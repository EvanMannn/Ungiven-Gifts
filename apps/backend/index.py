# Entrypoint Vercel's Python runtime looks for. Locally, run `uv run fastapi dev` instead.
from ungiven_gifts_api.main import app

__all__ = ["app"]
