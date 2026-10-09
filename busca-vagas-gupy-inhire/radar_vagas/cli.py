"""Entry points, one per rodar_tudo.js "passo" being ported to Python.

Uso: python -m radar_vagas.cli <companies|gupy-search|gupy-presence>
"""
import asyncio
import json
import sys

from . import companies as companies_module
from . import config
from .platforms.gupy import GupyScraper


def _load_companies() -> list[str]:
    return json.loads((config.DATA_DIR / "companies.json").read_text(encoding="utf-8"))


def _write_json(name: str, data) -> None:
    (config.DATA_DIR / name).write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


async def cmd_companies() -> None:
    await companies_module.run()


async def cmd_gupy_search() -> None:
    scraper = GupyScraper()
    results = await scraper.fetch_jobs(_load_companies())
    _write_json("gupy_results.json", results)
    print(f"[gupy] wrote {len(results)} rows -> gupy_results.json")

    presence = scraper.build_pool_presence()
    _write_json("gupy_presence.json", presence)
    print(f"[gupy] in-list companies present in Gupy search pool: {len(presence)}")


async def cmd_gupy_presence() -> None:
    scraper = GupyScraper()
    presence = await scraper.fetch_presence(_load_companies())
    _write_json("gupy_presence_full.json", presence)


COMMANDS = {
    "companies": cmd_companies,
    "gupy-search": cmd_gupy_search,
    "gupy-presence": cmd_gupy_presence,
}


def main() -> None:
    if len(sys.argv) != 2 or sys.argv[1] not in COMMANDS:
        print(f"uso: python -m radar_vagas.cli <{'|'.join(COMMANDS)}>", file=sys.stderr)
        raise SystemExit(1)
    asyncio.run(COMMANDS[sys.argv[1]]())


if __name__ == "__main__":
    main()
