"""Built-in deterministic sales demo."""

from fastapi import APIRouter, HTTPException

from app.api.dependencies import get_investigation_service, get_upload_service
from app.config import PROJECT_ROOT
from app.domain.entities import DataWitnessError
from app.domain.enums import DatasetRole
from app.domain.metric_models import MetricSpec
from app.domain.schemas import InvestigationCreatedResponse

router = APIRouter(prefix="/demo", tags=["demo"])


@router.post("/investigations", response_model=InvestigationCreatedResponse)
def create_demo_investigation() -> InvestigationCreatedResponse:
    before_path = PROJECT_ROOT / "data" / "demo" / "sales_before.csv"
    after_path = PROJECT_ROOT / "data" / "demo" / "sales_after.csv"
    if not before_path.exists() or not after_path.exists():
        raise HTTPException(status_code=500, detail="The demo dataset is missing.")
    try:
        upload_service = get_upload_service()
        before = upload_service.save_upload(before_path.name, DatasetRole.BEFORE, before_path.read_bytes())
        after = upload_service.save_upload(after_path.name, DatasetRole.AFTER, after_path.read_bytes())
        record = get_investigation_service().create(
            before.id,
            after.id,
            "order_id",
            MetricSpec(kind="sum", column="profit"),
        )
    except DataWitnessError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return InvestigationCreatedResponse(investigation_id=record.id, status=record.status.value)
