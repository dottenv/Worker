from datetime import datetime, timezone
from app import db, bcrypt


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    company_name = db.Column(db.String(200))
    phone = db.Column(db.String(20))
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    warehouses = db.relationship("Warehouse", backref="owner", lazy="dynamic")

    def set_password(self, password):
        self.password_hash = bcrypt.generate_password_hash(password).decode("utf-8")

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "company_name": self.company_name,
            "phone": self.phone,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Warehouse(db.Model):
    __tablename__ = "warehouses"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    address = db.Column(db.String(500))
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    employees = db.relationship("Employee", backref="warehouse", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "address": self.address,
            "user_id": self.user_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class Employee(db.Model):
    __tablename__ = "employees"

    id = db.Column(db.Integer, primary_key=True)
    first_name = db.Column(db.String(100), nullable=False)
    last_name = db.Column(db.String(100), nullable=False)
    email = db.Column(db.String(120))
    phone = db.Column(db.String(20))
    position = db.Column(db.String(100))
    pin_code = db.Column(db.String(6), nullable=False)
    warehouse_id = db.Column(
        db.Integer, db.ForeignKey("warehouses.id"), nullable=False
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    work_sessions = db.relationship("WorkSession", backref="employee", lazy="dynamic")

    def set_pin(self, pin):
        self.pin_code = bcrypt.generate_password_hash(pin).decode("utf-8")

    def check_pin(self, pin):
        return bcrypt.check_password_hash(self.pin_code, pin)

    def to_dict(self):
        return {
            "id": self.id,
            "first_name": self.first_name,
            "last_name": self.last_name,
            "email": self.email,
            "phone": self.phone,
            "position": self.position,
            "warehouse_id": self.warehouse_id,
            "user_id": self.user_id,
            "is_active": self.is_active,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }


class WorkSession(db.Model):
    __tablename__ = "work_sessions"

    id = db.Column(db.Integer, primary_key=True)
    employee_id = db.Column(
        db.Integer, db.ForeignKey("employees.id"), nullable=False
    )
    clock_in = db.Column(db.DateTime, nullable=False)
    clock_out = db.Column(db.DateTime)
    date = db.Column(db.Date, nullable=False)
    status = db.Column(db.String(20), default="working")
    note = db.Column(db.Text)

    def to_dict(self):
        return {
            "id": self.id,
            "employee_id": self.employee_id,
            "clock_in": self.clock_in.isoformat() if self.clock_in else None,
            "clock_out": self.clock_out.isoformat() if self.clock_out else None,
            "date": self.date.isoformat() if self.date else None,
            "status": self.status,
            "note": self.note,
            "duration": (
                str(self.clock_out - self.clock_in) if self.clock_out else None
            ),
        }
