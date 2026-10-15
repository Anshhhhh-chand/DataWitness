"""Thread-safe in-process repositories for the local single-user app."""

from dataclasses import dataclass, field
from threading import Event, RLock
from typing import Any

from app.domain.entities import DatasetPreview, InvestigationResult, utc_now
from app.domain.enums import DatasetRole, InvestigationStatus
from app.domain.metric_models import MetricSpec


@dataclass
class UploadRecord:
    id: str
    role: DatasetRole
    filename: str
    path: str
    size_bytes: int
    sha256: str
    preview: DatasetPreview
    created_at: Any = field(default_factory=utc_now)


@dataclass
class InvestigationRecord:
    id: str
    before_upload_id: str
    after_upload_id: str
    id_column: str
    metric: MetricSpec
    created_at: Any = field(default_factory=utc_now)
    result: InvestigationResult | None = None
    status: InvestigationStatus = InvestigationStatus.QUEUED
    stage: str = "queued"
    progress_percent: int = 0
    started_at: Any | None = None
    completed_at: Any | None = None
    events: list[dict[str, Any]] = field(default_factory=list)
    cancel_event: Event = field(default_factory=Event)
    lock: RLock = field(default_factory=RLock)


class Repository:
    def __init__(self) -> None:
        self.uploads: dict[str, UploadRecord] = {}
        self.investigations: dict[str, InvestigationRecord] = {}
        self.lock = RLock()

    def add_upload(self, record: UploadRecord) -> None:
        with self.lock:
            self.uploads[record.id] = record

    def get_upload(self, upload_id: str) -> UploadRecord | None:
        with self.lock:
            return self.uploads.get(upload_id)

    def add_investigation(self, record: InvestigationRecord) -> None:
        with self.lock:
            self.investigations[record.id] = record

    def get_investigation(self, investigation_id: str) -> InvestigationRecord | None:
        with self.lock:
            return self.investigations.get(investigation_id)

    def recent_investigations(self, limit: int = 10) -> list[InvestigationRecord]:
        with self.lock:
            records = list(self.investigations.values())
        return sorted(records, key=lambda record: record.created_at, reverse=True)[:limit]
