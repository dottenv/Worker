import logging
from models import User

logger = logging.getLogger(__name__)

TG_EMOJI = {
    "welcome": "👋",
    "center_access": "🏢",
    "swap_created": "🔄",
    "swap_accepted": "✅",
    "swap_rejected": "❌",
    "swap_cancelled": "🚫",
    "swap_forced": "⚡",
    "schedule_update": "📅",
}


def send_tg_notification(user_id: int, title: str, body: str = None, notification_type: str = ""):
    from telegram_bot import send_telegram_message_sync

    user = User.query.get(user_id)
    if not user or not user.telegram_chat_id:
        return

    import json as _json
    prefs = {}
    if user.push_prefs:
        try:
            prefs = _json.loads(user.push_prefs)
        except _json.JSONDecodeError:
            prefs = {}
    if notification_type and prefs and prefs.get(notification_type) is False:
        return

    emoji = TG_EMOJI.get(notification_type, "🔔")
    text = f"{emoji} <b>{title}</b>"
    if body:
        text += f"\n{body}"
    text += "\n\n— <i>Worker</i>"

    send_telegram_message_sync(user.telegram_chat_id, text)
