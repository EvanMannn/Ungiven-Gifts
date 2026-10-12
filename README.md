# Ungiven-Gifts

Ungiven Gifts is a Magic: The Gathering secret santa website. It helps organize the event, keep participants informed, handle deck restrictions, and more.

It works like When2Meet. Anyone can create an event without an account. They add players, deck restrictions, exclusions, and optional build groups. The site runs the draw and gives back a link to share. Each participant opens the link, picks their name, sets a password, and sees who they're building for.

## Repo layout

```
apps/
  backend/    FastAPI + MongoDB API (Python, managed with uv)
  frontend/   React + TypeScript SPA (Vite)
.github/workflows/
  ci.yml      lint, typecheck, tests, build, Docker build on every push and PR
  deploy.yml  deploys both apps to Vercel after CI passes on main
docker-compose.yml   local MongoDB + API
```

## Local development

Prerequisites: [uv](https://docs.astral.sh/uv/), Node 22+, and optionally Docker.

```sh
# API on http://localhost:8000 (interactive docs at /docs)
cd apps/backend
uv sync
uv run fastapi dev index.py

# Frontend on http://localhost:5173 (it proxies /api to the API)
cd apps/frontend
npm install
npm run dev
```

If `MONGODB_URI` isn't set, the API stores everything in memory. To use a real database locally, run `docker compose up --build`. That starts MongoDB and the API together.

Tests:

```sh
cd apps/backend && uv run pytest
cd apps/frontend && npm test
```

## UI

The frontend uses [shadcn/ui](https://ui.shadcn.com) components on Tailwind CSS v4. The site is dark-only, with pine green, holly red and gold accents. The theme tokens are in `apps/frontend/src/index.css`. To add more components, run `npx shadcn@latest add <name>` from `apps/frontend`.

Pages:

- `/` is the splash page.
- `/create` is the create-event form, followed by a review step and the share links.
- `/e/:slug` is for participants. They log in, go through the reveal carousel the first time, then see their dashboard.
- `/e/:slug/admin` is for the organizer. It shows the share link and each participant's progress, and lets the organizer reset passwords and edit event details.

## Deployment (Vercel, free tier)

Each app is its own Vercel project. GitHub Actions deploys both of them. Vercel's own Git integration is turned off in each `vercel.json`, so a commit doesn't get deployed twice.

1. **MongoDB:** create a free M0 cluster on [MongoDB Atlas](https://www.mongodb.com/atlas). Vercel functions don't have fixed IPs, so allow access from `0.0.0.0/0`.
2. **Vercel projects:** create two projects from this repo.
   - `ungiven-gifts-api`: Root Directory `apps/backend`. Set these environment variables:
     - `MONGODB_URI`
     - `SECRET_KEY` (a long random string)
     - `CORS_ORIGINS` (the frontend URL)
   - `ungiven-gifts-web`: Root Directory `apps/frontend`, framework Vite. Set `VITE_API_URL` to the API URL.
3. **GitHub secrets** (Settings → Secrets and variables → Actions):
   - `VERCEL_TOKEN`: from vercel.com/account/tokens
   - `VERCEL_ORG_ID`: the team or user ID (Vercel settings, or `.vercel/project.json` after running `vercel link`)
   - `VERCEL_PROJECT_ID_BACKEND` and `VERCEL_PROJECT_ID_FRONTEND`

Vercel deploys from source and doesn't use the Dockerfile. The image is there so the API can run on any container host, and CI builds it to make sure it stays working.
