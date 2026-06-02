from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from models.notification import Notification
from extensions import db

notifications_bp = Blueprint("notifications", __name__)


@notifications_bp.route("/api/notifications", methods=["GET"])
@jwt_required()
def list_notifications():
    user_id = get_jwt_identity()
    page = 1
    per_page = 50

    q = Notification.query.filter_by(user_id=user_id).order_by(Notification.created_at.desc())
    total = q.count()
    unread = Notification.query.filter_by(user_id=user_id, read=False).count()
    items = q.offset((page - 1) * per_page).limit(per_page).all()

    return jsonify({
        "notifications": [n.to_dict() for n in items],
        "total": total,
        "unread": unread,
    })


@notifications_bp.route("/api/notifications/<int:nid>/read", methods=["PUT"])
@jwt_required()
def mark_read(nid):
    user_id = get_jwt_identity()
    n = Notification.query.filter_by(id=nid, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    n.read = True
    db.session.commit()
    return jsonify(n.to_dict())


@notifications_bp.route("/api/notifications", methods=["DELETE"])
@jwt_required()
def delete_all():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id).delete()
    db.session.commit()
    return jsonify({"ok": True})


@notifications_bp.route("/api/notifications/read-all", methods=["PUT"])
@jwt_required()
def mark_all_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, read=False).update({"read": True})
    db.session.commit()
    return jsonify({"ok": True})


@notifications_bp.route("/api/notifications/read", methods=["DELETE"])
@jwt_required()
def delete_read():
    user_id = get_jwt_identity()
    Notification.query.filter_by(user_id=user_id, read=True).delete()
    db.session.commit()
    return jsonify({"ok": True})


@notifications_bp.route("/api/notifications/<int:nid>", methods=["DELETE"])
@jwt_required()
def delete_one(nid):
    user_id = get_jwt_identity()
    n = Notification.query.filter_by(id=nid, user_id=user_id).first()
    if not n:
        return jsonify({"error": "Not found"}), 404
    db.session.delete(n)
    db.session.commit()
    return jsonify({"ok": True})
