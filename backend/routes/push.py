import json
import os
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required
from models import User, PushSubscription
from extensions import db
from helpers import get_current_user

push_bp = Blueprint("push", __name__, url_prefix="/api/push")


@push_bp.route("/subscribe", methods=["POST"])
@jwt_required()
def subscribe():
    user = get_current_user()
    data = request.get_json()
    if not data or not data.get("endpoint") or not data.get("keys"):
        return jsonify({"error": "endpoint and keys are required"}), 400

    keys = data["keys"]
    endpoint = data["endpoint"]
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not all([endpoint, p256dh, auth]):
        return jsonify({"error": "Invalid subscription data"}), 400

    existing = PushSubscription.query.filter_by(
        user_id=user.id, endpoint=endpoint
    ).first()
    if existing:
        existing.p256dh = p256dh
        existing.auth = auth
        db.session.commit()
        return jsonify({"message": "Subscription updated"}), 200

    sub = PushSubscription(
        user_id=user.id,
        endpoint=endpoint,
        p256dh=p256dh,
        auth=auth,
    )
    db.session.add(sub)
    db.session.commit()
    return jsonify({"message": "Subscribed"}), 201


@push_bp.route("/unsubscribe", methods=["DELETE"])
@jwt_required()
def unsubscribe():
    user = get_current_user()
    data = request.get_json()
    endpoint = data.get("endpoint") if data else None

    query = PushSubscription.query.filter_by(user_id=user.id)
    if endpoint:
        query = query.filter_by(endpoint=endpoint)

    query.delete()
    db.session.commit()
    return jsonify({"message": "Unsubscribed"}), 200


@push_bp.route("/preferences", methods=["GET"])
@jwt_required()
def get_preferences():
    user = get_current_user()
    import json as _json
    prefs = {}
    if user.push_prefs:
        try:
            prefs = _json.loads(user.push_prefs)
        except _json.JSONDecodeError:
            prefs = {}
    return jsonify({
        "prefs": prefs,
        "sound": user.push_sound,
    })


@push_bp.route("/preferences", methods=["PUT"])
@jwt_required()
def set_preferences():
    user = get_current_user()
    data = request.get_json()
    if not data:
        return jsonify({"error": "No data"}), 400
    if "prefs" in data:
        import json as _json
        user.push_prefs = _json.dumps(data["prefs"])
    if "sound" in data:
        user.push_sound = bool(data["sound"])
    db.session.commit()
    return jsonify({"ok": True})
