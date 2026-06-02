from datetime import datetime, timezone

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app import db
from app.models import Warehouse

warehouses_bp = Blueprint("warehouses", __name__)


@warehouses_bp.route("", methods=["GET"])
@jwt_required()
def list_warehouses():
    user_id = int(get_jwt_identity())
    warehouses = Warehouse.query.filter_by(user_id=user_id).all()
    return jsonify([w.to_dict() for w in warehouses])


@warehouses_bp.route("", methods=["POST"])
@jwt_required()
def create_warehouse():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Warehouse name is required"}), 400

    warehouse = Warehouse(
        name=data["name"],
        address=data.get("address"),
        user_id=user_id,
    )
    db.session.add(warehouse)
    db.session.commit()
    return jsonify(warehouse.to_dict()), 201


@warehouses_bp.route("/<int:warehouse_id>", methods=["GET"])
@jwt_required()
def get_warehouse(warehouse_id):
    warehouse = Warehouse.query.get_or_404(warehouse_id)
    if warehouse.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403
    return jsonify(warehouse.to_dict())


@warehouses_bp.route("/<int:warehouse_id>", methods=["PUT"])
@jwt_required()
def update_warehouse(warehouse_id):
    warehouse = Warehouse.query.get_or_404(warehouse_id)
    if warehouse.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403

    data = request.get_json()
    if data.get("name"):
        warehouse.name = data["name"]
    if data.get("address") is not None:
        warehouse.address = data["address"]

    db.session.commit()
    return jsonify(warehouse.to_dict())


@warehouses_bp.route("/<int:warehouse_id>", methods=["DELETE"])
@jwt_required()
def delete_warehouse(warehouse_id):
    warehouse = Warehouse.query.get_or_404(warehouse_id)
    if warehouse.user_id != int(get_jwt_identity()):
        return jsonify({"error": "Forbidden"}), 403

    db.session.delete(warehouse)
    db.session.commit()
    return jsonify({"message": "Warehouse deleted"})
