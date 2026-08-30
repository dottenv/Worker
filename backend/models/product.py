from extensions import db
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


def _utcnow():
    return datetime.now(timezone.utc)


class Product(db.Model):
    __tablename__ = "products"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(db.Integer, db.ForeignKey("service_centers.id"), nullable=False, index=True)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    sku = db.Column(db.String(64), nullable=True)
    barcode = db.Column(db.String(64), nullable=True)
    name = db.Column(db.String(255), nullable=False)
    unit = db.Column(db.String(16), default="шт", nullable=False)
    default_price = db.Column(db.Float, default=0.0, nullable=False)
    stock_quantity = db.Column(db.Float, default=0.0, nullable=False)
    min_quantity = db.Column(db.Float, default=0.0, nullable=False)
    location = db.Column(db.String(128), nullable=True)
    description = db.Column(db.Text, nullable=True)
    photo = db.Column(db.String(255), nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    supplier = relationship("Supplier", backref="products")

    def to_dict(self):
        supplier_name = self.supplier.name if self.supplier else None
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "supplier_id": self.supplier_id,
            "supplier_name": supplier_name,
            "sku": self.sku or "",
            "barcode": self.barcode or "",
            "name": self.name,
            "unit": self.unit,
            "default_price": self.default_price,
            "stock_quantity": self.stock_quantity,
            "min_quantity": self.min_quantity,
            "location": self.location or "",
            "description": self.description or "",
            "photo": self.photo or "",
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
