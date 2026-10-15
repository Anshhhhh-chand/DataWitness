"""Shared service instances for API routes."""

from functools import lru_cache

from app.config import Settings, get_settings
from app.services.investigation_service import InvestigationService
from app.services.report_service import ReportService
from app.services.upload_service import UploadService
from app.storage.database import initialize_database
from app.storage.repositories import Repository


@lru_cache(maxsize=1)
def get_repository() -> Repository:
    settings = get_settings()
    initialize_database(settings.data_dir)
    return Repository()


@lru_cache(maxsize=1)
def get_upload_service() -> UploadService:
    return UploadService(get_repository(), get_settings())


@lru_cache(maxsize=1)
def get_investigation_service() -> InvestigationService:
    return InvestigationService(get_repository(), get_settings())


@lru_cache(maxsize=1)
def get_report_service() -> ReportService:
    return ReportService(get_repository())


def get_app_settings() -> Settings:
    return get_settings()
