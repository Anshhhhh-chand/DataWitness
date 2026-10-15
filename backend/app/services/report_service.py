"""Offline HTML, JSON and CSV report generation."""

import csv
import io
import json
from dataclasses import asdict, is_dataclass
from datetime import date, datetime
from enum import Enum
from typing import Any

from app.storage.repositories import InvestigationRecord, Repository


def _jsonable(value: Any) -> Any:
    if hasattr(value, "model_dump"):
        return _jsonable(value.model_dump(mode="json"))
    if is_dataclass(value) and not isinstance(value, type):
        return {key: _jsonable(item) for key, item in asdict(value).items()}
    if isinstance(value, Enum):
        return value.value
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, list):
        return [_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {str(key): _jsonable(item) for key, item in value.items()}
    return value


class ReportService:
    def __init__(self, repository: Repository) -> None:
        self.repository = repository

    def payload(self, record: InvestigationRecord) -> dict[str, Any]:
        result = record.result
        before = self.repository.get_upload(record.before_upload_id)
        after = self.repository.get_upload(record.after_upload_id)
        return {
            "product": "DataWitness",
            "investigation_id": record.id,
            "status": record.status.value,
            "id_column": record.id_column,
            "metric": _jsonable(record.metric),
            "before_dataset": _jsonable(before),
            "after_dataset": _jsonable(after),
            "result": _jsonable(result),
            "configuration": {
                "algorithm_version": result.algorithm_version if result else "delta-debugger-v1",
            },
        }

    def json(self, record: InvestigationRecord) -> str:
        return json.dumps(self.payload(record), indent=2, sort_keys=True)

    def csv(self, record: InvestigationRecord) -> str:
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(
            [
                "record_id",
                "change_type",
                "changed_columns",
                "in_minimal_set",
                "impact_score",
                "before_values",
                "after_values",
            ]
        )
        result = record.result
        minimal = set(result.minimal_change_ids) if result else set()
        findings = result.findings if result else []
        changes = result.diff.changes if result is not None and result.diff is not None else []
        for change in changes:
            finding = next((item for item in findings if item.change_id == change.id), None)
            writer.writerow(
                [
                    change.record_id,
                    change.kind.value,
                    ",".join(change.changed_columns),
                    change.id in minimal,
                    finding.score if finding else "",
                    json.dumps(_jsonable(change.before_values), sort_keys=True),
                    json.dumps(_jsonable(change.after_values), sort_keys=True),
                ]
            )
        return output.getvalue()

    def html(self, record: InvestigationRecord) -> str:
        payload = self.payload(record)
        result = record.result
        findings = result.findings if result else []
        proof = "No reproducing set was found."
        if result and result.reproduction_status == "verified_reproducer":
            proof = (
                f"DataWitness found {len(result.minimal_change_ids)} changes that reproduce the after result "
                f"within the configured deterministic search budget."
            )
        finding_rows = "".join(
            f"<tr><td>{finding.rank}</td><td>{finding.record_id}</td><td>{finding.score:.6g}</td>"
            f"<td>{'Verified reproducer' if finding.in_minimal_set else 'Changed record'}</td></tr>"
            for finding in findings
        )
        return f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>DataWitness report</title>
<style>body{{font:16px system-ui,sans-serif;max-width:1000px;margin:40px auto;padding:0 20px;color:#172033}}table{{border-collapse:collapse;width:100%}}th,td{{border-bottom:1px solid #ddd;padding:10px;text-align:left}}.proof{{padding:20px;background:#eefbf4;border:1px solid #9ed8b8;border-radius:10px}}</style>
</head><body><h1>DataWitness investigation report</h1>
<p><strong>Investigation:</strong> {record.id}</p><p><strong>Status:</strong> {record.status.value}</p>
<p><strong>ID column:</strong> {record.id_column} · <strong>Metric:</strong> {record.metric.kind} {record.metric.column or ''}</p>
<section class="proof"><h2>Reproduction proof</h2><p>{proof}</p>
<p>Before result: {result.old_result.value if result and result.old_result else '—'}<br>
After result: {result.new_result.value if result and result.new_result else '—'}<br>
Reproducing change count: {len(result.minimal_change_ids) if result else 0}</p></section>
<h2>Ranked findings</h2><table><thead><tr><th>Rank</th><th>Record ID</th><th>Impact</th><th>Evidence</th></tr></thead><tbody>{finding_rows}</tbody></table>
<h2>Machine-readable details</h2><pre>{json.dumps(payload, indent=2, default=str)}</pre></body></html>"""
