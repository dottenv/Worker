from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import SwapRequest, ScheduleEntry, ServiceCenter, ServiceCenterMember, User
from extensions import db
from datetime import date, datetime, timezone
from push_helper import send_push
from socket_events import emit_swap_event

swaps_bp = Blueprint("swaps", __name__, url_prefix="/api/swaps")


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


def shares_owner(user_a_id, user_b_id):
    """Check if two users belong to centers of the same owner."""
    a_scs = ServiceCenterMember.query.filter_by(
        user_id=user_a_id, is_active=True
    ).all()
    a_owner_ids = set()
    for m in a_scs:
        sc = ServiceCenter.query.get(m.service_center_id)
        if sc:
            a_owner_ids.add(sc.owner_id)
    b_scs = ServiceCenterMember.query.filter_by(
        user_id=user_b_id, is_active=True
    ).all()
    for m in b_scs:
        sc = ServiceCenter.query.get(m.service_center_id)
        if sc and sc.owner_id in a_owner_ids:
            return True
    return False


@swaps_bp.route("", methods=["GET"])
@jwt_required()
def list_swaps():
    user = get_current_user()
    # user sees swaps they are involved in
    swaps = SwapRequest.query.filter(
        db.or_(
            SwapRequest.requester_id == user.id,
            SwapRequest.responder_id == user.id,
        )
    ).order_by(SwapRequest.created_at.desc()).all()
    return jsonify([s.to_dict() for s in swaps]), 200


@swaps_bp.route("/admin", methods=["GET"])
@jwt_required()
def admin_list_swaps():
    """Admin sees all swaps across their centers."""
    user = get_current_user()
    owned = ServiceCenter.query.filter_by(owner_id=user.id).all()
    center_ids = [c.id for c in owned]
    if not center_ids:
        memberships = ServiceCenterMember.query.filter_by(
            user_id=user.id, is_active=True
        ).all()
        center_ids = [m.service_center_id for m in memberships]
    if not center_ids:
        return jsonify([]), 200
    swaps = SwapRequest.query.filter(
        SwapRequest.service_center_id.in_(center_ids)
    ).order_by(SwapRequest.created_at.desc()).all()
    return jsonify([s.to_dict() for s in swaps]), 200


@swaps_bp.route("/<int:swap_id>", methods=["GET"])
@jwt_required()
def get_swap(swap_id):
    swap = SwapRequest.query.get_or_404(swap_id)
    return jsonify(swap.to_dict()), 200


@swaps_bp.route("", methods=["POST"])
@jwt_required()
def create_swap():
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    sc_id = data.get("service_center_id")
    source_entry_id = data.get("source_entry_id")
    source_date_str = data.get("source_date")
    source_user_id = data.get("source_user_id")
    swap_type = data.get("swap_type", "swap")
    target_entry_id = data.get("target_entry_id")
    target_user_id = data.get("target_user_id")
    target_center_id = data.get("target_center_id")
    target_date_str = data.get("target_date")
    notes = data.get("notes", "")

    if not all([sc_id, source_date_str, source_user_id]):
        return jsonify({"error": "service_center_id, source_date, source_user_id are required"}), 400

    if swap_type not in ("swap", "give", "force", "substitution"):
        return jsonify({"error": "Invalid swap_type"}), 400

    # validate center
    sc = ServiceCenter.query.get(sc_id)
    if not sc:
        return jsonify({"error": "Service center not found"}), 404

    # validate source user is a member
    source_member = ServiceCenterMember.query.filter_by(
        service_center_id=sc_id, user_id=source_user_id, is_active=True
    ).first()
    if not source_member:
        return jsonify({"error": "Source user is not an active member"}), 400

    # validate responder exists for swap type
    if swap_type == "swap":
        if not target_user_id or not target_entry_id:
            return jsonify({"error": "target_user_id and target_entry_id required for swap"}), 400
        target_member = ServiceCenterMember.query.filter_by(
            service_center_id=target_center_id or sc_id,
            user_id=target_user_id,
            is_active=True,
        ).first()
        if not target_member:
            return jsonify({"error": "Target user is not an active member"}), 400
        # cross-center: must share owner
        if target_center_id and target_center_id != sc_id:
            target_sc = ServiceCenter.query.get(target_center_id)
            if not target_sc or target_sc.owner_id != sc.owner_id:
                return jsonify({"error": "Cross-center swaps require the same owner"}), 400
    elif swap_type == "give":
        if not target_user_id:
            return jsonify({"error": "target_user_id required for give"}), 400
    elif swap_type == "substitution":
        if not target_user_id:
            return jsonify({"error": "target_user_id required for substitution"}), 400
        target_member = ServiceCenterMember.query.filter_by(
            service_center_id=target_center_id,
            user_id=target_user_id,
            is_active=True,
        ).first()
        if not target_member:
            return jsonify({"error": "Target user is not an active member of the target center"}), 400
        # cross-center must share an owner
        target_sc = ServiceCenter.query.get(target_center_id)
        if not target_sc or target_sc.owner_id != sc.owner_id:
            return jsonify({"error": "Cross-center substitution requires the same owner"}), 400
    elif swap_type == "force":
        if not target_user_id or not target_entry_id:
            return jsonify({"error": "target_user_id and target_entry_id required for force"}), 400

    # permissions: admin can do anything, employees only among themselves
    is_mgr = is_manager(sc_id, user.id)
    if not is_mgr:
        # employees can only create swap/give requests
        if swap_type == "force":
            return jsonify({"error": "Only managers can force swaps"}), 403
        # employee must be the source user
        if user.id != source_user_id:
            return jsonify({"error": "You can only request swaps for yourself"}), 403
        # employee can only swap with others who share an owner
        if target_user_id and not shares_owner(user.id, target_user_id):
            return jsonify({"error": "Can only swap with employees of the same organization"}), 403

    # parse dates
    try:
        parsed_source_date = date.fromisoformat(source_date_str)
    except (ValueError, TypeError):
        return jsonify({"error": "Invalid source_date"}), 400

    parsed_target_date = None
    if target_date_str:
        try:
            parsed_target_date = date.fromisoformat(target_date_str)
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid target_date"}), 400

    # resolve responder_id
    responder_id = None
    if swap_type == "swap":
        responder_id = target_user_id
    elif swap_type in ("give", "substitution"):
        responder_id = target_user_id
    # force: no responder needed

    swap = SwapRequest(
        requester_id=user.id,
        responder_id=responder_id,
        service_center_id=sc_id,
        source_entry_id=source_entry_id,
        source_date=parsed_source_date,
        source_user_id=source_user_id,
        target_entry_id=target_entry_id,
        target_date=parsed_target_date,
        target_user_id=target_user_id,
        target_center_id=target_center_id or sc_id,
        status="accepted" if swap_type == "force" else "pending",
        swap_type=swap_type,
        notes=notes,
        resolved_by_id=user.id if swap_type == "force" else None,
        resolved_at=datetime.now(timezone.utc) if swap_type == "force" else None,
    )
    db.session.add(swap)
    db.session.flush()

    # execute force swap immediately
    if swap_type == "force":
        err = execute_swap(swap, user.id)
        if err:
            db.session.rollback()
            return jsonify({"error": err}), 400

    db.session.commit()

    # push + socket + notification: notify relevant users
    from notification_helper import create_notification
    if swap_type != "force" and target_user_id and int(target_user_id) != user.id:
        if swap_type == "substitution":
            push_msg = f"{user.full_name} просит подменить смену"
            notif_msg = f"{user.full_name} просит подменить смену"
        elif swap_type == "give":
            push_msg = f"{user.full_name} хочет передать вам смену"
            notif_msg = f"{user.full_name} хочет передать вам смену"
        else:
            push_msg = f"{user.full_name} хочет обменяться сменами"
            notif_msg = f"{user.full_name} хочет обменяться сменами"
        send_push(int(target_user_id), "Новый запрос",
                  push_msg)
        emit_swap_event(int(target_user_id), "swap:updated", {})
        create_notification(int(target_user_id), "swap_created", "Новый запрос",
                            notif_msg, "/swaps")
    elif swap_type == "force":
        tgt_name = None
        if target_user_id:
            tgt_user = User.query.get(int(target_user_id))
            tgt_name = tgt_user.full_name if tgt_user else None
        if int(source_user_id) != user.id:
            send_push(int(source_user_id), "Принудительный обмен",
                      f"Администратор изменил вашу смену")
            emit_swap_event(int(source_user_id), "swap:updated", {})
            create_notification(int(source_user_id), "swap_forced", "Принудительный обмен",
                                f"Администратор изменил вашу смену", "/swaps")
        if target_user_id and int(target_user_id) != user.id and int(target_user_id) != int(source_user_id):
            send_push(int(target_user_id), "Принудительный обмен",
                      f"Вам назначена смена от {tgt_name or 'сотрудника'}")
            emit_swap_event(int(target_user_id), "swap:updated", {})
            create_notification(int(target_user_id), "swap_forced", "Принудительный обмен",
                                f"Вам назначена смена от {tgt_name or 'сотрудника'}", "/swaps")

    return jsonify(swap.to_dict()), 201


def execute_swap(swap, resolved_by_id):
    """Execute the actual swap of entries. Returns error string or None."""
    source_entry = ScheduleEntry.query.get(swap.source_entry_id)
    if not source_entry:
        return "Source entry not found"

    if swap.swap_type in ("swap", "force"):
        target_entry = ScheduleEntry.query.get(swap.target_entry_id)
        if not target_entry:
            return "Target entry not found"
        # swap user_ids
        source_uid = source_entry.user_id
        target_uid = target_entry.user_id
        source_entry.user_id = target_uid
        target_entry.user_id = source_uid
    elif swap.swap_type in ("give", "substitution"):
        if not swap.responder_id:
            return f"No responder for {swap.swap_type} swap"
        source_entry.user_id = swap.responder_id

    swap.status = "accepted"
    swap.resolved_by_id = resolved_by_id
    swap.resolved_at = datetime.now(timezone.utc)
    return None


@swaps_bp.route("/<int:swap_id>/accept", methods=["PUT"])
@jwt_required()
def accept_swap(swap_id):
    user = get_current_user()
    swap = SwapRequest.query.get_or_404(swap_id)

    if swap.status != "pending":
        return jsonify({"error": "Swap is not pending"}), 400

    # only the responder can accept
    if swap.responder_id != user.id:
        # admin can accept on behalf
        if not is_manager(swap.service_center_id, user.id):
            return jsonify({"error": "Only the responder can accept"}), 403

    err = execute_swap(swap, user.id)
    if err:
        return jsonify({"error": err}), 400

    db.session.commit()

    # push + socket + notification: notify requester
    from notification_helper import create_notification
    if swap.requester_id != user.id:
        send_push(swap.requester_id, "Обмен принят",
                  f"{user.full_name} принял(а) ваш запрос на обмен")
        create_notification(swap.requester_id, "swap_accepted", "Обмен принят",
                            f"{user.full_name} принял(а) ваш запрос на обмен", "/swaps")
    emit_swap_event(swap.requester_id, "swap:updated", {})
    if swap.responder_id:
        emit_swap_event(swap.responder_id, "swap:updated", {})

    return jsonify(swap.to_dict()), 200


@swaps_bp.route("/<int:swap_id>/reject", methods=["PUT"])
@jwt_required()
def reject_swap(swap_id):
    user = get_current_user()
    swap = SwapRequest.query.get_or_404(swap_id)

    if swap.status != "pending":
        return jsonify({"error": "Swap is not pending"}), 400

    if swap.responder_id != user.id and not is_manager(swap.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    swap.status = "rejected"
    swap.resolved_by_id = user.id
    swap.resolved_at = datetime.now(timezone.utc)
    db.session.commit()

    from notification_helper import create_notification
    if swap.requester_id != user.id:
        send_push(swap.requester_id, "Обмен отклонён",
                  f"{user.full_name} отклонил(а) ваш запрос на обмен")
        create_notification(swap.requester_id, "swap_rejected", "Обмен отклонён",
                            f"{user.full_name} отклонил(а) ваш запрос на обмен", "/swaps")
    emit_swap_event(swap.requester_id, "swap:updated", {})
    if swap.responder_id:
        emit_swap_event(swap.responder_id, "swap:updated", {})

    return jsonify(swap.to_dict()), 200


@swaps_bp.route("/<int:swap_id>/cancel", methods=["PUT"])
@jwt_required()
def cancel_swap(swap_id):
    user = get_current_user()
    swap = SwapRequest.query.get_or_404(swap_id)

    if swap.status != "pending":
        return jsonify({"error": "Swap is not pending"}), 400

    if swap.requester_id != user.id and not is_manager(swap.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    swap.status = "cancelled"
    swap.resolved_by_id = user.id
    swap.resolved_at = datetime.now(timezone.utc)
    db.session.commit()

    from notification_helper import create_notification
    if swap.responder_id and swap.responder_id != user.id:
        send_push(swap.responder_id, "Обмен отменён",
                  f"{user.full_name} отменил(а) запрос на обмен")
        create_notification(swap.responder_id, "swap_cancelled", "Обмен отменён",
                            f"{user.full_name} отменил(а) запрос на обмен", "/swaps")
    emit_swap_event(swap.requester_id, "swap:updated", {})
    if swap.responder_id:
        emit_swap_event(swap.responder_id, "swap:updated", {})

    return jsonify(swap.to_dict()), 200


@swaps_bp.route("/<int:swap_id>/force", methods=["PUT"])
@jwt_required()
def force_swap(swap_id):
    user = get_current_user()
    swap = SwapRequest.query.get_or_404(swap_id)

    if not is_manager(swap.service_center_id, user.id):
        return jsonify({"error": "Access denied"}), 403

    if swap.status == "accepted":
        return jsonify({"error": "Swap already accepted"}), 400

    err = execute_swap(swap, user.id)
    if err:
        return jsonify({"error": err}), 400

    swap.swap_type = "force"
    db.session.commit()

    from notification_helper import create_notification
    if swap.requester_id != user.id:
        send_push(swap.requester_id, "Принудительный обмен",
                  f"Администратор выполнил принудительный обмен вашей смены")
        create_notification(swap.requester_id, "swap_forced", "Принудительный обмен",
                            f"Администратор выполнил принудительный обмен вашей смены", "/swaps")
    if swap.responder_id and swap.responder_id != user.id and swap.responder_id != swap.requester_id:
        send_push(swap.responder_id, "Принудительный обмен",
                  f"Администратор назначил вам смену")
        create_notification(swap.responder_id, "swap_forced", "Принудительный обмен",
                            f"Администратор назначил вам смену", "/swaps")
    emit_swap_event(swap.requester_id, "swap:updated", {})
    if swap.responder_id:
        emit_swap_event(swap.responder_id, "swap:updated", {})

    return jsonify(swap.to_dict()), 200
