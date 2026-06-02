from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Shift, ServiceCenter, ServiceCenterMember
from extensions import db
from datetime import time
from helpers import get_current_user, is_manager

shifts_bp = Blueprint(
    "shifts", __name__, url_prefix="/api/service-centers/<int:sc_id>/shifts"
)


@shifts_bp.route("", methods=["GET"])
@jwt_required()
def list_shifts(sc_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    is_member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user.id, is_active=True
    ).first()
    if not is_member and sc.owner_id != user.id:
        return jsonify({"error": "Access denied"}), 403

    shifts = Shift.query.filter_by(service_center_id=sc_id).all()
    return jsonify([s.to_dict() for s in shifts]), 200


@shifts_bp.route("", methods=["POST"])
@jwt_required()
def create_shift(sc_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Only owner or admin can manage shifts"}), 403

    data = request.get_json()
    if not data or not data.get("name") or not data.get("start_time") or not data.get("end_time"):
        return jsonify({"error": "name, start_time and end_time are required"}), 400

    try:
        start = time.fromisoformat(data["start_time"])
        end = time.fromisoformat(data["end_time"])
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid time format, use HH:MM"}), 400

    shift = Shift(
        service_center_id=sc_id,
        name=data["name"],
        start_time=start,
        end_time=end,
        is_paid=data.get("is_paid", True),
        color=data.get("color", "#6366f1"),
    )
    db.session.add(shift)
    db.session.commit()
    return jsonify(shift.to_dict()), 201


@shifts_bp.route("/<int:shift_id>", methods=["PUT"])
@jwt_required()
def update_shift(sc_id, shift_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    shift = Shift.query.get_or_404(shift_id)
    if shift.service_center_id != sc_id:
        return jsonify({"error": "Shift not found in this center"}), 404

    data = request.get_json()
    if data.get("name"):
        shift.name = data["name"]
    if data.get("start_time"):
        try:
            shift.start_time = time.fromisoformat(data["start_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid start_time"}), 400
    if data.get("end_time"):
        try:
            shift.end_time = time.fromisoformat(data["end_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid end_time"}), 400
    if "is_paid" in data:
        shift.is_paid = data["is_paid"]
    if data.get("color"):
        shift.color = data["color"]

    db.session.commit()
    return jsonify(shift.to_dict()), 200


@shifts_bp.route("/<int:shift_id>", methods=["DELETE"])
@jwt_required()
def delete_shift(sc_id, shift_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    shift = Shift.query.get_or_404(shift_id)
    if shift.service_center_id != sc_id:
        return jsonify({"error": "Shift not found"}), 404

    ServiceCenterMember.query.filter_by(shift_id=shift.id).update({"shift_id": None})
    db.session.delete(shift)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
