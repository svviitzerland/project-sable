# Agent guide

This is a reusable Next.js and FastAPI starter. Read `docs/PRODUCT_SPEC.md` when changing product scope or behavior, and `README.md` when setup or commands matter. Keep this file accurate when commands or conventions change.

## Layout

- `fe/`: Next.js App Router, React, TypeScript, Tailwind CSS, shadcn/ui. Pages and layouts live in `fe/src/app`; shared UI lives in `fe/src/components`; helpers live in `fe/src/lib`.
- `be/`: FastAPI app in `be/app`, tests in `be/tests`. Keep request and response contracts explicit with Pydantic models.
- `docs/`: product and architecture documentation. Put dated or phase-specific work in `docs/artifacts/phases/`.
- `.agents/skills/`: reusable skills. Read a skill's `SKILL.md` when its description fits the task; these skills are optional, not global instructions.

## Commands

- Backend setup (once): `cd be && uv sync && cp .env.example .env`
- Backend development: `cd be && uv run uvicorn app.main:app --reload --port 8000`
- Backend checks: `cd be && uv run pytest && uv run ruff check .`
- Frontend setup (once): `cd fe && pnpm install && cp .env.example .env.local`
- Frontend development: `cd fe && pnpm dev`
- Frontend checks: `cd fe && pnpm lint && pnpm typecheck && pnpm build`
- shadcn/ui: `cd fe && pnpm dlx shadcn@latest add <component>`

## Conventions

- Use `/api/v1` for backend routes and maintain typed response models. The frontend calls `/api/v1/*` through the Next.js rewrite; avoid hardcoded backend URLs in browser code.
- Keep server-only secrets on the backend or in non-public Next.js environment variables. Do not commit local `.env` files.
- Prefer small, reversible additions for hackathon speed. Add dependencies only for a concrete need.
- Write a test for backend behavior that could regress. Run checks relevant to the change; run both apps' checks before a demo or release.
- Update the product spec and phase artifact when scope or delivery priorities change.
