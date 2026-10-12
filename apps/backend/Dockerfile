# Container image for running the API outside Vercel (local dev via docker compose, or any
# container host). Vercel itself deploys straight from source and doesn't use this file.
FROM python:3.12-slim

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /uvx /bin/

WORKDIR /app
ENV UV_COMPILE_BYTECODE=1 UV_LINK_MODE=copy

COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

COPY ungiven_gifts_api ./ungiven_gifts_api
COPY index.py ./

EXPOSE 8000
CMD [".venv/bin/uvicorn", "ungiven_gifts_api.main:app", "--host", "0.0.0.0", "--port", "8000"]
