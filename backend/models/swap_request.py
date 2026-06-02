from extensions import db
from datetime import datetime, timezone


class SwapRequest(db.Model):
    __tablename__ = "swap_requests"

    id = db.Column(db.Integer, primary_key=True)
    requester_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )
    responder_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    service_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=False
    )

    source_entry_id = db.Column(
        db.Integer, db.ForeignKey("schedule_entries.id"), nullable=True
    )
    source_date = db.Column(db.Date, nullable=False)
    source_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=False
    )

    target_entry_id = db.Column(
        db.Integer, db.ForeignKey("schedule_entries.id"), nullable=True
    )
    target_date = db.Column(db.Date, nullable=True)
    target_user_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )
    target_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=True
    )

    status = db.Column(db.String(20), nullable=False, default="pending")
    swap_type = db.Column(db.String(20), nullable=False, default="swap")
    notes = db.Column(db.Text)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )
    resolved_at = db.Column(db.DateTime, nullable=True)
    resolved_by_id = db.Column(
        db.Integer, db.ForeignKey("users.id"), nullable=True
    )

    requester = db.relationship("User", foreign_keys=[requester_id])
    responder = db.relationship("User", foreign_keys=[responder_id])
    service_center = db.relationship("ServiceCenter", foreign_keys=[service_center_id])
    source_entry = db.relationship("ScheduleEntry", foreign_keys=[source_entry_id])
    target_entry = db.relationship("ScheduleEntry", foreign_keys=[target_entry_id])
    source_user = db.relationship("User", foreign_keys=[source_user_id])
    target_user = db.relationship("User", foreign_keys=[target_user_id])
    target_center = db.relationship("ServiceCenter", foreign_keys=[target_center_id])
    resolved_by = db.relationship("User", foreign_keys=[resolved_by_id])

    def to_dict(self):
        return {
            "id": self.id,
            "requester_id": self.requester_id,
            "requester_name": self.requester.full_name if self.requester else None,
            "responder_id": self.responder_id,
            "responder_name": self.responder.full_name if self.responder else None,
            "service_center_id": self.service_center_id,
            "service_center_name": self.service_center.name if self.service_center else None,
            "service_center_address": self.service_center.address if self.service_center else None,
            "source_entry_id": self.source_entry_id,
            "source_date": self.source_date.isoformat(),
            "source_user_id": self.source_user_id,
            "source_user_name": self.source_user.full_name if self.source_user else None,
            "target_entry_id": self.target_entry_id,
            "target_date": self.target_date.isoformat() if self.target_date else None,
            "target_user_id": self.target_user_id,
            "target_user_name": self.target_user.full_name if self.target_user else None,
            "target_center_id": self.target_center_id,
            "target_center_name": self.target_center.name if self.target_center else None,
            "target_center_address": self.target_center.address if self.target_center else None,
            "status": self.status,
            "swap_type": self.swap_type,
            "notes": self.notes,
            "created_at": self.created_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by_id": self.resolved_by_id,
            "resolved_by_name": self.resolved_by.full_name if self.resolved_by else None,
        }
