"""Thread-pool job manager used by the investigation service."""

from collections.abc import Callable
from concurrent.futures import Future, ThreadPoolExecutor
from typing import TypeVar

T = TypeVar("T")


class JobManager:
    def __init__(self, max_workers: int = 4) -> None:
        self.executor = ThreadPoolExecutor(max_workers=max_workers, thread_name_prefix="datawitness-job")

    def submit(self, job: Callable[[], T]) -> Future[T]:
        return self.executor.submit(job)
