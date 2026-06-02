from extensions import db
from datetime import datetime, timezone


class ScheduleEntry(db.Model):
    __tablename__ = "schedule_entries"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    service_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=False
    )
    date = db.Column(db.Date, nullable=False)
    type = db.Column(
        db.String(10), nullable=False, default="full_day"
    )  # full_day | hourly
    start_time = db.Column(db.Time, nullable=True)
    end_time = db.Column(db.Time, nullable=True)
    hourly_rate = db.Column(db.Numeric(10, 2), default=0)
    shift_id = db.Column(db.Integer, db.ForeignKey("shifts.id"), nullable=True)
    notes = db.Column(db.Text)
    created_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    user = db.relationship("User", foreign_keys=[user_id])
    service_center = db.relationship("ServiceCenter")
    shift = db.relationship("Shift")
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else None,
            "user_color": self.user.color if self.user else None,
            "service_center_id": self.service_center_id,
            "service_center_name": self.service_center.name
            if self.service_center
            else None,
            "service_center_address": self.service_center.address
            if self.service_center
            else None,
            "shift_id": self.shift_id,
            "shift_name": self.shift.name if self.shift else None,
            "shift_color": self.shift.color if self.shift else None,
            "date": self.date.isoformat(),
            "type": self.type,
            "start_time": self.start_time.strftime("%H:%M")
            if self.start_time
            else None,
            "end_time": self.end_time.strftime("%H:%M")
            if self.end_time
            else None,
            "hourly_rate": float(self.hourly_rate) if self.hourly_rate else 0,
            "notes": self.notes,
            "created_by_id": self.created_by_id,
            "created_by_name": self.created_by.full_name if self.created_by else None,
            "created_at": self.created_at.isoformat(),
        }
