# Agent guide

Jude is a SvelteKit + TypeScript courtroom workspace and marketing introduction. Read `PRODUCT.md` and `docs/product/PRODUCT_SPEC.md` when changing behavior, and `README.md` for setup. Keep this guide accurate.

## Layout

- `apps/web/`: the SvelteKit app (Svelte 5/SvelteKit 3, TypeScript, Tailwind), built with `@sveltejs/adapter-node` into a Docker image. Frontend: `src/routes`, `src/components`, browser helpers in `src/lib`. Backend: `src/lib/server` behind `src/routes/api/v1`. `evaluation/` and `scripts/evaluate.ts`: synthetic evaluation.
- `apps/voice/`: optional Python 3.12 FastAPI voice service (uv, pyannote, Docker). Stateless; the web app stores voiceprints. `evaluation/` replays voice matching on a real public hearing.
- `db/`: the PostgreSQL schema shared by every service: `migrations/` (ordered, idempotent; add the next number, never edit applied files), `migrate.mjs` and its own Docker image, run as a one-shot job before the web app. Local SQLite mirrors the schema in `apps/web/src/lib/server/database.ts`.
- `docs/`: `product/` (spec, limitations), `engineering/` (architecture, `.jude` format), `research/` (report, notes, public case sources), `phases/` (dated work records).
- `infra/`: AWS Terraform (`terraform/`) and the production Compose stack (`docker/`), codename project-sable; see `infra/README.md`. `.github/workflows/deploy.yml` checks, builds and deploys `main` through GitHub OIDC.
- `examples/`: fictional sample case pack. `compose.yaml`: local Docker service for `apps/voice`.
- `.agents/skills/`: optional reusable skills. Impeccable is at `.agents/skills/impeccable/SKILL.md` for frontend design/review.

## Commands

- Node 24.x and pnpm 11.25.0. Setup: `cd apps/web && pnpm install --frozen-lockfile && cp .env.example .env.local`.
- Optional local PostgreSQL: run a pgvector container, then `cd db && npm ci && DATABASE_URL=... npm run migrate` and set `DATABASE_URL` in `.env.local`.
- Development: `cd apps/web && pnpm dev` (one process for frontend and backend).
- Checks: `cd apps/web && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Browser checks against the running app: `cd apps/web && pnpm test:e2e`. Set `CHROMIUM_EXECUTABLE` for system Chromium or install it with Playwright. `JUDE_TEST_URL` overrides the URL.
- Voice service: `cd apps/voice && uv sync && uv run pytest && uv run ruff check .` (`uv sync --extra ml` for real pyannote models). Docker: `docker compose up --build voice`.
- PostgreSQL checks: set `JUDE_TEST_DATABASE_URL` to a disposable pgvector database named `jude_test*` before `pnpm test`.

## Conventions

- Preserve typed `/api/v1` contracts and validate input/model output with Zod. Never expose storage, queue, database or provider secrets to browser environment variables.
- Keep synthetic fixtures labeled. Distinguish configured integrations, mocks and real-provider verification. Findings support human verification, never guilt or credibility determinations.
- The UI is bilingual (Bahasa Indonesia primary, English). Put every user-facing string in `apps/web/src/lib/i18n/en.ts` and `id.ts` and render it with `t()`; never hardcode copy in components.
- Add meaningful tests for backend behavior that can regress; run relevant browser workflows before release. Preserve the existing visual identity when refactoring.
- Production (AWS) runs one web process against PostgreSQL with in-process jobs, S3 (`S3_BUCKET`) and Bedrock (`AI_PROVIDER=bedrock`) via the instance role. Keep infrastructure names on the codename, not the product name. Never commit Terraform state.
- Local mode uses one SQLite process and local files. Background analysis always runs in-process in both modes. Migrations run before the server starts (`db/`), never inside it. Production PostgreSQL is Amazon RDS.
- Voiceprints are biometric: keep them per case, deletable, out of `.jude` exports and logs. Voice matches are suggestions; names stay user-confirmed. The voice token is server-only.
- Native browser speech connects with temporary credentials; finalized batches save through authenticated API routes. SSE supplies advisory updates and the UI polls authoritative records.
- Update `docs/product/PRODUCT_SPEC.md` and add a dated record in `docs/phases/` when scope or deployment changes. Put research in `docs/research/<topic>/`, not at the repository root.
