import random
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash
from datetime import datetime, timezone

USER_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#10b981', '#06b6d4', '#3b82f6', '#a855f7',
    '#d946ef', '#14b8a6', '#84cc16', '#e11d48',
]


def pick_user_color():
    used = db.session.query(User.color).filter(User.color.isnot(None)).all()
    used_set = {c[0] for c in used if c[0]}
    available = [c for c in USER_COLORS if c not in used_set]
    return random.choice(available) if available else random.choice(USER_COLORS)


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(120), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(256), nullable=False)
    full_name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(20))
    max_link = db.Column(db.String(300), default='')
    color = db.Column(db.String(7), default='')
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    is_superuser = db.Column(db.Boolean, default=False)
    finance_enabled = db.Column(db.Boolean, default=False)
    messenger_enabled = db.Column(db.Boolean, default=False)
    push_sound = db.Column(db.Boolean, default=True)
    push_prefs = db.Column(db.Text, default='')  # JSON: {"swap_created":true,"schedule_update":true,...}
    nav_config = db.Column(db.Text, default='')  # JSON: {"pinned":["dashboard","schedule","centers","notifications"]}

    memberships = db.relationship(
        "ServiceCenterMember", back_populates="user", lazy="dynamic"
    )

    def set_password(self, password: str):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password: str) -> bool:
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        import json
        prefs = {}
        if self.push_prefs:
            try:
                prefs = json.loads(self.push_prefs)
            except json.JSONDecodeError:
                prefs = {}
        nav = {}
        if self.nav_config:
            try:
                nav = json.loads(self.nav_config)
            except json.JSONDecodeError:
                nav = {}
        return {
            "id": self.id,
            "email": self.email,
            "full_name": self.full_name,
            "phone": self.phone,
            "max_link": self.max_link,
            "color": self.color,
            "is_superuser": self.is_superuser,
            "finance_enabled": self.finance_enabled,
            "messenger_enabled": self.messenger_enabled,
            "push_sound": self.push_sound,
            "push_prefs": prefs,
            "nav_config": nav,
            "created_at": self.created_at.isoformat(),
        }
