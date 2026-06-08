import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Setting, User
from extensions import db
from helpers import get_current_user

logger = logging.getLogger(__name__)

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

FINANCE_KEYS = {"finance_enabled"}

ALLOWED_KEYS = FINANCE_KEYS


def is_owner():
    user = get_current_user()
    if not user:
        return False
    from models import ServiceCenterMember
    return ServiceCenterMember.query.filter_by(
        user_id=user.id, role="owner"
    ).count() > 0


@settings_bp.route("", methods=["GET"])
@jwt_required()
def get_settings():
    user = get_current_user()
    result = {}
    is_own = is_owner()
    for s in Setting.query.all():
        if s.key in FINANCE_KEYS and not is_own:
            continue
        result[s.key] = s.value
    result["finance_enabled"] = result.get("finance_enabled", "false")
    return jsonify(result)


@settings_bp.route("", methods=["PUT"])
@jwt_required()
def update_settings():
    if not is_owner():
        return jsonify({"error": "Only owners can update settings"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    for key, value in data.items():
        if key not in ALLOWED_KEYS:
            continue
        Setting.set(key, str(value))

    db.session.commit()
    return jsonify({"status": "ok"})
