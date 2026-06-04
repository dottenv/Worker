from gevent import monkey
monkey.patch_all()

import os
from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, jwt, socketio
from models import (User, ServiceCenter, ServiceCenterMember, Shift,
                    ScheduleEntry, SwapRequest, PushSubscription,
                    Notification, FinanceOperation, TimeEntry,
                    CustomField, CustomFieldValue, ShiftDocument)
from models.user import USER_COLORS
import random
from routes import (auth_bp, service_centers_bp, members_bp, shifts_bp,
                    schedule_bp, swaps_bp, push_bp, notifications_bp,
                    finance_bp, time_entries_bp,
                    custom_fields_bp, shift_documents_bp, vapid_bp,
                    telegram_bp, settings_bp)
from socket_events import register_socket_handlers


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    CORS(app, resources={r"/*": {"origins": "*"}})

    db.init_app(app)
    jwt.init_app(app)

    app.register_blueprint(auth_bp)
    app.register_blueprint(service_centers_bp)
    app.register_blueprint(members_bp)
    app.register_blueprint(shifts_bp)
    app.register_blueprint(schedule_bp)
    app.register_blueprint(swaps_bp)
    app.register_blueprint(push_bp)
    app.register_blueprint(notifications_bp)
    app.register_blueprint(finance_bp)
    app.register_blueprint(time_entries_bp)
    app.register_blueprint(custom_fields_bp)
    app.register_blueprint(shift_documents_bp)
    app.register_blueprint(vapid_bp)
    app.register_blueprint(telegram_bp)
    app.register_blueprint(settings_bp)

    with app.app_context():
        db.create_all()
        for col, spec in [
            ("color", "VARCHAR(7) DEFAULT ''"),
            ("telegram", "VARCHAR(120) DEFAULT ''"),
            ("max_link", "VARCHAR(300) DEFAULT ''"),
            ("is_superuser", "BOOLEAN DEFAULT 0"),
            ("finance_enabled", "BOOLEAN DEFAULT 0"),
            ("messenger_enabled", "BOOLEAN DEFAULT 0"),
            ("push_sound", "BOOLEAN DEFAULT 1"),
            ("push_prefs", "TEXT DEFAULT ''"),
            ("nav_config", "TEXT DEFAULT ''"),
            ("telegram_chat_id", "BIGINT"),
            ("telegram_username", "VARCHAR(120) DEFAULT ''"),
        ]:
            try:
                db.session.execute(db.text(f'ALTER TABLE users ADD COLUMN {col} {spec}'))
                db.session.commit()
            except Exception:
                db.session.rollback()
        # assign colors to existing users that have none
        no_color = User.query.filter(db.or_(User.color.is_(None), User.color == '')).all()
        if no_color:
            avail = list(USER_COLORS)
            random.shuffle(avail)
            for u in no_color:
                u.color = avail.pop() if avail else random.choice(USER_COLORS)
            db.session.commit()
        for col, spec in [
            ("details", "TEXT DEFAULT ''"),
        ]:
            try:
                db.session.execute(db.text(f'ALTER TABLE finance_operations ADD COLUMN {col} {spec}'))
                db.session.commit()
            except Exception:
                db.session.rollback()
        for col, spec in [
            ("address", "VARCHAR(300) DEFAULT ''"),
            ("phone", "VARCHAR(20) DEFAULT ''"),
        ]:
            try:
                db.session.execute(db.text(f'ALTER TABLE service_centers ADD COLUMN {col} {spec}'))
                db.session.commit()
            except Exception:
                db.session.rollback()
        try:
            db.session.execute(db.text('ALTER TABLE schedule_entries ADD COLUMN shift_id INTEGER REFERENCES shifts(id)'))
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(db.text(
                'CREATE TABLE IF NOT EXISTS time_entries ('
                'id INTEGER PRIMARY KEY AUTOINCREMENT, '
                'user_id INTEGER NOT NULL REFERENCES users(id), '
                'service_center_id INTEGER NOT NULL REFERENCES service_centers(id), '
                'shift_id INTEGER REFERENCES shifts(id), '
                'date DATE NOT NULL, '
                'clock_in DATETIME NOT NULL, '
                'clock_out DATETIME, '
                'break_minutes INTEGER DEFAULT 0, '
                'status VARCHAR(20) DEFAULT "pending", '
                'reviewed_by_id INTEGER REFERENCES users(id), '
                'reviewed_at DATETIME, '
                'notes TEXT DEFAULT "", '
                'created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)'
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(db.text(
                'CREATE TABLE IF NOT EXISTS settings ('
                'id INTEGER PRIMARY KEY AUTOINCREMENT, '
                'key VARCHAR(100) NOT NULL UNIQUE, '
                'value TEXT DEFAULT "")'
            ))
            db.session.commit()
        except Exception:
            db.session.rollback()
        for table_ddl in [
            (
                "custom_fields",
                "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "service_center_id INTEGER NOT NULL REFERENCES service_centers(id), "
                "name VARCHAR(100) NOT NULL, "
                "field_type VARCHAR(20) NOT NULL DEFAULT 'text', "
                "required BOOLEAN DEFAULT 0, "
                "carry_over BOOLEAN DEFAULT 0, "
                "sort_order INTEGER DEFAULT 0"
            ),
            (
                "custom_field_values",
                "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "time_entry_id INTEGER NOT NULL REFERENCES time_entries(id), "
                "custom_field_id INTEGER NOT NULL REFERENCES custom_fields(id), "
                "value TEXT DEFAULT ''"
            ),
            (
                "shift_documents",
                "id INTEGER PRIMARY KEY AUTOINCREMENT, "
                "time_entry_id INTEGER NOT NULL REFERENCES time_entries(id), "
                "filename VARCHAR(255) NOT NULL, "
                "original_name VARCHAR(255) NOT NULL, "
                "mime_type VARCHAR(100) DEFAULT 'image/jpeg', "
                "file_size INTEGER DEFAULT 0, "
                "created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP"
            ),
        ]:
            try:
                db.session.execute(db.text(
                    f"CREATE TABLE IF NOT EXISTS {table_ddl[0]} ({table_ddl[1]})"
                ))
                db.session.commit()
            except Exception:
                db.session.rollback()
        for col, spec in [
            ("telegram_file_id", "VARCHAR(300)"),
        ]:
            try:
                db.session.execute(db.text(f'ALTER TABLE shift_documents ADD COLUMN {col} {spec}'))
                db.session.commit()
            except Exception:
                db.session.rollback()
        for idx_ddl in [
            "CREATE INDEX IF NOT EXISTS ix_custom_fields_sc ON custom_fields(service_center_id)",
            "CREATE INDEX IF NOT EXISTS ix_custom_field_values_te ON custom_field_values(time_entry_id)",
            "CREATE INDEX IF NOT EXISTS ix_shift_documents_te ON shift_documents(time_entry_id)",
        ]:
            try:
                db.session.execute(db.text(idx_ddl))
                db.session.commit()
            except Exception:
                db.session.rollback()
        # ensure upload dir
        os.makedirs(os.path.join(app.config['UPLOAD_FOLDER'], 'shift_docs'), exist_ok=True)

    socketio.init_app(app)
    register_socket_handlers(socketio)

    return app


app = create_app()

# Sync Telegram bot from DB settings
with app.app_context():
    from telegram_bot import ensure_bot
    from models import Setting
    token = Setting.get("telegram_bot_token", app.config.get("TELEGRAM_BOT_TOKEN", ""))
    base_url = Setting.get("base_url", app.config.get("BASE_URL", "http://localhost:5173"))
    enabled = Setting.get("telegram_bot_enabled", "true" if token else "false") == "true"
    if enabled and token:
        ensure_bot(token, base_url)
        app.logger.info("Telegram bot started from settings")
    else:
        app.logger.info("Telegram bot not configured (set TELEGRAM_BOT_TOKEN in .env or settings)")

if __name__ == "__main__":
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
