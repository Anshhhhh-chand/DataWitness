"""Small deterministic cache for repeated metric experiments."""

import hashlib
import json
from threading import Lock

from app.domain.entities import MetricResult
from app.domain.metric_models import MetricSpec


def build_cache_key(investigation_id: str, metric: MetricSpec, selected_ids: list[str]) -> str:
    payload = {
        "investigation_id": investigation_id,
        "metric": metric.model_dump(mode="json"),
        "selected_ids": sorted(selected_ids),
    }
    return hashlib.sha256(json.dumps(payload, sort_keys=True).encode("utf-8")).hexdigest()


class ExperimentCache:
    def __init__(self) -> None:
        self._values: dict[str, MetricResult] = {}
        self._lock = Lock()

    def get(self, key: str) -> MetricResult | None:
        with self._lock:
            return self._values.get(key)

    def store(self, key: str, result: MetricResult) -> None:
        with self._lock:
            self._values[key] = result


_CACHE = ExperimentCache()


def get_cached_result(key: str) -> MetricResult | None:
    return _CACHE.get(key)


def store_result(key: str, result: MetricResult) -> None:
    _CACHE.store(key, result)
