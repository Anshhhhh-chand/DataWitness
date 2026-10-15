import time

from fastapi.testclient import TestClient

from app.main import app


def test_upload_investigate_and_download_reports() -> None:
    before = b"id,amount\na,10\nb,20\n"
    after = b"id,amount\na,10\nb,25\nc,40\n"
    with TestClient(app) as client:
        before_response = client.post(
            "/api/uploads",
            files={"file": ("before.csv", before, "text/csv")},
            data={"role": "before"},
        )
        after_response = client.post(
            "/api/uploads",
            files={"file": ("after.csv", after, "text/csv")},
            data={"role": "after"},
        )
        assert before_response.status_code == 200
        assert after_response.status_code == 200
        request = {
            "before_upload_id": before_response.json()["upload_id"],
            "after_upload_id": after_response.json()["upload_id"],
            "id_column": "id",
            "metric": {"kind": "sum", "column": "amount"},
        }
        created = client.post("/api/investigations", json=request)
        assert created.status_code == 200
        investigation_id = created.json()["investigation_id"]
        for _ in range(100):
            summary = client.get(f"/api/investigations/{investigation_id}").json()
            if summary["status"] in {"completed", "partial", "failed", "cancelled"}:
                break
            time.sleep(0.01)
        assert summary["status"] == "completed"
        assert summary["reproduction_status"] == "verified_reproducer"
        assert client.get(f"/api/investigations/{investigation_id}/changes").json()["total"] == 2
        assert client.get(f"/api/investigations/{investigation_id}/findings").status_code == 200
        assert client.get(f"/api/investigations/{investigation_id}/experiments").status_code == 200
        for report_format in ("html", "json", "csv"):
            report = client.get(f"/api/investigations/{investigation_id}/report?format={report_format}")
            assert report.status_code == 200
            assert report.content
