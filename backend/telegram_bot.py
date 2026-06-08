import logging

logger = logging.getLogger(__name__)

# Bot now runs as a separate container.
# This module provides backward-compatible sync wrappers for Flask-side code
# that needs to send messages (notifications, storage, etc.)


<<<<<<< HEAD
class SettingsStates(StatesGroup):
    waiting_base_url = State()
    waiting_token = State()


def _get_ctx():
    from flask import current_app
    try:
        return current_app._get_current_object()
    except RuntimeError:
        return _flask_app


def _with_ctx(coro):
    ctx = _get_ctx()
    if ctx is None:
        return None
    return ctx.app_context()


def _settings_keyboard():
    from models import Setting
    base_url = Setting.get("base_url", "")
    storage_chat = Setting.get("telegram_storage_chat_id", "")
    storage_topic = Setting.get("telegram_storage_topic_id", "")
    finance = Setting.get("finance_enabled", "false")
    token = Setting.get("telegram_bot_token", "")

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


def _build_handlers(dp_instance: Dispatcher):
    @dp_instance.message(Command("start"))
    async def cmd_start(message: types.Message):
        ctx = _get_ctx()
        if ctx is None:
            await message.answer("Ошибка конфигурации сервера.")
            return
        with ctx.app_context():
            from models import Setting
            base_url = Setting.get("base_url", "")
            if base_url and (base_url.startswith("http://") or base_url.startswith("https://")):
                web_app_url = f"{base_url}/telegram/connect"
                keyboard = InlineKeyboardMarkup(
                    inline_keyboard=[
                        [InlineKeyboardButton(
                            text="Открыть MiniApp",
                            web_app=WebAppInfo(url=web_app_url)
                        )]
                    ]
                )
                await message.answer(
                    "Добро пожаловать в Worker!\n\n"
                    "Нажмите кнопку ниже, чтобы открыть MiniApp и привязать аккаунт.",
                    reply_markup=keyboard
                )
                return
            await message.answer(
                "Добро пожаловать в Worker!\n\n"
                "Администратор ещё не настроил бота. Используйте /settings чтобы настроить."
            )

    @dp_instance.message(Command("help"))
    async def cmd_help(message: types.Message):
        await message.answer(
            "Команды:\n"
            "/start - Открыть MiniApp\n"
            "/settings - Настройки бота\n"
            "/help - Помощь"
        )

    @dp_instance.message(Command("settings"))
    async def cmd_settings(message: types.Message, state: FSMContext):
        await state.clear()
        ctx = _get_ctx()
        if ctx is None:
            await message.answer("Ошибка конфигурации сервера.")
            return
        with ctx.app_context():
            kb = _settings_keyboard()
            await message.answer("⚙️ Настройки бота:", reply_markup=kb)

    @dp_instance.callback_query(lambda c: c.data == "settings_main")
    async def settings_main(call: types.CallbackQuery, state: FSMContext):
        await state.clear()
        await call.answer()
        ctx = _get_ctx()
        if ctx is None:
            await call.message.edit_text("Ошибка конфигурации.")
            return
        with ctx.app_context():
            kb = _settings_keyboard()
            await call.message.edit_text("⚙️ Настройки бота:", reply_markup=kb)

    @dp_instance.callback_query(lambda c: c.data == "set_storage_chat")
    async def set_storage_chat(call: types.CallbackQuery):
        await call.answer()
        if not call.message:
            return
        ctx = _get_ctx()
        if ctx is None:
            return
        with ctx.app_context():
            from models import Setting
            Setting.set("telegram_storage_chat_id", str(call.message.chat.id))
            Setting.set("telegram_storage_topic_id", "")
            await call.message.edit_text(
                f"✅ Чат <code>{call.message.chat.id}</code> сохранён как хранилище.",
                parse_mode=ParseMode.HTML,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="⬅ Назад", callback_data="settings_main")]
                ])
            )

    @dp_instance.callback_query(lambda c: c.data == "set_base_url")
    async def set_base_url_prompt(call: types.CallbackQuery, state: FSMContext):
        await call.answer()
        if not call.message:
            return
        await state.set_state(SettingsStates.waiting_base_url)
        await call.message.edit_text(
            "🔗 Отправьте Base URL (например https://example.com):\n\n"
            "Или нажмите кнопку ниже чтобы отменить.",
            reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="❌ Отмена", callback_data="settings_main")]
            ])
        )

    @dp_instance.message(SettingsStates.waiting_base_url)
    async def capture_base_url(message: types.Message, state: FSMContext):
        url = message.text.strip()
        ctx = _get_ctx()
        if ctx is None:
            return
        with ctx.app_context():
            from models import Setting
            Setting.set("base_url", url)
            await state.clear()
            kb = _settings_keyboard()
            await message.answer(f"✅ Base URL сохранён: {url}", reply_markup=kb)

    @dp_instance.callback_query(lambda c: c.data == "toggle_finance")
    async def toggle_finance(call: types.CallbackQuery):
        await call.answer()
        ctx = _get_ctx()
        if ctx is None:
            return
        with ctx.app_context():
            from models import Setting
            cur = Setting.get("finance_enabled", "false")
            Setting.set("finance_enabled", "false" if cur == "true" else "true")
        if not call.message:
            return
        with ctx.app_context():
            kb = _settings_keyboard()
            await call.message.edit_text("⚙️ Настройки бота:", reply_markup=kb)

    @dp_instance.callback_query(lambda c: c.data == "show_status")
    async def show_status(call: types.CallbackQuery):
        await call.answer()
        ctx = _get_ctx()
        if ctx is None:
            return
        with ctx.app_context():
            from models import Setting
            lines = [
                "📊 <b>Статус бота</b>",
                "",
                f"URL: {Setting.get('base_url', '—') or '—'}",
                f"Чат: {Setting.get('telegram_storage_chat_id', '—') or '—'}",
                f"Тема: {Setting.get('telegram_storage_topic_id', '—') or '—'}",
                f"Финансы: {Setting.get('finance_enabled', 'false')}",
            ]
            await call.message.edit_text(
                "\n".join(lines),
                parse_mode=ParseMode.HTML,
                reply_markup=InlineKeyboardMarkup(inline_keyboard=[
                    [InlineKeyboardButton(text="⬅ Назад", callback_data="settings_main")]
                ])
            )

    @dp_instance.callback_query(lambda c: c.data == "close_settings")
    async def close_settings(call: types.CallbackQuery):
        await call.answer()
        await call.message.delete()

    @dp_instance.message()
    async def capture_forum_topic(message: types.Message):
        if not message.message_thread_id or not message.chat:
            return
        ctx = _get_ctx()
        if ctx is None:
            return
        with ctx.app_context():
            from models import Setting
            storage_chat = Setting.get("telegram_storage_chat_id", "")
            if not storage_chat:
                return
            try:
                storage_chat_id = int(storage_chat)
            except ValueError:
                return
            if message.chat.id != storage_chat_id:
                return
            topic_name = message.chat.forum_topic_name if hasattr(message.chat, 'forum_topic_name') else None
            if not topic_name and message.is_topic_message:
                topic_name = message.forum_topic_created.name if message.forum_topic_created else None
            if not topic_name:
                topic_name = f"Topic {message.message_thread_id}"
            import json as _json
            known = Setting.get("telegram_known_topics", "{}")
            try:
                topics = _json.loads(known)
            except _json.JSONDecodeError:
                topics = {}
            topics[str(message.message_thread_id)] = topic_name
            Setting.set("telegram_known_topics", _json.dumps(topics))



async def _poll_loop(b: Bot, d: Dispatcher):
    global _stop_event
    _stop_event.clear()
    try:
        await d.start_polling(b, handle_as_tasks=False)
    except Exception as e:
        if not _stop_event.is_set():
            logger.error(f"Telegram polling error: {e}")


def _run_polling(b: Bot, d: Dispatcher):
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(_poll_loop(b, d))
    loop.close()


def ensure_bot(token: str, base_url: str, app=None):
    global bot, dp, _poll_thread, _base_url, _flask_app

    # Stop existing bot if running
    if bot is not None:
        stop_bot()

=======
def _bot_token():
    import os
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
>>>>>>> 42712091c7c3757e678ca1fd19bd6c3d400c4eb0
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
