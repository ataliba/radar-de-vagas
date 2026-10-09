from radar_vagas.matching import (
    build_company_matcher,
    compact,
    slugify,
    slug_variants,
    title_matches,
    tokens,
)


def test_compact_strips_accents_lowercases_and_removes_punctuation():
    assert compact("Pathfind - Otimização de Rotas") == "pathfindotimizacaoderotas"


def test_compact_expands_ampersand():
    assert compact("Ben & Jerry") == "benejerry"


def test_tokens_drops_stopwords():
    assert tokens("Lopes Consultoria S.A.") == ["lopes", "consultoria"]


def test_slugify_falls_back_to_vaga_for_empty_input():
    assert slugify("!!!") == "vaga"


def test_slugify_basic():
    assert slugify("Engenheiro DevOps & Cloud") == "engenheiro-devops-and-cloud"


def test_slug_variants_includes_compact_and_first_token():
    variants = slug_variants("Pathfind - Otimização de Rotas")
    assert "pathfindotimizacaoderotas" in variants
    assert "pathfind" in variants


def test_title_matches_shared_distinctive_token():
    assert title_matches("Pathfind", "Vagas Pathfind Tecnologia")


def test_title_matches_has_no_generic_stopword_guard():
    # Known limitation ported as-is from gupy_presence_full.js's titleMatches:
    # unlike validate_inhire.js's stricter nameMatches (GENERIC stopword set,
    # InHire-only, not yet ported), a shared generic word like "consultoria"
    # alone is enough to match here. See busca_vagas/README.md's note on
    # empresa<->tenant matching false positives.
    assert title_matches("Lopes Consultoria", "BIX Consultoria de Dados")


def test_build_company_matcher_exact():
    match = build_company_matcher(["Uhuu", "Pathfind - Otimização de Rotas"])
    assert match("Uhuu") == "Uhuu"


def test_build_company_matcher_no_false_positive_on_short_prefix_overlap():
    match = build_company_matcher(["Pathfind - Otimização de Rotas"])
    assert match("Pathfind Tecnologia LTDA") is None


def test_build_company_matcher_none_for_unrelated():
    match = build_company_matcher(["Uhuu"])
    assert match("Empresa Qualquer Sem Relacao") is None
