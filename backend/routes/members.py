from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import ServiceCenter, ServiceCenterMember, Shift, User
from extensions import db
from socket_events import emit_to_users
from helpers import get_current_user, is_manager

members_bp = Blueprint(
    "members", __name__, url_prefix="/api/service-centers/<int:sc_id>/members"
)


@members_bp.route("", methods=["GET"])
@jwt_required()
def list_members(sc_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    is_member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user.id, is_active=True
    ).first()
    if not is_member and sc.owner_id != user.id:
        return jsonify({"error": "Access denied"}), 403

    members = (
        ServiceCenterMember.query.filter_by(service_center_id=sc_id)
        .order_by(ServiceCenterMember.joined_at)
        .all()
    )
    return jsonify([m.to_dict() for m in members]), 200


@members_bp.route("", methods=["POST"])
@jwt_required()
def add_member(sc_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Only owner or admin can add members"}), 403

    data = request.get_json()
    target = None

    user_id = data.get("user_id")
    if user_id is not None:
        user_id = int(user_id)
    email = data.get("email", "").strip().lower() if data.get("email") else ""

    if user_id:
        target = User.query.get(user_id)
    elif email:
        target = User.query.filter_by(email=email).first()
    else:
        return jsonify({"error": "user_id or email is required"}), 400

    if not target:
        return jsonify({"error": "User not found"}), 404

    existing = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=target.id
    ).first()
    if existing:
        return jsonify({"error": "User is already a member"}), 409

    member = ServiceCenterMember(
        service_center_id=sc_id,
        user_id=target.id,
        role=data.get("role", "employee"),
        hourly_rate=data.get("hourly_rate", 0),
    )
    db.session.add(member)
    db.session.commit()

    # notify center admins via socket
    try:
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins]
        emit_to_users(admin_ids, "member:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit member:updated after adding member: %s", e)

    from notification_helper import create_notification
    create_notification(target.id, "center_access", "Доступ к складу",
                        f"Вам предоставлен доступ к складу «{sc.name}».",
                        "/schedule")

    return jsonify(member.to_dict()), 201


@members_bp.route("/<int:member_id>", methods=["GET"])
@jwt_required()
def get_member(sc_id, member_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    is_member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user.id, is_active=True
    ).first()
    if not is_member and sc.owner_id != user.id:
        return jsonify({"error": "Access denied"}), 403

    member = ServiceCenterMember.query.get_or_404(member_id)
    if member.service_center_id != sc_id:
        return jsonify({"error": "Member not found"}), 404

    return jsonify(member.to_dict()), 200


@members_bp.route("/<int:member_id>/settings", methods=["PUT"])
@jwt_required()
def update_member_settings(sc_id, member_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Only owner or admin can update members"}), 403

    member = ServiceCenterMember.query.get_or_404(member_id)
    if member.service_center_id != sc_id:
        return jsonify({"error": "Member not found"}), 404

    data = request.get_json()
    if "tracking_mode" in data:
        if data["tracking_mode"] not in ("hourly", "shift"):
            return jsonify({"error": "Invalid tracking mode"}), 400
        member.tracking_mode = data["tracking_mode"]
    if "shift_id" in data:
        if data["shift_id"]:
            shift = Shift.query.filter_by(id=data["shift_id"], service_center_id=sc_id).first()
            if not shift:
                return jsonify({"error": "Shift not found"}), 404
            member.shift_id = data["shift_id"]
        else:
            member.shift_id = None
    if "hourly_rate" in data:
        member.hourly_rate = data["hourly_rate"]
    if "is_active" in data:
        member.is_active = data["is_active"]

    db.session.commit()

    try:
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins]
        emit_to_users(admin_ids, "member:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit member:updated after settings update: %s", e)

    return jsonify(member.to_dict()), 200


@members_bp.route("/<int:member_id>", methods=["PUT"])
@jwt_required()
def update_member(sc_id, member_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Only owner or admin can update members"}), 403

    member = ServiceCenterMember.query.get_or_404(member_id)
    if member.service_center_id != sc_id:
        return jsonify({"error": "Member not found in this center"}), 404

    data = request.get_json()
    if "role" in data:
        if data["role"] not in ("admin", "employee"):
            return jsonify({"error": "Invalid role"}), 400
        if member.role == "owner":
            return jsonify({"error": "Cannot change owner role"}), 403
        member.role = data["role"]
    if "hourly_rate" in data:
        member.hourly_rate = data["hourly_rate"]
    if "is_active" in data:
        member.is_active = data["is_active"]
    db.session.commit()

    try:
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins]
        emit_to_users(admin_ids, "member:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit member:updated after member update: %s", e)

    return jsonify(member.to_dict()), 200


@members_bp.route("/<int:member_id>", methods=["DELETE"])
@jwt_required()
def remove_member(sc_id, member_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Only owner or admin can remove members"}), 403

    member = ServiceCenterMember.query.get_or_404(member_id)
    if member.service_center_id != sc_id:
        return jsonify({"error": "Member not found in this center"}), 404
    if member.role == "owner":
        return jsonify({"error": "Cannot remove owner"}), 403

    db.session.delete(member)
    db.session.commit()

    try:
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins]
        emit_to_users(admin_ids, "member:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit member:updated after member removal: %s", e)

    return jsonify({"message": "Member removed"}), 200
