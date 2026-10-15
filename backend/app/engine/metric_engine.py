"""Count, sum and average calculations with stable tolerance rules."""

import math
from typing import Any, cast

import polars as pl

from app.domain.entities import MetricResult
from app.domain.metric_models import MetricSpec
from app.engine.schema_validator import validate_metric


def calculate_metric(table: pl.DataFrame, metric: MetricSpec) -> MetricResult:
    validate_metric(table, metric)
    if metric.kind == "count":
        return MetricResult(kind=metric.kind, column=None, value=float(table.height))
    assert metric.column is not None
    values = table.get_column(metric.column).drop_nulls()
    if metric.kind == "sum":
        return MetricResult(
            kind=metric.kind,
            column=metric.column,
            value=float(cast(Any, values.sum()) or 0.0),
        )
    return MetricResult(
        kind=metric.kind,
        column=metric.column,
        value=float(cast(Any, values.mean()) or 0.0),
    )


def metric_distance(actual: float, target: float, tolerance: float = 1e-9) -> float:
    if math.isclose(actual, target, rel_tol=tolerance, abs_tol=tolerance):
        return 0.0
    return abs(actual - target)


def matches_target(actual: float, target: float, tolerance: float = 1e-9) -> bool:
    return math.isclose(actual, target, rel_tol=tolerance, abs_tol=tolerance)
