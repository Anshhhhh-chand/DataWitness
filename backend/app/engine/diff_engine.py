"""Deterministic row-level dataset diffing."""

import hashlib
from collections import Counter

import polars as pl

from app.domain.entities import ChangeSummary, ChangeUnit, ColumnChangeSummary, DiffResult
from app.domain.enums import ChangeKind
from app.engine.record_aligner import align_records


def _change_id(kind: ChangeKind, record_id: str) -> str:
    digest = hashlib.sha1(f"{kind.value}:{record_id}".encode("utf-8")).hexdigest()[:16]
    return f"{kind.value}_{digest}"


def compute_diff(before: pl.DataFrame, after: pl.DataFrame, id_column: str) -> DiffResult:
    aligned = align_records(before, after, id_column)
    columns = [column for column in before.columns if column != id_column]
    changes: list[ChangeUnit] = []
    column_counts: Counter[str] = Counter()

    for record_id in aligned.added_ids:
        row = aligned.after_by_id[record_id]
        changes.append(ChangeUnit(_change_id(ChangeKind.ADDED, record_id), record_id, ChangeKind.ADDED, columns, None, row))
        column_counts.update(columns)
    for record_id in aligned.deleted_ids:
        row = aligned.before_by_id[record_id]
        changes.append(ChangeUnit(_change_id(ChangeKind.DELETED, record_id), record_id, ChangeKind.DELETED, columns, row, None))
        column_counts.update(columns)
    for record_id in aligned.modified_ids:
        before_row = aligned.before_by_id[record_id]
        after_row = aligned.after_by_id[record_id]
        changed_columns = [column for column in columns if before_row.get(column) != after_row.get(column)]
        changes.append(
            ChangeUnit(
                _change_id(ChangeKind.MODIFIED, record_id),
                record_id,
                ChangeKind.MODIFIED,
                changed_columns,
                before_row,
                after_row,
            )
        )
        column_counts.update(changed_columns)
    changes.sort(key=lambda change: (change.record_id, change.kind.value))
    summary = ChangeSummary(
        added=len(aligned.added_ids),
        deleted=len(aligned.deleted_ids),
        modified=len(aligned.modified_ids),
        unchanged=len(aligned.unchanged_ids),
    )
    return DiffResult(
        changes=changes,
        summary=summary,
        column_summaries=[ColumnChangeSummary(column, column_counts[column]) for column in sorted(column_counts)],
        unchanged_record_ids=aligned.unchanged_ids,
    )


def get_change_summary(diff: DiffResult) -> ChangeSummary:
    return diff.summary


def get_changed_columns(diff: DiffResult) -> list[ColumnChangeSummary]:
    return diff.column_summaries
