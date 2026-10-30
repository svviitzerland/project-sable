import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class Settings:
    data_dir: Path = field(
        default_factory=lambda: Path(os.getenv("JUDE_DATA_DIR", ".data"))
    )
    database_url: str = field(default_factory=lambda: os.getenv("DATABASE_URL", ""))
    production: bool = field(
        default_factory=lambda: os.getenv("JUDE_ENV") == "production"
    )
    origins: list[str] = field(
        default_factory=lambda: os.getenv(
            "ALLOWED_ORIGINS",
            "http://localhost:3000,http://localhost:3001,http://localhost:3002,http://localhost:3003,http://127.0.0.1:3000",
        ).split(",")
    )
    openrouter_key: str = field(
        default_factory=lambda: os.getenv("OPENROUTER_API_KEY", "")
    )
    model: str = field(default_factory=lambda: os.getenv("OPENROUTER_MODEL", ""))
    embedding_model: str = field(
        default_factory=lambda: os.getenv(
            "OPENROUTER_EMBEDDING_MODEL", "openai/text-embedding-3-small"
        )
    )
    speechmatics_key: str = field(
        default_factory=lambda: os.getenv("SPEECHMATICS_API_KEY", "")
    )
    speechmatics_url: str = field(
        default_factory=lambda: os.getenv(
            "SPEECHMATICS_URL", "wss://eu.rt.speechmatics.com/v2"
        )
    )
    pasal_key: str = field(default_factory=lambda: os.getenv("PASAL_API_KEY", ""))
    supabase_url: str = field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "").rstrip("/")
    )
    supabase_key: str = field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )
    bucket: str = field(
        default_factory=lambda: os.getenv("SUPABASE_STORAGE_BUCKET", "jude-documents")
    )
    serverless: bool = field(
        default_factory=lambda: (
            os.getenv("JUDE_RUNTIME") == "vercel" or os.getenv("VERCEL") == "1"
        )
    )
    backend_url: str = field(
        default_factory=lambda: os.getenv("JUDE_BACKEND_URL", "").rstrip("/")
    )
    qstash_url: str = field(
        default_factory=lambda: os.getenv(
            "QSTASH_URL", "https://qstash.upstash.io"
        ).rstrip("/")
    )
    qstash_token: str = field(default_factory=lambda: os.getenv("QSTASH_TOKEN", ""))
    qstash_current_key: str = field(
        default_factory=lambda: os.getenv("QSTASH_CURRENT_SIGNING_KEY", "")
    )
    qstash_next_key: str = field(
        default_factory=lambda: os.getenv("QSTASH_NEXT_SIGNING_KEY", "")
    )
    cron_secret: str = field(default_factory=lambda: os.getenv("CRON_SECRET", ""))
    simulation_delay: float = 2.5

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openrouter_key and self.model)

    def __post_init__(self):
        if self.serverless:
            self.production = True
            if self.data_dir == Path(".data"):
                self.data_dir = Path("/tmp/jude")
            if not self.database_url.startswith(
                ("postgresql://", "postgresql+psycopg://")
            ):
                raise ValueError(
                    "Vercel requires PostgreSQL DATABASE_URL; SQLite is local-only."
                )
            required = {
                "SUPABASE_URL": self.supabase_url,
                "SUPABASE_SERVICE_ROLE_KEY": self.supabase_key,
                "JUDE_BACKEND_URL": self.backend_url,
                "QSTASH_TOKEN": self.qstash_token,
                "QSTASH_CURRENT_SIGNING_KEY": self.qstash_current_key,
                "QSTASH_NEXT_SIGNING_KEY": self.qstash_next_key,
                "CRON_SECRET": self.cron_secret,
            }
            if missing := [key for key, value in required.items() if not value]:
                raise ValueError("Missing Vercel configuration: " + ", ".join(missing))
            if not self.backend_url.startswith(
                "https://"
            ) or not self.supabase_url.startswith("https://"):
                raise ValueError("Hosted backend and storage URLs must use HTTPS.")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.database_url:
            self.database_url = f"sqlite:///{self.data_dir / 'jude.db'}"
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
