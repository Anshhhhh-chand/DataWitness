"""Pydantic schemas for the public API."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.metric_models import MetricSpec


class ColumnSchema(BaseModel):
    name: str
    dtype: str
    nullable: bool = True


class UploadResponse(BaseModel):
    upload_id: str
    role: Literal["before", "after"]
    filename: str
    size_bytes: int
    sha256: str
    row_count: int
    columns: list[ColumnSchema]
    preview_rows: list[dict[str, Any]]


class InvestigationCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    before_upload_id: str
    after_upload_id: str
    id_column: str = Field(min_length=1)
    metric: MetricSpec


class InvestigationCreatedResponse(BaseModel):
    investigation_id: str
    status: str


class ProgressEventSchema(BaseModel):
    stage: str
    percent: int
    message: str
    experiments_completed: int = 0
    experiments_total: int = 0


class InvestigationSummary(BaseModel):
    investigation_id: str
    status: str
    stage: str
    progress_percent: int
    before_result: float | None
    after_result: float | None
    result_delta: float | None
    changed_count: int
    added_count: int
    deleted_count: int
    modified_count: int
    unchanged_count: int
    minimal_change_count: int
    minimal_change_ids: list[str]
    reproduction_status: str
    stop_reason: str | None
    error_message: str | None
    id_column: str
    metric: MetricSpec
    before_filename: str
    after_filename: str
    created_at: datetime
    started_at: datetime | None
    completed_at: datetime | None
    experiments_completed: int = 0
    experiment_budget: int = 0
    cache_hits: int = 0
    candidate_set_size: int = 0


class ReplayResponse(BaseModel):
    investigation_id: str
    selected_change_ids: list[str]
    reproduced_value: float | None
    target_value: float | None
    matches_target: bool
    message: str


class ChangeResponse(BaseModel):
    id: str
    record_id: str
    kind: str
    changed_columns: list[str]
    before_values: dict[str, Any] | None
    after_values: dict[str, Any] | None
    heuristic_impact: float | None
    in_minimal_set: bool


class ChangesResponse(BaseModel):
    items: list[ChangeResponse]
    page: int
    page_size: int
    total: int


class FindingResponse(BaseModel):
    id: str
    change_id: str
    record_id: str
    rank: int
    score: float
    explanation: str
    in_minimal_set: bool
    output_without_change: float | None
    estimated_effect: float | None


class ExperimentResponse(BaseModel):
    sequence_number: int
    selected_change_ids: list[str]
    selected_change_count: int
    output_value: float | None
    target_value: float
    distance_from_target: float | None
    matches_target: bool
    status: str
    cache_hit: bool
    duration_ms: float
    created_at: datetime
