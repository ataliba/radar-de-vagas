from pathlib import Path

from radar_vagas.companies import extract_from_xlsx

XLSX_PATH = Path(__file__).resolve().parents[2] / "empresas.xlsx"


def test_extract_from_xlsx_returns_nonempty_deduped_list():
    names = extract_from_xlsx(XLSX_PATH)
    assert len(names) > 0
    assert len(names) == len(set(names))
    assert "Empresas" not in names


def test_extract_from_xlsx_known_company_present():
    names = extract_from_xlsx(XLSX_PATH)
    assert "Uhuu" in names
