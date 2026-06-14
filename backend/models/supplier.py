from extensions import db
from datetime import datetime, timezone


class Supplier(db.Model):
    __tablename__ = "suppliers"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(db.Integer, db.ForeignKey("service_centers.id"), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    contact_person = db.Column(db.String(200), default='')
    phone = db.Column(db.String(50), default='')
    email = db.Column(db.String(120), default='')
    address = db.Column(db.String(300), default='')
    notes = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    service_center = db.relationship("ServiceCenter")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "name": self.name,
            "contact_person": self.contact_person or '',
            "phone": self.phone or '',
            "email": self.email or '',
            "address": self.address or '',
            "notes": self.notes or '',
            "created_at": self.created_at.isoformat(),
        }
