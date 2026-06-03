import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import TimeEntry, ServiceCenter, ServiceCenterMember, ScheduleEntry, Shift, User, ShiftDocument, CustomFieldValue
from models.finance_operation import FinanceOperation
from extensions import db
from datetime import datetime, date, time, timezone
from socket_events import emit_to_users, emit_swap_event, emit_finance_event
import json
from helpers import get_current_user, is_manager, get_center_owner, is_finance_enabled_for_center

time_entries_bp = Blueprint("time_entries", __name__, url_prefix="/api/time-entries")


def is_center_member(sc_id, user_id):
    return ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user_id, is_active=True
    ).first() is not None


def time_entry_payment_exists(entry_id: int, user_id: int) -> bool:
    ops = FinanceOperation.query.filter_by(user_id=user_id).all()
    for op in ops:
        if not op.details:
            continue
        try:
            details = json.loads(op.details)
        except (ValueError, TypeError):
            continue
        if any(
            isinstance(item, dict) and item.get("time_entry_id") == entry_id
            for item in details
        ):
            return True
    return False


def process_time_entry_payment(entry: TimeEntry):
    """Create a salary FinanceOperation based on actual clock-in/out hours."""
    if not entry.clock_in or not entry.clock_out:
        return
    if not is_finance_enabled_for_center(entry.service_center_id):
        return
    if time_entry_payment_exists(entry.id, entry.user_id):
        return

    # calculate actual hours worked
    duration = (entry.clock_out - entry.clock_in).total_seconds() / 3600
    duration -= (entry.break_minutes or 0) / 60
    if duration <= 0:
        return

    # get hourly rate from associated schedule entry, or fallback to member rate
    schedule_entry = ScheduleEntry.query.filter_by(
        user_id=entry.user_id,
        service_center_id=entry.service_center_id,
        date=entry.date,
    ).first()
    rate = 0
    if schedule_entry and schedule_entry.hourly_rate:
        rate = float(schedule_entry.hourly_rate)
    else:
        member = ServiceCenterMember.query.filter_by(
            service_center_id=entry.service_center_id,
            user_id=entry.user_id,
            is_active=True,
        ).first()
        rate = float(member.hourly_rate) if member and member.hourly_rate else 0

    amount = round(rate * duration, 2)
    if amount <= 0:
        return

    owner = get_center_owner(entry.service_center_id)
    if not owner:
        return

    details = [{
        "time_entry_id": entry.id,
        "schedule_entry_id": schedule_entry.id if schedule_entry else None,
        "rate": rate,
        "duration_hours": round(duration, 2),
        "date": entry.date.isoformat(),
    }]
    try:
        from notification_helper import create_notification
        sc = ServiceCenter.query.get(entry.service_center_id)
        create_notification(
            entry.user_id, "finance_update",
            "Оплата смены",
            f"Вам начислено {amount}₽ за смену в «{sc.name}»",
            "/finance",
        )
    except Exception as e:
        current_app.logger.error("Failed to create notification for time entry payment %s: %s", entry.id, e)

    op = FinanceOperation(
        user_id=entry.user_id,
        type="salary",
        amount=amount,
        description=f"Оплата смены по часам ({round(duration, 2)}ч × {rate}₽)",
        details=json.dumps(details, ensure_ascii=False),
        operation_date=entry.date,
        created_by_id=owner.id,
    )
    db.session.add(op)
    db.session.commit()
    try:
        emit_finance_event(entry.user_id, "finance:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit finance:updated for time entry %s: %s", entry.id, e)


@time_entries_bp.route("/with-documents", methods=["GET"])
@jwt_required()
def entries_with_documents():
    user = get_current_user()

    owned_ids = [c.id for c in ServiceCenter.query.filter_by(owner_id=user.id).all()]
    member = ServiceCenterMember.query.filter_by(
        user_id=user.id, is_active=True
    ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
    managed_ids = set(owned_ids + [m.service_center_id for m in member])

    if managed_ids:
        entries = TimeEntry.query.filter(
            TimeEntry.service_center_id.in_(managed_ids),
            TimeEntry.clock_out.isnot(None),
        ).order_by(TimeEntry.date.desc(), TimeEntry.clock_out.desc()).limit(200).all()
    else:
        entries = TimeEntry.query.filter_by(user_id=user.id).filter(
            TimeEntry.clock_out.isnot(None),
        ).order_by(TimeEntry.date.desc(), TimeEntry.clock_out.desc()).limit(200).all()

    entry_ids = [e.id for e in entries]
    docs = ShiftDocument.query.filter(ShiftDocument.time_entry_id.in_(entry_ids)).all() if entry_ids else []
    docs_by_entry = {}
    for d in docs:
        docs_by_entry.setdefault(d.time_entry_id, []).append(d.to_dict())

    custom_vals = CustomFieldValue.query.filter(CustomFieldValue.time_entry_id.in_(entry_ids)).all() if entry_ids else []
    cv_by_entry = {}
    for cv in custom_vals:
        cv_by_entry.setdefault(cv.time_entry_id, []).append(cv.to_dict())

    sc_map = {}
    for e in entries:
        sc_id = e.service_center_id
        if sc_id not in sc_map:
            sc = ServiceCenter.query.get(sc_id)
            sc_map[sc_id] = {
                "service_center_id": sc_id,
                "service_center_name": sc.name if sc else "Unknown",
                "service_center_address": sc.address if sc else "",
                "entries": [],
            }
        entry_data = e.to_dict()
        entry_data["documents"] = docs_by_entry.get(e.id, [])
        entry_data["custom_values"] = cv_by_entry.get(e.id, [])
        sc_map[sc_id]["entries"].append(entry_data)

    return jsonify(list(sc_map.values())), 200


# ---------- Employee: clock in ----------

def create_pending_entry(user, sc_id, today, data):
    """Create a pending TimeEntry and notify admins (used for no-schedule and re-open requests)."""
    now = datetime.now(timezone.utc)
    entry = TimeEntry(
        user_id=user.id,
        service_center_id=sc_id,
        date=today,
        clock_in=now,
        status="pending",
        notes=data.get("notes", ""),
    )
    db.session.add(entry)
    db.session.commit()

    # notify center admins
    try:
        from notification_helper import create_notification
        sc = ServiceCenter.query.get(sc_id)
        reason = " c комментарием: " + data["notes"] if data.get("notes") else ""
        members = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        for m in members:
            if m.user_id != user.id:
                create_notification(
                    m.user_id, "time_entry_request",
                    "Запрос на добавление смены",
                    f"{user.full_name} хочет добавить смену в «{sc.name}»{reason}",
                    "/time-requests",
                )
    except Exception as e:
        current_app.logger.error("Failed to create pending entry notifications: %s", e)

    # socket event for pending request
    try:
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins if m.user_id != user.id]
        if admin_ids:
            entry_data = entry.to_dict()
            entry_data["user_name"] = user.full_name
            sc = ServiceCenter.query.get(sc_id)
            entry_data["service_center_name"] = sc.name if sc else ""
            entry_data["service_center_address"] = sc.address if sc else ""
            emit_to_users(admin_ids, "time_entry:pending_clock_in", entry_data)
    except Exception as e:
        current_app.logger.error("Failed to emit pending_clock_in socket event: %s", e)

    return jsonify(entry.to_dict()), 201

@time_entries_bp.route("/clock-in", methods=["POST"])
@jwt_required()
def clock_in():
    user = get_current_user()
    data = request.get_json()
    if not data or not data.get("service_center_id"):
        return jsonify({"error": "service_center_id is required"}), 400

    sc_id = data["service_center_id"]
    if not is_center_member(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    today = date.today()

    # check for existing active entry (no clock_out)
    active = TimeEntry.query.filter_by(
        user_id=user.id, service_center_id=sc_id, clock_out=None
    ).first()
    if active:
        return jsonify({"error": "У вас уже есть активная смена", "entry": active.to_dict()}), 400

    # if already clocked out today → create pending re-open request with user's comment
    existing_today = TimeEntry.query.filter(
        TimeEntry.user_id == user.id,
        TimeEntry.service_center_id == sc_id,
        TimeEntry.date == today,
        TimeEntry.status.in_(["approved", "pending"]),
    ).first()
    if existing_today:
        return create_pending_entry(user, sc_id, today, data)

    # check schedule slot
    slot = ScheduleEntry.query.filter_by(
        user_id=user.id, service_center_id=sc_id, date=today
    ).first()

    now = datetime.now(timezone.utc)

    if slot:
        # has scheduled shift → auto-approve
        entry = TimeEntry(
            user_id=user.id,
            service_center_id=sc_id,
            date=today,
            clock_in=now,
            shift_id=slot.shift_id,
            status="approved",
            reviewed_by_id=user.id,
            reviewed_at=now,
            notes=data.get("notes", ""),
        )
        db.session.add(entry)
        db.session.commit()

        # notify admins via socket
        try:
            admins = ServiceCenterMember.query.filter_by(
                service_center_id=sc_id, is_active=True
            ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
            admin_ids = [m.user_id for m in admins if m.user_id != user.id]
            if admin_ids:
                entry_data = entry.to_dict()
                entry_data["user_name"] = user.full_name
                entry_data["service_center_name"] = ServiceCenter.query.get(sc_id).name
                entry_data["service_center_address"] = ServiceCenter.query.get(sc_id).address
                emit_to_users(admin_ids, "time_entry:clock_in", entry_data)
        except Exception as e:
            current_app.logger.error("Failed to emit clock_in socket event: %s", e)

        return jsonify(entry.to_dict()), 201

    # no scheduled shift → create pending request
    return create_pending_entry(user, sc_id, today, data)


# ---------- Employee: clock out ----------

@time_entries_bp.route("/clock-out", methods=["POST"])
@jwt_required()
def clock_out():
    user = get_current_user()
    data = request.get_json()

    sc_id = data.get("service_center_id") if data else None
    query = TimeEntry.query.filter_by(user_id=user.id, clock_out=None)
    if sc_id:
        query = query.filter_by(service_center_id=sc_id)

    active = query.first()
    if not active:
        return jsonify({"error": "Нет активной смены"}), 400

    active.clock_out = datetime.now(timezone.utc)
    if data:
        active.break_minutes = data.get("break_minutes", active.break_minutes or 0)
        active.notes = data.get("notes", active.notes or "")
    if active.status == "pending":
        return jsonify({"error": "Смена ещё не подтверждена администратором"}), 400
    if active.status == "rejected":
        return jsonify({"error": "Смена отклонена администратором"}), 400
    db.session.commit()

    # auto-create salary payment from actual hours worked
    try:
        process_time_entry_payment(active)
    except Exception as e:
        current_app.logger.error("Failed to process time entry payment on clock-out: %s", e)

    # notify admins via socket
    try:
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=active.service_center_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins if m.user_id != user.id]
        if admin_ids:
            user_obj = User.query.get(active.user_id)
            entry_data = active.to_dict()
            entry_data["user_name"] = user_obj.full_name if user_obj else ""
            sc_obj = ServiceCenter.query.get(active.service_center_id)
            entry_data["service_center_name"] = sc_obj.name if sc_obj else ""
            entry_data["service_center_address"] = sc_obj.address if sc_obj else ""
            emit_to_users(admin_ids, "time_entry:clock_out", entry_data)
    except Exception as e:
        current_app.logger.error("Failed to emit clock_out socket event: %s", e)

    return jsonify(active.to_dict()), 200


# ---------- Admin: view pending requests ----------

@time_entries_bp.route("/pending", methods=["GET"])
@jwt_required()
def pending_requests():
    user = get_current_user()
    sc_id = request.args.get("service_center_id", type=int)

    # get centers where user is manager
    owned = ServiceCenter.query.filter_by(owner_id=user.id).all()
    managed_ids = {c.id for c in owned}
    memberships = ServiceCenterMember.query.filter_by(
        user_id=user.id, is_active=True
    ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
    managed_ids.update(m.service_center_id for m in memberships)

    if sc_id:
        if sc_id not in managed_ids:
            return jsonify({"error": "Access denied"}), 403
        managed_ids = {sc_id}

    entries = (
        TimeEntry.query.filter(
            TimeEntry.service_center_id.in_(managed_ids),
            TimeEntry.status == "pending",
        )
        .order_by(TimeEntry.created_at.desc())
        .all()
    )
    return jsonify([e.to_dict() for e in entries]), 200


# ---------- Admin: approve ----------

@time_entries_bp.route("/<int:entry_id>/approve", methods=["PUT"])
@jwt_required()
def approve_entry(entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)

    if not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    entry.status = "approved"
    entry.reviewed_by_id = user.id
    entry.reviewed_at = datetime.now(timezone.utc)

    data = request.get_json() or {}

    # if no schedule entry exists for this user+center+date, create one
    existing_slot = ScheduleEntry.query.filter_by(
        user_id=entry.user_id,
        service_center_id=entry.service_center_id,
        date=entry.date,
    ).first()

    if not existing_slot:
        entry_type = data.get("type", "full_day")
        start_t = None
        end_t = None
        if data.get("start_time"):
            try:
                start_t = time.fromisoformat(data["start_time"])
            except (ValueError, TypeError):
                pass
        if data.get("end_time"):
            try:
                end_t = time.fromisoformat(data["end_time"])
            except (ValueError, TypeError):
                pass

        shift_id = data.get("shift_id")
        if shift_id:
            shift = Shift.query.filter_by(id=shift_id).first()
            if not shift:
                return jsonify({"error": "Shift not found"}), 400

        member = ServiceCenterMember.query.filter_by(
            service_center_id=entry.service_center_id,
            user_id=entry.user_id,
            is_active=True,
        ).first()
        rate = data.get("hourly_rate", member.hourly_rate if member else 0)

        slot = ScheduleEntry(
            user_id=entry.user_id,
            service_center_id=entry.service_center_id,
            date=entry.date,
            type=entry_type,
            start_time=start_t,
            end_time=end_t,
            hourly_rate=rate,
            shift_id=shift_id,
            notes="Создано из запроса на смену",
            created_by_id=user.id,
        )
        db.session.add(slot)

    db.session.commit()

    # auto-create salary payment from actual hours worked
    try:
        process_time_entry_payment(entry)
    except Exception as e:
        current_app.logger.error("Failed to process time entry payment on approve %s: %s", entry.id, e)

    # socket event for approved entry
    try:
        user_obj = User.query.get(entry.user_id)
        entry_data = entry.to_dict()
        entry_data["user_name"] = user_obj.full_name if user_obj else ""
        sc_obj = ServiceCenter.query.get(entry.service_center_id)
        entry_data["service_center_name"] = sc_obj.name if sc_obj else ""
        entry_data["service_center_address"] = sc_obj.address if sc_obj else ""
        emit_to_users([entry.user_id], "time_entry:approved", entry_data)
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=entry.service_center_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins if m.user_id != entry.user_id and m.user_id != entry.reviewed_by_id]
        if admin_ids:
            emit_to_users(admin_ids, "time_entry:approved", entry_data)
    except Exception as e:
        current_app.logger.error("Failed to emit time_entry:approved for entry %s: %s", entry.id, e)

    try:
        from notification_helper import create_notification
        sc = ServiceCenter.query.get(entry.service_center_id)
        create_notification(
            entry.user_id, "time_entry_approved",
            "Смена подтверждена",
            f"Ваша смена в «{sc.name}» подтверждена",
            "/",
        )
    except Exception as e:
        current_app.logger.error("Failed to create approve notification for entry %s: %s", entry.id, e)

    return jsonify(entry.to_dict()), 200


# ---------- Admin: reject ----------

@time_entries_bp.route("/<int:entry_id>/reject", methods=["PUT"])
@jwt_required()
def reject_entry(entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)

    if not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    entry.status = "rejected"
    entry.clock_out = datetime.now(timezone.utc)
    entry.reviewed_by_id = user.id
    entry.reviewed_at = datetime.now(timezone.utc)
    db.session.commit()

    # socket event for rejected entry
    try:
        user_obj = User.query.get(entry.user_id)
        entry_data = entry.to_dict()
        entry_data["user_name"] = user_obj.full_name if user_obj else ""
        emit_to_users([entry.user_id], "time_entry:rejected", entry_data)
    except Exception as e:
        current_app.logger.error("Failed to emit time_entry:rejected for entry %s: %s", entry.id, e)

    try:
        from notification_helper import create_notification
        sc = ServiceCenter.query.get(entry.service_center_id)
        create_notification(
            entry.user_id, "time_entry_rejected",
            "Смена отклонена",
            f"Ваша смена в «{sc.name}» отклонена",
            "/",
        )
    except Exception as e:
        current_app.logger.error("Failed to create reject notification for entry %s: %s", entry.id, e)

    return jsonify(entry.to_dict()), 200


# ---------- Employee: my entries ----------

@time_entries_bp.route("/my", methods=["GET"])
@jwt_required()
def my_entries():
    user = get_current_user()
    entries = (
        TimeEntry.query.filter_by(user_id=user.id)
        .order_by(TimeEntry.created_at.desc())
        .limit(100)
        .all()
    )
    return jsonify([e.to_dict() for e in entries]), 200


# ---------- Employee: active entry (for dashboard) ----------

@time_entries_bp.route("/active", methods=["GET"])
@jwt_required()
def active_entry():
    user = get_current_user()
    entry = TimeEntry.query.filter_by(user_id=user.id, clock_out=None).filter(
        TimeEntry.status.in_(["approved", "pending"])
    ).first()
    if not entry:
        return jsonify(None), 200
    return jsonify(entry.to_dict()), 200


# ---------- Admin: all entries for a center ----------

@time_entries_bp.route("/center/<int:sc_id>", methods=["GET"])
@jwt_required()
def center_entries(sc_id):
    user = get_current_user()
    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    date_from = request.args.get("from")
    date_to = request.args.get("to")

    query = TimeEntry.query.filter_by(service_center_id=sc_id)
    if date_from:
        query = query.filter(TimeEntry.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(TimeEntry.date <= date.fromisoformat(date_to))

    entries = query.order_by(TimeEntry.created_at.desc()).all()
    return jsonify([e.to_dict() for e in entries]), 200


# ---------- Admin: update/delete (manual override) ----------

@time_entries_bp.route("/<int:entry_id>", methods=["PUT"])
@jwt_required()
def update_entry(entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)

    if not is_manager(entry.service_center_id, user.id) and entry.user_id != user.id:
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if "clock_in" in data and data["clock_in"]:
        try:
            entry.clock_in = datetime.fromisoformat(data["clock_in"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid clock_in"}), 400
    if "clock_out" in data:
        entry.clock_out = datetime.fromisoformat(data["clock_out"]) if data["clock_out"] else None
    if "break_minutes" in data:
        entry.break_minutes = data["break_minutes"]
    if "notes" in data:
        entry.notes = data.get("notes")
    if "status" in data and is_manager(entry.service_center_id, user.id):
        entry.status = data["status"]

    db.session.commit()
    return jsonify(entry.to_dict()), 200


@time_entries_bp.route("/<int:entry_id>", methods=["DELETE"])
@jwt_required()
def delete_entry(entry_id):
    user = get_current_user()
    entry = TimeEntry.query.get_or_404(entry_id)

    if not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    docs = ShiftDocument.query.filter_by(time_entry_id=entry_id).all()
    for d in docs:
        file_path = os.path.join(current_app.config["UPLOAD_FOLDER"], "shift_docs", d.filename)
        if os.path.exists(file_path):
            os.remove(file_path)
        db.session.delete(d)

    CustomFieldValue.query.filter_by(time_entry_id=entry_id).delete()

    db.session.delete(entry)
    db.session.commit()
    return jsonify({"message": "Deleted"}), 200
