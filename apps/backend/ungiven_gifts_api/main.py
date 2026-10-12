from fastapi import APIRouter, FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .routes import admin, events, participants


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title="Ungiven Gifts API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    api = APIRouter(prefix="/api")

    @api.get("/health", tags=["meta"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    api.include_router(events.router)
    api.include_router(participants.router)
    api.include_router(admin.router)
    app.include_router(api)
    return app


app = create_app()
