import json

from radar_vagas.roles import FALLBACK_DEVOPS, build_match_role, load_termos

match_role = build_match_role(FALLBACK_DEVOPS)


def test_kubernetes_takes_priority_over_generic_devops():
    assert match_role("Engenheiro DevOps / Kubernetes Pleno") == "Kubernetes Engineer"


def test_devops_sre():
    assert match_role("Analista DevOps Sr") == "DevOps Engineer / SRE"
    assert match_role("Site Reliability Engineer") == "DevOps Engineer / SRE"


def test_cloud_platform():
    assert match_role("Cloud Engineer") == "Cloud Engineer / Cloud Security / Platform Engineer"
    assert match_role("Platform Engineer Pleno") == "Cloud Engineer / Cloud Security / Platform Engineer"


def test_infra_sysadmin():
    assert match_role("Administrador de Sistemas") == "Infraestrutura / Sysadmin"


def test_unrelated_role_returns_none():
    assert match_role("Analista de Vendas") is None


def test_match_is_whole_word_not_substring():
    # "nuvemshop" nao deve casar com "nuvem" isolado (espacos como
    # delimitador, igual ao buildMatchRole em lib.js).
    assert match_role("Vendedor na Nuvemshop") is None


def test_longer_term_wins_regardless_of_input_order():
    termos = [
        {"termo": "Analista", "rotulo": "Generico"},
        {"termo": "Analista de Dados", "rotulo": "Dados"},
    ]
    assert build_match_role(termos)("Analista de Dados Pleno") == "Dados"


def test_dados_preset_ignores_devops_titles():
    dados = build_match_role([
        {"termo": "Analista de Dados", "rotulo": "Analista de Dados / Data Analyst"},
        {"termo": "Inteligência de Negócios", "rotulo": "BI / Business Intelligence"},
    ])
    assert dados("Analista de Dados Sr") == "Analista de Dados / Data Analyst"
    assert dados("Analista de Inteligencia de Negocios") == "BI / Business Intelligence"
    assert dados("Engenheiro DevOps") is None


def test_load_termos_reads_json(tmp_path):
    termos = [{"termo": "Growth", "rotulo": "Growth Analyst / Analista de Growth"}]
    (tmp_path / "termos.json").write_text(json.dumps(termos), encoding="utf-8")
    assert load_termos(tmp_path) == termos


def test_load_termos_falls_back_to_devops_when_missing(tmp_path):
    assert load_termos(tmp_path) == FALLBACK_DEVOPS
