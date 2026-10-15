"""Metric configuration and calculations returned by the engine."""

from typing import Literal

from pydantic import BaseModel, ConfigDict, model_validator


class MetricSpec(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["count", "sum", "average"]
    column: str | None = None

    @model_validator(mode="after")
    def require_column_for_numeric_metrics(self) -> "MetricSpec":
        if self.kind in {"sum", "average"} and not self.column:
            raise ValueError(f"{self.kind} metrics require a column")
        if self.kind == "count" and self.column is not None:
            raise ValueError("count metrics do not accept a column")
        return self
