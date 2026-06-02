from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models import Employee, Warehouse

employees_bp = Blueprint("employees", __name__)


@employees_bp.route("", methods=["GET"])
@jwt_required()
def list_employees():
    user_id = int(get_jwt_identity())
    warehouse_id = request.args.get("warehouse_id", type=int)
    active_only = request.args.get("active_only", type=bool, default=False)

    query = Employee.query.filter_by(user_id=user_id)
    if warehouse_id:
        query = query.filter_by(warehouse_id=warehouse_id)
    if active_only:
        query = query.filter_by(is_active=True)

    return jsonify([e.to_dict() for e in query.all()])


@employees_bp.route("", methods=["POST"])
@jwt_required()
def create_employee():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("first_name") or not data.get("last_name"):
        return jsonify({"error": "First and last name are required"}), 400

    warehouse = Warehouse.query.get(data.get("warehouse_id"))
    if not warehouse or warehouse.user_id != user_id:
        return jsonify({"error": "Warehouse not found"}), 404

    employee = Employee(
        first_name=data["first_name"],
        last_name=data["last_name"],
        email=data.get("email"),
        phone=data.get("phone"),
        position=data.get("position"),
        warehouse_id=data["warehouse_id"],
        user_id=user_id,
    )
    employee.set_pin(str(data.get("pin_code", "1234")))

    db.session.add(employee)
    db.session.commit()
    return jsonify(employee.to_dict()), 201


@employees_bp.route("/<int:employee_id>", methods=["GET"])
@jwt_required()
def get_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    if employee.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(employee.to_dict())


@employees_bp.route("/<int:employee_id>", methods=["PUT"])
@jwt_required()
def update_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    user_id = int(get_jwt_identity())
    if employee.user_id != user_id:
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    for field in ["first_name", "last_name", "email", "phone", "position", "is_active"]:
        if field in data:
            setattr(employee, field, data[field])
    if "pin_code" in data:
        employee.set_pin(str(data["pin_code"]))
    if "warehouse_id" in data:
        warehouse = Warehouse.query.get(data["warehouse_id"])
        if warehouse and warehouse.user_id == user_id:
            employee.warehouse_id = data["warehouse_id"]

    db.session.commit()
    return jsonify(employee.to_dict())


@employees_bp.route("/<int:employee_id>", methods=["DELETE"])
@jwt_required()
def delete_employee(employee_id):
    employee = Employee.query.get_or_404(employee_id)
    if employee.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(employee)
    db.session.commit()
    return jsonify({"message": "Employee deleted"})
