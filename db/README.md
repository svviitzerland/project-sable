# Database

The single source of truth for the PostgreSQL schema, independent of any one service.

- `migrations/`: ordered, idempotent SQL files (`001_…` to `007_…`). Add new changes as the next number; never edit an applied file.
- `migrate.mjs`: applies pending files and records them in `jude_schema_migrations`. A short prelude creates the roles, `extensions` schema (pgvector) and `storage.buckets` table that the first migrations, written for Supabase, expect.
- `Dockerfile`: the one-shot `migrate` job. In production (`infra/docker/compose.yaml`) it runs against Amazon RDS before the web app starts.

Run locally against any PostgreSQL with pgvector:

```bash
cd db && npm ci && DATABASE_URL=postgresql://user:pass@localhost:5432/db npm run migrate
```

The web app's local SQLite mode mirrors this schema in `apps/web/src/lib/server/local-schema.ts` and `database.ts`; keep them in step when adding migrations. The PostgreSQL test suite (`apps/web/tests/postgres.test.ts`) applies these files twice.
