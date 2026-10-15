"""Local file storage for uploaded datasets and generated reports."""

from pathlib import Path


class FileStore:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.root.mkdir(parents=True, exist_ok=True)

    def save_upload(self, upload_id: str, content: bytes) -> Path:
        path = self.root / f"{upload_id}.csv"
        path.write_bytes(content)
        return path

    def save_report(self, report_id: str, extension: str, content: str) -> Path:
        path = self.root / f"{report_id}.{extension}"
        path.write_text(content, encoding="utf-8")
        return path
