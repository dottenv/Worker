from extensions import db
from datetime import datetime, timezone


class ServiceCenterMember(db.Model):
    __tablename__ = "service_center_members"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=False
    )
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    role = db.Column(
        db.String(20), nullable=False, default="employee"
    )
    tracking_mode = db.Column(
        db.String(10), nullable=False, default="hourly"
    )  # hourly | shift
    shift_id = db.Column(
        db.Integer, db.ForeignKey("shifts.id"), nullable=True
    )
    hourly_rate = db.Column(db.Numeric(10, 2), default=0)
    is_active = db.Column(db.Boolean, default=True)
    joined_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", back_populates="memberships")
    service_center = db.relationship(
        "ServiceCenter", back_populates="members"
    )
    shift = db.relationship("Shift", backref="assigned_members")

    __table_args__ = (
        db.UniqueConstraint(
            "service_center_id", "user_id", name="uq_member_center"
        ),
    )

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "user_id": self.user_id,
            "user": self.user.to_dict() if self.user else None,
            "role": self.role,
            "tracking_mode": self.tracking_mode,
            "shift_id": self.shift_id,
            "shift": self.shift.to_dict() if self.shift else None,
            "hourly_rate": float(self.hourly_rate) if self.hourly_rate else 0,
            "is_active": self.is_active,
            "joined_at": self.joined_at.isoformat(),
        }
