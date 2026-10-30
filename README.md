# Jude — courtroom intelligence

A marketing website for Jude, an evidence-grounded AI courtroom copilot concept for Indonesian legal professionals. The site includes a responsive editorial landing page and an interactive, explicitly synthetic evidence demonstration. Live transcription, AI analysis, document uploads, and legal retrieval are not connected in this prototype.

The project retains its Next.js + FastAPI foundation. The marketing page runs independently of the backend; Next.js forwards browser requests under `/api/*` to FastAPI when backend features are added.

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

Open http://localhost:3000 to explore Jude. The demo supports three example findings, original-source excerpt selection, per-example review state for the current visit, and copying suggested questions. All material is synthetic and no data is submitted. FastAPI's interactive docs remain at http://127.0.0.1:8000/docs. Set `API_INTERNAL_URL` in `fe/.env.local` if the backend runs elsewhere. Restart Next.js after changing it.

If port 3000 is occupied, run `cd fe && pnpm dev --port 3001` and use `http://localhost:3001`. Use the printed localhost URL for development.

## Checks

```bash
cd be && uv run pytest && uv run ruff check .
cd fe && pnpm lint && pnpm typecheck && pnpm build
```

## Product and design

1. `PRODUCT.md` records the supplied product truth; `docs/PRODUCT_SPEC.md` tracks website scope.
2. `docs/artifacts/phases/2026-10-30-jude-website.md` records the approved direction and validation.
3. `fe/src/components/jude-site.tsx` owns the website; `fe/src/lib/jude-demo.ts` owns its synthetic examples.
4. Fonts are served locally from `fe/public/fonts/`, with their licenses. Generated image assets carry prompt provenance.
5. Future backend routes belong under `/api/v1`; never put credentials in browser code.

This starter does not assume a database, auth provider, or AI service. Add those when the project requires them.

## Impeccable design skill

[Impeccable](https://impeccable.style/) 4.8.0 is installed for this repository in `.agents/skills/impeccable/`. In Codex chat, use `$impeccable init` to establish product context, `$impeccable audit` to review the UI, or `$impeccable polish` for a finishing pass. If the skill does not appear, start a new chat or reload Codex.

The vendored Codex skill comes from `pbakaus/impeccable` at commit `02523aec3e4c4580102d996d1b6a71fbe062e03f`. Its launcher downloads the matching engine on first use. Automatic design hooks are optional and are not enabled by this installation; use `$impeccable hooks on` to configure them separately.
