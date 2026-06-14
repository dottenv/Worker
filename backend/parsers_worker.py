"""Parser worker: runs parsing/ordering in a subprocess.

Usage:
    python -m backend.parsers_worker moba --action parse_catalog --config-id 1
    python -m backend.parsers_worker moba --action place_order --config-id 1 --purchase-id 5
"""
import argparse
import asyncio
import json
import os
import sys
from datetime import datetime, timezone

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from flask import Flask
from config import Config
from extensions import db
from models.parser_config import ParserConfig
from models.product import Product
from models.purchase import Purchase
from models.purchase_item import PurchaseItem
from models.supplier import Supplier


def _update_config(config_id: int, **kwargs):
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        config = ParserConfig.query.get(config_id)
        if config:
            for k, v in kwargs.items():
                setattr(config, k, v)
            db.session.commit()


def _append_log(config_id: int, message: str):
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        config = ParserConfig.query.get(config_id)
        if config:
            logs = []
            if config.sync_log:
                try:
                    logs = json.loads(config.sync_log)
                except (json.JSONDecodeError, TypeError):
                    logs = []
            logs.append({"time": datetime.now(timezone.utc).isoformat(), "msg": message})
            config.sync_log = json.dumps(logs, ensure_ascii=False)
            db.session.commit()


def _save_products(config_id: int, supplier_id: int, products: list[dict]):
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        config = ParserConfig.query.get(config_id)
        if not config:
            return
        created = 0
        for p in products:
            exists = Product.query.filter_by(
                service_center_id=config.service_center_id,
                name=p["name"],
            ).first()
            if not exists:
                product = Product(
                    service_center_id=config.service_center_id,
                    supplier_id=supplier_id,
                    name=p["name"],
                    unit=p.get("unit", "шт"),
                    default_price=p.get("price", 0),
                    description=f"Артикул: {p.get('article', '')}",
                )
                db.session.add(product)
                created += 1
            else:
                if p.get("price"):
                    exists.default_price = p["price"]
        db.session.commit()
        _append_log(config_id, f"Создано {created} новых товаров, обновлено {len(products) - created}")


def _place_order_from_purchase(config_id: int, purchase_id: int, order_id: str):
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        purchase = Purchase.query.get(purchase_id)
        if purchase:
            purchase.status = "received"
            purchase.notes = (purchase.notes or "") + f"\nЗаказ MOBA: №{order_id}"
            db.session.commit()
            _append_log(config_id, f"Заказ №{purchase_id} обновлён: статус received, номер MOBA: {order_id}")


def make_progress_callback(config_id: int):
    def callback(percent: int, message: str):
        _update_config(config_id, sync_progress=percent)
        _append_log(config_id, message)
        print(f"[{percent}%] {message}", flush=True)
    return callback


def _load_parser_creds(config_id: int):
    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        config = ParserConfig.query.get(config_id)
        if not config:
            return None
        return {
            "login": config.login,
            "password": config.password,
            "base_url": config.base_url,
        }


async def run_moba_parse_catalog(config_id: int, supplier_id: int):
    _update_config(config_id, sync_status="parsing", sync_progress=0, sync_log="[]")
    _append_log(config_id, "Запуск парсинга каталога MOBA...")

    try:
        from parsers.moba_parser import MobaParser
    except ImportError as e:
        _update_config(config_id, sync_status="error")
        _append_log(config_id, f"Ошибка: не удалось загрузить модуль парсера (проверьте установку Playwright): {e}")
        return 1

    creds = _load_parser_creds(config_id)
    if not creds:
        _update_config(config_id, sync_status="error")
        _append_log(config_id, "Конфигурация парсера не найдена")
        return 1

    parser = MobaParser(creds["login"], creds["password"], creds["base_url"])
    try:
        logged_in = await parser.login()
        if not logged_in:
            _update_config(config_id, sync_status="error")
            _append_log(config_id, "Ошибка: не удалось войти в аккаунт MOBA")
            return 1

        _append_log(config_id, "Успешный вход в аккаунт MOBA")

        cb = make_progress_callback(config_id)
        result = await parser.parse_catalog(progress_callback=cb)

        if result.success and result.data.get("products"):
            _save_products(config_id, supplier_id, result.data["products"])
            _update_config(config_id, sync_status="done", sync_progress=100, last_sync_at=datetime.now(timezone.utc))
            _append_log(config_id, f"Парсинг завершён: {result.message}")
        else:
            _update_config(config_id, sync_status="error")
            _append_log(config_id, f"Парсинг завершён с ошибкой: {result.message}")

        return 0 if result.success else 1
    except Exception as e:
        _update_config(config_id, sync_status="error")
        _append_log(config_id, f"Критическая ошибка: {e}")
        return 1
    finally:
        try:
            await parser.close()
        except Exception:
            pass


async def run_moba_place_order(config_id: int, purchase_id: int):
    _update_config(config_id, sync_status="placing", sync_progress=0, sync_log="[]")
    _append_log(config_id, f"Оформление заказа №{purchase_id} на MOBA...")

    try:
        from parsers.moba_parser import MobaParser
    except ImportError as e:
        _update_config(config_id, sync_status="error")
        _append_log(config_id, f"Ошибка: не удалось загрузить модуль парсера: {e}")
        return 1

    creds = _load_parser_creds(config_id)
    if not creds:
        _update_config(config_id, sync_status="error")
        _append_log(config_id, "Конфигурация парсера не найдена")
        return 1

    app = Flask(__name__)
    app.config.from_object(Config)
    db.init_app(app)
    with app.app_context():
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            _update_config(config_id, sync_status="error")
            _append_log(config_id, f"Заказ №{purchase_id} не найден")
            return 1
        items = []
        for item in purchase.items:
            items.append({
                "name": item.product.name if item.product else f"Товар #{item.product_id}",
                "article": "",
                "quantity": float(item.quantity),
                "price": float(item.price_per_unit),
            })

    parser = MobaParser(creds["login"], creds["password"], creds["base_url"])
    try:
        logged_in = await parser.login()
        if not logged_in:
            _update_config(config_id, sync_status="error")
            _append_log(config_id, "Ошибка: не удалось войти в аккаунт MOBA")
            return 1

        _append_log(config_id, "Успешный вход в аккаунт MOBA")

        cb = make_progress_callback(config_id)
        result = await parser.place_order(items, progress_callback=cb)

        if result.success:
            order_id = result.data.get("order_id", "")
            _place_order_from_purchase(config_id, purchase_id, order_id)
            _update_config(config_id, sync_status="done", sync_progress=100, last_sync_at=datetime.now(timezone.utc))
            _append_log(config_id, f"Заказ оформлен: {result.message}")
        else:
            _update_config(config_id, sync_status="error")
            _append_log(config_id, f"Ошибка оформления: {result.message}")

        return 0 if result.success else 1
    except Exception as e:
        _update_config(config_id, sync_status="error")
        _append_log(config_id, f"Критическая ошибка: {e}")
        return 1
    finally:
        try:
            await parser.close()
        except Exception:
            pass


def main():
    parser = argparse.ArgumentParser(description="Parser Worker")
    parser.add_argument("site", choices=["moba"], help="Site to parse")
    parser.add_argument("--action", required=True, choices=["parse_catalog", "place_order"])
    parser.add_argument("--config-id", type=int, required=True)
    parser.add_argument("--purchase-id", type=int, default=0)
    parser.add_argument("--supplier-id", type=int, default=0)

    args = parser.parse_args()

    if args.site == "moba":
        if args.action == "parse_catalog":
            if not args.supplier_id:
                print("--supplier-id required for parse_catalog")
                return 1
            exit_code = asyncio.run(run_moba_parse_catalog(args.config_id, args.supplier_id))
        elif args.action == "place_order":
            if not args.purchase_id:
                print("--purchase-id required for place_order")
                return 1
            exit_code = asyncio.run(run_moba_place_order(args.config_id, args.purchase_id))

    sys.exit(exit_code)


if __name__ == "__main__":
    main()
