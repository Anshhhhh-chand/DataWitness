"""Upload validation and metadata creation."""

from pathlib import Path
from uuid import uuid4

from app.config import Settings
from app.domain.entities import DataWitnessError
from app.domain.enums import DatasetRole
from app.engine.csv_loader import calculate_file_hash, load_csv, preview_csv, validate_file_size
from app.storage.file_store import FileStore
from app.storage.repositories import Repository, UploadRecord


class UploadService:
    def __init__(self, repository: Repository, settings: Settings) -> None:
        self.repository = repository
        self.settings = settings
        self.file_store = FileStore(settings.upload_dir)

    def save_upload(self, filename: str, role: DatasetRole, content: bytes) -> UploadRecord:
        if not filename.lower().endswith(".csv"):
            raise DataWitnessError("Only CSV files are supported.")
        if not content:
            raise DataWitnessError("The CSV file is empty.")
        if len(content) > self.settings.max_upload_bytes:
            raise DataWitnessError(
                f"The CSV file exceeds the {self.settings.max_upload_bytes // (1024 * 1024)} MB limit."
            )
        upload_id = str(uuid4())
        path = self.file_store.save_upload(upload_id, content)
        try:
            validate_file_size(path, self.settings.max_upload_bytes)
            table = load_csv(path, self.settings.max_rows)
            preview = preview_csv(path, self.settings.preview_rows)
        except Exception:
            path.unlink(missing_ok=True)
            raise
        record = UploadRecord(
            id=upload_id,
            role=role,
            filename=Path(filename).name,
            path=str(path),
            size_bytes=len(content),
            sha256=calculate_file_hash(path),
            preview=preview,
        )
        if table.height != preview.row_count:
            path.unlink(missing_ok=True)
            raise DataWitnessError("The uploaded CSV could not be read consistently.")
        self.repository.add_upload(record)
        return record
