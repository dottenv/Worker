import hashlib
import hmac
import json
import logging
from urllib.parse import parse_qs

from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import User
from extensions import db
from helpers import get_current_user

logger = logging.getLogger(__name__)

telegram_bp = Blueprint("telegram", __name__, url_prefix="/api/telegram")


def validate_telegram_init_data(init_data: str, bot_token: str) -> dict | None:
    try:
        parsed = parse_qs(init_data)
        data = {k: v[0] for k, v in parsed.items()}
        received_hash = data.pop("hash", None)
        if not received_hash:
            return None
        check_string = "\n".join(f"{k}={v}" for k, v in sorted(data.items()))
        secret_key = hmac.new(b"WebAppData", bot_token.encode(), hashlib.sha256).digest()
        computed_hash = hmac.new(secret_key, check_string.encode(), hashlib.sha256).hexdigest()
        if computed_hash != received_hash:
            return None
        return data
    except Exception as e:
        logger.error(f"Telegram init data validation error: {e}")
        return None


@telegram_bp.route("/connect", methods=["POST"])
@jwt_required()
def connect_telegram():
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data provided"}), 400

    init_data = data.get("init_data")
    if init_data:
        bot_token = current_app.config.get("TELEGRAM_BOT_TOKEN", "")
        validated = validate_telegram_init_data(init_data, bot_token)
        if validated:
            user_data = json.loads(validated.get("user", "{}"))
            chat_id = user_data.get("id")
            username = user_data.get("username", "")
            if chat_id:
                existing = User.query.filter_by(telegram_chat_id=chat_id).first()
                if existing and existing.id != user.id:
                    return jsonify({"error": "Telegram аккаунт уже привязан к другому пользователю"}), 409
                user.telegram_chat_id = chat_id
                user.telegram_username = username
                db.session.commit()
                return jsonify({"status": "connected", "telegram_id": chat_id, "username": username})

    telegram_id = data.get("telegram_id")
    telegram_username = data.get("telegram_username", "")
    if telegram_id:
        existing = User.query.filter_by(telegram_chat_id=telegram_id).first()
        if existing and existing.id != user.id:
            return jsonify({"error": "Telegram аккаунт уже привязан к другому пользователю"}), 409
        user.telegram_chat_id = telegram_id
        user.telegram_username = telegram_username
        db.session.commit()
        return jsonify({"status": "connected", "telegram_id": telegram_id, "username": telegram_username})

    return jsonify({"error": "Missing telegram_id or init_data"}), 400


@telegram_bp.route("/disconnect", methods=["POST"])
@jwt_required()
def disconnect_telegram():
    user = get_current_user()
    user.telegram_chat_id = None
    user.telegram_username = ""
    db.session.commit()
    return jsonify({"status": "disconnected"})


@telegram_bp.route("/status", methods=["GET"])
@jwt_required()
def telegram_status():
    user = get_current_user()
    return jsonify({
        "connected": user.telegram_chat_id is not None,
        "telegram_id": user.telegram_chat_id,
        "telegram_username": user.telegram_username or "",
    })
