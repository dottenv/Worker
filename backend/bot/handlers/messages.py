import re

from aiogram import Router, F
from aiogram.types import Message

from models import Setting

router = Router()


@router.message(F.text)
async def capture_forum_topic(message: Message):
    chat_id = Setting.get("telegram_storage_chat_id", "")
    if not chat_id or str(message.chat.id) != chat_id:
        return
    if message.is_topic_message and message.message_thread_id:
        known = Setting.get("telegram_known_topics", "[]")
        import json
        try:
            topics = json.loads(known)
        except (json.JSONDecodeError, TypeError):
            topics = []
        for t in topics:
            if t.get("thread_id") == message.message_thread_id:
                return
        name = message.forum_topic_created.name if message.forum_topic_created else (
            re.sub(r'[^\w\s-]', '', message.text.split("\n")[0])[:30]
        )
        topics.append({"thread_id": message.message_thread_id, "name": name})
        Setting.set("telegram_known_topics", json.dumps(topics, ensure_ascii=False))
