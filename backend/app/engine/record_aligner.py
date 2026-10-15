"""Stable-ID alignment for two Polars tables."""

from dataclasses import dataclass
from typing import Any

import polars as pl


def _key(value: Any) -> str:
    return str(value)


@dataclass(frozen=True)
class AlignedRecords:
    before_by_id: dict[str, dict[str, Any]]
    after_by_id: dict[str, dict[str, Any]]
    common_ids: list[str]
    added_ids: list[str]
    deleted_ids: list[str]
    modified_ids: list[str]
    unchanged_ids: list[str]


def _rows_by_id(table: pl.DataFrame, id_column: str) -> dict[str, dict[str, Any]]:
    return {_key(row[id_column]): row for row in table.to_dicts()}


def _values_equal(before: dict[str, Any], after: dict[str, Any], columns: list[str]) -> bool:
    return all(before.get(column) == after.get(column) for column in columns)


def align_records(before: pl.DataFrame, after: pl.DataFrame, id_column: str) -> AlignedRecords:
    before_by_id = _rows_by_id(before, id_column)
    after_by_id = _rows_by_id(after, id_column)
    common_ids = sorted(set(before_by_id) & set(after_by_id))
    added_ids = sorted(set(after_by_id) - set(before_by_id))
    deleted_ids = sorted(set(before_by_id) - set(after_by_id))
    compare_columns = [column for column in before.columns if column != id_column]
    modified_ids = [
        record_id
        for record_id in common_ids
        if not _values_equal(before_by_id[record_id], after_by_id[record_id], compare_columns)
    ]
    unchanged_ids = [record_id for record_id in common_ids if record_id not in set(modified_ids)]
    return AlignedRecords(
        before_by_id=before_by_id,
        after_by_id=after_by_id,
        common_ids=common_ids,
        added_ids=added_ids,
        deleted_ids=deleted_ids,
        modified_ids=modified_ids,
        unchanged_ids=unchanged_ids,
    )


def classify_changes(aligned: AlignedRecords) -> dict[str, list[str]]:
    return {
        "added": aligned.added_ids,
        "deleted": aligned.deleted_ids,
        "modified": aligned.modified_ids,
        "unchanged": aligned.unchanged_ids,
    }
