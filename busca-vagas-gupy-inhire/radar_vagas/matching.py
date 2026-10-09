"""Normalization and matching helpers — port of the shared parts of lib.js."""
import re
import unicodedata

_DIACRITICS = re.compile("[\u0300-\u036f]")  # combining diacritical marks (NFD)
_NON_ALNUM = re.compile(r"[^a-z0-9]+")

STOP = {
    "sa", "s", "a", "ltda", "me", "eireli", "group", "grupo", "the", "company", "co",
    "tecnologia", "tech", "brasil", "brazil", "do", "de", "da", "dos", "das", "and",
    "solutions", "software", "digital", "inc", "holding", "participacoes", "banco",
}


def _strip_accents_lower(s: str) -> str:
    return _DIACRITICS.sub("", unicodedata.normalize("NFD", str(s))).lower()


def normalize_spaced(s: str) -> str:
    """Lowercase, strip accents, collapse any non-alnum run into a single space."""
    return _NON_ALNUM.sub(" ", _strip_accents_lower(s))


def compact(s: str) -> str:
    s = _strip_accents_lower(s).replace("&", " e ")
    return _NON_ALNUM.sub("", s)


def tokens(s: str) -> list[str]:
    return [t for t in normalize_spaced(s).split() if t and t not in STOP]


def slugify(s: str) -> str:
    s = _strip_accents_lower(s).replace("&", " and ")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    return s or "vaga"


def is_remote(workplace_type, is_remote_work) -> bool:
    w = str(workplace_type or "").lower()
    if is_remote_work is True:
        return True
    return "remote" in w or "remoto" in w


def slug_variants(name: str) -> list[str]:
    """Candidate URL subdomain/slug guesses for a company name."""
    all_toks = normalize_spaced(name).split()
    toks = tokens(name)
    out: list[str] = []
    seen: set[str] = set()

    def add(v: str) -> None:
        if v and 2 <= len(v) <= 40 and v not in seen:
            seen.add(v)
            out.append(v)

    add(compact(name))
    add("".join(all_toks))
    add("".join(toks))
    add("-".join(all_toks))
    add("-".join(toks))
    if toks:
        add(toks[0])
    if all_toks:
        add(all_toks[0])
    return out


def title_matches(company: str, title: str) -> bool:
    """Loose match: shared distinctive token, or compact-substring either way."""
    a, b = set(tokens(company)), set(tokens(title))
    if any(len(t) >= 3 and t in b for t in a):
        return True
    ca, cb = compact(company), compact(title)
    return (len(ca) >= 4 and ca in cb) or (len(cb) >= 4 and cb in ca)


def build_company_matcher(companies: list[str]):
    """Returns match_company(name) -> original company string or None.

    Same policy as gupy.js's matchCompany: exact compact match first, then
    substring match requiring the shorter side to be >=5 chars (avoids noise).
    """
    indexed = [(compact(c), c) for c in companies]
    indexed = [(c, orig) for c, orig in indexed if len(c) >= 2]

    def match_company(name: str) -> str | None:
        cp = compact(name)
        if not cp:
            return None
        for c, orig in indexed:
            if c == cp:
                return orig
        for c, orig in indexed:
            if (len(c) >= 5 and c in cp) or (len(cp) >= 5 and cp in c):
                return orig
        return None

    return match_company
