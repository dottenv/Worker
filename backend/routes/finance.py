import json
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.finance_operation import FinanceOperation, calc_balance
from models.user import User
from models.service_center_member import ServiceCenterMember
from models.schedule_entry import ScheduleEntry
from models.service_center import ServiceCenter
from extensions import db
from datetime import date, datetime
from socket_events import emit_to_users

finance_bp = Blueprint("finance", __name__, url_prefix="/api/finance")

FINANCE_TYPES = {
    "advance": "Аванс",
    "salary": "Зарплата",
    "deduction": "Удержание",
    "payment": "Выплата",
    "adjustment": "Корректировка",
}


def is_owner_of(user_id: int, target_user_id: int) -> bool:
    owned = (
        ServiceCenterMember.query
        .filter_by(user_id=user_id, role="owner")
        .with_entities(ServiceCenterMember.service_center_id)
        .all()
    )
    owned_ids = {r[0] for r in owned}
    if not owned_ids:
        return False
    target_memberships = (
        ServiceCenterMember.query
        .filter(ServiceCenterMember.user_id == target_user_id)
        .all()
    )
    return any(m.service_center_id in owned_ids for m in target_memberships)


def user_belongs_to_owner(current_user_id: int, target_user_id: int) -> bool:
    my_centers = (
        ServiceCenterMember.query
        .filter(
            ServiceCenterMember.user_id == current_user_id,
            ServiceCenterMember.role.in_(["owner", "admin"]),
        )
        .with_entities(ServiceCenterMember.service_center_id)
        .all()
    )
    my_center_ids = {r[0] for r in my_centers}
    if not my_center_ids:
        return False
    target = ServiceCenterMember.query.filter(
        ServiceCenterMember.user_id == target_user_id,
        ServiceCenterMember.service_center_id.in_(my_center_ids),
    ).first()
    return target is not None


def is_user_owner(user_id: int) -> bool:
    return ServiceCenterMember.query.filter_by(
        user_id=user_id, role="owner"
    ).count() > 0


def notify_finance(target_user_id, title, body):
    from notification_helper import create_notification
    create_notification(target_user_id, "finance_update", title, body, "/finance")


@finance_bp.route("", methods=["GET"])
@jwt_required()
def list_operations():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    # Получаем полный баланс на основе ВСЕ операций
    all_ops = FinanceOperation.query.filter_by(user_id=user_id).all()
    balance = calc_balance(all_ops)

    # Применяем фильтры для отображения
    q = FinanceOperation.query.filter_by(user_id=user_id)

    type_filter = request.args.get("type")
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if type_filter:
        q = q.filter(FinanceOperation.type == type_filter)
    if from_date:
        q = q.filter(FinanceOperation.operation_date >= datetime.strptime(from_date, "%Y-%m-%d").date())
    if to_date:
        q = q.filter(FinanceOperation.operation_date <= datetime.strptime(to_date, "%Y-%m-%d").date())

    ops = q.order_by(FinanceOperation.operation_date.desc(), FinanceOperation.created_at.desc()).all()

    return jsonify({
        "operations": [op.to_dict() for op in ops],
        "balance": balance,
        "types": FINANCE_TYPES,
    })


@finance_bp.route("/admin", methods=["GET"])
@jwt_required()
def admin_list():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    target_user_id = request.args.get("user_id", type=int)

    q = FinanceOperation.query

    if target_user_id:
        if not user_belongs_to_owner(user_id, target_user_id):
            return jsonify({"error": "Access denied"}), 403
        q = q.filter(FinanceOperation.user_id == target_user_id)
    else:
        my_centers = ServiceCenterMember.query.filter(
            ServiceCenterMember.user_id == user_id,
            ServiceCenterMember.role.in_(["owner", "admin"]),
        ).all()
        center_ids = [m.service_center_id for m in my_centers]
        if not center_ids:
            return jsonify({"operations": [], "balance": 0, "types": FINANCE_TYPES})
        employee_ids = (
            ServiceCenterMember.query
            .filter(ServiceCenterMember.service_center_id.in_(center_ids))
            .with_entities(ServiceCenterMember.user_id)
            .distinct()
            .all()
        )
        emp_ids = [r[0] for r in employee_ids if r[0] != user_id]
        q = q.filter(FinanceOperation.user_id.in_(emp_ids))

    type_filter = request.args.get("type")
    from_date = request.args.get("from")
    to_date = request.args.get("to")

    if type_filter:
        q = q.filter(FinanceOperation.type == type_filter)
    if from_date:
        q = q.filter(FinanceOperation.operation_date >= datetime.strptime(from_date, "%Y-%m-%d").date())
    if to_date:
        q = q.filter(FinanceOperation.operation_date <= datetime.strptime(to_date, "%Y-%m-%d").date())

    ops = q.order_by(FinanceOperation.operation_date.desc(), FinanceOperation.created_at.desc()).all()
    balance = calc_balance(ops)

    return jsonify({
        "operations": [op.to_dict() for op in ops],
        "balance": balance,
        "types": FINANCE_TYPES,
    })


@finance_bp.route("/employees", methods=["GET"])
@jwt_required()
def list_employees():
    user_id = int(get_jwt_identity())
    centers = ServiceCenterMember.query.filter(
        ServiceCenterMember.user_id == user_id,
        ServiceCenterMember.role.in_(["owner", "admin"]),
    ).all()
    center_ids = [m.service_center_id for m in centers]
    if not center_ids:
        return jsonify([])

    members = (
        ServiceCenterMember.query
        .filter(
            ServiceCenterMember.service_center_id.in_(center_ids),
            ServiceCenterMember.user_id != user_id,
        )
        .all()
    )
    user_ids = list({m.user_id for m in members})
    employees = User.query.filter(User.id.in_(user_ids)).all()
    return jsonify([{"id": u.id, "full_name": u.full_name, "email": u.email} for u in employees])


@finance_bp.route("", methods=["POST"])
@jwt_required()
def create_operation():
    user_id = int(get_jwt_identity())

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    target_user_id = data.get("user_id")
    op_type = data.get("type")
    amount = data.get("amount")
    description = data.get("description", "")
    details = data.get("details", [])
    operation_date_str = data.get("operation_date")

    if not all([target_user_id, op_type, amount is not None, operation_date_str]):
        return jsonify({"error": "Missing required fields"}), 400

    if op_type not in FINANCE_TYPES:
        return jsonify({"error": "Invalid operation type"}), 400

    if not user_belongs_to_owner(user_id, target_user_id):
        return jsonify({"error": "Access denied"}), 403

    try:
        op_date = datetime.strptime(operation_date_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "Invalid date format"}), 400

    op = FinanceOperation(
        user_id=target_user_id,
        type=op_type,
        amount=amount,
        description=description,
        details=json.dumps(details, ensure_ascii=False) if details else '',
        operation_date=op_date,
        created_by_id=user_id,
    )
    db.session.add(op)
    db.session.commit()

    current_user = User.query.get(user_id)
    target_user = User.query.get(target_user_id)
    # notify target employee
    notify_finance(target_user_id, "Финансы: новая операция",
                   f"{FINANCE_TYPES.get(op_type, op_type)} на {amount} ₽ от {current_user.full_name if current_user else ''}")
    emit_to_users([target_user_id], "finance:updated", {})
    emit_to_users([user_id], "finance:updated", {})

    return jsonify(op.to_dict()), 201


@finance_bp.route("/<int:op_id>", methods=["PUT"])
@jwt_required()
def update_operation(op_id):
    user_id = int(get_jwt_identity())

    op = FinanceOperation.query.get_or_404(op_id)
    if not user_belongs_to_owner(user_id, op.user_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if "type" in data:
        if data["type"] not in FINANCE_TYPES:
            return jsonify({"error": "Invalid operation type"}), 400
        op.type = data["type"]
    if "amount" in data:
        op.amount = data["amount"]
    if "description" in data:
        op.description = data["description"]
    if "details" in data:
        op.details = json.dumps(data["details"], ensure_ascii=False) if data["details"] else ''
    if "operation_date" in data:
        try:
            op.operation_date = datetime.strptime(data["operation_date"], "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"error": "Invalid date format"}), 400

    db.session.commit()
    emit_to_users([op.user_id], "finance:updated", {})
    emit_to_users([user_id], "finance:updated", {})

    return jsonify(op.to_dict())


@finance_bp.route("/<int:op_id>", methods=["DELETE"])
@jwt_required()
def delete_operation(op_id):
    user_id = int(get_jwt_identity())

    op = FinanceOperation.query.get_or_404(op_id)
    if not user_belongs_to_owner(user_id, op.user_id):
        return jsonify({"error": "Access denied"}), 403

    target_user_id = op.user_id
    db.session.delete(op)
    db.session.commit()

    emit_to_users([target_user_id], "finance:updated", {})
    emit_to_users([user_id], "finance:updated", {})

    return jsonify({"ok": True})


@finance_bp.route("/toggle", methods=["PUT"])
@jwt_required()
def toggle_finance():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not is_user_owner(user_id):
        return jsonify({"error": "Only owners can toggle modules"}), 403

    data = request.get_json()
    enabled = data.get("enabled", not user.finance_enabled) if data else not user.finance_enabled
    user.finance_enabled = bool(enabled)
    db.session.commit()

    # notify all employees in owner's centers
    owned_center_ids = [
        r[0] for r in ServiceCenterMember.query
        .filter_by(user_id=user_id, role="owner")
        .with_entities(ServiceCenterMember.service_center_id)
        .all()
    ]
    if owned_center_ids:
        employee_ids = [
            r[0] for r in ServiceCenterMember.query
            .filter(
                ServiceCenterMember.service_center_id.in_(owned_center_ids),
                ServiceCenterMember.user_id != user_id,
            )
            .with_entities(ServiceCenterMember.user_id)
            .distinct()
            .all()
        ]
        for eid in employee_ids:
            emit_to_users([eid], "finance:updated", {})

    return jsonify({"finance_enabled": user.finance_enabled})


@finance_bp.route("/status", methods=["GET"])
@jwt_required()
def finance_status():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    memberships = ServiceCenterMember.query.filter(
        ServiceCenterMember.user_id == user_id,
        ServiceCenterMember.role.in_(["owner", "admin"]),
    ).all()
    is_admin = len(memberships) > 0

    available = user.finance_enabled

    if not available:
        my_centers = ServiceCenterMember.query.filter(
            ServiceCenterMember.user_id == user_id
        ).with_entities(ServiceCenterMember.service_center_id).all()
        center_ids = [r[0] for r in my_centers]
        if center_ids:
            owners = (
                ServiceCenterMember.query
                .filter(
                    ServiceCenterMember.service_center_id.in_(center_ids),
                    ServiceCenterMember.role == "owner",
                )
                .with_entities(ServiceCenterMember.user_id)
                .all()
            )
            owner_ids = [r[0] for r in owners]
            if owner_ids:
                enabled_owners = User.query.filter(
                    User.id.in_(owner_ids),
                    User.finance_enabled == True,
                ).count()
                available = enabled_owners > 0

    return jsonify({
        "available": available,
        "is_admin": is_admin,
        "finance_enabled": user.finance_enabled,
        "is_owner": is_user_owner(user_id),
    })


def compute_forecast_amount(entry) -> float:
    """Projected pay for a schedule entry (same logic as compute_schedule_amount)."""
    if not entry.hourly_rate:
        return 0.0
    rate = float(entry.hourly_rate)
    if entry.type == "hourly":
        if entry.start_time and entry.end_time:
            start_dt = datetime.combine(entry.date, entry.start_time)
            end_dt = datetime.combine(entry.date, entry.end_time)
            duration = (end_dt - start_dt).total_seconds() / 3600
            if duration <= 0:
                return 0.0
            return round(rate * duration, 2)
        return 0.0
    return rate


def forecast_for_user(user_id: int):
    """Return forecast (upcoming unpaid schedule entries) for a single user."""
    from datetime import time as dtime
    today = date.today()
    entries = (
        ScheduleEntry.query
        .filter_by(user_id=user_id)
        .filter(ScheduleEntry.date >= today)
        .order_by(ScheduleEntry.date.asc())
        .all()
    )
    forecast = []
    total = 0.0
    for entry in entries:
        # skip if already paid via schedule
        already_paid = False
        ops = FinanceOperation.query.filter_by(user_id=user_id).all()
        for op in ops:
            if not op.details:
                continue
            try:
                details = json.loads(op.details)
            except (ValueError, TypeError):
                continue
            if any(isinstance(d, dict) and d.get("schedule_entry_id") == entry.id for d in details):
                already_paid = True
                break
            if any(isinstance(d, dict) and d.get("time_entry_id") and
                   d.get("date") == entry.date.isoformat() for d in details):
                already_paid = True
                break

        amount = compute_forecast_amount(entry) if not already_paid else 0.0
        total += amount
        sc = ServiceCenter.query.get(entry.service_center_id)
        forecast.append({
            "id": entry.id,
            "date": entry.date.isoformat(),
            "type": entry.type,
            "start_time": entry.start_time.strftime("%H:%M") if entry.start_time else None,
            "end_time": entry.end_time.strftime("%H:%M") if entry.end_time else None,
            "hourly_rate": float(entry.hourly_rate) if entry.hourly_rate else 0,
            "amount": amount,
            "service_center_id": entry.service_center_id,
            "service_center_name": sc.name if sc else "",
            "service_center_address": sc.address if sc else "",
        })
    return {"forecast": forecast, "total": round(total, 2)}


@finance_bp.route("/forecast", methods=["GET"])
@jwt_required()
def forecast():
    user_id = int(get_jwt_identity())
    return jsonify(forecast_for_user(user_id))


@finance_bp.route("/forecast/admin", methods=["GET"])
@jwt_required()
def forecast_admin():
    user_id = int(get_jwt_identity())
    target_user_id = request.args.get("user_id", type=int)

    if target_user_id:
        if not user_belongs_to_owner(user_id, target_user_id):
            return jsonify({"error": "Access denied"}), 403
        return jsonify(forecast_for_user(target_user_id))

    # aggregate forecast for all employees in admin's centers
    my_centers = ServiceCenterMember.query.filter(
        ServiceCenterMember.user_id == user_id,
        ServiceCenterMember.role.in_(["owner", "admin"]),
    ).all()
    center_ids = [m.service_center_id for m in my_centers]
    if not center_ids:
        return jsonify({"forecast": [], "total": 0.0})

    employee_ids = (
        ServiceCenterMember.query
        .filter(ServiceCenterMember.service_center_id.in_(center_ids))
        .with_entities(ServiceCenterMember.user_id)
        .distinct()
        .all()
    )
    emp_ids = [r[0] for r in employee_ids if r[0] != user_id]

    all_forecast = []
    grand_total = 0.0
    for eid in emp_ids:
        result = forecast_for_user(eid)
        all_forecast.extend(result["forecast"])
        grand_total += result["total"]
    return jsonify({"forecast": all_forecast, "total": round(grand_total, 2)})
