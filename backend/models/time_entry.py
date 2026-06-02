from extensions import db
from datetime import datetime, timezone


class TimeEntry(db.Model):
    __tablename__ = "time_entries"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=False
    )
    shift_id = db.Column(db.Integer, db.ForeignKey("shifts.id"), nullable=True)
    date = db.Column(db.Date, nullable=False)
    clock_in = db.Column(db.DateTime, nullable=False)
    clock_out = db.Column(db.DateTime, nullable=True)
    break_minutes = db.Column(db.Integer, default=0)
    status = db.Column(db.String(20), default="pending")
    reviewed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    notes = db.Column(db.Text, default="")
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", foreign_keys=[user_id])
    service_center = db.relationship("ServiceCenter")
    shift = db.relationship("Shift")
    reviewed_by = db.relationship("User", foreign_keys=[reviewed_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "service_center_id": self.service_center_id,
            "service_center_name": self.service_center.name
            if self.service_center
            else None,
            "service_center_address": self.service_center.address
            if self.service_center
            else None,
            "shift_id": self.shift_id,
            "shift_name": self.shift.name if self.shift else None,
            "date": self.date.isoformat(),
            "clock_in": self.clock_in.isoformat() if self.clock_in else None,
            "clock_out": self.clock_out.isoformat() if self.clock_out else None,
            "duration_hours": round(
                ((self.clock_out - self.clock_in).total_seconds() / 3600)
                - (self.break_minutes or 0) / 60, 2
            ) if self.clock_in and self.clock_out else None,
            "break_minutes": self.break_minutes or 0,
            "status": self.status,
            "reviewed_by_name": self.reviewed_by.full_name
            if self.reviewed_by
            else None,
            "reviewed_at": self.reviewed_at.isoformat()
            if self.reviewed_at
            else None,
            "notes": self.notes or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
