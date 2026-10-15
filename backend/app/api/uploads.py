"""CSV upload endpoint."""

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from app.api.dependencies import get_upload_service
from app.domain.entities import DataWitnessError
from app.domain.enums import DatasetRole
from app.domain.schemas import ColumnSchema, UploadResponse

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("", response_model=UploadResponse)
async def upload_csv(file: UploadFile = File(...), role: DatasetRole = Form(...)) -> UploadResponse:
    try:
        content = await file.read()
        record = get_upload_service().save_upload(file.filename or "upload.csv", role, content)
    except DataWitnessError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return UploadResponse(
        upload_id=record.id,
        role=record.role.value,
        filename=record.filename,
        size_bytes=record.size_bytes,
        sha256=record.sha256,
        row_count=record.preview.row_count,
        columns=[ColumnSchema(name=column.name, dtype=column.dtype, nullable=column.nullable) for column in record.preview.columns],
        preview_rows=record.preview.rows,
    )
