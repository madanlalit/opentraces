"""Adapter registry.

Each adapter knows:
  - which agent it handles
  - where that agent stores sessions locally
  - how to map a stored session into the canonical ot/0.2 format
"""

from __future__ import annotations

import hashlib
from pathlib import Path

from .base import SessionRef, Trace, content_blocks, to_ndjson
from .pi import parse_session as _parse_pi
from .pi import scan_sessions as _scan_pi

__all__ = [
    "SessionRef",
    "Trace",
    "content_blocks",
    "to_ndjson",
    "idempotency_key",
    "scan_sessions",
    "parse_session",
    "IMPLEMENTED_AGENTS",
]


IMPLEMENTED_AGENTS = ["pi"]


def scan_sessions(agent: str) -> list[SessionRef]:
    if agent == "pi":
        return _scan_pi()
    raise ValueError(f"no adapter for agent: {agent} (implemented: {', '.join(IMPLEMENTED_AGENTS)})")


def parse_session(agent: str, path: Path) -> Trace:
    if agent == "pi":
        return _parse_pi(path)
    raise ValueError(f"no adapter for agent: {agent} (implemented: {', '.join(IMPLEMENTED_AGENTS)})")


def idempotency_key(agent: str, path: Path) -> str:
    """Stable key so retries never create duplicate traces server-side."""
    h = hashlib.sha256()
    h.update(agent.encode())
    h.update(str(path).encode())
    h.update(str(path.stat().st_size).encode())
    return h.hexdigest()
