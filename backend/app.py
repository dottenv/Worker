from gevent import monkey
monkey.patch_all()

from flask import Flask
from flask_cors import CORS
from config import Config
from extensions import db, jwt, socketio
from models import User, ServiceCenter, ServiceCenterMember, Shift, ScheduleEntry, SwapRequest, PushSubscription, Notification, FinanceOperation, TimeEntry
from models.user import USER_COLORS
import random
from routes import auth_bp, service_centers_bp, members_bp, shifts_bp, schedule_bp, swaps_bp, push_bp, notifications_bp, finance_bp, time_entries_bp
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

    with app.app_context():
        db.create_all()
        # migration: add color column for existing databases
        try:
            db.session.execute(db.text('ALTER TABLE users ADD COLUMN color VARCHAR(7) DEFAULT \'\''))
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
        # migration: add finance_enabled column for existing databases
        try:
            db.session.execute(db.text('ALTER TABLE users ADD COLUMN finance_enabled BOOLEAN DEFAULT 0'))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # migration: add push_sound and push_prefs columns
        try:
            db.session.execute(db.text('ALTER TABLE users ADD COLUMN push_sound BOOLEAN DEFAULT 1'))
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(db.text('ALTER TABLE users ADD COLUMN push_prefs TEXT DEFAULT \'\''))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # migration: add finance details column
        try:
            db.session.execute(db.text('ALTER TABLE finance_operations ADD COLUMN details TEXT DEFAULT \'\''))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # migration: add address and phone columns for service_centers
        try:
            db.session.execute(db.text('ALTER TABLE service_centers ADD COLUMN address VARCHAR(300) DEFAULT \'\''))
            db.session.commit()
        except Exception:
            db.session.rollback()
        try:
            db.session.execute(db.text('ALTER TABLE service_centers ADD COLUMN phone VARCHAR(20) DEFAULT \'\''))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # migration: add shift_id column for schedule_entries
        try:
            db.session.execute(db.text('ALTER TABLE schedule_entries ADD COLUMN shift_id INTEGER REFERENCES shifts(id)'))
            db.session.commit()
        except Exception:
            db.session.rollback()
        # migration: create time_entries table
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
        # migration: add nav_config column for users
        try:
            db.session.execute(db.text('ALTER TABLE users ADD COLUMN nav_config TEXT DEFAULT \'\''))
            db.session.commit()
        except Exception:
            db.session.rollback()

    socketio.init_app(app)
    register_socket_handlers(socketio)

    return app


if __name__ == "__main__":
    app = create_app()
    socketio.run(app, debug=True, host="0.0.0.0", port=5000)
