from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.supplier import Supplier
from models.product import Product
from models.purchase import Purchase
from models.purchase_item import PurchaseItem
from models.parser_config import ParserConfig
from models.user import User
from models.service_center import ServiceCenter
from models.service_center_member import ServiceCenterMember
from extensions import db
from helpers import is_manager
from datetime import datetime, timezone
from socket_events import emit_to_users
import sys
import os

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


# ─────────────────────────── RETURNS ───────────────────────────

@purchases_bp.route("/returns", methods=["GET"])
@jwt_required()
def list_returns():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    if not sc_id:
        return jsonify({"error": "service_center_id required"}), 400
    if not user_belongs_to_center(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403
    items = (PurchaseItem.query
             .join(Purchase)
             .filter(
                 Purchase.service_center_id == sc_id,
                 PurchaseItem.returned_quantity > 0,
             )
             .order_by(Purchase.created_at.desc())
             .all())
    result = []
    for item in items:
        d = item.to_dict()
        d["order_status"] = item.purchase.status if item.purchase else ""
        d["order_created_at"] = item.purchase.created_at.isoformat() if item.purchase else ""
        d["supplier_name"] = item.purchase.supplier.name if item.purchase and item.purchase.supplier else ""
        result.append(d)
    return jsonify(result)


@purchases_bp.route("/orders/<int:order_id>/return", methods=["POST"])
@jwt_required()
def return_order_items(order_id):
    user_id = int(get_jwt_identity())
    order = Purchase.query.get_or_404(order_id)
    if not is_purchase_admin(user_id, order.service_center_id):
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json()
    if not data or not isinstance(data.get("items"), list):
        return jsonify({"error": "items required"}), 400

    for ret in data["items"]:
        item_id = ret.get("item_id")
        qty = float(ret.get("quantity", 0))
        if not item_id or qty <= 0:
            continue
        item = PurchaseItem.query.filter_by(id=item_id, purchase_id=order_id).first()
        if not item:
            continue
        item.returned_quantity = float(item.returned_quantity or 0) + qty
        if float(item.returned_quantity) > float(item.quantity):
            item.returned_quantity = item.quantity

    db.session.commit()
    emit_to_users_for_order(order)
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


# ─────────────────────────── PARSER ───────────────────────────

@purchases_bp.route("/parser/config", methods=["GET"])
@jwt_required()
def get_parser_config():
    user_id = int(get_jwt_identity())
    supplier_id = request.args.get("supplier_id", type=int)
    if not supplier_id:
        return jsonify({"error": "supplier_id required"}), 400
    supplier = Supplier.query.get_or_404(supplier_id)
    if not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    config = ParserConfig.query.filter_by(supplier_id=supplier_id).first()
    if not config:
        return jsonify(None)
    return jsonify(config.to_dict())


@purchases_bp.route("/parser/config", methods=["POST"])
@jwt_required()
def save_parser_config():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("supplier_id"):
        return jsonify({"error": "supplier_id required"}), 400
    supplier = Supplier.query.get_or_404(data["supplier_id"])
    if not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403

    config = ParserConfig.query.filter_by(supplier_id=data["supplier_id"]).first()
    if config:
        config.login = data.get("login", config.login)
        config.password = data.get("password", config.password)
        config.base_url = data.get("base_url", config.base_url)
        config.is_active = data.get("is_active", config.is_active)
    else:
        config = ParserConfig(
            service_center_id=supplier.service_center_id,
            supplier_id=data["supplier_id"],
            parser_type="moba_ru",
            login=data.get("login", ""),
            password=data.get("password", ""),
            base_url=data.get("base_url", "https://novosibirsk.moba.ru"),
        )
        db.session.add(config)
    db.session.commit()
    return jsonify(config.to_dict())


@purchases_bp.route("/parser/run", methods=["POST"])
@jwt_required()
def run_parser():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("config_id"):
        return jsonify({"error": "config_id required"}), 400

    config = ParserConfig.query.get_or_404(data["config_id"])
    supplier = Supplier.query.get(config.supplier_id)
    if not supplier or not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403

    action = data.get("action", "parse_catalog")
    purchase_id = data.get("purchase_id", 0)

    if config.sync_status in ("parsing", "placing"):
        return jsonify({"error": "Parser already running"}), 409

    config.sync_status = "parsing" if action == "parse_catalog" else "placing"
    config.sync_progress = 0
    config.sync_log = "[]"
    db.session.commit()

    worker_path = os.path.join(
        os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
        "parsers_worker.py",
    )
    cmd = [
        sys.executable, worker_path, "moba",
        "--action", action,
        "--config-id", str(config.id),
    ]
    if action == "parse_catalog":
        cmd.extend(["--supplier-id", str(config.supplier_id or 0)])
    elif action == "place_order":
        cmd.extend(["--purchase-id", str(purchase_id)])

    log_dir = "/data"
    os.makedirs(log_dir, exist_ok=True)
    log_file = open(os.path.join(log_dir, f"parser_{config.id}.log"), "a")

    try:
        import subprocess
        subprocess.Popen(
            cmd,
            cwd=os.path.dirname(worker_path),
            stdout=log_file,
            stderr=subprocess.STDOUT,
        )
    except Exception as e:
        return jsonify({"error": f"Failed to start parser: {e}"}), 500

    return jsonify({"ok": True, "action": action})


@purchases_bp.route("/parser/reset", methods=["POST"])
@jwt_required()
def reset_parser():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("config_id"):
        return jsonify({"error": "config_id required"}), 400
    config = ParserConfig.query.get_or_404(data["config_id"])
    supplier = Supplier.query.get(config.supplier_id)
    if not supplier or not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    config.sync_status = "idle"
    config.sync_progress = 0
    config.sync_log = "[]"
    db.session.commit()
    return jsonify({"ok": True})


@purchases_bp.route("/parser/status", methods=["GET"])
@jwt_required()
def parser_status():
    user_id = int(get_jwt_identity())
    config_id = request.args.get("config_id", type=int)
    if not config_id:
        return jsonify({"error": "config_id required"}), 400
    config = ParserConfig.query.get_or_404(config_id)
    supplier = Supplier.query.get(config.supplier_id)
    if not supplier or not is_purchase_admin(user_id, supplier.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    return jsonify({
        "status": config.sync_status,
        "progress": config.sync_progress,
        "log": config.sync_log,
        "last_sync_at": config.last_sync_at.isoformat() if config.last_sync_at else None,
    })
