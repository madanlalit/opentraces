"""Shared adapter types — no imports from sibling adapter modules here."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any


@dataclass
class SessionRef:
    agent: str
    path: Path
    name: str  # short human label (first user message / session name)
    n_entries: int


@dataclass
class Trace:
    header: dict
    steps: list
    skipped: dict = field(default_factory=dict)  # entry-type → count, shown to seller
    source_path: Path | None = None


def content_blocks(raw: Any) -> Any:
    """Map an agent message content value into canonical content blocks.

    str stays str (user content may be a bare string); lists map block-by-block.
    Unrecognized blocks are dropped and counted by the caller's skipped dict.
    """
    if raw is None or isinstance(raw, str):
        return raw
    blocks = []
    for block in raw:
        btype = block.get("type")
        if btype == "text":
            blocks.append({"type": "text", "text": block.get("text", "")})
        elif btype == "thinking":
            blocks.append({"type": "thinking", "thinking": block.get("thinking", "")})
        elif btype == "toolCall":
            blocks.append(
                {
                    "type": "toolCall",
                    "id": block["id"],
                    "name": block["name"],
                    "arguments": block.get("arguments", {}),
                }
            )
        elif btype == "image":
            blocks.append(
                {"type": "image", "data": block.get("data", ""), "mime_type": block.get("mimeType", "")}
            )
        # unknown block types are dropped (adapter drop-and-count rule)
    return blocks


def to_ndjson(trace: Trace) -> str:
    lines = [json.dumps(trace.header, ensure_ascii=False)]
    lines += [json.dumps(step, ensure_ascii=False) for step in trace.steps]
    return "\n".join(lines) + "\n"
