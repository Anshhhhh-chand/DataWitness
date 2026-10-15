"""Application settings and local filesystem paths."""

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


PROJECT_ROOT = Path(__file__).resolve().parents[2]


class Settings(BaseSettings):
    """Typed settings loaded from environment variables."""

    model_config = SettingsConfigDict(
        env_prefix="DATAWITNESS_",
        env_file=(str(PROJECT_ROOT / ".env"), ".env"),
        extra="ignore",
    )

    environment: str = Field(default="development", alias="ENV")
    data_dir: Path = Field(default=PROJECT_ROOT / "var" / "data")
    max_upload_bytes: int = 100 * 1024 * 1024
    max_rows: int = 250_000
    max_changed_records: int = 5_000
    experiment_budget: int = 500
    time_limit_seconds: float = 30.0
    preview_rows: int = 10
    experiment_page_size: int = 50
    change_page_size: int = 50

    @property
    def upload_dir(self) -> Path:
        return self.data_dir / "uploads"

    @property
    def report_dir(self) -> Path:
        return self.data_dir / "reports"

    def ensure_directories(self) -> None:
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.report_dir.mkdir(parents=True, exist_ok=True)


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    settings = Settings()
    settings.ensure_directories()
    return settings
