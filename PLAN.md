# OpenTraces — Plan

> Turn any coding agent's traces into training data any lab can use. Sellers are anybody with a coding agent — start with pi, expand to Claude Code, Codex, OpenCode.

## 1. Thesis

A person's raw agent sessions are **not** what a lab can train on. Labs need a rights-clean, agent-agnostic trajectory with a trustworthy outcome. That conversion — laptop session → lab-usable artifact — is the product. The marketplace listing is just distribution.

The moat is not the site. It's (1) the canonical format everyone's traces flow through, and (2) eventually, independent verification. A verified `trace.v1` is worth several times a raw session dump; copying the verifier (pinned env, sandbox, anti-gaming, signed reports) is harder than copying a listing page.

### Scope decisions (locked)

- **Buyer side: deferred.** No buyer validation work now. Build supply ingestion first.
- **Sellers: anyone with a coding agent.** pi first (best-documented format, reference implementation), then Claude Code → Codex → OpenCode.
- **Models: any.** Traces from any model are accepted; model provenance is recorded in metadata (matters later for rights filtering, not a gate now).
- **MVP = frontend + backend + database.** Store and show traces. Verification: later phase. Payments: right after MVP.

---

## 2. From person to lab artifact (the core product narrative)

A Claude Code / Codex / pi / Cursor session on someone's laptop is:

| Problem | Why it blocks training |
|---|---|
| **Vendor-shaped** | Every agent's JSONL is different — events, trees vs linear, tool names. Labs would need a parser per agent. |
| **Untrusted on reward** | "tests passed" is self-reported on the seller's machine. |
| **Rights-messy** | Secrets, PII, proprietary repos, provider ToS on model outputs. |
| **Non-reproducible** | No pinned repo/commit/tests, so the lab can't replay or score a new policy. |

No lab drops `~/.claude/projects/...jsonl` into Axolotl or verl. They need **one interchange object** they can stream, filter, and train on.

### What "usable for any lab" means

Make the trace look identical regardless of who generated it and which agent they used, then attach three lab-facing guarantees:

| Guarantee | What the lab gets |
|---|---|
| **Format** | One schema (`ot/0.2`): header + NDJSON steps (user / assistant / tool_call / tool_result) |
| **Verification** *(Phase 2)* | Signed report: tests/build actually passed in a neutral sandbox, not the seller's laptop |
| **Trust** | Scrubbed secrets/PII, license + attestation, contamination flags vs public benchmarks |

Then any lab's pipeline is: download pack → map canonical steps to their SFT/DPO/RL loader → use `outcome.reward` as label or filter. **They never write a Claude Code parser.**

### The conversion pipeline (person → lab artifact)

1. **Capture — don't ask people to export.** Adapters read the agent's local session store (pi trees, Claude JSONL, Codex rollouts) and map events into the canonical step list. Drop TUI-only junk; keep thinking, tools, observations.
2. **Pin the environment.** Attach `repo_url` + `base_commit` + files touched. This is what makes a trajectory a *task*, not a chat log. Without it, a trace can still be stored/listed as cheap unverified data; with it, a lab can later replay.
3. **Scrub so legal/security accept the file.** Secrets, emails, absolute paths, screenshots out. Dedup near-copies. Flag overlap with SWE-bench / HumanEval so labs don't train on eval. Seller attests rights + which model produced the tokens.
4. **Verify the reward independently** *(Phase 2 — designed now, built later).* Replay the final patch in a neutral sandbox against pinned commit/tests; sign (trace hash, env digest, result). The signed reward is why the same file is useful to every lab — they aren't trusting the seller's `success: true`.
5. **Package by training method, not by person.**
   - **Trace Packs** (first): static trajectories + outcome → SFT, DPO, distillation, reward models, off-policy RL.
   - **Environment Packs** (later): Docker image + test suite + seed traces → on-policy GRPO/PPO. Static traces alone don't serve those buyers; they need to roll out their own policy.
   - Domain grouping ("Python debugging", "Rails migrations") is how a lab picks a slice. The person is the supply source; the pack + schema (+ verification) is the SKU.

### Why this is lab-agnostic

Labs differ on harness (verl, OpenRLHF, custom). They do **not** differ on needing:
- `(prompt, tool trajectory, observation, outcome)` in a stable schema
- A reward they can treat as ground truth
- A license that permits SFT/RL

Own the interchange + trust layer (and later verification), and any lab ingests the same blob.

> **Practical framing for supply conversations:** raw "here's my `.claude` folder" is a lead, not a dataset. Adapters → scrub → pin env → (verify) → canonical pack is what makes it data.

---

## 3. Users

### Sellers (build for them now)
- **pi users** — first-class: the format is documented (`~/.pi/agent/sessions/`, tree JSONL), so the pi adapter is the reference implementation that validates the canonical schema.
- **Anyone with a coding agent** — Claude Code, Codex, OpenCode next (adapters read their local session stores; nobody exports anything).
- Traces from **any model** accepted; provenance recorded, not gated.

### Buyers (deferred, keep in mind)
Labs, RL teams, app startups fine-tuning domain agents. No buyer-facing work in MVP, but every schema/trust decision above is made so onboarding them later is a download + loader mapping, not a re-architecture.

---

## 4. Product pillars

### A — Canonical format (`ot/0.2`)
Header + NDJSON steps. Tree-aware (pi's `id`/`parentId` structure with branching/compaction is the reference). Adapters map each vendor format into it; unmappable entries are dropped and *counted* in a scrub report. Details in [docs/FLOW.md](docs/FLOW.md).

### B — Trust layer (in MVP)
- Secret scanning, PII redaction, absolute-path scrubbing, screenshot drop
- Dedup fingerprints (MinHash over steps)
- Contamination flags vs SWE-bench / HumanEval / MBPP
- Seller attestation (rights holder, model provenance) + license terms recorded at ingest

### C — Verification (Phase 2 — design now, build later)
Neutral-sandbox replay of the final patch against pinned commit/tests → signed Verification Report (ed25519 over trace hash + env digest + result). Not in MVP, but the schema reserves the fields (`outcome.verification`) so traces verified later upgrade in place. Verification-as-a-service becomes a revenue line then.

### D — Marketplace mechanics (minimal in MVP)
Vault → pack grouping → public index page with free metadata + samples. Payments right after MVP (Stripe Connect, 80/20, T+7 holdback).

---

## 5. MVP scope — frontend + backend + database

**In**
- **Auth**: Clerk orgs (every seller = an org), JWT→DB sync, API keys (`ot_live_<id>_<secret>`, hashed, scoped, shown once), `ot login` device flow
- **Backend API**: `POST /v1/traces` (NDJSON, gzip/zstd, idempotent, → R2 blob + D1 metadata), trace status endpoints
- **CLI** (`opentraces` on PyPI / `uv tool install`): `ot push` with **pi adapter** (reference impl), consent-first picker, env capture (git remote/commit/files-touched), client-side scrub preview
- **Scrub pipeline v0**: secrets, PII, quality gate (min steps, ≥1 tool call), dedup, contamination flags
- **Database**: traces, packs, sources, api_keys, ledger-ready schema (see FLOW.md §8)
- **Frontend**: dashboard (vault with statuses + scrub reports), pack builder, public index page, settings/API keys

**Out (explicitly)**
- Verification (schema reserved, build in Phase 2)
- Payments/payouts (Phase 1.5, immediately post-MVP)
- Buyer-side SDK/loaders, Environment Packs, Watermarks/canaries (Phase 2+)

---

## 6. Architecture (lean, unchanged)

```
CLI (Python) ──push──▶ API ──▶ Scrub ──▶ R2 (blobs) + Postgres (metadata)
                                      └─▶ (Phase 2: Verifier → signed reports)
Web (React SPA) ◀────────── API
Auth: Clerk (JWT + API keys) · Payments later: Stripe Connect
```

## 6. Stack & architecture (100% Cloudflare)

```
apps/web (React SPA, Vite) ──▶ Workers (Hono API) ──▶ Queues (scrub consumer) ──▶ R2 + D1
packages/schema (zod = source of truth → JSON Schema → pydantic codegen for the Python CLI)
Auth: Clerk (JWKS verify in Worker) · Payments later: Stripe · Verifier later: own container
```

- **Frontend**: React + Vite + TS, Tailwind + shadcn/ui, TanStack Router/Query → **Workers static assets** (Pages)
- **API**: **Hono on Workers** — dashboard API + ingest endpoints in one deploy (`api.opentraces.dev`)
- **DB**: **D1 (SQLite)** for metadata (orgs, traces, packs, ledger) — single-vendor, zero-config; trace blobs (JSONL) in **R2** via presigned uploads. If we outgrow D1 (buyer-side full-text search, analytics), swap to **Hyperdrive → Neon Postgres** — only the DB layer changes.
- **Jobs**: **Cloudflare Queues** — upload enqueues; consumer Worker runs scrub (secret patterns, PII regex, MinHash dedup, contamination hashes) and updates trace status; **Cron Triggers** for payouts later
- **Schema**: **Zod in `packages/schema` = single source of truth** for `ot/0.2`; JSON Schema exported from it; the Python CLI's **pydantic models are generated** from that JSON Schema in CI (`datamodel-code-generator`)
- **CLI**: Python (runs on seller machines — hosting-agnostic), **Typer + Rich**, `httpx`, on **PyPI** (`pipx`/`uv tool install opentraces`); gzip at MVP
- **Auth**: Clerk on the SPA; the Worker verifies session JWTs via JWKS and API keys (SHA-256 hash in D1)
- Traces stored as JSONL (gzip) in R2; metadata in D1
- **Phase 2 verifier**: the one piece that will never run on Cloudflare — sandboxed test execution needs real VMs/containers. Own service (Fly.io or similar), Workers API just calls it. Fine: internal infrastructure, not user-facing hosting.

---

## 7. Business model

| Stream | When |
|---|---|
| Pack sales, 80/20 split via Stripe Connect | Phase 1.5 |
| Commissioned collection ("N verified traces for domain X") | Phase 2, after verification exists |
| Verification-as-a-service | Phase 2 |
| Environment Packs (rollout licensing) | Phase 3 |

Price anchors (validate later, when buyers matter): verified traces plausibly $1–10/trace, packs $500–5k.

---

## 8. Roadmap

| Phase | Focus | Exit criteria |
|---|---|---|
| **1. MVP** (now) | FE + BE + DB; pi adapter; scrub v0; vault + packs + public index | A pi user's real sessions are stored, scrubbed, viewable, packable end-to-end |
| **1.5 Payments** | Stripe Connect, ledger, payouts, license enforcement at download | First pack sold end-to-end |
| **2. Verification + other agents** | Claude Code/Codex/OpenCode adapters; sandbox verifier; signed reports; canaries | ≥1k verified traces; verification is the headline feature |
| **3. Environments + standard** | Environment Packs (on-policy RL); buyer SDK; format adopted by an OSS agent | A framework ships native `opentraces` export; repeat purchases |

---

## 9. Risks

| Risk | Mitigation |
|---|---|
| Format drift across agent versions | Adapter configs versioned in CLI; canonical schema tolerant (drop-and-count) |
| Privacy/IP leaks from seller machines | Scrub gate at ingest, attestations, per-buyer canaries (Phase 2) |
| Provider ToS on training outputs | Record model provenance now; rights filtering is metadata, not a gate |
| Verification (Phase 2) gamed | Pinned env digests, neutral sandbox, audit sampling — designed before built |
| Chicken-and-egg | Supply-first: seed own traces via pi; index is free; buyers later |

---

## 10. Decisions needed

1. **Consent UX** — interactive picker per upload (rec: yes for v1) vs always-on auto-push with allowlist?
2. **Revenue split** — lock 80/20 for launch messaging?
3. **Payout holdback** — T+7?
4. **Screenshots/attachments** — drop always (rec) or opt-in?
5. **CLI distribution** — `opentraces` on PyPI, `pipx`/`uv tool install`-able?
6. **MVP timeline** — solo? this sets 6 vs 12 weeks for Phase 1.

---

## 11. Next steps

- [ ] Confirm the six decisions above
- [ ] Extract `ot/0.2` into `schema/trace.schema.json` (JSON Schema) using pi's session format as reference
- [ ] Scaffold: React (Vite) + Clerk + Hono on Workers + D1 + R2; `POST /v1/traces`; API-key middleware
- [ ] `opentraces` CLI: `ot login` (device flow) + `ot push` with pi adapter
- [ ] Run own pi sessions through the pipeline; publish the free seed pack from them
- [ ] Landing page: one-liner, "sell your pi traces" CTA, index teaser
