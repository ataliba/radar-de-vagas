"""Role matching against a job title — port of buildMatchRole() in lib.js.

Os termos vêm de termos.json, gerado por extrair_termos.js (passo [0] do
rodar_tudo.js) a partir da config em TermoBusca no Rails — preset
DevOps/SRE/Cloud/Infra ou Dados/BI/Growth + termos customizados. A mesma
lista alimenta as QUERIES de busca e a classificação de título, evitando
dessincronia entre as duas.
"""
import json
from collections.abc import Callable
from pathlib import Path

from .matching import normalize_spaced

# Preset DevOps/SRE/Cloud/Infra embutido — mesmo conteúdo de FALLBACK_DEVOPS
# em extrair_termos.js (e de rails/db/seed_data/termos_devops.json), usado
# quando termos.json não existe (ex.: CLI rodada fora do rodar_tudo.js).
FALLBACK_DEVOPS = [
    {"termo": "DevOps", "rotulo": "DevOps Engineer / SRE"},
    {"termo": "SRE", "rotulo": "DevOps Engineer / SRE"},
    {"termo": "Site Reliability Engineer", "rotulo": "DevOps Engineer / SRE"},
    {"termo": "Cloud", "rotulo": "Cloud Engineer / Cloud Security / Platform Engineer"},
    {"termo": "Cloud Engineer", "rotulo": "Cloud Engineer / Cloud Security / Platform Engineer"},
    {"termo": "Cloud Security", "rotulo": "Cloud Engineer / Cloud Security / Platform Engineer"},
    {"termo": "Analista Cloud", "rotulo": "Cloud Engineer / Cloud Security / Platform Engineer"},
    {"termo": "Nuvem", "rotulo": "Cloud Engineer / Cloud Security / Platform Engineer"},
    {"termo": "Platform Engineer", "rotulo": "Cloud Engineer / Cloud Security / Platform Engineer"},
    {"termo": "Kubernetes", "rotulo": "Kubernetes Engineer"},
    {"termo": "Infraestrutura", "rotulo": "Infraestrutura / Sysadmin"},
    {"termo": "Analista de Infraestrutura", "rotulo": "Infraestrutura / Sysadmin"},
    {"termo": "Sysadmin", "rotulo": "Infraestrutura / Sysadmin"},
    {"termo": "Administrador de Sistemas", "rotulo": "Infraestrutura / Sysadmin"},
]


def load_termos(data_dir: Path) -> list[dict]:
    path = data_dir / "termos.json"
    if not path.exists():
        print(f"[termos] {path} não encontrado — usando preset DevOps embutido")
        return FALLBACK_DEVOPS
    return json.loads(path.read_text(encoding="utf-8-sig"))


def build_match_role(termos: list[dict]) -> Callable[[str], str | None]:
    """Title -> canonical role label matcher.

    Termos mais longos (mais específicos) são checados primeiro, o que
    substitui a priorização manual (Kubernetes antes de DevOps genérico, etc).
    Espaços nas bordas fazem o match respeitar palavra inteira.
    """
    ordered = sorted(
        ((normalize_spaced(t["termo"]).strip(), t["rotulo"]) for t in termos),
        key=lambda pair: len(pair[0]),
        reverse=True,
    )

    def match_role(title: str) -> str | None:
        t = f" {normalize_spaced(title or '')} "
        for termo, rotulo in ordered:
            if f" {termo} " in t:
                return rotulo
        return None

    return match_role
