from extensions import db
from datetime import datetime, timezone


class ShiftDocument(db.Model):
    __tablename__ = "shift_documents"

    id = db.Column(db.Integer, primary_key=True)
    time_entry_id = db.Column(
        db.Integer, db.ForeignKey("time_entries.id"), nullable=False, index=True
    )
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    mime_type = db.Column(db.String(100), default="image/jpeg")
    file_size = db.Column(db.Integer, default=0)
    telegram_file_id = db.Column(db.String(300), nullable=True)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    time_entry = db.relationship("TimeEntry", backref="documents")

    def to_dict(self):
        return {
            "id": self.id,
            "time_entry_id": self.time_entry_id,
            "filename": self.filename,
            "original_name": self.original_name,
            "mime_type": self.mime_type,
            "file_size": self.file_size,
            "telegram_file_id": self.telegram_file_id,
            "created_at": self.created_at.isoformat(),
            "url": f"/api/shift-documents/{self.id}/download",
        }
