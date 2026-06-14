from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.supplier import Supplier
from models.product import Product
from models.purchase import Purchase
from models.purchase_item import PurchaseItem
from models.user import User
from models.service_center import ServiceCenter
from models.service_center_member import ServiceCenterMember
from extensions import db
from helpers import is_manager
from datetime import datetime, timezone
from socket_events import emit_to_users

purchases_bp = Blueprint("purchases", __name__, url_prefix="/api/purchases")

PURCHASE_STATUSES = {
    "draft": "Черновик",
    "ordered": "Заказано",
    "received": "Получено",
    "cancelled": "Отменено",
}


def is_purchase_admin(user_id, service_center_id):
    return is_manager(service_center_id, user_id)


def is_user_owner(user_id):
    return ServiceCenterMember.query.filter_by(
        user_id=user_id, role="owner"
    ).count() > 0


def user_belongs_to_center(user_id, service_center_id):
    return ServiceCenterMember.query.filter_by(
        service_center_id=service_center_id, user_id=user_id, is_active=True
    ).first() is not None


# ─────────────────────────── SUPPLIERS ───────────────────────────

@purchases_bp.route("/suppliers", methods=["GET"])
@jwt_required()
def list_suppliers():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    if not sc_id:
        return jsonify({"error": "service_center_id required"}), 400
    if not user_belongs_to_center(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403
    suppliers = Supplier.query.filter_by(service_center_id=sc_id).order_by(Supplier.name).all()
    return jsonify([s.to_dict() for s in suppliers])


@purchases_bp.route("/suppliers", methods=["POST"])
@jwt_required()
def create_supplier():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("name") or not data.get("service_center_id"):
        return jsonify({"error": "name and service_center_id required"}), 400
    if not is_purchase_admin(user_id, data["service_center_id"]):
        return jsonify({"error": "Access denied"}), 403
    supplier = Supplier(
        service_center_id=data["service_center_id"],
        name=data["name"],
        contact_person=data.get("contact_person", ""),
        phone=data.get("phone", ""),
        email=data.get("email", ""),
        address=data.get("address", ""),
        notes=data.get("notes", ""),
    )
    db.session.add(supplier)
    db.session.commit()
    return jsonify(supplier.to_dict()), 201


@purchases_bp.route("/suppliers/<int:supplier_id>", methods=["PUT"])
@jwt_required()
def update_supplier(supplier_id):
    user_id = int(get_jwt_identity())
    supplier = Supplier.query.get_or_404(supplier_id)
    if not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    data = request.get_json()
    if "name" in data:
        supplier.name = data["name"]
    if "contact_person" in data:
        supplier.contact_person = data["contact_person"]
    if "phone" in data:
        supplier.phone = data["phone"]
    if "email" in data:
        supplier.email = data["email"]
    if "address" in data:
        supplier.address = data["address"]
    if "notes" in data:
        supplier.notes = data["notes"]
    db.session.commit()
    return jsonify(supplier.to_dict())


@purchases_bp.route("/suppliers/<int:supplier_id>", methods=["DELETE"])
@jwt_required()
def delete_supplier(supplier_id):
    user_id = int(get_jwt_identity())
    supplier = Supplier.query.get_or_404(supplier_id)
    if not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    db.session.delete(supplier)
    db.session.commit()
    return jsonify({"ok": True})


# ─────────────────────────── PRODUCTS ───────────────────────────

@purchases_bp.route("/products", methods=["GET"])
@jwt_required()
def list_products():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    if not sc_id:
        return jsonify({"error": "service_center_id required"}), 400
    if not user_belongs_to_center(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403
    products = Product.query.filter_by(service_center_id=sc_id).order_by(Product.name).all()
    return jsonify([p.to_dict() for p in products])


@purchases_bp.route("/products", methods=["POST"])
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("name") or not data.get("service_center_id"):
        return jsonify({"error": "name and service_center_id required"}), 400
    if not is_purchase_admin(user_id, data["service_center_id"]):
        return jsonify({"error": "Access denied"}), 403
    product = Product(
        service_center_id=data["service_center_id"],
        name=data["name"],
        unit=data.get("unit", "шт"),
        default_price=data.get("default_price", 0),
        description=data.get("description", ""),
    )
    db.session.add(product)
    db.session.commit()
    return jsonify(product.to_dict()), 201


@purchases_bp.route("/products/<int:product_id>", methods=["PUT"])
@jwt_required()
def update_product(product_id):
    user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)
    if not is_purchase_admin(user_id, product.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    data = request.get_json()
    if "name" in data:
        product.name = data["name"]
    if "unit" in data:
        product.unit = data["unit"]
    if "default_price" in data:
        product.default_price = data["default_price"]
    if "description" in data:
        product.description = data["description"]
    db.session.commit()
    return jsonify(product.to_dict())


@purchases_bp.route("/products/<int:product_id>", methods=["DELETE"])
@jwt_required()
def delete_product(product_id):
    user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)
    if not is_purchase_admin(user_id, product.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    db.session.delete(product)
    db.session.commit()
    return jsonify({"ok": True})


# ─────────────────────────── PURCHASES (ORDERS) ───────────────────────────

@purchases_bp.route("/orders", methods=["GET"])
@jwt_required()
def list_orders():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    if sc_id:
        if not user_belongs_to_center(user_id, sc_id):
            return jsonify({"error": "Access denied"}), 403
        orders = Purchase.query.filter_by(service_center_id=sc_id).order_by(Purchase.created_at.desc()).all()
    else:
        centers = ServiceCenterMember.query.filter_by(user_id=user_id, is_active=True).all()
        center_ids = [m.service_center_id for m in centers]
        if not center_ids:
            return jsonify([])
        orders = Purchase.query.filter(Purchase.service_center_id.in_(center_ids)).order_by(Purchase.created_at.desc()).all()
    return jsonify([o.to_dict() for o in orders])


@purchases_bp.route("/orders/<int:order_id>", methods=["GET"])
@jwt_required()
def get_order(order_id):
    user_id = int(get_jwt_identity())
    order = Purchase.query.get_or_404(order_id)
    if not user_belongs_to_center(user_id, order.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    return jsonify(order.to_dict())


@purchases_bp.route("/orders", methods=["POST"])
@jwt_required()
def create_order():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("service_center_id") or not data.get("supplier_id"):
        return jsonify({"error": "service_center_id and supplier_id required"}), 400
    if not is_purchase_admin(user_id, data["service_center_id"]):
        return jsonify({"error": "Access denied"}), 403

    order = Purchase(
        service_center_id=data["service_center_id"],
        supplier_id=data["supplier_id"],
        user_id=user_id,
        status=data.get("status", "draft"),
        notes=data.get("notes", ""),
    )
    db.session.add(order)
    db.session.flush()

    items_data = data.get("items", [])
    for item_data in items_data:
        if not item_data.get("product_id") or item_data.get("quantity") is None:
            continue
        item = PurchaseItem(
            purchase_id=order.id,
            product_id=item_data["product_id"],
            quantity=item_data.get("quantity", 1),
            price_per_unit=item_data.get("price_per_unit", 0),
        )
        db.session.add(item)

    db.session.commit()
    emit_to_users_for_order(order)
    return jsonify(order.to_dict()), 201


@purchases_bp.route("/orders/<int:order_id>", methods=["PUT"])
@jwt_required()
def update_order(order_id):
    user_id = int(get_jwt_identity())
    order = Purchase.query.get_or_404(order_id)
    if not is_purchase_admin(user_id, order.service_center_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if "supplier_id" in data:
        order.supplier_id = data["supplier_id"]
    if "status" in data:
        order.status = data["status"]
    if "notes" in data:
        order.notes = data["notes"]
    if "items" in data:
        PurchaseItem.query.filter_by(purchase_id=order.id).delete()
        for item_data in data["items"]:
            if not item_data.get("product_id") or item_data.get("quantity") is None:
                continue
            item = PurchaseItem(
                purchase_id=order.id,
                product_id=item_data["product_id"],
                quantity=item_data.get("quantity", 1),
                price_per_unit=item_data.get("price_per_unit", 0),
            )
            db.session.add(item)
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    emit_to_users_for_order(order)
    return jsonify(order.to_dict())


@purchases_bp.route("/orders/<int:order_id>", methods=["DELETE"])
@jwt_required()
def delete_order(order_id):
    user_id = int(get_jwt_identity())
    order = Purchase.query.get_or_404(order_id)
    if not is_purchase_admin(user_id, order.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    db.session.delete(order)
    db.session.commit()
    return jsonify({"ok": True})


def emit_to_users_for_order(order):
    member_ids = [
        r[0] for r in ServiceCenterMember.query
        .filter(
            ServiceCenterMember.service_center_id == order.service_center_id,
            ServiceCenterMember.is_active == True,
        )
        .with_entities(ServiceCenterMember.user_id)
        .all()
    ]
    emit_to_users(member_ids, "purchases:updated", {})


# ─────────────────────────── TOGGLE / STATUS ───────────────────────────

@purchases_bp.route("/toggle", methods=["PUT"])
@jwt_required()
def toggle_purchases():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    if not is_user_owner(user_id):
        return jsonify({"error": "Only owners can toggle modules"}), 403

    data = request.get_json()
    enabled = data.get("enabled", not user.purchases_enabled) if data else not user.purchases_enabled
    user.purchases_enabled = bool(enabled)
    db.session.commit()

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
            emit_to_users([eid], "purchases:updated", {})

    return jsonify({"purchases_enabled": user.purchases_enabled})


@purchases_bp.route("/status", methods=["GET"])
@jwt_required()
def purchases_status():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    memberships = ServiceCenterMember.query.filter(
        ServiceCenterMember.user_id == user_id,
        ServiceCenterMember.role.in_(["owner", "admin"]),
    ).all()
    is_admin = len(memberships) > 0

    available = user.purchases_enabled

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
                    User.purchases_enabled == True,
                ).count()
                available = enabled_owners > 0

    return jsonify({
        "available": available,
        "is_admin": is_admin,
        "purchases_enabled": user.purchases_enabled,
        "is_owner": is_user_owner(user_id),
    })
