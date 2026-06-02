from extensions import db


class CustomFieldValue(db.Model):
    __tablename__ = "custom_field_values"

    id = db.Column(db.Integer, primary_key=True)
    time_entry_id = db.Column(
        db.Integer, db.ForeignKey("time_entries.id"), nullable=False, index=True
    )
    custom_field_id = db.Column(
        db.Integer, db.ForeignKey("custom_fields.id"), nullable=False
    )
    value = db.Column(db.Text, default="")

    time_entry = db.relationship("TimeEntry", backref="custom_values")
    custom_field = db.relationship("CustomField")

    def to_dict(self):
        return {
            "id": self.id,
            "time_entry_id": self.time_entry_id,
            "custom_field_id": self.custom_field_id,
            "field_name": self.custom_field.name if self.custom_field else None,
            "field_type": self.custom_field.field_type if self.custom_field else None,
            "value": self.value,
        }
