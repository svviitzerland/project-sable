# Agent guide

Jude is a SvelteKit + TypeScript courtroom workspace and marketing introduction. Read `PRODUCT.md` and `docs/PRODUCT_SPEC.md` when changing behavior, and `README.md` for setup. Keep this guide accurate.

## Layout

- `fe/`: the complete app, retained as the existing Vercel root. Svelte 5/SvelteKit 3, TypeScript, Tailwind. Routes in `src/routes`, UI in `src/components`, browser helpers in `src/lib`, server-only modules in `src/lib/server`.
- `fe/migrations/`: separately applied PostgreSQL migrations. `fe/evaluation/` and `fe/scripts/evaluate.ts`: synthetic evaluation.
- `docs/`: architecture, portable format, deployment and product docs; dated work in `docs/artifacts/phases/`.
- `.agents/skills/`: optional reusable skills. Impeccable is at `.agents/skills/impeccable/SKILL.md` for frontend design/review.

## Commands

- Node 24.x and pnpm 11.25.0. Setup: `cd fe && pnpm install --frozen-lockfile && cp .env.example .env.local`.
- Development: `cd fe && pnpm dev` (one process for frontend and backend).
- Checks: `cd fe && pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Browser checks against the running app: `cd fe && pnpm test:e2e`. Set `CHROMIUM_EXECUTABLE` for system Chromium or install it with Playwright. `JUDE_TEST_URL` overrides the URL.
- PostgreSQL checks: set `JUDE_TEST_DATABASE_URL` to a disposable database named `jude_test*` before `pnpm test`.

## Conventions

- Preserve typed `/api/v1` contracts and validate input/model output with Zod. Never expose storage, queue, database or provider secrets to browser environment variables.
- Keep synthetic fixtures labeled. Distinguish configured integrations, mocks and real-provider verification. Findings support human verification, never guilt or credibility determinations.
- Add meaningful tests for backend behavior that can regress; run relevant browser workflows before release. Preserve the existing visual identity when refactoring.
- Local mode uses one SQLite process. Hosted mode requires PostgreSQL, private Storage, signed QStash jobs and authenticated scheduled recovery. Read `docs/DEPLOY_VERCEL.md`. Never migrate or globally reset hosted state at cold start.
- Native browser speech connects with temporary credentials; finalized batches save through authenticated API routes. SSE supplies advisory updates and the UI polls authoritative records.
- Update product spec and phase artifact when scope or deployment changes.
