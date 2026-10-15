"""Small job runner abstraction for local background execution."""

from collections.abc import Callable
from typing import TypeVar

T = TypeVar("T")


class JobRunner:
    def run(self, job: Callable[[], T]) -> T:
        return job()
