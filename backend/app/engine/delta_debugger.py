"""Bounded, deterministic delta-debugging search."""

from dataclasses import dataclass
from time import monotonic
from typing import Any, Callable, Iterable

from app.domain.entities import ChangeUnit, Experiment


@dataclass(frozen=True)
class _Evaluation:
    matches: bool
    output: float | None = None
    cache_hit: bool = False


@dataclass(frozen=True)
class MinimizationResult:
    selected_ids: list[str]
    experiments: list[Experiment]
    experiment_count: int
    cache_hits: int
    stop_reason: str | None
    minimality_established: bool
    final_output: float | None
    target_output: float | None
    reproduced: bool


def _change_id(change: ChangeUnit | str) -> str:
    return change if isinstance(change, str) else change.id


def _evaluate(raw: Any) -> _Evaluation:
    if isinstance(raw, _Evaluation):
        return raw
    if isinstance(raw, bool):
        return _Evaluation(matches=raw)
    if isinstance(raw, tuple):
        if len(raw) == 2:
            return _Evaluation(matches=bool(raw[0]), output=float(raw[1]) if raw[1] is not None else None)
        if len(raw) >= 3:
            return _Evaluation(
                matches=bool(raw[0]),
                output=float(raw[1]) if raw[1] is not None else None,
                cache_hit=bool(raw[2]),
            )
    if isinstance(raw, dict):
        return _Evaluation(
            matches=bool(raw.get("matches", raw.get("matched", False))),
            output=float(raw["output"]) if raw.get("output") is not None else None,
            cache_hit=bool(raw.get("cache_hit", False)),
        )
    matches = bool(getattr(raw, "matches_target", False))
    output = getattr(raw, "value", None)
    return _Evaluation(matches=matches, output=float(output) if output is not None else None)


def _chunks(values: list[str], count: int) -> list[list[str]]:
    width = max(1, (len(values) + count - 1) // count)
    return [values[index : index + width] for index in range(0, len(values), width)]


def _notify(progress: Callable[..., None] | None, completed: int, budget: int, message: str) -> None:
    if progress is None:
        return
    try:
        progress(completed, budget, message)
    except TypeError:
        progress(completed, budget)


def minimize_change_set(
    all_changes: Iterable[ChangeUnit | str],
    predicate: Callable[[list[str]], Any],
    budget: int,
    progress: Callable[..., None] | None = None,
    should_cancel: Callable[[], bool] | None = None,
    time_limit_seconds: float | None = None,
) -> MinimizationResult:
    """Find a small reproducing subset without exceeding configured limits."""

    candidates = sorted({_change_id(change) for change in all_changes})
    experiments: list[Experiment] = []
    cache_hits = 0
    started = monotonic()
    stop_reason: str | None = None
    target_output: float | None = None

    def run(candidate: list[str], message: str) -> _Evaluation | None:
        nonlocal cache_hits, stop_reason, target_output
        if len(experiments) >= max(0, budget):
            stop_reason = "experiment_budget_reached"
            return None
        if time_limit_seconds is not None and monotonic() - started >= time_limit_seconds:
            stop_reason = "time_limit_reached"
            return None
        if should_cancel is not None and should_cancel():
            stop_reason = "cancelled"
            return None
        evaluation = _evaluate(predicate(list(candidate)))
        sequence = len(experiments) + 1
        if target_output is None and evaluation.output is not None:
            target_output = evaluation.output
        if evaluation.cache_hit:
            cache_hits += 1
        experiments.append(
            Experiment(
                sequence_number=sequence,
                selected_change_ids=list(candidate),
                output_value=evaluation.output,
                target_value=target_output or 0.0,
                distance_from_target=None,
                matches_target=evaluation.matches,
                cache_hit=evaluation.cache_hit,
            )
        )
        _notify(progress, len(experiments), budget, message)
        return evaluation

    if not candidates:
        evaluation = run([], "Checking the unchanged dataset")
        return MinimizationResult(
            selected_ids=[],
            experiments=experiments,
            experiment_count=len(experiments),
            cache_hits=cache_hits,
            stop_reason=stop_reason,
            minimality_established=stop_reason is None,
            final_output=evaluation.output if evaluation else None,
            target_output=target_output,
            reproduced=bool(evaluation and evaluation.matches),
        )

    full = run(candidates, f"Testing all {len(candidates)} changes")
    if full is None or not full.matches:
        if stop_reason is None:
            stop_reason = "full_change_set_did_not_reproduce"
        return MinimizationResult(
            selected_ids=candidates,
            experiments=experiments,
            experiment_count=len(experiments),
            cache_hits=cache_hits,
            stop_reason=stop_reason,
            minimality_established=False,
            final_output=full.output if full else None,
            target_output=target_output,
            reproduced=bool(full and full.matches),
        )

    current = candidates
    granularity = 2
    while len(current) >= 2:
        groups = _chunks(current, granularity)
        reduced = False
        for group in groups:
            group_set = set(group)
            complement = [item for item in current if item not in group_set]
            evaluation = run(complement, f"Testing a smaller group of {len(complement)} changes")
            if evaluation is None:
                break
            if evaluation.matches:
                current = complement
                granularity = max(granularity - 1, 2)
                reduced = True
                break
        if stop_reason is not None:
            break
        if reduced:
            continue
        if granularity >= len(current):
            break
        granularity = min(len(current), granularity * 2)

    minimality_established = stop_reason is None
    return MinimizationResult(
        selected_ids=current,
        experiments=experiments,
        experiment_count=len(experiments),
        cache_hits=cache_hits,
        stop_reason=stop_reason,
        minimality_established=minimality_established,
        final_output=experiments[-1].output_value if experiments else None,
        target_output=target_output,
        reproduced=True,
    )
