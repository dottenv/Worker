from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, ServiceCenter, ServiceCenterMember
from models.user import pick_user_color
from extensions import db
from socket_events import get_online_user_ids

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")
    full_name = data.get("full_name", "").strip()

    if not email or not password or not full_name:
        return jsonify({"error": "Email, password and full_name are required"}), 400

    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(email=email, full_name=full_name, phone=data.get("phone", ""), color=pick_user_color())
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    from notification_helper import create_notification
    create_notification(user.id, "welcome", "Добро пожаловать!", "Вы успешно зарегистрировались. Дождитесь доступа к сервисному центру от администратора или создайте свой.", "/settings")

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    user = User.query.filter_by(email=email).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    token = create_access_token(identity=str(user.id))
    return jsonify({"token": token, "user": user.to_dict()}), 200


@auth_bp.route("/me", methods=["GET"])
@jwt_required()
def me():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify(user.to_dict()), 200


@auth_bp.route("/role", methods=["GET"])
@jwt_required()
def my_role():
    user_id = int(get_jwt_identity())
    owned_count = ServiceCenter.query.filter_by(owner_id=user_id).count()
    admin_count = ServiceCenterMember.query.filter_by(
        user_id=user_id, role="admin", is_active=True
    ).count()
    return jsonify({
        "is_owner": owned_count > 0,
        "is_admin": admin_count > 0,
    }), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    # Обновление ФИО
    if "full_name" in data:
        full_name = data["full_name"].strip()
        if not full_name:
            return jsonify({"error": "Full name cannot be empty"}), 400
        user.full_name = full_name

    # Обновление email (проверка на уникальность)
    if "email" in data:
        email = data["email"].strip().lower()
        if not email:
            return jsonify({"error": "Email cannot be empty"}), 400
        if email != user.email and User.query.filter_by(email=email).first():
            return jsonify({"error": "Email already in use"}), 409
        user.email = email

    # Обновление телефона
    if "phone" in data:
        user.phone = data["phone"] or ""

    # Обновление пароля
    if "password" in data:
        password = data["password"]
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        user.set_password(password)

    db.session.commit()
    return jsonify(user.to_dict()), 200


@auth_bp.route("/profile/<int:target_id>", methods=["GET"])
@jwt_required()
def get_user_profile(target_id):
    user = User.query.get_or_404(target_id)
    d = user.to_dict()
    d["online"] = target_id in get_online_user_ids()
    return jsonify(d), 200


@auth_bp.route("/profile/<int:target_id>/centers", methods=["GET"])
@jwt_required()
def get_user_centers(target_id):
    memberships = ServiceCenterMember.query.filter_by(
        user_id=target_id, is_active=True
    ).all()
    result = []
    for m in memberships:
        sc = ServiceCenter.query.get(m.service_center_id)
        if sc:
            result.append({
                "id": sc.id,
                "name": sc.name,
                "role": m.role,
            })
    return jsonify(result), 200


@auth_bp.route("/nav-config", methods=["GET"])
@jwt_required()
def get_nav_config():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    import json
    nav = {}
    if user.nav_config:
        try:
            nav = json.loads(user.nav_config)
        except json.JSONDecodeError:
            nav = {}
    return jsonify(nav), 200


@auth_bp.route("/nav-config", methods=["PUT"])
@jwt_required()
def update_nav_config():
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    data = request.get_json()
    if not data or "pinned" not in data:
        return jsonify({"error": "pinned array is required"}), 400
    pinned = data["pinned"]
    if not isinstance(pinned, list) or len(pinned) > 5:
        return jsonify({"error": "pinned must be an array with at most 5 items"}), 400
    import json
    user.nav_config = json.dumps({"pinned": pinned})
    db.session.commit()
    return jsonify({"pinned": pinned}), 200
