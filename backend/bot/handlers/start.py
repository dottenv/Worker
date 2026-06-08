from aiogram import Router
from aiogram.types import Message
from aiogram.filters import CommandStart
import requests

from bot.keyboards.keyboards import settings_keyboard
from models import Setting

router = Router()


@router.message(CommandStart())
async def cmd_start(message: Message):
    base_url = Setting.get("base_url", "")
    chat_id = message.chat.id
    Setting.set("telegram_chat_id", str(chat_id))
    text = (
        "👋 Добро пожаловать в Worker!\n\n"
        "Этот бот помогает управлять заявками и документами.\n"
        "— Используйте /settings для настройки\n"
        "— Используйте /help для справки"
    )
    result_url = None
    if base_url:
        result_url = base_url.strip()
        if not result_url.startswith(("http://", "https://")):
            result_url = "https://" + result_url
    if result_url:
        try:
            resp = requests.get(result_url, timeout=5)
            if resp.status_code < 500:
                from aiogram.types import WebAppInfo, InlineKeyboardButton, InlineKeyboardMarkup
                kb = InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(
                        text="Открыть Worker",
                        web_app=WebAppInfo(url=result_url.rstrip("/") + "/login")
                    )],
                    [InlineKeyboardButton(text="⚙ Настройки", callback_data="settings_main")]
                ])
                await message.answer(text, reply_markup=kb)
                return
        except requests.RequestException:
            pass
    from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup
    kb = InlineKeyboardMarkup(inline_keyboard=[
        [InlineKeyboardButton(text="⚙ Настройки", callback_data="settings_main")]
    ])
    await message.answer(text, reply_markup=kb)
