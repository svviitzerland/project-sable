"""Local-only browser fixture: hosted transports, disposable data, fake storage.

Run from be: uv run uvicorn tests.hosted_preview:app --port 8010
Never use this entrypoint in a deployment.
"""

from pathlib import Path
from tempfile import mkdtemp

from app.config import Settings
from app.factory import create_app
from tests.test_vercel_runtime import Storage

settings = Settings(
    data_dir=Path(mkdtemp(prefix="jude-hosted-acceptance-")),
    database_url="",
    production=False,
    serverless=False,
    origins=["http://127.0.0.1:3012", "http://localhost:3012"],
    openrouter_key="",
    speechmatics_key="",
    pasal_key="",
    supabase_url="",
    supabase_key="",
    qstash_token="",
    simulation_delay=0.05,
)
app = create_app(settings)
# Bootstrap SQLite locally before enabling only the hosted transport paths.
# Shared coordination is covered separately by the runtime/PostgreSQL suites.
settings.serverless = True
settings.supabase_url = "https://storage.example"
app.state.storage = Storage()
