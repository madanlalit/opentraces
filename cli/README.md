# opentraces (CLI)

Sell your coding agent's traces.

```bash
uv tool install .            # or: pipx install .
ot login                     # paste an API key from the dashboard
ot push --agent pi           # scan ~/.pi/agent/sessions, pick, upload
ot whoami                    # verify credentials, see vault count
```

- MVP adapter: **pi** (Claude Code / Codex / OpenCode come in Phase 2)
- Traces upload as canonical `ot/0.2` NDJSON; scrubbing runs server-side
- Credentials: `~/.opentraces/credentials` (env: `OT_API_URL`, `OT_API_KEY`)
