from models.notification import Notification
from extensions import db, socketio
from flask import current_app
from push_helper import send_push


def create_notification(user_id, type, title, body=None, link=None):
    try:
        n = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
        db.session.add(n)
        db.session.commit()

        socketio.emit("notification:new", n.to_dict(), to=f"user_{user_id}")

        send_push(user_id, title, body or "", link or "/swaps", notification_type=type)
    except Exception as e:
        current_app.logger.error(f"Failed to create notification: {e}")
        db.session.rollback()
