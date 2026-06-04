from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


def settings_keyboard() -> InlineKeyboardMarkup:
    from models import Setting
    base_url = Setting.get("base_url", "")
    storage_chat = Setting.get("telegram_storage_chat_id", "")
    finance = Setting.get("finance_enabled", "false")

    lines = []
    url_status = "✅" if base_url else "❌"
    lines.append([InlineKeyboardButton(
        text=f"{url_status} URL: {base_url or 'не задан'}",
        callback_data="set_base_url"
    )])
    chat_status = "✅" if storage_chat else "❌"
    lines.append([InlineKeyboardButton(
        text=f"{chat_status} Чат: {storage_chat or 'не задан'}",
        callback_data="set_storage_chat"
    )])
    lines.append([InlineKeyboardButton(
        text=f"{'✅' if finance == 'true' else '❌'} Финансы: {'вкл' if finance == 'true' else 'выкл'}",
        callback_data="toggle_finance"
    )])
    lines.append([InlineKeyboardButton(text="📊 Статус", callback_data="show_status")])
    lines.append([InlineKeyboardButton(text="❌ Закрыть", callback_data="close_settings")])
    return InlineKeyboardMarkup(inline_keyboard=lines)


def back_button() -> InlineKeyboardMarkup:
    return InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⬅ Назад", callback_data="settings_main")]
    ])
