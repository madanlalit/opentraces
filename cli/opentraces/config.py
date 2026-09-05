"""Local config: API URL + API key.

Precedence: env (OT_API_URL / OT_API_KEY) → ~/.opentraces/credentials → defaults.
Credentials file format:
    url=http://localhost:8787
    key=ot_live_<key_id>_<secret>
"""

import os
from pathlib import Path

CREDENTIALS_PATH = Path.home() / ".opentraces" / "credentials"
# Production API. Local dev overrides with OT_API_URL (or `ot login` against localhost).
DEFAULT_API_URL = "https://opentraces-api.lalitmadan.workers.dev"


def _read_credentials() -> dict:
    out = {}
    if CREDENTIALS_PATH.exists():
        for line in CREDENTIALS_PATH.read_text().splitlines():
            line = line.strip()
            if "=" in line and not line.startswith("#"):
                k, _, v = line.partition("=")
                out[k.strip()] = v.strip()
    return out


def save_credentials(key: str, url: str) -> None:
    CREDENTIALS_PATH.parent.mkdir(parents=True, exist_ok=True)
    CREDENTIALS_PATH.write_text(f"url={url}\nkey={key}\n")
    CREDENTIALS_PATH.chmod(0o600)


def get_api_url() -> str:
    return os.environ.get("OT_API_URL") or _read_credentials().get("url") or DEFAULT_API_URL


def get_api_key() -> str | None:
    return os.environ.get("OT_API_KEY") or _read_credentials().get("key")
