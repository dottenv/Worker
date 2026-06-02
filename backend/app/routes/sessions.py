from datetime import datetime, date, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models import WorkSession, Employee

sessions_bp = Blueprint("sessions", __name__)


@sessions_bp.route("/clock-in", methods=["POST"])
@jwt_required()
def clock_in():
    identity = get_jwt_identity()
    data = request.get_json()
    employee_id = data.get("employee_id") if data else None

    active = WorkSession.query.filter_by(
        employee_id=employee_id, clock_out=None
    ).first()
    if active:
        return jsonify({"error": "Already clocked in"}), 409

    now = datetime.now(timezone.utc)
    session = WorkSession(
        employee_id=employee_id,
        clock_in=now,
        date=now.date(),
        status="working",
    )
    db.session.add(session)
    db.session.commit()
    return jsonify(session.to_dict()), 201


@sessions_bp.route("/clock-out", methods=["POST"])
@jwt_required()
def clock_out():
    data = request.get_json()
    employee_id = data.get("employee_id") if data else None

    session = WorkSession.query.filter_by(
        employee_id=employee_id, clock_out=None
    ).first()
    if not session:
        return jsonify({"error": "No active session"}), 404

    now = datetime.now(timezone.utc)
    session.clock_out = now
    session.status = "completed"
    db.session.commit()
    return jsonify(session.to_dict())


@sessions_bp.route("/active", methods=["GET"])
@jwt_required()
def get_active():
    employee_id = request.args.get("employee_id", type=int)
    session = WorkSession.query.filter_by(
        employee_id=employee_id, clock_out=None
    ).first()
    return jsonify(session.to_dict() if session else None)


@sessions_bp.route("", methods=["GET"])
@jwt_required()
def list_sessions():
    user_id = int(get_jwt_identity())
    session_date = request.args.get("date")
    warehouse_id = request.args.get("warehouse_id", type=int)
    employee_id = request.args.get("employee_id", type=int)

    query = WorkSession.query.join(Employee).filter(Employee.user_id == user_id)

    if session_date:
        query = query.filter(WorkSession.date == date.fromisoformat(session_date))
    if warehouse_id:
        query = query.filter(Employee.warehouse_id == warehouse_id)
    if employee_id:
        query = query.filter(WorkSession.employee_id == employee_id)

    query = query.order_by(WorkSession.clock_in.desc())
    return jsonify([s.to_dict() for s in query.all()])


@sessions_bp.route("/<int:session_id>", methods=["PUT"])
@jwt_required()
def update_session(session_id):
    session = WorkSession.query.get_or_404(session_id)
    employee = Employee.query.get(session.employee_id)
    if employee.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    if "note" in data:
        session.note = data["note"]
    if "clock_in" in data:
        session.clock_in = datetime.fromisoformat(data["clock_in"])
    if "clock_out" in data:
        session.clock_out = datetime.fromisoformat(data["clock_out"])
        if session.clock_out:
            session.status = "completed"

    db.session.commit()
    return jsonify(session.to_dict())
