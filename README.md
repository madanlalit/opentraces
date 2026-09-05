# OpenTraces

> The marketplace for verified agent traces. Sell your coding-agent trajectories to teams doing SFT and RL.

- 📋 Product & business plan: [PLAN.md](PLAN.md)
- 🔧 Technical flow spec: [docs/FLOW.md](docs/FLOW.md)
- 🗂️ Per-file code documentation: [docs/CODEMAP.md](docs/CODEMAP.md) — updated with every change
- Trace schema (drafted in PLAN §3A, to be extracted to `schema/trace.v0.1.json`)
- Status: **Phase 0 — validation**

## Core ideas

1. **Canonical format** — one interchange schema for agent traces, with ingestion adapters for popular agents.
2. **Verified rewards** — outcomes checked in a neutral sandbox and cryptographically signed. Verified traces are the product; raw traces are not.
3. **Trust layer** — secret/PII scanning, dedup, contamination screening, licensing, provenance.
4. **Marketplace** — Trace Packs today (SFT/DPO/off-policy RL), Environment Packs later (on-policy RLVR).

## Ingestion flow

Clerk auth → API key → `ot push` (reads local session stores of pi / Claude Code / Codex / OpenCode, scrubs, uploads) → verification → pack & price → Stripe Connect payout. Full spec: [docs/FLOW.md](docs/FLOW.md)

## Repo layout (MVP scaffold)

```
apps/web          React + Vite + Clerk + Tailwind — dashboard & public index
apps/api          Hono on Cloudflare Workers — ingest API (D1 + R2)
packages/schema   ot/0.2 canonical trace format (Zod = source of truth)
cli/              Python CLI (`ot login` / `ot push`) with pi adapter
docs/             FLOW.md — full technical spec
```

## Dev quickstart

```bash
pnpm install
pnpm --filter @opentraces/api exec wrangler d1 create opentraces   # paste id into apps/api/wrangler.jsonc
pnpm --filter @opentraces/api db:local                             # create tables (local D1)
node apps/api/scripts/mint-dev-key.mjs                             # dev key + SQL to register it
pnpm dev:api        # localhost:8787
pnpm dev:web        # localhost:5173 (needs apps/web/.env with Clerk key)

# CLI
cd cli && uv venv && uv pip install -e .
ot login && ot push --agent pi
```
