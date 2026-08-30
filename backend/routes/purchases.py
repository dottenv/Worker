from flask import Blueprint, jsonify, request, send_from_directory, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.supplier import Supplier
from models.product import Product
from models.purchase import Purchase
from models.purchase_item import PurchaseItem
from models.stock_movement import StockMovement
from models.user import User
from models.service_center import ServiceCenter
from models.service_center_member import ServiceCenterMember
from extensions import db
from helpers import is_manager
from datetime import datetime, timezone
from socket_events import emit_to_users
import os
import uuid

purchases_bp = Blueprint("purchases", __name__, url_prefix="/api/purchases")

IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "gif", "webp", "bmp"}

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


def emit_to_users_for_center(sc_id):
    member_ids = [
        r[0] for r in ServiceCenterMember.query
        .filter(
            ServiceCenterMember.service_center_id == sc_id,
            ServiceCenterMember.is_active == True,
        )
        .with_entities(ServiceCenterMember.user_id)
        .all()
    ]
    emit_to_users(member_ids, "purchases:updated", {})


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
    for field in ["name", "contact_person", "phone", "email", "address", "notes"]:
        if field in data:
            setattr(supplier, field, data[field])
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


@purchases_bp.route("/products/by-barcode", methods=["GET"])
@jwt_required()
def product_by_barcode():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    barcode = (request.args.get("barcode") or "").strip()
    if not sc_id or not barcode:
        return jsonify({"error": "service_center_id and barcode required"}), 400
    if not user_belongs_to_center(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403
    product = Product.query.filter_by(service_center_id=sc_id, barcode=barcode).first()
    if not product:
        return jsonify({"error": "not found"}), 404
    return jsonify(product.to_dict())


def _product_photo_dir():
    return os.path.join(current_app.config["UPLOAD_FOLDER"], "product_photos")


def _remove_photo_file(product):
    if not product.photo:
        return
    try:
        p = os.path.join(_product_photo_dir(), product.photo)
        if os.path.isfile(p):
            os.remove(p)
    except Exception:
        pass


@purchases_bp.route("/products/<int:product_id>/photo", methods=["POST"])
@jwt_required()
def upload_product_photo(product_id):
    user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)
    if not is_purchase_admin(user_id, product.service_center_id):
        return jsonify({"error": "Access denied"}), 403

    if "file" not in request.files or not request.files["file"].filename:
        return jsonify({"error": "Файл не передан"}), 400
    file = request.files["file"]
    ext = file.filename.rsplit(".", 1)[-1].lower() if "." in file.filename else ""
    if ext not in IMAGE_EXTENSIONS:
        return jsonify({"error": "Допустимы изображения: png, jpg, jpeg, gif, webp, bmp"}), 400

    upload_dir = _product_photo_dir()
    os.makedirs(upload_dir, exist_ok=True)
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    file.save(os.path.join(upload_dir, unique_name))

    _remove_photo_file(product)
    product.photo = unique_name
    db.session.commit()

    emit_to_users_for_center(product.service_center_id)
    return jsonify(product.to_dict())


@purchases_bp.route("/products/<int:product_id>/photo", methods=["DELETE"])
@jwt_required()
def delete_product_photo(product_id):
    user_id = int(get_jwt_identity())
    product = Product.query.get_or_404(product_id)
    if not is_purchase_admin(user_id, product.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    _remove_photo_file(product)
    product.photo = None
    db.session.commit()
    return jsonify(product.to_dict())


@purchases_bp.route("/products/<int:product_id>/photo", methods=["GET"])
def get_product_photo(product_id):
    product = Product.query.get_or_404(product_id)
    if not product.photo:
        return jsonify({"error": "no photo"}), 404
    return send_from_directory(_product_photo_dir(), product.photo)


@purchases_bp.route("/products", methods=["POST"])
@jwt_required()
def create_product():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("name") or not data.get("service_center_id"):
        return jsonify({"error": "name and service_center_id required"}), 400
    if not is_purchase_admin(user_id, data["service_center_id"]):
        return jsonify({"error": "Access denied"}), 403

    barcode = (data.get("barcode") or "").strip()
    if barcode:
        dup = Product.query.filter_by(service_center_id=data["service_center_id"], barcode=barcode).first()
        if dup:
            return jsonify({"error": "Штрихкод уже используется другим товаром"}), 409

    product = Product(
        service_center_id=data["service_center_id"],
        supplier_id=data.get("supplier_id") or None,
        name=data["name"],
        sku=(data.get("sku") or "").strip(),
        barcode=barcode,
        unit=data.get("unit", "шт"),
        default_price=float(data.get("default_price", 0) or 0),
        min_quantity=float(data.get("min_quantity", 0) or 0),
        location=(data.get("location") or "").strip(),
        description=data.get("description", ""),
        stock_quantity=0.0,
    )
    db.session.add(product)
    db.session.flush()

    initial = float(data.get("stock_quantity", 0) or 0)
    if initial > 0:
        product.stock_quantity = initial
        db.session.add(StockMovement(
            service_center_id=product.service_center_id,
            product_id=product.id,
            user_id=user_id,
            type="adjust",
            quantity=initial,
            reason="Начальный остаток при добавлении товара",
        ))

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
    if "supplier_id" in data:
        product.supplier_id = data.get("supplier_id") or None
    if "unit" in data:
        product.unit = data["unit"]
    if "default_price" in data:
        product.default_price = float(data["default_price"] or 0)
    if "min_quantity" in data:
        product.min_quantity = float(data["min_quantity"] or 0)
    if "location" in data:
        product.location = (data["location"] or "").strip()
    if "description" in data:
        product.description = data["description"]
    if "sku" in data:
        product.sku = (data["sku"] or "").strip()
    if "barcode" in data:
        barcode = (data["barcode"] or "").strip()
        if barcode:
            dup = Product.query.filter(
                Product.service_center_id == product.service_center_id,
                Product.barcode == barcode,
                Product.id != product.id,
            ).first()
            if dup:
                return jsonify({"error": "Штрихкод уже используется другим товаром"}), 409
        product.barcode = barcode

    if "stock_quantity" in data:
        new_qty = float(data["stock_quantity"] or 0)
        cur = float(product.stock_quantity or 0)
        if new_qty != cur:
            delta = new_qty - cur
            product.stock_quantity = new_qty
            db.session.add(StockMovement(
                service_center_id=product.service_center_id,
                product_id=product.id,
                user_id=user_id,
                type="adjust",
                quantity=abs(delta),
                reason="Корректировка остатка вручную",
            ))

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


# ─────────────────────────── STOCK ───────────────────────────

@purchases_bp.route("/stock", methods=["GET"])
@jwt_required()
def stock_list():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    if not sc_id:
        return jsonify({"error": "service_center_id required"}), 400
    if not user_belongs_to_center(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403
    products = Product.query.filter_by(service_center_id=sc_id).order_by(Product.name).all()
    result = []
    for p in products:
        d = p.to_dict()
        d["low_stock"] = p.stock_quantity <= p.min_quantity
        result.append(d)
    return jsonify(result)


@purchases_bp.route("/stock/writeoff", methods=["POST"])
@jwt_required()
def write_off_stock():
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("service_center_id") or not isinstance(data.get("items"), list):
        return jsonify({"error": "service_center_id and items required"}), 400
    sc_id = data["service_center_id"]
    if not is_purchase_admin(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403

    reason = (data.get("reason") or "").strip()
    for item in data["items"]:
        product_id = item.get("product_id")
        qty = float(item.get("quantity", 0) or 0)
        if not product_id or qty <= 0:
            continue
        product = Product.query.get(product_id)
        if not product or product.service_center_id != sc_id:
            return jsonify({"error": f"Товар {product_id} не найден"}), 404
        cur = float(product.stock_quantity or 0)
        if qty > cur:
            return jsonify({"error": f"Недостаточно остатка для «{product.name}»"}), 400
        product.stock_quantity = cur - qty
        db.session.add(StockMovement(
            service_center_id=sc_id,
            product_id=product.id,
            user_id=user_id,
            type="writeoff",
            quantity=qty,
            reason=reason,
        ))

    db.session.commit()
    emit_to_users_for_center(sc_id)
    return jsonify({"ok": True})


@purchases_bp.route("/movements", methods=["GET"])
@jwt_required()
def list_movements():
    user_id = int(get_jwt_identity())
    sc_id = request.args.get("service_center_id", type=int)
    if not sc_id:
        return jsonify({"error": "service_center_id required"}), 400
    if not user_belongs_to_center(user_id, sc_id):
        return jsonify({"error": "Access denied"}), 403
    movements = (StockMovement.query
                 .filter_by(service_center_id=sc_id)
                 .order_by(StockMovement.created_at.desc())
                 .limit(500)
                 .all())
    return jsonify([m.to_dict() for m in movements])


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
    emit_to_users_for_center(order.service_center_id)
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
    emit_to_users_for_center(order.service_center_id)
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


@purchases_bp.route("/orders/<int:order_id>/receive", methods=["POST"])
@jwt_required()
def receive_order(order_id):
    user_id = int(get_jwt_identity())
    order = Purchase.query.get_or_404(order_id)
    if not is_purchase_admin(user_id, order.service_center_id):
        return jsonify({"error": "Access denied"}), 403
    if order.status == "received":
        return jsonify({"error": "Заказ уже оприходован"}), 409

    data = request.get_json() or {}
    received_items = data.get("items", []) if isinstance(data.get("items"), list) else []

    for item in order.items:
        received = float(item.quantity - (item.returned_quantity or 0))
        for r in received_items:
            if r.get("item_id") == item.id:
                received = float(r.get("quantity", received) or 0)
        if received <= 0:
            continue
        product = Product.query.get(item.product_id)
        if product:
            product.stock_quantity = float(product.stock_quantity or 0) + received
            db.session.add(StockMovement(
                service_center_id=order.service_center_id,
                product_id=product.id,
                user_id=user_id,
                type="receive",
                quantity=received,
                reason=f"Приёмка заказа №{order.id}",
                related_purchase_id=order.id,
            ))

    order.status = "received"
    order.updated_at = datetime.now(timezone.utc)
    db.session.commit()
    emit_to_users_for_center(order.service_center_id)
    return jsonify(order.to_dict())


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
    emit_to_users_for_center(order.service_center_id)
    return jsonify({"ok": True})


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
