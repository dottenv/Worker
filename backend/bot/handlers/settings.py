from aiogram import Router, F
from aiogram.types import Message, CallbackQuery
from aiogram.filters import Command
from aiogram.fsm.context import FSMContext

from bot.utils.states import SettingsStates
from bot.keyboards.keyboards import settings_keyboard, back_button
from models import Setting

router = Router()


@router.message(Command("settings"))
async def cmd_settings(message: Message):
    kb = settings_keyboard()
    await message.answer("⚙ <b>Настройки бота</b>\n\nВыберите пункт:", reply_markup=kb)


@router.callback_query(F.data == "settings_main")
async def settings_main(callback: CallbackQuery):
    kb = settings_keyboard()
    await callback.message.edit_text(
        "⚙ <b>Настройки бота</b>\n\nВыберите пункт:", reply_markup=kb
    )
    await callback.answer()


@router.callback_query(F.data == "set_base_url")
async def set_base_url(callback: CallbackQuery, state: FSMContext):
    current = Setting.get("base_url", "")
    text = (
        f"📍 <b>Текущий URL:</b> {current or 'не задан'}\n\n"
        "Отправьте новый URL (с https://):"
    )
    await callback.message.edit_text(text, reply_markup=back_button())
    await state.set_state(SettingsStates.waiting_base_url)
    await callback.answer()


@router.callback_query(F.data == "set_storage_chat")
async def set_storage_chat(callback: CallbackQuery, state: FSMContext):
    current = Setting.get("telegram_storage_chat_id", "")
    text = (
        f"📁 <b>Текущий чат хранения:</b> {current or 'не задан'}\n\n"
        "Отправьте ID чата (например, -1001234567890):"
    )
    await callback.message.edit_text(text, reply_markup=back_button())
    await state.set_state(SettingsStates.waiting_storage_chat)
    await callback.answer()


@router.callback_query(F.data == "toggle_finance")
async def toggle_finance(callback: CallbackQuery):
    current = Setting.get("finance_enabled", "false")
    new_val = "false" if current == "true" else "true"
    Setting.set("finance_enabled", new_val)
    kb = settings_keyboard()
    await callback.message.edit_text(
        f"✅ Финансы {'включены' if new_val == 'true' else 'выключены'}",
        reply_markup=kb
    )
    await callback.answer()


@router.callback_query(F.data == "show_status")
async def show_status(callback: CallbackQuery):
    base_url = Setting.get("base_url", "")
    storage = Setting.get("telegram_storage_chat_id", "")
    chat = Setting.get("telegram_chat_id", "")
    finance = Setting.get("finance_enabled", "false")
    topic = Setting.get("telegram_forum_topic_id", "")

    lines = [
        "📊 <b>Статус</b>\n",
        f"🌐 URL: {'✅' if base_url else '❌'} {base_url or 'не задан'}",
        f"💬 Чат хранения: {'✅' if storage else '❌'} {storage or 'не задан'}",
        f"👤 Текущий чат: {chat or 'не задан'}",
        f"💰 Финансы: {'вкл' if finance == 'true' else 'выкл'}",
        f"📌 Тема форума: {topic or 'не задана'}",
    ]
    await callback.message.edit_text(
        "\n".join(lines), reply_markup=back_button()
    )
    await callback.answer()


@router.callback_query(F.data == "close_settings")
async def close_settings(callback: CallbackQuery):
    await callback.message.delete()
    await callback.answer()


@router.message(SettingsStates.waiting_base_url)
async def handle_base_url_input(message: Message, state: FSMContext):
    url = message.text.strip()
    if not url.startswith(("http://", "https://")):
        url = "https://" + url
    Setting.set("base_url", url)
    await state.clear()
    kb = settings_keyboard()
    await message.answer(f"✅ URL сохранён: {url}", reply_markup=kb)


@router.message(SettingsStates.waiting_storage_chat)
async def handle_storage_chat_input(message: Message, state: FSMContext):
    chat_id = message.text.strip()
    Setting.set("telegram_storage_chat_id", chat_id)
    await state.clear()
    kb = settings_keyboard()
    await message.answer(f"✅ Чат хранения сохранён: {chat_id}", reply_markup=kb)
