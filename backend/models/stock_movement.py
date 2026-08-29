from extensions import db
from sqlalchemy.orm import relationship
from datetime import datetime, timezone


def _utcnow():
    return datetime.now(timezone.utc)


class StockMovement(db.Model):
    __tablename__ = "stock_movements"

    MOVEMENT_TYPES = {
        "receive": "Оприходование",
        "writeoff": "Списание",
        "adjust": "Корректировка",
    }

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(db.Integer, db.ForeignKey("service_centers.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    type = db.Column(db.String(16), nullable=False)
    quantity = db.Column(db.Float, default=0.0, nullable=False)
    reason = db.Column(db.Text, nullable=True)
    related_purchase_id = db.Column(db.Integer, db.ForeignKey("purchases.id"), nullable=True)
    created_at = db.Column(db.DateTime, default=_utcnow, nullable=False)

    product = relationship("Product")
    user = relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else None,
            "user_id": self.user_id,
            "user_name": self.user.name if self.user else None,
            "type": self.type,
            "type_label": self.MOVEMENT_TYPES.get(self.type, self.type),
            "quantity": self.quantity,
            "reason": self.reason or "",
            "related_purchase_id": self.related_purchase_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
