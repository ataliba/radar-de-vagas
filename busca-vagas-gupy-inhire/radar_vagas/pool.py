"""Bounded-concurrency pool — port of pool() in lib.js."""
import asyncio
from collections.abc import Awaitable, Callable, Sequence
from typing import TypeVar

T = TypeVar("T")
R = TypeVar("R")


async def run_pool(
    items: Sequence[T],
    worker: Callable[[T], Awaitable[R]],
    concurrency: int = 12,
) -> list[R | None]:
    """Runs `worker` over `items` with at most `concurrency` in flight.

    A failing item logs its error and yields None for that slot, mirroring
    the JS pool()'s per-item try/catch (one bad item never aborts the run).
    """
    semaphore = asyncio.Semaphore(max(1, min(concurrency, len(items)) or 1))

    async def guarded(item: T) -> R | None:
        async with semaphore:
            try:
                return await worker(item)
            except Exception as exc:  # noqa: BLE001 - mirrors JS catch-and-continue
                print(f"  [pool] error: {exc}")
                return None

    return list(await asyncio.gather(*(guarded(item) for item in items)))
