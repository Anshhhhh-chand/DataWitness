"""Background investigation jobs and progress state."""

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from threading import Lock
from uuid import uuid4

from app.config import Settings
from app.domain.entities import DataWitnessError
from app.domain.enums import InvestigationStatus
from app.domain.metric_models import MetricSpec
from app.engine.investigation_engine import run_investigation
from app.storage.repositories import InvestigationRecord, Repository


class InvestigationService:
    def __init__(self, repository: Repository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings
        self.executor = ThreadPoolExecutor(max_workers=4, thread_name_prefix="datawitness")
        self.lock = Lock()

    def create(self, before_upload_id: str, after_upload_id: str, id_column: str, metric: MetricSpec) -> InvestigationRecord:
        before = self.repository.get_upload(before_upload_id)
        after = self.repository.get_upload(after_upload_id)
        if before is None or after is None:
            raise DataWitnessError("Both uploaded datasets are required.")
        if before.role.value != "before" or after.role.value != "after":
            raise DataWitnessError("Choose one before dataset and one after dataset.")
        record = InvestigationRecord(
            id=str(uuid4()),
            before_upload_id=before_upload_id,
            after_upload_id=after_upload_id,
            id_column=id_column,
            metric=metric,
            events=[
                {
                    "stage": "queued",
                    "percent": 0,
                    "message": "Investigation queued",
                    "experiments_completed": 0,
                    "experiments_total": self.settings.experiment_budget,
                }
            ],
        )
        self.repository.add_investigation(record)
        self.executor.submit(self._run, record)
        return record

    def _set_progress(self, record: InvestigationRecord, stage: str, percent: int, message: str, done: int, total: int) -> None:
        with record.lock:
            record.stage = stage
            record.progress_percent = percent
            record.events.append(
                {
                    "stage": stage,
                    "percent": percent,
                    "message": message,
                    "experiments_completed": done,
                    "experiments_total": total,
                }
            )

    def _run(self, record: InvestigationRecord) -> None:
        before = self.repository.get_upload(record.before_upload_id)
        after = self.repository.get_upload(record.after_upload_id)
        if before is None or after is None:
            return
        with record.lock:
            record.status = InvestigationStatus.RUNNING
            record.started_at = datetime.now(timezone.utc)
        self._set_progress(record, "running", 1, "Investigation started", 0, self.settings.experiment_budget)

        def progress(stage: str, percent: int, message: str, done: int, total: int) -> None:
            self._set_progress(record, stage, percent, message, done, total)

        result = run_investigation(
            before_path=__import__("pathlib").Path(before.path),
            after_path=__import__("pathlib").Path(after.path),
            id_column=record.id_column,
            metric=record.metric,
            settings=self.settings,
            progress_callback=progress,
            should_cancel=record.cancel_event.is_set,
            investigation_id=record.id,
        )
        with record.lock:
            record.result = result
            record.status = result.status
            record.stage = result.stage
            record.progress_percent = result.progress_percent
            record.started_at = result.started_at
            record.completed_at = result.completed_at
        self._set_progress(
            record,
            result.stage,
            result.progress_percent,
            result.error_message or "Investigation finished",
            len(result.experiments),
            self.settings.experiment_budget,
        )

    def get(self, investigation_id: str) -> InvestigationRecord:
        record = self.repository.get_investigation(investigation_id)
        if record is None:
            raise DataWitnessError("Investigation not found.")
        return record

    def cancel(self, investigation_id: str) -> InvestigationRecord:
        record = self.get(investigation_id)
        with record.lock:
            if record.status in {
                InvestigationStatus.QUEUED,
                InvestigationStatus.RUNNING,
            }:
                record.cancel_event.set()
                record.events.append(
                    {
                        "stage": record.stage,
                        "percent": record.progress_percent,
                        "message": "Cancellation requested",
                        "experiments_completed": 0,
                        "experiments_total": self.settings.experiment_budget,
                    }
                )
        return record
