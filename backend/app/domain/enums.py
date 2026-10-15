"""Stable string values shared by the API and deterministic engine."""

from enum import StrEnum


class DatasetRole(StrEnum):
    BEFORE = "before"
    AFTER = "after"


class ChangeKind(StrEnum):
    ADDED = "added"
    DELETED = "deleted"
    MODIFIED = "modified"


class InvestigationStatus(StrEnum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    PARTIAL = "partial"
    FAILED = "failed"
    CANCELLED = "cancelled"
