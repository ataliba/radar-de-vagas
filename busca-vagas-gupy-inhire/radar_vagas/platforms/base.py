"""Common interface for a per-platform scraper module."""
from abc import ABC, abstractmethod


class PlatformScraper(ABC):
    """One module per ATS (Gupy, InHire, Sólides, ...).

    `fetch_jobs` does the global/pooled job search; `fetch_presence` checks,
    per target company, whether it has a career page on the platform at all
    (independent of whether it currently has a matching open role).
    """

    @abstractmethod
    async def fetch_jobs(self, companies: list[str]) -> list[dict]: ...

    @abstractmethod
    async def fetch_presence(self, companies: list[str]) -> list[dict]: ...
