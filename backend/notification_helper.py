import threading
from models.notification import Notification
from extensions import db, socketio
from flask import current_app
from push_helper import send_push
from telegram_notifier import send_tg_notification

_debounce = {}
_debounce_lock = threading.Lock()
DEBOUNCE_SECONDS = 3


def _flush_debounce(user_id, type, body, _first_body, title, link, count, _app):
    with _debounce_lock:
        key = (user_id, type)
        _debounce.pop(key, None)

    if count > 1:
        body = f"{_first_body} (ещё {count - 1})"

    with _app.app_context():
        try:
            n = Notification(user_id=user_id, type=type, title=title, body=body, link=link)
            db.session.add(n)
            db.session.commit()
            socketio.emit("notification:new", n.to_dict(), to=f"user_{user_id}")
            send_push(user_id, title, body, link, notification_type=type)
            send_tg_notification(user_id, title, body, type)
        except Exception as e:
            current_app.logger.error(f"Failed to create debounced notification: {e}")
            db.session.rollback()


def create_notification(user_id, type, title, body=None, link=None):
    key = (user_id, type)

    with _debounce_lock:
        pending = _debounce.get(key)

        if pending and pending["title"] == title:
            pending["count"] += 1
            if link:
                pending["link"] = link
            pending["timer"].cancel()
            timer = threading.Timer(
                DEBOUNCE_SECONDS,
                _flush_debounce,
                args=[user_id, type, body, pending["_first_body"], title, pending["link"], pending["count"], pending["_app"]],
            )
            timer.daemon = True
            timer.start()
            pending["timer"] = timer
            return

        _app = current_app._get_current_object()
        timer = threading.Timer(
            DEBOUNCE_SECONDS,
            _flush_debounce,
            args=[user_id, type, body, body, title, link, 1, _app],
        )
        timer.daemon = True
        timer.start()
        _debounce[key] = {
            "timer": timer,
            "title": title,
            "body": body,
            "_first_body": body,
            "link": link,
            "count": 1,
            "_app": _app,
        }
