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
    simulation_delay: float = 2.5

    @property
    def ai_enabled(self) -> bool:
        return bool(self.openrouter_key and self.model)

    def __post_init__(self):
        self.data_dir.mkdir(parents=True, exist_ok=True)
        if not self.database_url:
            self.database_url = f"sqlite:///{self.data_dir / 'jude.db'}"
        if self.database_url.startswith("postgresql://"):
            self.database_url = self.database_url.replace(
                "postgresql://", "postgresql+psycopg://", 1
            )
