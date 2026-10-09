"""Small HTTP helpers: retry-with-backoff, shared by platform modules."""
import asyncio

import httpx


async def fetch_json_retry(
    client: httpx.AsyncClient,
    url: str,
    *,
    headers: dict | None = None,
    attempts: int = 3,
    backoff_seconds: float = 0.8,
) -> dict:
    """GETs `url` as JSON, retrying up to `attempts` times with fixed backoff.

    Mirrors the Node scripts' `for (attempt...) try/catch` + sleep(800) pattern
    (Gupy: 3 attempts / 800ms).
    """
    last_exc: Exception | None = None
    for attempt in range(attempts):
        try:
            res = await client.get(url, headers=headers)
            if res.status_code != 200:
                raise RuntimeError(f"HTTP {res.status_code} for {url}")
            return res.json()
        except Exception as exc:  # noqa: BLE001 - retried below, re-raised after last attempt
            last_exc = exc
            if attempt == attempts - 1:
                raise
            await asyncio.sleep(backoff_seconds)
    raise last_exc  # pragma: no cover - unreachable, satisfies type checkers
