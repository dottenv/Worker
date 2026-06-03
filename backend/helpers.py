"""Shared helpers for backend route files."""

from flask import current_app
from flask_jwt_extended import get_jwt_identity
from models import User, ServiceCenter, ServiceCenterMember, FinanceOperation
from extensions import db
import json
from datetime import datetime


def get_current_user():
    user_id = int(get_jwt_identity())
    return User.query.get(user_id)


def is_manager(sc_id, user_id):
    sc = ServiceCenter.query.get(sc_id)
    if sc and sc.owner_id == user_id:
        return True
    member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user_id, is_active=True
    ).first()
    return member and member.role in ("owner", "admin")


def get_center_owner(sc_id):
    sc = ServiceCenter.query.get(sc_id)
    return User.query.get(sc.owner_id) if sc else None


def is_finance_enabled_for_center(sc_id):
    owner = get_center_owner(sc_id)
    return owner.finance_enabled if owner else False


def schedule_payment_exists(entry_id, user_id):
    ops = FinanceOperation.query.filter_by(user_id=user_id).all()
    for op in ops:
        try:
            details = json.loads(op.details) if op.details else {}
        except (json.JSONDecodeError, TypeError):
            continue
        if details.get("schedule_entry_id") == entry_id:
            return True
    return False


def compute_schedule_amount(entry):
    if entry.type == "full_day":
        return float(entry.hourly_rate or 0) * 8
    if entry.start_time and entry.end_time:
        start = datetime.combine(entry.date, entry.start_time)
        end = datetime.combine(entry.date, entry.end_time)
        if end <= start:
            end = datetime.combine(entry.date, entry.end_time)
        hours = (end - start).total_seconds() / 3600
        return round(hours * float(entry.hourly_rate or 0), 2)
    return 0



