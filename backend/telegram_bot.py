import logging

logger = logging.getLogger(__name__)

# Bot now runs as a separate container.
# This module provides backward-compatible sync wrappers for Flask-side code
# that needs to send messages (notifications, storage, etc.)


def _bot_token():
    import os
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        from models import Setting
        token = Setting.get("bot_token", "")
    return token


def send_telegram_message_sync(chat_id: int, text: str,
                                message_thread_id: int | None = None):
    from bot.services.telegram import send_message
    return send_message(chat_id, text, message_thread_id=message_thread_id)


def send_telegram_photo_sync(chat_id: int, file_path: str, caption: str | None = None,
                              message_thread_id: int | None = None):
    from bot.services.telegram import send_photo
    return send_photo(chat_id, file_path, caption=caption, message_thread_id=message_thread_id)


def send_telegram_document_sync(chat_id: int, file_path: str, filename: str | None = None,
                                 caption: str | None = None,
                                 message_thread_id: int | None = None):
    from bot.services.telegram import send_document
    return send_document(chat_id, file_path, filename=filename, caption=caption, message_thread_id=message_thread_id)


def send_telegram_media_group_sync(chat_id: int, media: list,
                                    message_thread_id: int | None = None):
    from bot.services.telegram import send_media_group
    return send_media_group(chat_id, media, message_thread_id=message_thread_id)


def ensure_bot(token: str = "", base_url: str = "", app=None):
    logger.info("Bot runs as separate container — ensure_bot is a no-op")


def stop_bot():
    logger.info("Bot runs as separate container — stop_bot is a no-op")


def is_bot_running() -> bool:
    return False
