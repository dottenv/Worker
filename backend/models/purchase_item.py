from extensions import db


class PurchaseItem(db.Model):
    __tablename__ = "purchase_items"

    id = db.Column(db.Integer, primary_key=True)
    purchase_id = db.Column(db.Integer, db.ForeignKey("purchases.id"), nullable=False, index=True)
    product_id = db.Column(db.Integer, db.ForeignKey("products.id"), nullable=False)
    quantity = db.Column(db.Numeric(12, 2), nullable=False, default=1)
    price_per_unit = db.Column(db.Numeric(12, 2), nullable=False, default=0)

    purchase = db.relationship("Purchase", back_populates="items")
    product = db.relationship("Product")

    @property
    def total(self):
        return float(self.quantity or 0) * float(self.price_per_unit or 0)

    def to_dict(self):
        return {
            "id": self.id,
            "purchase_id": self.purchase_id,
            "product_id": self.product_id,
            "product_name": self.product.name if self.product else '',
            "product_unit": self.product.unit if self.product else 'шт',
            "quantity": float(self.quantity),
            "price_per_unit": float(self.price_per_unit),
            "total": self.total,
        }
