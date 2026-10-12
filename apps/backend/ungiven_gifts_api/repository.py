"""Event storage. MongoDB in deployed environments, an in-memory dict otherwise."""

import logging
from typing import Protocol

from pymongo import AsyncMongoClient

from .config import Settings, get_settings
from .models import EventRecord

logger = logging.getLogger(__name__)


class EventRepository(Protocol):
    async def insert(self, event: EventRecord) -> None: ...
    async def get(self, slug: str) -> EventRecord | None: ...
    async def save(self, event: EventRecord) -> None: ...
    async def slug_exists(self, slug: str) -> bool: ...


class InMemoryEventRepository:
    def __init__(self) -> None:
        self._events: dict[str, dict] = {}

    async def insert(self, event: EventRecord) -> None:
        self._events[event.slug] = event.model_dump(mode="json")

    async def get(self, slug: str) -> EventRecord | None:
        doc = self._events.get(slug)
        return EventRecord.model_validate(doc) if doc else None

    async def save(self, event: EventRecord) -> None:
        self._events[event.slug] = event.model_dump(mode="json")

    async def slug_exists(self, slug: str) -> bool:
        return slug in self._events


class MongoEventRepository:
    def __init__(self, client: AsyncMongoClient, db_name: str) -> None:
        self._events = client[db_name]["events"]

    async def ensure_indexes(self) -> None:
        await self._events.create_index("slug", unique=True)

    async def insert(self, event: EventRecord) -> None:
        await self._events.insert_one(event.model_dump(mode="json"))

    async def get(self, slug: str) -> EventRecord | None:
        doc = await self._events.find_one({"slug": slug}, {"_id": 0})
        return EventRecord.model_validate(doc) if doc else None

    async def save(self, event: EventRecord) -> None:
        await self._events.replace_one({"slug": event.slug}, event.model_dump(mode="json"))

    async def slug_exists(self, slug: str) -> bool:
        return await self._events.count_documents({"slug": slug}, limit=1) > 0


_repository: EventRepository | None = None


async def build_repository(settings: Settings) -> EventRepository:
    if not settings.mongodb_uri:
        logger.warning("MONGODB_URI not set; using in-memory storage. Data is lost on restart.")
        return InMemoryEventRepository()
    repo = MongoEventRepository(AsyncMongoClient(settings.mongodb_uri), settings.mongodb_db)
    await repo.ensure_indexes()
    return repo


async def get_repository() -> EventRepository:
    """FastAPI dependency. Built lazily so serverless cold starts don't need a lifespan hook."""
    global _repository
    if _repository is None:
        _repository = await build_repository(get_settings())
    return _repository
