import os
import logging
from models import Setting, TimeEntry, ShiftDocument, CustomField, CustomFieldValue
from telegram_bot import send_telegram_photo_sync, send_telegram_document_sync

logger = logging.getLogger(__name__)


def send_shift_to_telegram(time_entry_id: int):
    chat_id_str = Setting.get("telegram_storage_chat_id", "")
    if not chat_id_str:
        return

    try:
        chat_id = int(chat_id_str)
    except ValueError:
        logger.warning(f"Invalid telegram_storage_chat_id: {chat_id_str}")
        return

    topic_str = Setting.get("telegram_storage_topic_id", "")
    thread_id = int(topic_str) if topic_str and topic_str.isdigit() else None

    entry = TimeEntry.query.get(time_entry_id)
    if not entry or not entry.clock_out:
        return

    entry_data = entry.to_dict()
    sc_name = entry_data.get("service_center_name", "")
    user_name = entry_data.get("user_name", "")
    clock_in_str = entry_data.get("clock_in", "")[:16] if entry_data.get("clock_in") else ""
    clock_out_str = entry_data.get("clock_out", "")[:16] if entry_data.get("clock_out") else ""
    duration = entry_data.get("duration_hours", "")
    notes = entry_data.get("notes", "") or ""

    docs = ShiftDocument.query.filter_by(time_entry_id=time_entry_id).order_by(
        ShiftDocument.created_at.asc()
    ).all()
    if not docs:
        return

    fields = CustomField.query.filter_by(service_center_id=entry.service_center_id).order_by(
        CustomField.sort_order
    ).all()
    values = CustomFieldValue.query.filter_by(time_entry_id=time_entry_id).all()
    value_map = {v.custom_field_id: v.value for v in values}
    field_lines = []
    for f in fields:
        val = value_map.get(f.id, "")
        if val:
            field_lines.append(f"<b>{f.name}:</b> {val}")

    caption_parts = [
        f"<b>Смена #{entry.id}</b>",
        f"<b>Сотрудник:</b> {user_name}",
        f"<b>Центр:</b> {sc_name}",
    ]
    if clock_in_str:
        caption_parts.append(f"<b>Начало:</b> {clock_in_str}")
    if clock_out_str:
        caption_parts.append(f"<b>Конец:</b> {clock_out_str}")
    if duration:
        caption_parts.append(f"<b>Часов:</b> {duration}")
    if field_lines:
        caption_parts.append("")
        caption_parts.extend(field_lines)
    if notes:
        caption_parts.append("")
        caption_parts.append(f"<i>Комментарий:</i> {notes}")

    caption = "\n".join(caption_parts)

    image_docs = [d for d in docs if d.mime_type and d.mime_type.startswith("image/")]
    file_docs = [d for d in docs if not d.mime_type or not d.mime_type.startswith("image/")]

    upload_dir = None
    from flask import current_app
    if current_app:
        upload_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], "shift_docs")

    if upload_dir:
        if image_docs:
            first = True
            for d in image_docs:
                file_path = os.path.join(upload_dir, d.filename)
                if not os.path.exists(file_path):
                    continue
                cap = caption if first else None
                send_telegram_photo_sync(chat_id, file_path, cap, thread_id)
                first = False

        for d in file_docs:
            file_path = os.path.join(upload_dir, d.filename)
            if not os.path.exists(file_path):
                continue
            send_telegram_document_sync(chat_id, file_path, d.original_name, None, thread_id)
