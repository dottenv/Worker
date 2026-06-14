from extensions import db
from datetime import datetime, timezone


class ParserConfig(db.Model):
    __tablename__ = "parser_configs"

    id = db.Column(db.Integer, primary_key=True)
    service_center_id = db.Column(db.Integer, db.ForeignKey("service_centers.id"), nullable=False)
    supplier_id = db.Column(db.Integer, db.ForeignKey("suppliers.id"), nullable=True)
    parser_type = db.Column(db.String(50), nullable=False)
    login = db.Column(db.String(200), nullable=False)
    password = db.Column(db.String(500), nullable=False)
    base_url = db.Column(db.String(300), default='https://novosibirsk.moba.ru')
    is_active = db.Column(db.Boolean, default=True)
    last_sync_at = db.Column(db.DateTime, nullable=True)
    sync_status = db.Column(db.String(20), default='idle')
    sync_log = db.Column(db.Text, default='')
    sync_progress = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    service_center = db.relationship("ServiceCenter")
    supplier = db.relationship("Supplier")

    def to_dict(self):
        return {
            "id": self.id,
            "service_center_id": self.service_center_id,
            "supplier_id": self.supplier_id,
            "parser_type": self.parser_type,
            "login": self.login,
            "base_url": self.base_url,
            "is_active": self.is_active,
            "last_sync_at": self.last_sync_at.isoformat() if self.last_sync_at else None,
            "sync_status": self.sync_status,
            "sync_log": self.sync_log,
            "sync_progress": self.sync_progress,
            "created_at": self.created_at.isoformat(),
        }
