import os


def get_token() -> str:
    return os.environ.get("TELEGRAM_BOT_TOKEN", "")


def get_db_url() -> str:
    return os.environ.get("DATABASE_URL", "sqlite:////data/app.db")
