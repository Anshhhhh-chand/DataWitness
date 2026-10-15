"""Report download endpoints."""

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, Response

from app.api.dependencies import get_investigation_service, get_report_service
from app.domain.entities import DataWitnessError

router = APIRouter(prefix="/investigations", tags=["reports"])


@router.get("/{investigation_id}/report")
def report(investigation_id: str, format: str = Query("html", pattern="^(html|json|csv)$")) -> Response:
    try:
        record = get_investigation_service().get(investigation_id)
    except DataWitnessError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    service = get_report_service()
    if format == "json":
        return Response(
            content=service.json(record),
            media_type="application/json",
            headers={"Content-Disposition": f'attachment; filename="datawitness-{record.id}.json"'},
        )
    if format == "csv":
        return Response(
            content=service.csv(record),
            media_type="text/csv",
            headers={"Content-Disposition": f'attachment; filename="datawitness-{record.id}.csv"'},
        )
    return PlainTextResponse(
        content=service.html(record),
        media_type="text/html",
        headers={"Content-Disposition": f'attachment; filename="datawitness-{record.id}.html"'},
    )
