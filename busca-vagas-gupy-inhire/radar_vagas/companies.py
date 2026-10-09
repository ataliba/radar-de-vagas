"""Target-company list — port of extrair_empresas.js.

Prioriza o Rails (tela "Empresas cadastradas" do dashboard, editável via web)
e só cai pro empresas.xlsx embutido na imagem se o Rails estiver fora do ar
(ex.: primeira subida, antes do container do dashboard estar de pé).
"""
import json

import httpx
import openpyxl

from . import config


async def fetch_from_rails() -> list[str]:
    if config.BASIC_AUTH_USER and config.BASIC_AUTH_PASSWORD:
        auth = httpx.BasicAuth(config.BASIC_AUTH_USER, config.BASIC_AUTH_PASSWORD)
    else:
        auth = None
    async with httpx.AsyncClient(timeout=10.0, auth=auth) as client:
        res = await client.get(config.RAILS_EMPRESAS_URL)
        res.raise_for_status()
        nomes = res.json()
    if not isinstance(nomes, list) or not nomes:
        raise ValueError("lista vazia")
    return nomes


def extract_from_xlsx(xlsx_path) -> list[str]:
    """Column A of every sheet, deduplicated (order preserved).

    The legacy Node version reads xl/sharedStrings.xml directly, which is
    already a table of *distinct* strings (a repeated cell value is one
    entry referenced twice) — dedup here reproduces that, since openpyxl
    gives us one row per cell instead.
    """
    wb = openpyxl.load_workbook(xlsx_path, read_only=True, data_only=True)
    seen: set[str] = set()
    names: list[str] = []
    for sheet in wb.worksheets:
        for row in sheet.iter_rows(min_col=1, max_col=1, values_only=True):
            value = row[0]
            if value is None:
                continue
            text = str(value).strip()
            if text and text != "Empresas" and text not in seen:
                seen.add(text)
                names.append(text)
    return names


async def load_companies() -> list[str]:
    try:
        nomes = await fetch_from_rails()
        print(f"companies.json a partir do Rails ({config.RAILS_EMPRESAS_URL}): {len(nomes)} empresas")
    except Exception as exc:  # noqa: BLE001 - fallback path, mirrors JS catch
        print(f"Rails indisponível ({exc}) — usando empresas.xlsx como fallback")
        xlsx_path = config.DATA_DIR / "empresas.xlsx"
        nomes = extract_from_xlsx(xlsx_path)
        print(f"companies.json a partir do xlsx: {len(nomes)} empresas")
    return nomes


async def run() -> None:
    nomes = await load_companies()
    out_path = config.DATA_DIR / "companies.json"
    out_path.write_text(json.dumps(nomes, ensure_ascii=False, indent=2), encoding="utf-8")
