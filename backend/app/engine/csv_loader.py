"""Safe, bounded CSV loading using Polars."""

from hashlib import sha256
from pathlib import Path

import polars as pl

from app.domain.entities import ColumnInfo, DatasetPreview, DataWitnessError


def validate_file_size(path: Path, max_bytes: int) -> None:
    size = path.stat().st_size
    if size == 0:
        raise DataWitnessError("The CSV file is empty.")
    if size > max_bytes:
        raise DataWitnessError(f"The CSV file exceeds the {max_bytes // (1024 * 1024)} MB limit.")


def calculate_file_hash(path: Path) -> str:
    digest = sha256()
    with path.open("rb") as file:
        for chunk in iter(lambda: file.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_csv(path: Path, max_rows: int) -> pl.DataFrame:
    if path.suffix.lower() != ".csv":
        raise DataWitnessError("Only CSV files are supported.")
    try:
        table = pl.read_csv(path, infer_schema_length=1000, try_parse_dates=False)
    except (pl.exceptions.PolarsError, UnicodeError) as exc:
        raise DataWitnessError("The CSV file could not be parsed. Check its header and encoding.") from exc
    if not table.columns:
        raise DataWitnessError("The CSV file must contain a header row.")
    if table.height > max_rows:
        raise DataWitnessError(f"The CSV file exceeds the {max_rows:,} row limit.")
    return table


def preview_csv(path: Path, limit: int = 10) -> DatasetPreview:
    table = load_csv(path, max_rows=max(limit, 1_000_000_000))
    columns = [ColumnInfo(name=name, dtype=str(dtype)) for name, dtype in table.schema.items()]
    return DatasetPreview(row_count=table.height, columns=columns, rows=table.head(limit).to_dicts())
