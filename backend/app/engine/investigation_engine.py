"""Orchestrate loading, diffing, metric experiments and evidence."""

from pathlib import Path
from time import monotonic
from typing import Any

from app.config import Settings
from app.domain.entities import (
    DataWitnessError,
    InvestigationResult,
    ProgressCallback,
    ValidationError,
)
from app.domain.enums import InvestigationStatus
from app.domain.metric_models import MetricSpec
from app.engine.csv_loader import load_csv
from app.engine.delta_debugger import minimize_change_set
from app.engine.diff_engine import compute_diff
from app.engine.experiment_cache import build_cache_key, get_cached_result, store_result
from app.engine.influence_scorer import rank_changes
from app.engine.metric_engine import calculate_metric, matches_target
from app.engine.patch_engine import apply_change_set
from app.engine.schema_validator import validate_dataset_pair, validate_metric


def _emit(callback: ProgressCallback | None, stage: str, percent: int, message: str, done: int = 0, total: int = 0) -> None:
    if callback:
        callback(stage, percent, message, done, total)


def run_investigation(
    before_path: Path,
    after_path: Path,
    id_column: str,
    metric: MetricSpec,
    settings: Settings,
    progress_callback: ProgressCallback | None = None,
    should_cancel: Any = lambda: False,
    investigation_id: str = "local",
) -> InvestigationResult:
    started_at = __import__("datetime").datetime.now(__import__("datetime").timezone.utc)
    try:
        _emit(progress_callback, "loading", 5, "Loading both CSV datasets")
        before = load_csv(before_path, settings.max_rows)
        after = load_csv(after_path, settings.max_rows)
        _emit(progress_callback, "validating", 15, "Validating schemas and stable IDs")
        validation = validate_dataset_pair(before, after, id_column)
        if not validation.valid:
            raise ValidationError(" ".join(validation.errors))
        validate_metric(before, metric)
        validate_metric(after, metric)
        _emit(progress_callback, "diffing", 30, "Comparing records by stable ID")
        diff = compute_diff(before, after, id_column)
        if diff.summary.changed > settings.max_changed_records:
            raise ValidationError(f"The investigation exceeds the {settings.max_changed_records:,} changed-record limit.")
        _emit(progress_callback, "calculating_baseline", 40, "Calculating before and after results")
        old_result = calculate_metric(before, metric)
        new_result = calculate_metric(after, metric)
        if not diff.changes:
            return InvestigationResult(
                status=InvestigationStatus.COMPLETED,
                stage="completed",
                progress_percent=100,
                old_result=old_result,
                new_result=new_result,
                diff=diff,
                minimal_change_ids=[],
                experiments=[],
                findings=[],
                reproduction_status="no_changes",
                started_at=started_at,
                completed_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
            )

        _emit(progress_callback, "searching", 45, "Searching for a smaller reproducing change set", 0, settings.experiment_budget)
        started_search = monotonic()

        def predicate(selected_ids: list[str]) -> dict[str, Any]:
            key = build_cache_key(investigation_id, metric, selected_ids)
            cached = get_cached_result(key)
            if cached is not None:
                output = cached.value
                return {"matches": matches_target(output, new_result.value), "output": output, "cache_hit": True}
            patched = apply_change_set(before, diff.changes, selected_ids, id_column)
            output_result = calculate_metric(patched, metric)
            store_result(key, output_result)
            return {"matches": matches_target(output_result.value, new_result.value), "output": output_result.value}

        def search_progress(done: int, total: int, message: str) -> None:
            percent = 45 + min(40, int(done / max(total, 1) * 40))
            _emit(progress_callback, "searching", percent, message, done, total)

        minimization = minimize_change_set(
            diff.changes,
            predicate,
            budget=settings.experiment_budget,
            progress=search_progress,
            should_cancel=should_cancel,
            time_limit_seconds=max(0.0, settings.time_limit_seconds - (monotonic() - started_search)),
        )
        _emit(progress_callback, "ranking", 90, "Ranking changed records by experiment evidence")
        findings = rank_changes(before, diff.changes, minimization.selected_ids, metric, id_column)
        reproduced = minimization.reproduced
        if minimization.stop_reason == "cancelled":
            status = InvestigationStatus.CANCELLED
        elif minimization.stop_reason is not None:
            status = InvestigationStatus.PARTIAL
        else:
            status = InvestigationStatus.COMPLETED
        reproduction_status = "verified_reproducer" if reproduced else "not_reproduced"
        if old_result.value == new_result.value and reproduced:
            reproduction_status = "no_effect"
        return InvestigationResult(
            status=status,
            stage=status.value,
            progress_percent=100 if status == InvestigationStatus.COMPLETED else 95,
            old_result=old_result,
            new_result=new_result,
            diff=diff,
            minimal_change_ids=minimization.selected_ids,
            experiments=minimization.experiments,
            findings=findings,
            reproduction_status=reproduction_status,
            stop_reason=minimization.stop_reason,
            started_at=started_at,
            completed_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        )
    except DataWitnessError as exc:
        return InvestigationResult(
            status=InvestigationStatus.FAILED,
            stage="failed",
            progress_percent=100,
            old_result=None,
            new_result=None,
            diff=None,
            minimal_change_ids=[],
            experiments=[],
            findings=[],
            reproduction_status="failed",
            error_message=str(exc),
            started_at=started_at,
            completed_at=__import__("datetime").datetime.now(__import__("datetime").timezone.utc),
        )
