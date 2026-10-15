"""Dataset and metric validation rules."""

from dataclasses import dataclass

import polars as pl

from app.domain.entities import ValidationError
from app.domain.metric_models import MetricSpec


@dataclass(frozen=True)
class DatasetSchema:
    columns: list[str]
    dtypes: dict[str, str]


@dataclass(frozen=True)
class SchemaValidationResult:
    valid: bool
    errors: list[str]
    columns: list[str]


def infer_schema(table: pl.DataFrame) -> DatasetSchema:
    return DatasetSchema(columns=table.columns, dtypes={name: str(dtype) for name, dtype in table.schema.items()})


def validate_id_column(table: pl.DataFrame, id_column: str) -> None:
    if id_column not in table.columns:
        raise ValidationError(f"The ID column '{id_column}' is missing.")
    series = table.get_column(id_column)
    if series.null_count() > 0:
        raise ValidationError(f"The ID column '{id_column}' contains empty values.")
    if series.cast(pl.String).str.len_chars().eq(0).any():
        raise ValidationError(f"The ID column '{id_column}' contains empty values.")
    if series.n_unique() != table.height:
        raise ValidationError(f"The ID column '{id_column}' must contain unique values.")


def validate_dataset_pair(
    before: pl.DataFrame,
    after: pl.DataFrame,
    id_column: str,
) -> SchemaValidationResult:
    errors: list[str] = []
    try:
        validate_id_column(before, id_column)
    except ValidationError as exc:
        errors.append(str(exc))
    try:
        validate_id_column(after, id_column)
    except ValidationError as exc:
        errors.append(str(exc))
    if set(before.columns) != set(after.columns):
        errors.append("The datasets must contain the same columns, regardless of order.")
    return SchemaValidationResult(valid=not errors, errors=errors, columns=before.columns)


def validate_metric(table: pl.DataFrame, metric: MetricSpec) -> None:
    if metric.kind == "count":
        return
    if not metric.column or metric.column not in table.columns:
        raise ValidationError(f"The metric column '{metric.column}' is missing.")
    dtype = table.schema[metric.column]
    if dtype not in pl.NUMERIC_DTYPES:
        raise ValidationError(f"The metric column '{metric.column}' must be numeric.")
