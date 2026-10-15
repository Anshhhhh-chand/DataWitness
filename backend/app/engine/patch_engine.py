"""Apply row-level changes to a before table."""

from typing import Iterable

import polars as pl

from app.domain.entities import ChangeUnit


def apply_change_set(
    before: pl.DataFrame,
    changes: Iterable[ChangeUnit],
    selected_ids: Iterable[str],
    id_column: str,
) -> pl.DataFrame:
    selected = set(selected_ids)
    selected_changes = [change for change in changes if change.id in selected or change.record_id in selected]
    rows = {str(row[id_column]): row for row in before.to_dicts()}
    for change in selected_changes:
        if change.kind.value == "deleted":
            rows.pop(change.record_id, None)
        elif change.after_values is not None:
            rows[change.record_id] = dict(change.after_values)
    order = [str(row[id_column]) for row in before.to_dicts() if str(row[id_column]) in rows]
    order.extend(sorted(record_id for record_id in rows if record_id not in set(order)))
    result = [rows[record_id] for record_id in order]
    return pl.DataFrame(result, schema=before.schema) if result else before.clear()
