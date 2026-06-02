from extensions import db


class Shift(db.Model):
    __tablename__ = "shifts"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(
        db.Integer, db.ForeignKey("service_centers.id"), nullable=False
    )
    name = db.Column(db.String(100), nullable=False)
    start_time = db.Column(db.Time, nullable=False)
    end_time = db.Column(db.Time, nullable=False)
    is_paid = db.Column(db.Boolean, default=True)
    color = db.Column(db.String(7), default="#6366f1")  # hex

    service_center = db.relationship("ServiceCenter", backref="shifts")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "name": self.name,
            "start_time": self.start_time.strftime("%H:%M"),
            "end_time": self.end_time.strftime("%H:%M"),
            "is_paid": self.is_paid,
            "color": self.color,
        }
