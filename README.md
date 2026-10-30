# Next.js + FastAPI starter

A small fullstack base. The frontend and backend run independently, and Next.js forwards browser requests under `/api/*` to FastAPI during development.

## Stack

- `fe/`: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui
- `be/`: FastAPI, Uvicorn, Pydantic
- `.agents/skills/`: reusable agent skills 
- `docs/`: project decisions and artifacts

## Get started

Requirements: Node.js 20.9+, pnpm 9+, Python 3.11+, and [uv](https://docs.astral.sh/uv/).

In separate terminals:

```bash
cd be
uv sync
cp .env.example .env
uv run uvicorn app.main:app --reload --port 8000
```

```bash
cd fe
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000. The page should say **API: Connected**. FastAPI's interactive docs are at http://127.0.0.1:8000/docs. Set `API_INTERNAL_URL` in `fe/.env.local` if the backend runs elsewhere. Restart Next.js after changing it.

## Checks

```bash
cd be && uv run pytest && uv run ruff check .
cd fe && pnpm lint && pnpm typecheck && pnpm build
```

## First steps for a new project

1. Fill in `docs/PRODUCT_SPEC.md` with the problem, users, scope, and acceptance criteria.
2. Record a delivery plan in `docs/artifacts/phases/`.
3. Add API routes under `be/app/` and UI routes under `fe/src/app/`.
4. Add shadcn components from `fe/` with `pnpm dlx shadcn@latest add <component>`.
5. Update `AGENTS.md` when the architecture or commands change.

This starter does not assume a database, auth provider, or AI service. Add those when the project requires them.
