import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import (
    ServiceCenter, ServiceCenterMember, Shift, ScheduleEntry,
    TimeEntry, ShiftDocument, CustomField, CustomFieldValue,
    SwapRequest,
)
from extensions import db
from socket_events import emit_to_users
from helpers import get_current_user

service_centers_bp = Blueprint(
    "service_centers", __name__, url_prefix="/api/service-centers"
)


@service_centers_bp.route("", methods=["GET"])
@jwt_required()
def list_centers():
    user = get_current_user()
    owned = ServiceCenter.query.filter_by(owner_id=user.id).all()
    member_of = (
        ServiceCenter.query.join(ServiceCenterMember)
        .filter(
            ServiceCenterMember.user_id == user.id,
            ServiceCenterMember.is_active == True,
        )
        .all()
    )
    seen = set()
    result = []
    for sc in owned + member_of:
        if sc.id not in seen:
            seen.add(sc.id)
            d = sc.to_dict()
            d["role"] = "owner" if sc.owner_id == user.id else "member"
            result.append(d)
    return jsonify(result), 200


@service_centers_bp.route("", methods=["POST"])
@jwt_required()
def create_center():
    user = get_current_user()
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Name is required"}), 400

    sc = ServiceCenter(
        name=data["name"],
        description=data.get("description", ""),
        owner_id=user.id,
    )
    db.session.add(sc)
    db.session.flush()

    member = ServiceCenterMember(
        service_center_id=sc.id,
        user_id=user.id,
        role="owner",
    )
    db.session.add(member)
    db.session.commit()

    try:
        emit_to_users([user.id], "center:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit center:updated for user %s: %s", user.id, e)

    return jsonify(sc.to_dict()), 201


@service_centers_bp.route("/<int:sc_id>", methods=["GET"])
@jwt_required()
def get_center(sc_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    d = sc.to_dict()
    if sc.owner_id == user.id:
        d["role"] = "owner"
    else:
        member = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, user_id=user.id, is_active=True
        ).first()
        d["role"] = member.role if member else "member"
    return jsonify(d), 200


@service_centers_bp.route("/<int:sc_id>", methods=["PUT"])
@jwt_required()
def update_center(sc_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    if sc.owner_id != user.id:
        return jsonify({"error": "Only owner can update"}), 403

    data = request.get_json()
    if data.get("name"):
        sc.name = data["name"]
    if "description" in data:
        sc.description = data.get("description")
    if "address" in data:
        sc.address = data.get("address")
    if "phone" in data:
        sc.phone = data.get("phone")
    db.session.commit()

    try:
        members = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).all()
        member_ids = [m.user_id for m in members]
        emit_to_users(member_ids, "center:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit center:updated for center %s: %s", sc_id, e)

    return jsonify(sc.to_dict()), 200


@service_centers_bp.route("/<int:sc_id>", methods=["DELETE"])
@jwt_required()
def delete_center(sc_id):
    user = get_current_user()
    sc = ServiceCenter.query.get_or_404(sc_id)
    if sc.owner_id != user.id:
        return jsonify({"error": "Only owner can delete"}), 403

    member_ids = [m.user_id for m in ServiceCenterMember.query.filter_by(service_center_id=sc.id).all()]

    # delete swap requests referencing this center
    SwapRequest.query.filter(
        db.or_(
            SwapRequest.service_center_id == sc.id,
            SwapRequest.target_center_id == sc.id,
        )
    ).delete()

    # delete custom fields + their values
    fields = CustomField.query.filter_by(service_center_id=sc.id).all()
    field_ids = [f.id for f in fields]
    if field_ids:
        CustomFieldValue.query.filter(CustomFieldValue.custom_field_id.in_(field_ids)).delete()
    CustomField.query.filter_by(service_center_id=sc.id).delete()

    # delete time entries + associated documents (files) + custom values
    entries = TimeEntry.query.filter_by(service_center_id=sc.id).all()
    for entry in entries:
        docs = ShiftDocument.query.filter_by(time_entry_id=entry.id).all()
        for d in docs:
            file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], "shift_docs", d.filename)
            if os.path.exists(file_path):
                os.remove(file_path)
            db.session.delete(d)
        CustomFieldValue.query.filter_by(time_entry_id=entry.id).delete()
        db.session.delete(entry)

    # delete schedule entries
    ScheduleEntry.query.filter_by(service_center_id=sc.id).delete()

    # delete shifts
    Shift.query.filter_by(service_center_id=sc.id).delete()

    # delete members
    ServiceCenterMember.query.filter_by(service_center_id=sc.id).delete()

    # delete the center itself
    db.session.delete(sc)
    db.session.commit()

    try:
        emit_to_users(member_ids, "center:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit center:updated on delete for center %s: %s", sc.id, e)

    return jsonify({"message": "Deleted"}), 200


@service_centers_bp.route("/other", methods=["GET"])
@jwt_required()
def list_other_centers():
    """Return centers with the same owner(s) that the current user is NOT a member of."""
    user = get_current_user()

    # centers the user belongs to
    my_ids = set(
        m.service_center_id for m in ServiceCenterMember.query.filter_by(
            user_id=user.id, is_active=True
        ).all()
    )

    # collect all owners from the user's centers + user's owned centers
    owner_ids = {user.id}
    for sc_id in my_ids:
        sc = ServiceCenter.query.get(sc_id)
        if sc:
            owner_ids.add(sc.owner_id)

    # get all centers owned by these owners
    candidate_centers = ServiceCenter.query.filter(
        ServiceCenter.owner_id.in_(owner_ids),
        ~ServiceCenter.id.in_(my_ids) if my_ids else True,
    ).all()

    result = []
    for sc in candidate_centers:
        d = sc.to_dict()
        members = ServiceCenterMember.query.filter_by(
            service_center_id=sc.id, is_active=True
        ).all()
        d["members"] = [m.to_dict() for m in members]
        result.append(d)

    return jsonify(result), 200
