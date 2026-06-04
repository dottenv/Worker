import asyncio
import logging
import threading
from aiogram import Bot, Dispatcher, types
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.filters import Command
from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup, WebAppInfo

logger = logging.getLogger(__name__)

bot: Bot | None = None
dp: Dispatcher | None = None
_poll_thread: threading.Thread | None = None
_stop_event = threading.Event()
_stop_event.set()

_base_url: str = ""


def _build_handlers(dp_instance: Dispatcher, base_url: str):
    @dp_instance.message(Command("start"))
    async def cmd_start(message: types.Message):
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

    @dp_instance.message(Command("help"))
    async def cmd_help(message: types.Message):
        await message.answer(
            "Команды:\n"
            "/start - Открыть MiniApp\n"
            "/help - Помощь"
        )


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


def ensure_bot(token: str, base_url: str):
    global bot, dp, _poll_thread, _base_url

    # Stop existing bot if running
    if bot is not None:
        stop_bot()

    if not token:
        return

    _base_url = base_url
    bot = Bot(token=token, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
    dp = Dispatcher()
    _build_handlers(dp, base_url)

    _poll_thread = threading.Thread(
        target=_run_polling, args=(bot, dp), daemon=True, name="tg-bot-polling"
    )
    _poll_thread.start()
    logger.info("Telegram bot polling started")


def stop_bot():
    global bot, dp, _poll_thread, _stop_event

    _stop_event.set()

    if bot:
        try:
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)
            loop.run_until_complete(bot.session.close())
            loop.close()
        except Exception as e:
            logger.warning(f"Bot session close error: {e}")

    bot = None
    dp = None
    _poll_thread = None
    logger.info("Telegram bot stopped")


def is_bot_running() -> bool:
    return bot is not None and not _stop_event.is_set()


async def send_telegram_message(chat_id: int, text: str, parse_mode: str = "HTML",
                                 message_thread_id: int | None = None):
    if not bot:
        logger.warning("Telegram bot not initialized")
        return
    try:
        kwargs = {"chat_id": chat_id, "text": text, "parse_mode": parse_mode}
        if message_thread_id:
            kwargs["message_thread_id"] = message_thread_id
        await bot.send_message(**kwargs)
    except Exception as e:
        logger.error(f"Failed to send Telegram message to {chat_id}: {e}")


async def send_telegram_media_group(chat_id: int, media: list,
                                     message_thread_id: int | None = None):
    if not bot:
        logger.warning("Telegram bot not initialized")
        return
    try:
        from aiogram.types import MediaGroup
        mg = MediaGroup(media)
        kwargs = {"chat_id": chat_id, "media": mg}
        if message_thread_id:
            kwargs["message_thread_id"] = message_thread_id
        await bot.send_media_group(**kwargs)
    except Exception as e:
        logger.error(f"Failed to send media group to {chat_id}: {e}")


async def send_telegram_document(chat_id: int, file_path: str, filename: str | None = None,
                                  caption: str | None = None,
                                  message_thread_id: int | None = None):
    if not bot:
        logger.warning("Telegram bot not initialized")
        return None
    try:
        from aiogram.types import FSInputFile
        doc = FSInputFile(file_path, filename=filename)
        kwargs = {"chat_id": chat_id, "document": doc, "caption": caption, "parse_mode": "HTML"}
        if message_thread_id:
            kwargs["message_thread_id"] = message_thread_id
        msg = await bot.send_document(**kwargs)
        if msg.document:
            return msg.document.file_id
        if msg.photo:
            return msg.photo[-1].file_id
    except Exception as e:
        logger.error(f"Failed to send document to Telegram: {e}")
    return None


async def send_telegram_photo(chat_id: int, file_path: str, caption: str | None = None,
                               message_thread_id: int | None = None):
    if not bot:
        logger.warning("Telegram bot not initialized")
        return None
    try:
        from aiogram.types import FSInputFile
        photo = FSInputFile(file_path)
        kwargs = {"chat_id": chat_id, "photo": photo, "caption": caption, "parse_mode": "HTML"}
        if message_thread_id:
            kwargs["message_thread_id"] = message_thread_id
        msg = await bot.send_photo(**kwargs)
        if msg.photo:
            return msg.photo[-1].file_id
    except Exception as e:
        logger.error(f"Failed to send photo to Telegram: {e}")
    return None


def _run_async(coro):
    try:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(coro)
        loop.close()
        return result
    except Exception as e:
        logger.error(f"sync tg error: {e}")
    return None


def send_telegram_message_sync(chat_id: int, text: str,
                                message_thread_id: int | None = None):
    return _run_async(send_telegram_message(chat_id, text, message_thread_id=message_thread_id))


def send_telegram_document_sync(chat_id: int, file_path: str, filename: str | None = None,
                                 caption: str | None = None,
                                 message_thread_id: int | None = None):
    return _run_async(send_telegram_document(chat_id, file_path, filename, caption, message_thread_id))


def send_telegram_photo_sync(chat_id: int, file_path: str, caption: str | None = None,
                              message_thread_id: int | None = None):
    return _run_async(send_telegram_photo(chat_id, file_path, caption, message_thread_id))


def send_telegram_media_group_sync(chat_id: int, media: list,
                                    message_thread_id: int | None = None):
    return _run_async(send_telegram_media_group(chat_id, media, message_thread_id))
