import json
import logging
from pywebpush import webpush, WebPushException
from flask import current_app
from py_vapid import Vapid

logger = logging.getLogger(__name__)

# All notification types that can trigger a push
PUSH_NOTIFICATION_TYPES = [
    "welcome",
    "center_access",
    "swap_created",
    "swap_accepted",
    "swap_rejected",
    "swap_cancelled",
    "swap_forced",
    "schedule_update",
]


def send_push(user_id: int, title: str, body: str, url: str = "/swaps", notification_type: str = ""):
    """Send push notification to all subscriptions of a user (if they have the type enabled)."""
    from models import PushSubscription, User

    user = User.query.get(user_id)
    if not user:
        return

    # Check per-type preference
    if notification_type:
        import json as _json
        prefs = {}
        if user.push_prefs:
            try:
                prefs = _json.loads(user.push_prefs)
            except _json.JSONDecodeError:
                prefs = {}
        if prefs and prefs.get(notification_type) is False:
            return

    subs = PushSubscription.query.filter_by(user_id=user_id).all()
    if not subs:
        return

    vapid_private = current_app.config.get("VAPID_PRIVATE_KEY", "")

    if not vapid_private:
        logger.warning("VAPID keys not configured, skipping push")
        return

    try:
        vapid = Vapid.from_pem(vapid_private.encode("utf-8"))
    except Exception as e:
        logger.warning(f"Failed to parse VAPID private key: {e}")
        return

    payload = json.dumps({
        "title": title,
        "body": body,
        "url": url,
        "sound": user.push_sound,
    })

    for sub in subs:
        try:
            webpush(
                subscription_info={
                    "endpoint": sub.endpoint,
                    "keys": {
                        "p256dh": sub.p256dh,
                        "auth": sub.auth,
                    },
                },
                data=payload,
                vapid_private_key=vapid,
                vapid_claims={
                    "sub": f"mailto:admin@serviceapp.local",
                },
            )
        except WebPushException as e:
            if e.response and e.response.status_code == 410:
                from extensions import db
                db.session.delete(sub)
                db.session.commit()
            else:
                logger.warning(f"Push send failed to {sub.id}: {e}")
        except Exception as e:
            logger.warning(f"Push send error to {sub.id}: {e}")
