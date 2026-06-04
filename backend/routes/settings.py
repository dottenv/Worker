import logging
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required
from models import Setting, User
from extensions import db
from helpers import get_current_user

logger = logging.getLogger(__name__)

settings_bp = Blueprint("settings", __name__, url_prefix="/api/settings")

TELEGRAM_KEYS = {
    "telegram_bot_enabled",
    "telegram_bot_token",
    "telegram_storage_chat_id",
    "telegram_storage_topic_id",
    "base_url",
}

FINANCE_KEYS = {"finance_enabled"}

ALLOWED_KEYS = TELEGRAM_KEYS | FINANCE_KEYS


def is_owner():
    user = get_current_user()
    if not user:
        return False
    from models import ServiceCenterMember
    return ServiceCenterMember.query.filter_by(
        user_id=user.id, role="owner"
    ).count() > 0


@settings_bp.route("", methods=["GET"])
@jwt_required()
def get_settings():
    user = get_current_user()
    result = {}
    is_own = is_owner()
    for s in Setting.query.all():
        if s.key in FINANCE_KEYS and not is_own:
            continue
        if s.key in TELEGRAM_KEYS and not is_own:
            continue
        result[s.key] = s.value
    result["finance_enabled"] = result.get("finance_enabled", "false")
    return jsonify(result)


@settings_bp.route("", methods=["PUT"])
@jwt_required()
def update_settings():
    if not is_owner():
        return jsonify({"error": "Only owners can update settings"}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400

    updated_telegram = False
    for key, value in data.items():
        if key not in ALLOWED_KEYS:
            continue
        Setting.set(key, str(value))
        if key in TELEGRAM_KEYS:
            updated_telegram = True

    db.session.commit()

    if updated_telegram:
        _sync_telegram_bot()

    return jsonify({"status": "ok"})


@settings_bp.route("/sync-bot", methods=["POST"])
@jwt_required()
def sync_bot():
    if not is_owner():
        return jsonify({"error": "Access denied"}), 403
    _sync_telegram_bot()
    return jsonify({"status": "ok"})


def _sync_telegram_bot():
    from flask import current_app as _current_app
    from telegram_bot import ensure_bot
    app = _current_app._get_current_object()

    token = Setting.get("telegram_bot_token", "")
    base_url = Setting.get("base_url", "")
    enabled = Setting.get("telegram_bot_enabled", "false") == "true"

    if enabled and token:
        ensure_bot(token, base_url, app=app)
    else:
        ensure_bot("", "", app=app)


@settings_bp.route("/verify-chat", methods=["GET"])
@jwt_required()
def verify_chat():
    if not is_owner():
        return jsonify({"error": "Access denied"}), 403

    chat_id_str = request.args.get("chat_id", "")
    if not chat_id_str:
        return jsonify({"error": "chat_id required"}), 400

    token = Setting.get("telegram_bot_token", "")
    if not token:
        return jsonify({"error": "Bot token not configured"}), 400

    try:
        chat_id = int(chat_id_str)
    except ValueError:
        return jsonify({"error": "Invalid chat_id"}), 400

    import json as _json
    from urllib.request import urlopen
    from urllib.error import URLError

    try:
        resp = urlopen(
            f"https://api.telegram.org/bot{token}/getChat?chat_id={chat_id}",
            timeout=10,
        )
        data = _json.loads(resp.read().decode())
    except URLError as e:
        return jsonify({"error": f"Telegram API error: {e.reason}"}), 502

    if not data.get("ok"):
        return jsonify({"error": data.get("description", "Unknown error")}), 400

    chat = data["result"]
    return jsonify({
        "id": chat.get("id"),
        "title": chat.get("title") or chat.get("first_name") or "",
        "type": chat.get("type", ""),
        "is_forum": chat.get("is_forum", False),
        "username": chat.get("username"),
        "invite_link": chat.get("invite_link"),
    })


@settings_bp.route("/topics", methods=["GET"])
@jwt_required()
def get_known_topics():
    if not is_owner():
        return jsonify({"error": "Access denied"}), 403

    import json as _json
    raw = Setting.get("telegram_known_topics", "{}")
    try:
        topics = _json.loads(raw)
    except _json.JSONDecodeError:
        topics = {}
    return jsonify({"topics": topics})
