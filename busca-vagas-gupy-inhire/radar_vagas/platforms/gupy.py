"""Gupy — port of gupy.js + gupy_presence_full.js.

Busca global via API pública (employability-portal.gupy.io) e checagem de
presença por empresa via probe do subdomínio (<slug>.gupy.io).
"""
import asyncio
import re

import httpx

from .. import config
from ..http_client import fetch_json_retry
from ..matching import build_company_matcher, slug_variants, title_matches
from ..pool import run_pool
from ..roles import build_match_role, load_termos
from .base import PlatformScraper

API = "https://employability-portal.gupy.io/api/v1/jobs"

_LIMIT = 100
_MAX_OFFSET = 3000  # safety cap
_TITLE_RE = re.compile(r"<title>([^<]*)</title>", re.IGNORECASE)


def _is_remote(job: dict) -> bool:
    w = str(job.get("workplaceType") or "").lower()
    if job.get("isRemoteWork") is True:
        return True
    return "remote" in w or "remoto" in w


async def _fetch_all(client: httpx.AsyncClient, query: str) -> list[dict]:
    # NOTE: pagination.total is unreliable (caps at `limit` when limit>=100),
    # but offset paging works. Page until a page returns fewer than `limit` rows.
    offset, out = 0, []
    while offset <= _MAX_OFFSET:
        url = httpx.URL(API, params={"jobName": query, "offset": offset, "limit": _LIMIT})
        json_body = await fetch_json_retry(client, str(url), headers={"Accept": "application/json"})
        data = json_body.get("data") or []
        out.extend(data)
        if len(data) < _LIMIT:
            break
        offset += _LIMIT
        await asyncio.sleep(0.12)
    return out


async def _probe_title(client: httpx.AsyncClient, slug: str) -> str | None:
    try:
        res = await client.get(f"https://{slug}.gupy.io/")
    except httpx.HTTPError:
        return None
    if res.status_code != 200:
        return None
    m = _TITLE_RE.search(res.text)
    title = m.group(1).strip() if m else ""
    if not title or title == "404":
        return None
    return title


class GupyScraper(PlatformScraper):
    """Stateful over one run: fetch_jobs() must run before build_pool_presence().

    termos: lista de {termo, rotulo} (ver roles.load_termos) — cada termo vira
    uma query na API e a mesma lista classifica o título. Default: termos.json
    em DATA_DIR, gerado pelo passo [0] do rodar_tudo.js.
    """

    def __init__(self, termos: list[dict] | None = None) -> None:
        self._termos = termos
        self._pooled_jobs: dict = {}
        self._match_company = None

    async def fetch_jobs(self, companies: list[str]) -> list[dict]:
        termos = self._termos if self._termos is not None else load_termos(config.DATA_DIR)
        queries = [t["termo"] for t in termos]
        match_role = build_match_role(termos)
        self._match_company = build_company_matcher(companies)
        by_id: dict = {}

        async with httpx.AsyncClient(timeout=30.0) as client:
            for query in queries:
                jobs = await _fetch_all(client, query)
                for job in jobs:
                    by_id[job["id"]] = job  # dedup across queries
                print(f'  [gupy] "{query}" ... fetched={len(jobs)}')

        print(f"[gupy] unique jobs pooled: {len(by_id)}")
        self._pooled_jobs = by_id

        results = []
        for job in by_id.values():
            role = match_role(job.get("name"))
            if not role or not _is_remote(job):
                continue
            company = self._match_company(job.get("careerPageName"))
            results.append({
                "platform": "Gupy",
                "companyList": company or job.get("careerPageName"),
                "companyGupy": job.get("careerPageName"),
                "na_lista": "Sim" if company else "Não",
                "role": role,
                "jobTitle": job.get("name"),
                "workplaceType": job.get("workplaceType"),
                "location": " / ".join(filter(None, [job.get("city"), job.get("state"), job.get("country")])),
                "url": job.get("jobUrl") or job.get("careerPageUrl") or "",
                "publishedDate": job.get("publishedDate") or "",
            })
        print(f"[gupy] role+remote matched rows: {len(results)}")
        return results

    def build_pool_presence(self) -> list[dict]:
        """In-list companies with any active job in the search pool (any role)."""
        presence: dict[str, dict] = {}
        for job in self._pooled_jobs.values():
            company = self._match_company(job.get("careerPageName"))
            if not company:
                continue
            row = presence.setdefault(
                company, {"empresa": company, "nome_na_plataforma": job.get("careerPageName"), "vagas_no_pool": 0}
            )
            row["vagas_no_pool"] += 1
        return sorted(presence.values(), key=lambda r: r["empresa"])

    async def fetch_presence(self, companies: list[str]) -> list[dict]:
        """Exhaustive per-company check: does <slug>.gupy.io/ resolve to them?"""
        async with httpx.AsyncClient(timeout=15.0, follow_redirects=True) as client:

            async def check_company(company: str) -> dict | None:
                for slug in slug_variants(company):
                    title = await _probe_title(client, slug)
                    if title and title_matches(company, title):
                        return {"empresa": company, "titulo_gupy": title, "url": f"https://{slug}.gupy.io/"}
                return None

            found = [row for row in await run_pool(companies, check_company, concurrency=16) if row]

        found.sort(key=lambda r: r["empresa"])
        print(f"[gupy-presence] companies with a Gupy career page: {len(found)}/{len(companies)}")
        return found
