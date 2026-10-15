"""Rank changes using deterministic value movement heuristics."""

from typing import Iterable

import polars as pl

from app.domain.entities import ChangeUnit, Finding
from app.domain.metric_models import MetricSpec
from app.engine.metric_engine import calculate_metric
from app.engine.patch_engine import apply_change_set


def rank_changes(
    before: pl.DataFrame,
    changes: Iterable[ChangeUnit],
    minimal_set: Iterable[str],
    metric: MetricSpec,
    id_column: str,
) -> list[Finding]:
    change_list = list(changes)
    minimal_ids = set(minimal_set)
    baseline = calculate_metric(before, metric).value
    findings: list[Finding] = []
    for change in change_list:
        without = apply_change_set(before, change_list, minimal_ids - {change.id}, id_column)
        output_without = calculate_metric(without, metric).value
        effect = abs(baseline - output_without)
        findings.append(
            Finding(
                id=f"finding_{change.id}",
                change_id=change.id,
                record_id=change.record_id,
                rank=0,
                score=effect,
                explanation=(
                    "Removing this changed record moves the metric away from the before result."
                    if change.id in minimal_ids
                    else "This record changed but was not required by the verified reproducer."
                ),
                in_minimal_set=change.id in minimal_ids,
                output_without_change=output_without,
                estimated_effect=effect,
            )
        )
    findings.sort(key=lambda finding: (-finding.score, finding.record_id))
    return [Finding(**{**finding.__dict__, "rank": index}) for index, finding in enumerate(findings, start=1)]
