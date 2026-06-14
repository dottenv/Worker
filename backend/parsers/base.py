from abc import ABC, abstractmethod
from typing import Optional


class ParseResult:
    def __init__(self, success: bool, message: str = "", data: Optional[dict] = None):
        self.success = success
        self.message = message
        self.data = data or {}


class BaseParser(ABC):
    def __init__(self, login: str, password: str, base_url: str):
        self.login = login
        self.password = password
        self.base_url = base_url.rstrip("/")

    @abstractmethod
    async def login(self) -> bool: ...

    @abstractmethod
    async def parse_catalog(self, progress_callback=None) -> ParseResult: ...

    @abstractmethod
    async def place_order(self, items: list[dict], progress_callback=None) -> ParseResult: ...

    @abstractmethod
    async def close(self): ...
