from aiogram import Router
from aiogram.types import Message
from aiogram.filters import Command

router = Router()


@router.message(Command("help"))
async def cmd_help(message: Message):
    text = (
        "📖 <b>Команды</b>\n\n"
        "/start — Главное меню\n"
        "/settings — Настройки бота\n"
        "/help — Эта справка\n\n"
        "<b>Настройки:</b>\n"
        "• URL — адрес WebApp (https://...)\n"
        "• Чат — ID чата для хранения файлов\n"
        "• Финансы — вкл/выкл финансовый модуль\n\n"
        "Для обращения к администратору напишите @%s"
    ) % "admin"
    await message.answer(text)
