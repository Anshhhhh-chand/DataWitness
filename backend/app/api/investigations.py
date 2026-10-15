"""Investigation creation, state, progress, changes and evidence endpoints."""

import asyncio
from typing import Any

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse

from app.api.dependencies import get_investigation_service, get_repository
from app.domain.entities import DataWitnessError
from app.domain.schemas import (
    ChangeResponse,
    ChangesResponse,
    ExperimentResponse,
    FindingResponse,
    InvestigationCreatedResponse,
    InvestigationCreateRequest,
    InvestigationSummary,
)
from app.services.progress_service import as_sse

router = APIRouter(prefix="/investigations", tags=["investigations"])


def _record_or_404(investigation_id: str):
    try:
        return get_investigation_service().get(investigation_id)
    except DataWitnessError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _summary(record: Any) -> InvestigationSummary:
    result = record.result
    diff = result.diff if result else None
    before = get_repository().get_upload(record.before_upload_id)
    after = get_repository().get_upload(record.after_upload_id)
    return InvestigationSummary(
        investigation_id=record.id,
        status=record.status.value,
        stage=record.stage,
        progress_percent=record.progress_percent,
        before_result=result.old_result.value if result and result.old_result else None,
        after_result=result.new_result.value if result and result.new_result else None,
        result_delta=(result.new_result.value - result.old_result.value) if result and result.old_result and result.new_result else None,
        changed_count=diff.summary.changed if diff else 0,
        added_count=diff.summary.added if diff else 0,
        deleted_count=diff.summary.deleted if diff else 0,
        modified_count=diff.summary.modified if diff else 0,
        unchanged_count=diff.summary.unchanged if diff else 0,
        minimal_change_count=len(result.minimal_change_ids) if result else 0,
        minimal_change_ids=result.minimal_change_ids if result else [],
        reproduction_status=result.reproduction_status if result else "queued",
        stop_reason=result.stop_reason if result else None,
        error_message=result.error_message if result else None,
        id_column=record.id_column,
        metric=record.metric,
        before_filename=before.filename if before else "",
        after_filename=after.filename if after else "",
        created_at=record.created_at,
        started_at=record.started_at,
        completed_at=record.completed_at,
    )


@router.post("", response_model=InvestigationCreatedResponse)
def create_investigation(request: InvestigationCreateRequest) -> InvestigationCreatedResponse:
    try:
        record = get_investigation_service().create(
            request.before_upload_id,
            request.after_upload_id,
            request.id_column,
            request.metric,
        )
    except DataWitnessError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return InvestigationCreatedResponse(investigation_id=record.id, status="queued")


@router.get("/{investigation_id}", response_model=InvestigationSummary)
def get_investigation(investigation_id: str) -> InvestigationSummary:
    return _summary(_record_or_404(investigation_id))


@router.get("/{investigation_id}/events")
async def investigation_events(investigation_id: str) -> StreamingResponse:
    record = _record_or_404(investigation_id)

    async def stream():
        index = 0
        while True:
            with record.lock:
                events = record.events[index:]
                index = len(record.events)
                terminal = record.status.value in {"completed", "partial", "failed", "cancelled"}
            for event in events:
                yield as_sse(event)
            if terminal and index >= len(record.events):
                break
            await asyncio.sleep(0.1)

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache"})


@router.post("/{investigation_id}/cancel", response_model=InvestigationSummary)
def cancel_investigation(investigation_id: str) -> InvestigationSummary:
    try:
        record = get_investigation_service().cancel(investigation_id)
    except DataWitnessError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _summary(record)


@router.get("/{investigation_id}/changes", response_model=ChangesResponse)
def list_changes(
    investigation_id: str,
    kind: str = "all",
    search: str = "",
    verified: bool | None = None,
    sort: str = "record_id",
    page: int = 1,
    page_size: int = 50,
) -> ChangesResponse:
    record = _record_or_404(investigation_id)
    if not record.result or not record.result.diff:
        return ChangesResponse(items=[], page=page, page_size=page_size, total=0)
    minimal = set(record.result.minimal_change_ids)
    changes = [
        change
        for change in record.result.diff.changes
        if (kind == "all" or change.kind.value == kind)
        and (not search or search.lower() in change.record_id.lower())
        and (verified is None or (change.id in minimal) == verified)
    ]
    if sort == "change_type":
        changes.sort(key=lambda item: (item.kind.value, item.record_id))
    else:
        changes.sort(key=lambda item: item.record_id)
    page = max(page, 1)
    page_size = min(max(page_size, 1), 500)
    start = (page - 1) * page_size
    items = [
        ChangeResponse(
            id=change.id,
            record_id=change.record_id,
            kind=change.kind.value,
            changed_columns=change.changed_columns,
            before_values=change.before_values,
            after_values=change.after_values,
            heuristic_impact=change.heuristic_impact,
            in_minimal_set=change.id in minimal,
        )
        for change in changes[start : start + page_size]
    ]
    return ChangesResponse(items=items, page=page, page_size=page_size, total=len(changes))


@router.get("/{investigation_id}/changes/{change_id}", response_model=ChangeResponse)
def get_change(investigation_id: str, change_id: str) -> ChangeResponse:
    response = list_changes(investigation_id, page_size=500)
    for item in response.items:
        if item.id == change_id:
            return item
    raise HTTPException(status_code=404, detail="Change not found.")


@router.get("/{investigation_id}/findings", response_model=list[FindingResponse])
def list_findings(investigation_id: str) -> list[FindingResponse]:
    record = _record_or_404(investigation_id)
    return [FindingResponse(**finding.__dict__) for finding in (record.result.findings if record.result else [])]


@router.get("/{investigation_id}/experiments", response_model=list[ExperimentResponse])
def list_experiments(investigation_id: str) -> list[ExperimentResponse]:
    record = _record_or_404(investigation_id)
    return [
        ExperimentResponse(
            sequence_number=experiment.sequence_number,
            selected_change_ids=experiment.selected_change_ids,
            selected_change_count=len(experiment.selected_change_ids),
            output_value=experiment.output_value,
            target_value=experiment.target_value,
            distance_from_target=experiment.distance_from_target,
            matches_target=experiment.matches_target,
            status=experiment.status,
            cache_hit=experiment.cache_hit,
            duration_ms=experiment.duration_ms,
            created_at=experiment.created_at,
        )
        for experiment in (record.result.experiments if record.result else [])
    ]
