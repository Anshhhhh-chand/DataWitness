from pathlib import Path

import polars as pl
import pytest

from app.config import Settings
from app.domain.entities import DataWitnessError
from app.domain.metric_models import MetricSpec
from app.engine.csv_loader import load_csv, validate_file_size
from app.engine.delta_debugger import minimize_change_set
from app.engine.diff_engine import compute_diff
from app.engine.investigation_engine import run_investigation
from app.engine.metric_engine import calculate_metric
from app.engine.patch_engine import apply_change_set
from app.engine.schema_validator import validate_dataset_pair


def test_diff_and_full_patch_reconstruct_after() -> None:
    before = pl.DataFrame({"id": ["a", "b", "c"], "amount": [10, 20, 30]})
    after = pl.DataFrame({"id": ["a", "b", "d"], "amount": [10, 25, 40]})

    diff = compute_diff(before, after, "id")
    assert diff.summary.added == 1
    assert diff.summary.deleted == 1
    assert diff.summary.modified == 1
    assert next(change for change in diff.changes if change.record_id == "b").changed_columns == ["amount"]

    patched = apply_change_set(before, diff.changes, [change.id for change in diff.changes], "id")
    assert patched.sort("id").equals(after.sort("id"))


def test_metrics_and_schema_validation() -> None:
    table = pl.DataFrame({"id": ["a", "b"], "amount": [10, 20]})
    assert calculate_metric(table, MetricSpec(kind="count")).value == 2
    assert calculate_metric(table, MetricSpec(kind="sum", column="amount")).value == 30
    assert calculate_metric(table, MetricSpec(kind="average", column="amount")).value == 15
    assert validate_dataset_pair(table, table, "id").valid
    invalid = validate_dataset_pair(table, pl.DataFrame({"id": ["a", "a"], "amount": [1, 2]}), "id")
    assert not invalid.valid


def test_delta_debugger_finds_known_two_change_reproducer() -> None:
    def predicate(selected: list[str]) -> tuple[bool, float]:
        matched = {"change-a", "change-b"}.issubset(selected)
        return matched, float(len(selected))

    result = minimize_change_set(["change-d", "change-b", "change-a", "change-c"], predicate, budget=50)

    assert result.reproduced
    assert result.selected_ids == ["change-a", "change-b"]
    assert result.minimality_established
    assert result.experiment_count <= 50


def test_investigation_result_is_deterministic(tmp_path: Path) -> None:
    before_path = tmp_path / "before.csv"
    after_path = tmp_path / "after.csv"
    before_path.write_text("id,amount\na,10\nb,20\nc,30\n", encoding="utf-8")
    after_path.write_text("id,amount\na,10\nb,25\nc,30\nd,40\n", encoding="utf-8")
    settings = Settings(data_dir=tmp_path / "data", experiment_budget=50)

    first = run_investigation(before_path, after_path, "id", MetricSpec(kind="sum", column="amount"), settings)
    second = run_investigation(before_path, after_path, "id", MetricSpec(kind="sum", column="amount"), settings)

    assert first.minimal_change_ids == second.minimal_change_ids
    assert first.new_result == second.new_result
    assert first.reproduction_status == "verified_reproducer"


def test_csv_limits(tmp_path: Path) -> None:
    path = tmp_path / "rows.csv"
    path.write_text("id\na\n", encoding="utf-8")
    assert load_csv(path, 2).height == 1
    with pytest.raises(DataWitnessError):
        validate_file_size(path, 1)
