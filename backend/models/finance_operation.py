import json
from extensions import db
from datetime import datetime, timezone
from decimal import Decimal


class FinanceOperation(db.Model):
    __tablename__ = "finance_operations"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False, index=True)
    type = db.Column(db.String(50), nullable=False)  # advance, deduction, payment, adjustment, salary
    amount = db.Column(db.Numeric(12, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    details = db.Column(db.Text, nullable=True, default='')  # JSON array of items
    operation_date = db.Column(db.Date, nullable=False)
    created_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(db.DateTime, nullable=False, default=lambda: datetime.now(timezone.utc))

    user = db.relationship("User", foreign_keys=[user_id], backref="finance_operations")
    created_by = db.relationship("User", foreign_keys=[created_by_id])

    def to_dict(self):
        parsed_details = []
        if self.details:
            try:
                parsed_details = json.loads(self.details)
            except (json.JSONDecodeError, TypeError):
                parsed_details = []
        return {
            "id": self.id,
            "user_id": self.user_id,
            "type": self.type,
            "amount": float(self.amount),
            "description": self.description or "",
            "details": parsed_details,
            "operation_date": self.operation_date.isoformat(),
            "created_by_id": self.created_by_id,
            "created_at": self.created_at.isoformat(),
        }


# helpers for balance sign
FINANCE_CREDIT_TYPES = ("salary", "adjustment")  # add to balance
FINANCE_DEBIT_TYPES = ("advance", "payment", "deduction")  # subtract from balance


def calc_balance(operations: list["FinanceOperation"]) -> float:
    b = Decimal("0")
    for op in operations:
        if op.type in FINANCE_CREDIT_TYPES:
            b += Decimal(str(op.amount))
        else:
            b -= Decimal(str(op.amount))
    return float(b)