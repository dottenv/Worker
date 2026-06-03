from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import CustomField, CustomFieldValue, TimeEntry, ServiceCenterMember
from extensions import db
from helpers import get_current_user, is_manager

custom_fields_bp = Blueprint(
    "custom_fields", __name__, url_prefix="/api/service-centers/<int:sc_id>/custom-fields"
)


@custom_fields_bp.route("", methods=["GET"])
@jwt_required()
def list_fields(sc_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        member = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, user_id=user.id, is_active=True
        ).first()
        if not member:
            return jsonify({"error": "Access denied"}), 403

    fields = CustomField.query.filter_by(service_center_id=sc_id).order_by(
        CustomField.sort_order
    ).all()
    return jsonify([f.to_dict() for f in fields]), 200


@custom_fields_bp.route("", methods=["POST"])
@jwt_required()
def create_field(sc_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "name is required"}), 400

    field_type = data.get("field_type", "text")
    if field_type not in ("text", "number", "money"):
        return jsonify({"error": "field_type must be text, number or money"}), 400

    max_order = db.session.query(db.func.max(CustomField.sort_order)).filter_by(
        service_center_id=sc_id
    ).scalar() or 0

    field = CustomField(
        service_center_id=sc_id,
        name=data["name"],
        field_type=field_type,
        required=data.get("required", False),
        carry_over=data.get("carry_over", False),
        sort_order=max_order + 1,
    )
    db.session.add(field)
    db.session.commit()
    return jsonify(field.to_dict()), 201


@custom_fields_bp.route("/<int:field_id>", methods=["PUT"])
@jwt_required()
def update_field(sc_id, field_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    field = CustomField.query.get_or_404(field_id)
    if field.service_center_id != sc_id:
        return jsonify({"error": "Field not found"}), 404

    data = request.get_json()
    if "name" in data:
        field.name = data["name"]
    if "field_type" in data:
        if data["field_type"] not in ("text", "number", "money"):
            return jsonify({"error": "Invalid field_type"}), 400
        field.field_type = data["field_type"]
    if "required" in data:
        field.required = data["required"]
    if "carry_over" in data:
        field.carry_over = data["carry_over"]
    if "sort_order" in data:
        field.sort_order = data["sort_order"]

    db.session.commit()
    return jsonify(field.to_dict()), 200


@custom_fields_bp.route("/<int:field_id>", methods=["DELETE"])
@jwt_required()
def delete_field(sc_id, field_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    field = CustomField.query.get_or_404(field_id)
    if field.service_center_id != sc_id:
        return jsonify({"error": "Field not found"}), 404

    CustomFieldValue.query.filter_by(custom_field_id=field.id).delete()
    db.session.delete(field)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200


# ---------- Values for a time entry ----------

@custom_fields_bp.route("/values/<int:entry_id>", methods=["GET"])
@jwt_required()
def get_values(sc_id, entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)
    if entry.service_center_id != sc_id:
        return jsonify({"error": "Entry not found"}), 404
    if entry.user_id != user.id and not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    values = CustomFieldValue.query.filter_by(time_entry_id=entry_id).all()
    return jsonify([v.to_dict() for v in values]), 200


@custom_fields_bp.route("/values/<int:entry_id>", methods=["PUT"])
@jwt_required()
def update_values(sc_id, entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)
    if entry.service_center_id != sc_id:
        return jsonify({"error": "Entry not found"}), 404
    if entry.user_id != user.id and not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if not data or "values" not in data:
        return jsonify({"error": "values is required"}), 400

    for item in data["values"]:
        field_id = item.get("custom_field_id")
        value = item.get("value", "")
        existing = CustomFieldValue.query.filter_by(
            time_entry_id=entry_id, custom_field_id=field_id
        ).first()
        if existing:
            existing.value = str(value)
        else:
            cv = CustomFieldValue(
                time_entry_id=entry_id,
                custom_field_id=field_id,
                value=str(value),
            )
            db.session.add(cv)
    db.session.commit()

    values = CustomFieldValue.query.filter_by(time_entry_id=entry_id).all()
    return jsonify([v.to_dict() for v in values]), 200


# ---------- Carry-over: get last shift values ----------

@custom_fields_bp.route("/carry-over", methods=["GET"])
@jwt_required()
def get_carry_over(sc_id):
    user = get_current_user()
    member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user.id, is_active=True
    ).first()
    if not member:
        return jsonify({"error": "Access denied"}), 403

    fields = CustomField.query.filter_by(
        service_center_id=sc_id, carry_over=True
    ).all()
    if not fields:
        return jsonify({}), 200

    exclude_entry_id = request.args.get("exclude_entry_id", type=int)

    query = TimeEntry.query.filter_by(
        user_id=user.id, service_center_id=sc_id
    ).filter(TimeEntry.clock_out.isnot(None))

    if exclude_entry_id:
        query = query.filter(TimeEntry.id != exclude_entry_id)

    last_entry = query.order_by(TimeEntry.clock_out.desc()).first()

    if not last_entry:
        return jsonify({}), 200

    values = CustomFieldValue.query.filter_by(
        time_entry_id=last_entry.id
    ).filter(
        CustomFieldValue.custom_field_id.in_([f.id for f in fields])
    ).all()

    result = {}
    for v in values:
        result[v.custom_field_id] = v.value
    return jsonify(result), 200
