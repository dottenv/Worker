from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity

from app import db
from app.models import User, Employee

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    if User.query.filter_by(email=data["email"]).first():
        return jsonify({"error": "Email already registered"}), 409

    if User.query.filter_by(username=data["username"]).first():
        return jsonify({"error": "Username already taken"}), 409

    user = User(
        username=data["username"],
        email=data["email"],
        company_name=data.get("company_name"),
        phone=data.get("phone"),
    )
    user.set_password(data["password"])

    db.session.add(user)
    db.session.commit()

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    user = User.query.filter_by(email=data["email"]).first()
    if not user or not user.check_password(data["password"]):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()})


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict())


@auth_bp.route("/employee-login", methods=["POST"])
def employee_login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    employee = Employee.query.get(data.get("employee_id"))
    if not employee or not employee.check_pin(data.get("pin_code", "")):
        return jsonify({"error": "Invalid credentials"}), 401

    if not employee.is_active:
        return jsonify({"error": "Employee is deactivated"}), 403

    token = create_access_token(
        identity=str(employee.id), additional_claims={"type": "employee"}
    )
    return jsonify({"token": token, "employee": employee.to_dict()})
