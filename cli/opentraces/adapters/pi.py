"""pi adapter — reads ~/.pi/agent/sessions/<encoded-cwd>/<ts>_<uuid>.jsonl

pi's session format (documented in pi's docs/session-format.md): JSONL, first
line a `session` header (cwd, version), then typed entries forming a tree via
id/parentId. Message entries carry AgentMessage payloads: user / assistant /
toolResult roles, with text / thinking / toolCall content blocks and usage.

MVP note: we linearize the file in stored order (the active path is what most
sessions contain; branched trees are flattened). Full tree round-tripping is
planned for ot/0.3 — the canonical step schema already reserves id/parent_id.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from .base import SessionRef, Trace, content_blocks

SESSIONS_DIR = Path.home() / ".pi" / "agent" / "sessions"

ContextLike = tuple[str, str]  # (role-ish, text) for naming


def scan_sessions() -> list[SessionRef]:
    refs: list[SessionRef] = []
    if not SESSIONS_DIR.exists():
        return refs
    for path in sorted(SESSIONS_DIR.glob("*/*.jsonl"), key=lambda p: p.stat().st_mtime, reverse=True):
        name, n_entries = _summarize(path)
        refs.append(SessionRef(agent="pi", path=path, name=name, n_entries=n_entries))
    return refs


def _summarize(path: Path) -> tuple[str, int]:
    name = path.stem
    n = 0
    try:
        for line in path.read_text(errors="replace").splitlines():
            line = line.strip()
            if not line:
                continue
            n += 1
            if name == path.stem:  # first user text wins as the label
                try:
                    entry = json.loads(line)
                except json.JSONDecodeError:
                    continue
                msg = entry.get("message", {})
                if entry.get("type") == "message" and msg.get("role") == "user":
                    text = _text_of(msg.get("content"))
                    if text:
                        name = text[:80]
                        break
    except OSError:
        pass
    return name, n


def _text_of(content: Any) -> str:
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(b.get("text", "") for b in content if isinstance(b, dict) and b.get("type") == "text")
    return ""


def parse_session(path: Path) -> Trace:
    header: dict | None = None
    steps: list[dict] = []
    skipped: dict[str, int] = {}
    model: str | None = None
    provider: str | None = None
    total_cost = 0.0

    for line in path.read_text(errors="replace").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            entry = json.loads(line)
        except json.JSONDecodeError:
            skipped["<invalid_json>"] = skipped.get("<invalid_json>", 0) + 1
            continue

        etype = entry.get("type")

        if etype == "session":
            header = {
                "type": "header",
                "schema": "ot/0.2",
                "agent": {"name": "pi"},
                "env": {"repo_url": None, "base_commit": None},
                "attestation": {"rights_holder": True, "license": "standard", "consent": "cli-interactive"},
                "privacy": {"scrub": "pending"},
            }
            continue

        if etype != "message":
            skipped[str(etype)] = skipped.get(str(etype), 0) + 1
            continue

        msg = entry.get("message", {})
        role = msg.get("role")

        if role == "user":
            steps.append(
                {
                    "type": "step",
                    "i": len(steps),
                    "ts": entry.get("timestamp"),
                    "role": "user",
                    "content": content_blocks(msg.get("content")),
                }
            )

        elif role == "assistant":
            blocks = []
            for block in msg.get("content") or []:
                if isinstance(block, dict) and block.get("type") in ("text", "thinking", "toolCall"):
                    blocks.append(content_blocks([block])[0])
            step = {
                "type": "step",
                "i": len(steps),
                "ts": entry.get("timestamp"),
                "role": "assistant",
                "content": blocks,
            }
            model = model or msg.get("model")
            provider = provider or msg.get("provider")
            usage = msg.get("usage")
            if isinstance(usage, dict):
                cost = usage.get("cost") or {}
                if isinstance(cost, dict) and cost.get("total"):
                    total_cost += float(cost["total"])
                step["usage"] = {
                    "input": usage.get("input"),
                    "output": usage.get("output"),
                    "cache_read": usage.get("cacheRead"),
                    "cache_write": usage.get("cacheWrite"),
                    "total_tokens": usage.get("totalTokens"),
                }
            stop = msg.get("stopReason")
            if stop:
                step["stop_reason"] = stop
            steps.append(step)

        elif role == "toolResult":
            steps.append(
                {
                    "type": "step",
                    "i": len(steps),
                    "ts": entry.get("timestamp"),
                    "role": "tool_result",
                    "tool_call_id": msg.get("toolCallId", ""),
                    "tool_name": msg.get("toolName"),
                    "content": content_blocks(msg.get("content")),
                    "is_error": bool(msg.get("isError")),
                }
            )

        else:
            skipped[str(role)] = skipped.get(str(role), 0) + 1

    if header is None:
        # not a pi session file (or truncated) — treat as unparseable
        header = {
            "type": "header",
            "schema": "ot/0.2",
            "agent": {"name": "pi"},
            "attestation": {"rights_holder": True, "license": "standard", "consent": "cli-interactive"},
        }
        skipped["<no_session_header>"] = 1

    header["agent"]["model"] = model
    header["agent"]["provider"] = provider
    if total_cost:
        header["usage"] = {"cost_usd": round(total_cost, 6)}
    first_user = next((s for s in steps if s["role"] == "user"), None)
    if first_user is not None:
        header.setdefault("task", {})["description"] = _text_of(first_user["content"])[:200]
        header["task"]["source"] = "user_prompt"
    header.setdefault("task", {})

    return Trace(header=header, steps=steps, skipped=skipped, source_path=path)
