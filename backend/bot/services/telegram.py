import os
import json
import requests


def get_bot_token() -> str:
    token = os.environ.get("TELEGRAM_BOT_TOKEN", "")
    if not token:
        from models import Setting
        token = Setting.get("bot_token", "")
    return token


def api_url(method: str) -> str:
    token = get_bot_token()
    return f"https://api.telegram.org/bot{token}/{method}"


def send_message(chat_id: int, text: str, parse_mode: str = "HTML",
                 reply_markup: dict | None = None,
                 message_thread_id: int | None = None) -> str | None:
    payload = {
        "chat_id": chat_id,
        "text": text,
        "parse_mode": parse_mode,
    }
    if message_thread_id:
        payload["message_thread_id"] = message_thread_id
    if reply_markup:
        payload["reply_markup"] = json.dumps(reply_markup) if isinstance(reply_markup, dict) else reply_markup
    try:
        resp = requests.post(api_url("sendMessage"), json=payload, timeout=10)
        resp.raise_for_status()
    except requests.RequestException:
        pass
    return None


def send_photo(chat_id: int, file_path: str, caption: str | None = None,
               message_thread_id: int | None = None) -> str | None:
    try:
        with open(file_path, "rb") as f:
            files = {"photo": f}
            data = {"chat_id": chat_id, "parse_mode": "HTML"}
            if caption:
                data["caption"] = caption
            if message_thread_id:
                data["message_thread_id"] = message_thread_id
            resp = requests.post(api_url("sendPhoto"), data=data, files=files, timeout=30)
            resp.raise_for_status()
            result = resp.json()
            if result.get("ok") and result.get("result", {}).get("photo"):
                return result["result"]["photo"][-1]["file_id"]
    except (FileNotFoundError, requests.RequestException):
        pass
    return None


def send_document(chat_id: int, file_path: str, filename: str | None = None,
                  caption: str | None = None,
                  message_thread_id: int | None = None) -> str | None:
    try:
        with open(file_path, "rb") as f:
            files = {"document": (filename or os.path.basename(file_path), f)}
            data = {"chat_id": chat_id, "parse_mode": "HTML"}
            if caption:
                data["caption"] = caption
            if message_thread_id:
                data["message_thread_id"] = message_thread_id
            resp = requests.post(api_url("sendDocument"), data=data, files=files, timeout=30)
            resp.raise_for_status()
            result = resp.json()
            if result.get("ok"):
                msg = result["result"]
                if msg.get("document"):
                    return msg["document"]["file_id"]
                if msg.get("photo"):
                    return msg["photo"][-1]["file_id"]
    except (FileNotFoundError, requests.RequestException):
        pass
    return None


def send_media_group(chat_id: int, media: list,
                     message_thread_id: int | None = None) -> list[str]:
    for item in media:
        if "media" in item and isinstance(item["media"], str) and os.path.isfile(item["media"]):
            item["media"] = f"attach://{os.path.basename(item['media'])}"
    payload = {
        "chat_id": chat_id,
        "media": json.dumps(media),
    }
    if message_thread_id:
        payload["message_thread_id"] = message_thread_id
    files = {}
    for item in media:
        fpath = item.get("_file_path") or item.get("media", "")
        if isinstance(fpath, str) and os.path.isfile(fpath):
            files[os.path.basename(fpath)] = open(fpath, "rb")
    try:
        resp = requests.post(api_url("sendMediaGroup"), data=payload, files=files, timeout=30)
        resp.raise_for_status()
    except requests.RequestException:
        pass
    finally:
        for f in files.values():
            f.close()
    return []
