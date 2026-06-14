import asyncio
import re
from typing import Optional, Callable
from playwright.async_api import async_playwright, Page, Browser

from parsers.base import BaseParser, ParseResult


class MobaParser(BaseParser):
    def __init__(self, login: str, password: str, base_url: str = "https://novosibirsk.moba.ru"):
        super().__init__(login, password, base_url)
        self.browser: Optional[Browser] = None
        self.page: Optional[Page] = None

    async def _ensure_browser(self):
        if not self.browser:
            p = await async_playwright().start()
            self.browser = await p.chromium.launch(headless=True)
            self.page = await self.browser.new_page()
            self.page.set_default_timeout(30000)

    async def login(self) -> bool:
        await self._ensure_browser()
        page = self.page

        try:
            await page.goto(f"{self.base_url}/auth/", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            login_input = page.locator('input[name="USER_LOGIN"], input[name="login"], input[type="email"]')
            await login_input.first.fill(self.login)

            pass_input = page.locator('input[name="USER_PASSWORD"], input[name="password"], input[type="password"]')
            await pass_input.first.fill(self.password)

            submit_btn = page.locator('input[type="submit"], button[type="submit"], .login-btn, .btn-primary').first
            await submit_btn.click()

            await page.wait_for_timeout(3000)

            if "auth" in page.url.lower() or "login" in page.url.lower():
                return False
            return True
        except Exception as e:
            raise RuntimeError(f"Login failed: {e}")

    async def parse_catalog(self, progress_callback: Optional[Callable] = None) -> ParseResult:
        await self._ensure_browser()
        page = self.page

        try:
            await page.goto(f"{self.base_url}/catalog/", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            products = []
            categories = await page.locator(".catalog-section-list a, .bx_catalog_line ul li a, .sections a, a[href*='/catalog/']").all()

            category_urls = set()
            for cat in categories:
                href = await cat.get_attribute("href")
                if href and "/catalog/" in href and href != "/catalog/" and "modeli" not in href:
                    full_url = href if href.startswith("http") else f"{self.base_url}{href}"
                    category_urls.add(full_url)

            if not category_urls:
                category_urls.add(f"{self.base_url}/catalog/")

            total = len(category_urls)
            for idx, cat_url in enumerate(category_urls):
                if progress_callback:
                    progress_callback(int((idx / total) * 100), f"Парсинг категории {idx+1}/{total}")

                await page.goto(cat_url, wait_until="networkidle")
                await page.wait_for_timeout(1500)

                page_num = 1
                while True:
                    items = await page.locator(
                        ".catalog-item, .product-item, .item, .card, "
                        ".bx_catalog_item, [data-entity*='item'], "
                        ".product-card, .catalog-card"
                    ).all()

                    for item in items:
                        try:
                            name_el = item.locator(".item-title a, .product-name a, .card-title a, h3 a, .name a, a[href*='/catalog/']").first
                            price_el = item.locator(".item-price, .product-price, .price, .card-price, .bx_price").first

                            name = (await name_el.text_content() or "").strip()
                            price_text = (await price_el.text_content() or "0").strip()
                            price = float(re.sub(r"[^\d.,]", "", price_text).replace(",", ".") or 0)
                            href = await name_el.get_attribute("href") or ""
                            article = re.sub(r".*/(\d+)/?$", r"\1", href.strip("/"))

                            if name:
                                products.append({
                                    "name": name,
                                    "article": article,
                                    "price": price,
                                    "unit": "шт",
                                    "url": href if href.startswith("http") else f"{self.base_url}{href}",
                                })
                        except Exception:
                            continue

                    next_btn = page.locator(
                        "a.next, .pagination .next, .bx-pagination-next, "
                        "a[rel='next'], .pager-next, li.next a"
                    ).first
                    if await next_btn.is_visible():
                        page_num += 1
                        await next_btn.click()
                        await page.wait_for_timeout(1500)
                    else:
                        break

            return ParseResult(True, f"Найдено {len(products)} товаров", {"products": products, "count": len(products)})

        except Exception as e:
            return ParseResult(False, f"Ошибка парсинга: {e}")

    async def place_order(self, items: list[dict], progress_callback: Optional[Callable] = None) -> ParseResult:
        await self._ensure_browser()
        page = self.page

        try:
            for idx, item in enumerate(items):
                if progress_callback:
                    progress_callback(int((idx / len(items)) * 100), f"Товар {idx+1}/{len(items)}")

                search_query = item.get("article") or item.get("name", "")
                await page.goto(f"{self.base_url}/catalog/?q={search_query}", wait_until="networkidle")
                await page.wait_for_timeout(1500)

                add_btn = page.locator(
                    ".add-to-cart, .buy-btn, .basket-btn, "
                    "a[href*='?action=ADD2BASKET'], "
                    "button[data-product-id], .catalog-item__buy-btn, "
                    "input[value*='Купить'], input[value*='В корзину']"
                ).first

                if await add_btn.is_visible():
                    await add_btn.click()
                    await page.wait_for_timeout(1000)

                qty_input = page.locator("input[name*='QUANTITY'], input.qty, input.quantity").first
                if await qty_input.is_visible():
                    await qty_input.fill(str(item.get("quantity", 1)))
                    await page.wait_for_timeout(500)

            if progress_callback:
                progress_callback(90, "Оформление заказа...")

            await page.goto(f"{self.base_url}/personal/order/make/", wait_until="networkidle")
            await page.wait_for_timeout(2000)

            order_btn = page.locator(
                "input[type='submit'][value*='Заказ'], button[type='submit'][value*='Заказ'], "
                ".order-btn, .checkout-btn, #ORDER_CONFIRM_BUTTON, "
                "input[name*='confirm'], button[name*='confirm']"
            ).first

            if await order_btn.is_visible():
                await order_btn.click()
                await page.wait_for_timeout(3000)

            current_url = page.url
            order_id = ""
            match = re.search(r"/personal/orders/(\d+)/", current_url)
            if match:
                order_id = match.group(1)

            if not order_id:
                page_text = await page.text_content("body")
                match = re.search(r"заказ\s*№?\s*(\d+)", page_text or "", re.IGNORECASE)
                if match:
                    order_id = match.group(1)

            if progress_callback:
                progress_callback(100, "Заказ оформлен" + (f" №{order_id}" if order_id else ""))

            return ParseResult(True, f"Заказ оформлен{', №' + order_id if order_id else ''}", {"order_id": order_id})

        except Exception as e:
            return ParseResult(False, f"Ошибка оформления заказа: {e}")

    async def close(self):
        if self.browser:
            await self.browser.close()
            self.browser = None
            self.page = None
