# Ungiven Gifts API

FastAPI backend. Python deps are managed with [uv](https://docs.astral.sh/uv/).

```sh
uv sync                    # install deps into .venv
uv run fastapi dev index.py  # http://localhost:8000, docs at /docs
uv run pytest              # tests (no Mongo needed; they use the in-memory store)
uv run ruff check . && uv run ruff format --check .
```

Copy `.env.example` to `.env` to configure. With `MONGODB_URI` empty the API keeps
everything in memory, which is fine for poking at the UI but loses data on restart.

## Layout

- `ungiven_gifts_api/pairing.py` – the draw: random perfect matching that respects exclusions and groups
- `ungiven_gifts_api/event_builder.py` – validates an organizer's submission and builds the stored event
- `ungiven_gifts_api/routes/` – `events` (create/public info), `participants` (login, dashboard), `admin`
- `ungiven_gifts_api/repository.py` – Mongo and in-memory storage behind one interface
- `index.py` – entrypoint for Vercel's Python runtime
