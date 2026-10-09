"""Env-var configuration, mirroring the Node scripts' defaults."""
import os
from pathlib import Path

# Same convention as lib.js's `DIR = __dirname`: in the container everything
# (input xlsx, output JSON) lives flat in the script's own working directory.
# Override for local dev, where radar_vagas/ is a sibling of busca_vagas/
# rather than living inside it.
DATA_DIR = Path(os.environ.get("RADAR_DATA_DIR", ".")).resolve()

RAILS_EMPRESAS_URL = os.environ.get("RAILS_EMPRESAS_URL", "http://web:3000/empresas_alvos.json")
BASIC_AUTH_USER = os.environ.get("BASIC_AUTH_USER")
BASIC_AUTH_PASSWORD = os.environ.get("BASIC_AUTH_PASSWORD")
