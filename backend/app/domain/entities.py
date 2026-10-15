"""Engine entities kept independent from HTTP and storage concerns."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any, Callable

from app.domain.enums import ChangeKind, InvestigationStatus


class DataWitnessError(Exception):
    """Expected, user-safe application error."""


class ValidationError(DataWitnessError):
    """The supplied dataset cannot be investigated."""


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


@dataclass(frozen=True)
class ColumnInfo:
    name: str
    dtype: str
    nullable: bool = True


@dataclass(frozen=True)
class DatasetPreview:
    row_count: int
    columns: list[ColumnInfo]
    rows: list[dict[str, Any]]


@dataclass(frozen=True)
class ChangeUnit:
    id: str
    record_id: str
    kind: ChangeKind
    changed_columns: list[str]
    before_values: dict[str, Any] | None
    after_values: dict[str, Any] | None
    heuristic_impact: float | None = None

    @property
    def change_id(self) -> str:
        return self.id


@dataclass(frozen=True)
class ChangeSummary:
    added: int
    deleted: int
    modified: int
    unchanged: int

    @property
    def changed(self) -> int:
        return self.added + self.deleted + self.modified


@dataclass(frozen=True)
class ColumnChangeSummary:
    column: str
    changed_count: int


@dataclass(frozen=True)
class DiffResult:
    changes: list[ChangeUnit]
    summary: ChangeSummary
    column_summaries: list[ColumnChangeSummary]
    unchanged_record_ids: list[str] = field(default_factory=list)


@dataclass(frozen=True)
class MetricResult:
    kind: str
    column: str | None
    value: float


@dataclass(frozen=True)
class Experiment:
    sequence_number: int
    selected_change_ids: list[str]
    output_value: float | None
    target_value: float
    distance_from_target: float | None
    matches_target: bool
    status: str = "completed"
    cache_hit: bool = False
    duration_ms: float = 0.0
    created_at: datetime = field(default_factory=utc_now)


@dataclass(frozen=True)
class Finding:
    id: str
    change_id: str
    record_id: str
    rank: int
    score: float
    explanation: str
    in_minimal_set: bool
    output_without_change: float | None = None
    estimated_effect: float | None = None


@dataclass
class InvestigationResult:
    status: InvestigationStatus
    stage: str
    progress_percent: int
    old_result: MetricResult | None
    new_result: MetricResult | None
    diff: DiffResult | None
    minimal_change_ids: list[str]
    experiments: list[Experiment]
    findings: list[Finding]
    reproduction_status: str
    stop_reason: str | None = None
    error_message: str | None = None
    started_at: datetime | None = None
    completed_at: datetime | None = None
    algorithm_version: str = "delta-debugger-v1"


ProgressCallback = Callable[[str, int, str, int, int], None]
