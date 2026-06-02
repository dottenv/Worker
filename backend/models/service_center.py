from extensions import db
from datetime import datetime, timezone


class ServiceCenter(db.Model):
    __tablename__ = "service_centers"

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text)
    address = db.Column(db.String(300), default='')
    phone = db.Column(db.String(20), default='')
    owner_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(
        db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc)
    )

    owner = db.relationship("User", backref="owned_centers")
    members = db.relationship(
        "ServiceCenterMember", back_populates="service_center", lazy="dynamic"
    )

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "description": self.description,
            "address": self.address or '',
            "phone": self.phone or '',
            "owner_id": self.owner_id,
            "created_at": self.created_at.isoformat(),
            "members_count": self.members.count(),
        }
