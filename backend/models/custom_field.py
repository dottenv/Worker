from extensions import db


class CustomField(db.Model):
    __tablename__ = "custom_fields"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=False, index=True
    )
    name = db.Column(db.String(100), nullable=False)
    field_type = db.Column(
        db.String(20), nullable=False, default="text"
    )
    required = db.Column(db.Boolean, default=False)
    carry_over = db.Column(db.Boolean, default=False)
    sort_order = db.Column(db.Integer, default=0)

    service_center = db.relationship("ServiceCenter", backref="custom_fields")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "name": self.name,
            "field_type": self.field_type,
            "required": self.required,
            "carry_over": self.carry_over,
            "sort_order": self.sort_order,
        }
