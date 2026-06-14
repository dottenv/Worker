from extensions import db
from datetime import datetime, timezone


class Purchase(db.Model):
    __tablename__ = "purchases"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(db.Integer, db.ForeignKey("service_centers.id"), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    status = db.Column(db.String(20), nullable=False, default='draft')
    notes = db.Column(db.Text, default='')
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    supplier = db.relationship("Supplier")
    user = db.relationship("User")
    service_center = db.relationship("ServiceCenter")
    items = db.relationship("PurchaseItem", back_populates="purchase", cascade="all, delete-orphan")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "supplier_id": self.supplier_id,
            "supplier_name": self.supplier.name if self.supplier else '',
            "user_id": self.user_id,
            "user_name": self.user.full_name if self.user else '',
            "status": self.status,
            "notes": self.notes or '',
            "items": [item.to_dict() for item in self.items],
            "total": sum(item.total for item in self.items),
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }
