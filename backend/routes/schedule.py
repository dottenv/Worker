from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import ScheduleEntry, ServiceCenter, ServiceCenterMember, User, SwapRequest, Shift, TimeEntry
from models.finance_operation import FinanceOperation
from extensions import db
from datetime import date, time, datetime, timedelta
import json
from socket_events import emit_finance_event, emit_to_users
from helpers import get_current_user, is_manager, get_center_owner, is_finance_enabled_for_center, schedule_payment_exists, compute_schedule_amount

schedule_bp = Blueprint("schedule", __name__, url_prefix="/api/schedule")


def process_schedule_payment(entry: ScheduleEntry):
    if not is_finance_enabled_for_center(entry.service_center_id):
        return
    if schedule_payment_exists(entry.id, entry.user_id):
        return
    # skip if time-entry payment already exists for this shift
    existing_time_entry = TimeEntry.query.filter_by(
        user_id=entry.user_id,
        service_center_id=entry.service_center_id,
        date=entry.date,
        status="approved",
    ).filter(TimeEntry.clock_in.isnot(None), TimeEntry.clock_out.isnot(None)).first()
    if existing_time_entry:
        return
    # only pay for PAST dates — today/future shifts require clock-in/out
    now = datetime.now()
    if now.date() <= entry.date:
        return

    amount = compute_schedule_amount(entry)
    if amount <= 0:
        return

    owner = get_center_owner(entry.service_center_id)
    if not owner:
        return

    details = [
        {
            "schedule_entry_id": entry.id,
            "schedule_type": entry.type,
            "rate": float(entry.hourly_rate),
            "date": entry.date.isoformat(),
        }
    ]
    try:
        from notification_helper import create_notification
        create_notification(
            entry.user_id,
            "finance_update",
            "Начисление оплаты",
            f"Вам начислена оплата за смену {entry.date.isoformat()}",
            "/finance",
        )
    except Exception as e:
        current_app.logger.error("Failed to notify payment for entry %s: %s", entry.id, e)

    op = FinanceOperation(
        user_id=entry.user_id,
        type="salary",
        amount=amount,
        description=f"Оплата смены {'за весь день' if entry.type == 'full_day' else 'по часам'}",
        details=json.dumps(details, ensure_ascii=False),
        operation_date=entry.date,
        created_by_id=owner.id,
    )
    db.session.add(op)
    db.session.commit()
    emit_finance_event(entry.user_id, "finance:updated", {})


# ---- Admin: full view across all owned centers ----

@schedule_bp.route("/admin", methods=["GET"])
@jwt_required()
def admin_schedule():
    user = get_current_user()
    owned = ServiceCenter.query.filter_by(owner_id=user.id).all()
    owned_ids = set(c.id for c in owned)

    member_of = ServiceCenterMember.query.filter_by(
        user_id=user.id, is_active=True
    ).all()
    member_ids = set(m.service_center_id for m in member_of)

    # union: owned centers + centers where user is an active member
    center_ids = list(owned_ids | member_ids)

    # filter by specific center
    sc_filter = request.args.get("service_center_id", type=int)
    if sc_filter:
        if sc_filter in center_ids:
            center_ids = [sc_filter]
        else:
            return jsonify([]), 200

    # date filter
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    query = ScheduleEntry.query.filter(
        ScheduleEntry.service_center_id.in_(center_ids)
    )
    if date_from:
        query = query.filter(ScheduleEntry.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(ScheduleEntry.date <= date.fromisoformat(date_to))

    entries = query.order_by(
        ScheduleEntry.date.desc(), ScheduleEntry.service_center_id
    ).all()

    skip_payment = request.args.get("skip_payment", "0") == "1"
    if not skip_payment:
        for entry in entries:
            process_schedule_payment(entry)

    # group by employee x center
    employees = {}
    for sc_id in center_ids:
        members = (
            ServiceCenterMember.query.filter_by(
                service_center_id=sc_id, is_active=True
            )
            .order_by(ServiceCenterMember.role.desc())
            .all()
        )
        for m in members:
            key = (m.user_id, sc_id)
            if key not in employees:
                employees[key] = {
                    "user_id": m.user_id,
                    "user_name": m.user.full_name,
                    "user_color": m.user.color or '',
                    "service_center_id": sc_id,
                    "service_center_name": ServiceCenter.query.get(sc_id).name,
                    "role": m.role,
                    "hourly_rate": float(m.hourly_rate) if m.hourly_rate else 0,
                    "entries": [],
                }
    for e in entries:
        key = (e.user_id, e.service_center_id)
        if key in employees:
            employees[key]["entries"].append(e.to_dict())

    return jsonify(list(employees.values())), 200


# ---- Admin: create entry ----

@schedule_bp.route("", methods=["POST"])
@jwt_required()
def create_entry():
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    sc_id = data.get("service_center_id")
    target_user_id = data.get("user_id")
    entry_date = data.get("date")
    entry_type = data.get("type", "full_day")

    if not all([sc_id, target_user_id, entry_date]):
        return jsonify({"error": "service_center_id, user_id and date are required"}), 400

    if entry_type not in ("full_day", "hourly"):
        return jsonify({"error": "Type must be 'full_day' or 'hourly'"}), 400

    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=target_user_id, is_active=True
    ).first()
    if not member:
        return jsonify({"error": "User is not an active member of this center"}), 400

    try:
        parsed_date = date.fromisoformat(entry_date)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format"}), 400

    start = None
    end = None
    if data.get("start_time"):
        try:
            start = time.fromisoformat(data["start_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid start_time"}), 400
    if data.get("end_time"):
        try:
            end = time.fromisoformat(data["end_time"])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid end_time"}), 400

    rate_value = 0
    if is_finance_enabled_for_center(sc_id):
        rate_value = data.get("hourly_rate", member.hourly_rate or 0)

    shift_id = data.get("shift_id")
    if shift_id:
        shift = Shift.query.filter_by(id=shift_id, service_center_id=sc_id).first()
        if not shift:
            return jsonify({"error": "Shift not found in this center"}), 400

    existing = ScheduleEntry.query.filter_by(
        user_id=target_user_id,
        service_center_id=sc_id,
        date=parsed_date,
    ).first()

    if existing:
        existing.type = entry_type
        existing.start_time = start
        existing.end_time = end
        existing.hourly_rate = rate_value
        existing.shift_id = shift_id
        existing.notes = data.get("notes", "")
        db.session.commit()
        entry = existing
    else:
        entry = ScheduleEntry(
            user_id=target_user_id,
            service_center_id=sc_id,
            date=parsed_date,
            type=entry_type,
            start_time=start,
            end_time=end,
            hourly_rate=rate_value,
            shift_id=shift_id,
            notes=data.get("notes", ""),
            created_by_id=user.id,
        )
        db.session.add(entry)
        db.session.commit()

    # notify affected user via socket
    try:
        emit_to_users([int(target_user_id)], "schedule:updated", {})
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins if m.user_id != int(target_user_id)]
        if admin_ids:
            emit_to_users(admin_ids, "schedule:updated", {})
    except Exception:
        pass

    if int(target_user_id) != user.id:
        from notification_helper import create_notification
        sc_name = ServiceCenter.query.get(sc_id).name
        create_notification(int(target_user_id), "schedule_update", "Изменение графика",
                            f"Вам назначена смена на {parsed_date.isoformat()} в «{sc_name}»",
                            "/schedule")

    return jsonify(entry.to_dict()), 201


# ---- Admin: copy schedule entries (week-to-week) ----

@schedule_bp.route("/copy", methods=["POST"])
@jwt_required()
def copy_schedule():
    user = get_current_user()
    data = request.get_json() or {}
    source_from = data.get("source_from")
    source_to = data.get("source_to")
    target_from = data.get("target_from")
    target_to = data.get("target_to")
    sc_id = data.get("service_center_id", type=int)

    if not all([source_from, source_to, target_from, target_to, sc_id]):
        return jsonify({"error": "source_from, source_to, target_from, target_to and service_center_id are required"}), 400

    try:
        src_start = date.fromisoformat(source_from)
        src_end = date.fromisoformat(source_to)
        tgt_start = date.fromisoformat(target_from)
        tgt_end = date.fromisoformat(target_to)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format"}), 400

    if not is_manager(sc_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    src_dates = [(src_start + timedelta(days=i)) for i in range((src_end - src_start).days + 1)]
    tgt_dates = [(tgt_start + timedelta(days=i)) for i in range((tgt_end - tgt_start).days + 1)]

    source_entries = ScheduleEntry.query.filter(
        ScheduleEntry.service_center_id == sc_id,
        ScheduleEntry.date.in_(src_dates),
    ).all()

    if not source_entries:
        return jsonify({"error": "Нет смен в выбранном исходном периоде"}), 400

    created = 0
    updated = 0

    for src_entry in source_entries:
        offset = (src_entry.date - src_start).days
        if offset >= len(tgt_dates):
            continue
        target_date = tgt_dates[offset]

        existing = ScheduleEntry.query.filter_by(
            user_id=src_entry.user_id,
            service_center_id=sc_id,
            date=target_date,
        ).first()

        if existing:
            existing.type = src_entry.type
            existing.start_time = src_entry.start_time
            existing.end_time = src_entry.end_time
            existing.hourly_rate = src_entry.hourly_rate
            existing.shift_id = src_entry.shift_id
            existing.notes = src_entry.notes
            updated += 1
        else:
            entry = ScheduleEntry(
                user_id=src_entry.user_id,
                service_center_id=sc_id,
                date=target_date,
                type=src_entry.type,
                start_time=src_entry.start_time,
                end_time=src_entry.end_time,
                hourly_rate=src_entry.hourly_rate,
                shift_id=src_entry.shift_id,
                notes=src_entry.notes,
                created_by_id=user.id,
            )
            db.session.add(entry)
            created += 1

    db.session.commit()

    # notify affected users
    try:
        affected_user_ids = set(e.user_id for e in source_entries)
        for uid in affected_user_ids:
            emit_to_users([uid], "schedule:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit schedule:updated after copy: %s", e)

    return jsonify({"created": created, "updated": updated}), 200


# ---- Employee: my schedule ----

@schedule_bp.route("/my", methods=["GET"])
@jwt_required()
def my_schedule():
    user = get_current_user()
    sc_id = request.args.get("service_center_id", type=int)

    query = ScheduleEntry.query.filter_by(user_id=user.id)
    if sc_id:
        query = query.filter_by(service_center_id=sc_id)

    date_from = request.args.get("from")
    date_to = request.args.get("to")
    if date_from:
        query = query.filter(ScheduleEntry.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(ScheduleEntry.date <= date.fromisoformat(date_to))

    entries = query.order_by(ScheduleEntry.date.desc()).all()
    for entry in entries:
        process_schedule_payment(entry)  # FIXME: migrate to background processing
    return jsonify([e.to_dict() for e in entries]), 200


# ---- Employee: group by center for table view ----

@schedule_bp.route("/my/grouped", methods=["GET"])
@jwt_required()
def my_schedule_grouped():
    user = get_current_user()
    sc_id = request.args.get("service_center_id", type=int)
    if not sc_id:
        return jsonify({"error": "service_center_id is required"}), 400

    member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=user.id, is_active=True
    ).first()
    if not member:
        return jsonify({"error": "Access denied"}), 403

    date_from = request.args.get("from")
    date_to = request.args.get("to")

    query = ScheduleEntry.query.filter_by(service_center_id=sc_id)
    if date_from:
        query = query.filter(ScheduleEntry.date >= date.fromisoformat(date_from))
    if date_to:
        query = query.filter(ScheduleEntry.date <= date.fromisoformat(date_to))

    entries = query.order_by(ScheduleEntry.date).all()
    for entry in entries:
        process_schedule_payment(entry)  # FIXME: migrate to background processing

    # group by date
    by_date = {}
    for e in entries:
        ds = e.date.isoformat()
        if ds not in by_date:
            by_date[ds] = []
        by_date[ds].append(e.to_dict())

    return jsonify(by_date), 200


# ---- Admin: update/delete ----

@schedule_bp.route("/<int:entry_id>", methods=["PUT"])
@jwt_required()
def update_entry(entry_id):
    user = get_current_user()
    entry = ScheduleEntry.query.get_or_404(entry_id)

    if not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if "type" in data:
        if data["type"] not in ("full_day", "hourly"):
            return jsonify({"error": "Invalid type"}), 400
        entry.type = data["type"]
    if "start_time" in data:
        entry.start_time = (
            time.fromisoformat(data["start_time"]) if data["start_time"] else None
        )
    if "end_time" in data:
        entry.end_time = (
            time.fromisoformat(data["end_time"]) if data["end_time"] else None
        )
    if "hourly_rate" in data:
        entry.hourly_rate = data["hourly_rate"] if is_finance_enabled_for_center(entry.service_center_id) else 0
    if "notes" in data:
        entry.notes = data.get("notes")
    if "date" in data:
        entry.date = date.fromisoformat(data["date"])

    db.session.commit()

    # notify affected user via socket
    try:
        emit_to_users([int(entry.user_id)], "schedule:updated", {})
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=entry.service_center_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins if m.user_id != int(entry.user_id)]
        if admin_ids:
            emit_to_users(admin_ids, "schedule:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit schedule:updated after entry update: %s", e)

    if int(entry.user_id) != user.id:
        from notification_helper import create_notification
        sc_name = ServiceCenter.query.get(entry.service_center_id).name
        create_notification(int(entry.user_id), "schedule_update", "Изменение графика",
                            f"Ваша смена на {entry.date.isoformat()} в «{sc_name}» изменена",
                            "/schedule")

    return jsonify(entry.to_dict()), 200


@schedule_bp.route("/<int:entry_id>", methods=["DELETE"])
@jwt_required()
def delete_entry(entry_id):
    user = get_current_user()
    entry = ScheduleEntry.query.get_or_404(entry_id)

    if not is_manager(entry.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    target_user_id = entry.user_id
    entry_date = entry.date.isoformat()
    sc_id = entry.service_center_id
    db.session.delete(entry)
    db.session.commit()

    # notify affected user via socket
    try:
        emit_to_users([int(target_user_id)], "schedule:updated", {})
        admins = ServiceCenterMember.query.filter_by(
            service_center_id=sc_id, is_active=True
        ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
        admin_ids = [m.user_id for m in admins if m.user_id != int(target_user_id)]
        if admin_ids:
            emit_to_users(admin_ids, "schedule:updated", {})
    except Exception as e:
        current_app.logger.error("Failed to emit schedule:updated after entry deletion: %s", e)

    if int(target_user_id) != user.id:
        from notification_helper import create_notification
        sc_name = ServiceCenter.query.get(sc_id).name
        create_notification(int(target_user_id), "schedule_update", "Изменение графика",
                            f"Ваша смена на {entry_date} в «{sc_name}» удалена",
                            "/schedule")

    return jsonify({"message": "Deleted"}), 200


@schedule_bp.route("/bulk-delete", methods=["POST"])
@jwt_required()
def bulk_delete_entries():
    user = get_current_user()
    data = request.get_json()
    if not data or "ids" not in data or not isinstance(data["ids"], list):
        return jsonify({"error": "ids array is required"}), 400

    ids = data["ids"]
    if not ids:
        return jsonify({"message": "No entries to delete"}), 200

    entries = ScheduleEntry.query.filter(ScheduleEntry.id.in_(ids)).all()
    if not entries:
        return jsonify({"error": "No entries found"}), 404

    affected_users = set()
    sc_ids = set()
    for entry in entries:
        if not is_manager(entry.service_center_id, user.id):
            return jsonify({"error": f"Access denied for entry {entry.id}"}), 403
        affected_users.add(int(entry.user_id))
        sc_ids.add(entry.service_center_id)
        db.session.delete(entry)

    db.session.commit()

    for uid in affected_users:
        try:
            emit_to_users([uid], "schedule:updated", {})
        except Exception:
            pass

    for sc_id in sc_ids:
        try:
            admins = ServiceCenterMember.query.filter_by(
                service_center_id=sc_id, is_active=True
            ).filter(ServiceCenterMember.role.in_(["owner", "admin"])).all()
            admin_ids = [m.user_id for m in admins if m.user_id not in affected_users]
            if admin_ids:
                emit_to_users(admin_ids, "schedule:updated", {})
        except Exception as e:
            current_app.logger.error("Failed to emit schedule:updated after bulk delete: %s", e)

    for entry in entries:
        if int(entry.user_id) != user.id:
            from notification_helper import create_notification
            sc_name = ServiceCenter.query.get(entry.service_center_id).name
            create_notification(int(entry.user_id), "schedule_update", "Изменение графика",
                                f"Ваша смена на {entry.date.isoformat()} в «{sc_name}» удалена",
                                "/schedule")

    return jsonify({"deleted": len(entries)}), 200


@schedule_bp.route("/history", methods=["GET"])
@jwt_required()
def admin_history():
    user = get_current_user()
    owned = ServiceCenter.query.filter_by(owner_id=user.id).all()
    owned_ids = set(c.id for c in owned)
    member_of = ServiceCenterMember.query.filter_by(
        user_id=user.id, is_active=True
    ).all()
    member_ids = set(m.service_center_id for m in member_of)
    center_ids = list(owned_ids | member_ids)

    if not center_ids:
        return jsonify({"swaps": [], "entries": []}), 200

    # recent swaps across admin's centers
    swaps = SwapRequest.query.filter(
        SwapRequest.service_center_id.in_(center_ids)
    ).order_by(SwapRequest.created_at.desc()).limit(20).all()

    # recent entry creations
    entries = ScheduleEntry.query.filter(
        ScheduleEntry.service_center_id.in_(center_ids)
    ).order_by(ScheduleEntry.created_at.desc()).limit(20).all()

    return jsonify({
        "swaps": [s.to_dict() for s in swaps],
        "entries": [e.to_dict() for e in entries],
    }), 200


@schedule_bp.route("/available-dates", methods=["GET"])
@jwt_required()
def available_dates():
    """Return dates in range where the target user has NO schedule entries."""
    current_user = get_current_user()
    target_user_id = request.args.get("user_id", type=int)
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if not target_user_id or not date_from or not date_to:
        return jsonify({"error": "user_id, from, to are required"}), 400

    try:
        parsed_from = date.fromisoformat(date_from)
        parsed_to = date.fromisoformat(date_to)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid date format"}), 400

    # verify current user is at least a member in some center with same owner
    target = User.query.get(target_user_id)
    if not target:
        return jsonify({"error": "User not found"}), 404

    # get all dates in range where target has schedule entries
    busy_dates = set()
    entries = ScheduleEntry.query.filter(
        ScheduleEntry.user_id == target_user_id,
        ScheduleEntry.date >= parsed_from,
        ScheduleEntry.date <= parsed_to,
    ).all()
    for e in entries:
        busy_dates.add(e.date.isoformat())

    # build list of free dates
    free = []
    d = parsed_from
    while d <= parsed_to:
        ds = d.isoformat()
        if ds not in busy_dates:
            free.append(ds)
        d += timedelta(days=1)

    return jsonify(free), 200
