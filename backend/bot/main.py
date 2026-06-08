import os
import sys
import logging

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("bot")

from flask import Flask
from config import Config
from extensions import db

app = Flask(__name__)
app.config.from_object(Config)
db.init_app(app)

with app.app_context():
    db.create_all()

from aiogram import Bot, Dispatcher
from aiogram.client.default import DefaultBotProperties
from aiogram.enums import ParseMode
from aiogram.fsm.storage.memory import MemoryStorage

TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
if not TOKEN:
    logger.error("TELEGRAM_BOT_TOKEN is not set")
    sys.exit(1)

bot = Bot(token=TOKEN, default=DefaultBotProperties(parse_mode=ParseMode.HTML))
dp = Dispatcher(storage=MemoryStorage())

from bot.handlers.start import router as start_router
from bot.handlers.help import router as help_router
from bot.handlers.settings import router as settings_router
from bot.handlers.messages import router as messages_router

dp.include_routers(start_router, help_router, settings_router, messages_router)

if __name__ == "__main__":
    logger.info("Bot starting polling...")
    dp.run_polling(bot, skip_updates=True)
