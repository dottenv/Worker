from extensions import db
from datetime import datetime, timezone


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(db.Integer, db.ForeignKey("service_centers.id"), nullable=False, index=True)
    name = db.Column(db.String(200), nullable=False)
    unit = db.Column(db.String(20), default='шт')
    default_price = db.Column(db.Numeric(12, 2), default=0)
    description = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    service_center = db.relationship("ServiceCenter")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "name": self.name,
            "unit": self.unit or 'шт',
            "default_price": float(self.default_price) if self.default_price else 0,
            "description": self.description or '',
            "created_at": self.created_at.isoformat(),
        }
