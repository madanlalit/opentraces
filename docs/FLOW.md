# OpenTraces — Ingestion & Payout Flow

> How a seller goes from "agent session on my laptop" to "listed pack, money in Stripe account."

Flow: **Clerk login → API key → CLI/hook upload → scrub & index → (verify) → pack & price → sale → Stripe Connect payout.**

---

## 1. Auth & identity (Clerk)

- **Clerk Organizations** are the top-level entity. Every seller is an org (even a solo dev — org = seller account). This buys us multi-user seller teams later (agencies, companies with agent fleets) with zero migration.
- Dashboard auth = Clerk components (`<SignIn/>`, `<UserButton/>`); every dashboard request carries a Clerk session JWT.
- Backend API validates the Clerk JWT, then syncs `users`/`orgs`/`memberships` into our Postgres (webhook on `user.created`, `organizationMembership.*`) so DB rows always have a local FK target.
- Roles within org: `owner` (payouts, keys, pricing), `member` (upload traces, view own).

```
Dashboard (browser) ── Clerk JWT ──▶ API
CLI / hooks / SDK   ── API key  ──▶ API
```

**Two credential types, one API.** Session JWT for humans in the dashboard; API keys for machines (CLI, CI, agent hooks). Same authorization layer underneath: everything is org-scoped.

---

## 2. API keys

Dashboard → *Settings → API Keys → Create key* → key shown **once**.

**Format:** `ot_live_<key_id>_<secret>` (test mode: `ot_test_...`)
- `key_id`: 12 chars, stored plaintext — lets us look up the key without a full-table scan and show it in the dashboard (`ot_live_k93mf2…••••`)
- `secret`: random 32 bytes; we store only `SHA-256(secret)` and compare in constant time. Never logged. Rotation: create new, old key stays valid until expiry/revocation (both shown in dashboard).

**Properties per key:**
| Field | Notes |
|---|---|
| `scopes` | `traces:write`, `traces:read`, `packs:write` — default `traces:write` for CLI keys |
| `source_id` | which agent/machine the key is pinned to (optional) |
| `last_used_at`, `last_ip` | shown in dashboard so users can spot leaks |
| `rate_limit` | default 60 req/min, burst 10 |

**Header:** `Authorization: Bearer ot_live_...`

**`ot login` flow (device code):**
```
$ ot login
  Open https://opentraces.dev/cli/auth and enter code: KRMQ-XPLW
  Waiting for authorization... ✓
  Logged in as @lalit (org: acme-ai). Key ot_live_k93mf2… stored in macOS Keychain.
```
CLI opens the dashboard, user approves, page shows the generated key once, CLI polls a device endpoint, stores key in the OS keychain (`~/.opentraces/credentials` fallback, `chmod 600`).

---

## 3. Where each agent's traces live (adapter targets)

Every CLI agent persists sessions locally. The CLI scans these, lists candidates, uploads. **CLI reads; it never asks users to find files.**

| Agent | Session store | Format | Notes |
|---|---|---|---|
| **Claude Code** | `~/.claude/projects/<encoded-cwd>/<session-uuid>.jsonl` | JSONL, typed events (`user`/`assistant`/`tool_use`/`tool_result`), `sessionId` + `cwd` in entries | Encoded cwd = project dir path with `/` → `-` |
| **OpenAI Codex CLI** | `~/.codex/sessions/YYYY/MM/DD/rollout-<ts>-<uuid>.jsonl` | JSONL: `session_meta` line (cwd, cli version), then `response_item` payloads | Date-sharded |
| **pi** | `~/.pi/agent/sessions/--<path>--/<ts>_<uuid>.jsonl` | JSONL **tree**: `session` header (cwd), typed entries with `id`/`parentId`; rich types incl. `thinking`, tool calls, `usage.cost`, compaction/branch entries | Best-documented of the four — use as reference implementation for our canonical schema |
| **OpenCode** | `~/.local/share/opencode/storage/session/...` (+ `message/`, `part/` dirs) | JSON per session/message/part | Verify exact layout on first adapter pass |

Storage paths are versioned config in the CLI (`adapters/*.json`) so format drift is a patch release, not a redesign.

---

## 4. Upload flow (the product moment)

### 4a. Interactive (default) — consent-first
```
$ ot push
  Scanning for sessions… found 14 (claude-code 9 · pi 3 · codex 2)

  ? Select sessions to sell:
    ● 2025-01-14  Fix race condition in worker pool shutdown   48 steps  $1.20  acme/api
    ● 2025-01-13  Migrate auth to Clerk organizations         112 steps  $3.40  acme/web
    ○ 2025-01-12  Debug flaky CI test                         23 steps   $0.60  acme/api

  Captured environment: repo github.com/acme/api @ a1b2c3d, 6 files touched
  ? Attach repo & commit info? (Y/n)
  ? License: ● OpenTraces Standard (training + RL permitted, no resale)

  Scrubbing… ✓ 2 secrets removed, 1 absolute path redacted, screenshots dropped
  Uploading…   ✓ tr_9f3k2m queued for verification
  💰 These traces are in your vault. Estimated listing value: $5.20 — you keep 80% when sold.
```

### 4b. Non-interactive / automated
```bash
ot push --agent claude-code --since 7d --repo github.com/acme/api \
        --license standard --yes          # uses saved consent rules
ot config allowlist add github.com/acme  # push only these repos, ever
```
Consent rules live in `~/.opentraces/config.toml` (repo allowlist, scrub settings, default license). CI/agent-hook setups use a scoped key + explicit flags; the server records the attestation either way.

### 4c. Direct REST (for custom harnesses / other agents)
```
POST /v1/traces
  Authorization: Bearer ot_live_...
  Content-Type: application/x-ndjson   (canonical steps stream, zstd optional)

  {"type":"header","schema":"ot/0.2","agent":{"name":"custom","model":"..."},
   "env":{"repo_url":"...","base_commit":"..."},
   "attestation":{"rights_holder":true,"license":"standard"}}
  {"type":"step","i":0,"role":"user","content":[...]}
  {"type":"step","i":1,"role":"assistant","content":[{"type":"tool_call",...}]}
  ...

→ 202 {"trace_id":"tr_01J...","status":"scrubbing"}
```

**Upload mechanics:** client computes `sha256` of the NDJSON payload, `POST /v1/traces` with size upfront; small bodies inline, big ones get presigned R2 PUT. Server responds 202; scrub pipeline is async; CLI polls `GET /v1/traces/{id}` or receives status via dashboard. Idempotency: client sends `Idempotency-Key: <hash+agent+session-id>` so retries never double-upload.

---

## 5. Canonical format `ot/0.2` (sketch)

Steps as NDJSON (one step per line) — buyers stream; blob in R2, metadata in Postgres. Pi taught us sessions are **trees** (branching, compaction), so: header declares `structure: "linear" | "tree"`; linear = `i` ordering; tree = steps carry `id`/`parent_id` and buyers can walk the active path. Tree support is why our format will survive contact with real agents.

```jsonc
// header line
{ "type":"header", "schema":"ot/0.2", "trace_id":"tr_01J...",
  "agent":{"name":"claude-code","version":"1.x","model":"claude-sonnet-4-5","provider":"anthropic","temperature":1.0,"seed":null},
  "env":{"repo_url":"github.com/acme/api","base_commit":"a1b2c3d","branch":"fix/worker-pool",
         "image_digest":null, "snapshot":false},
  "task":{"description":"Fix race condition in worker pool shutdown","source":"user_prompt"},
  "outcome":{"self_reported":"success"},          // seller claim; platform verification replaces this
  "usage":{"input":48210,"output":9340,"cost_usd":1.20},
  "attestation":{"rights_holder":true,"license":"standard","consent":"cli-interactive"},
  "privacy":{"scrub":"pending"} }
// step lines
{ "type":"step","i":0,"role":"user","content":[{"type":"text","text":"..."}] }
{ "type":"step","i":1,"role":"assistant","content":[
    {"type":"thinking","thinking":"..."},
    {"type":"tool_call","id":"call_1","name":"bash","arguments":{"command":"pytest -x"}} ]}
{ "type":"step","i":2,"role":"tool_result","tool_call_id":"call_1","content":[{"type":"text","text":"..."}],
   "is_error":false,"usage":{"output":512} }
```

### Adapter mapping
| Canonical | pi | Claude Code | Codex | OpenCode |
|---|---|---|---|---|
| `header` | `session` entry | first lines (`sessionId`,`cwd`) | `session_meta` | session JSON |
| `step` user | `role:"user"` | `type:"user"` | `response_item` message | message JSON |
| `step` assistant + thinking | `role:"assistant"` + `thinking` block | `type:"assistant"` + `thinking` blocks | `reasoning` items | part JSON |
| `tool_call` | `toolCall` block | `tool_use` block | `function_call` / shell exec | part JSON |
| `tool_result` | `role:"toolResult"` | `type:"user"` w/ `tool_result` | `function_call_output` | part JSON |
| `usage` | `message.usage` | per-message usage fields | token_count events | message JSON |

Drop-rule for adapters: entries that don't map (`custom`, `label`, TUI-only events) are skipped and counted; the scrub report shows "34 steps dropped (extension state)" so sellers see what buyers will see.

---

## 6. Server pipeline & trace states

```
uploaded ─▶ scrubbing ─▶ scrubbed ─▶ indexed ─▶ listed ─▶ sold ─▶ payout_held ─▶ paid
                │                        │
                └─▶ rejected             └─▶ verification_queued ─▶ verified / verify_failed
```

1. **Scrub (automatic, at ingest):**
   - Secret scanning (gitleaks patterns) → **remove** + record type/location in scrub report; if secrets are pervasive → auto-reject
   - PII redaction (emails, keys, absolute paths → `~/`, usernames)
   - Binary/large attachments (screenshots) dropped unless opted in
   - Dedup fingerprint (MinHash over steps + diff) → warn on near-duplicates within org
   - Contamination hash check vs SWE-bench/HumanEval/etc. → flag
   - Quality gate: min steps, ≥1 tool call, has user task, token cost floor — rejects junk/no-op sessions automatically
2. **Environment capture:** repo URL + `base_commit` + files-touched from adapter/CLI git data. This is what makes later verification (and Environment Packs) possible. If no git repo → trace is stored as "unverified, no-env".
3. **Verification — Phase 2, not in MVP.** Schema reserves the fields (`outcome.verification`); when built: env with repo+commit + runnable tests → neutral-sandbox replay (apply final diff, run tests) → signed Verification Report → `verified` badge. Until then every trace is stored unverified.
4. **Vault:** traces land in the seller's private vault (dashboard: list, scrub reports, per-trace status, est. value). Nothing is public here.
5. **Pack & list:** seller selects traces → creates a **Pack** (title, domain tags, license, price) → publish → auto review (scrub + contamination + sampling) → live in the public index.

---

## 7. Money flow

- **Seller sets pack price** (or per-trace floor auto-suggested from token cost × quality multiplier).
- Buyer checkout via **Stripe Checkout**; org connected via **Stripe Connect Express** at signup (dashboard: "Connect payouts" → Stripe onboarding iframe).
- Ledger, not vibes: every event (sale, refund, platform fee, verification fee, payout) is a row in `ledger_entries`. Balance = sum. No derived floats.
- **Split: 80% seller / 20% OpenTraces** (platform fee line item, shown at checkout).
- **Payout release: T+7 days** after purchase (refund window / audit holdback), then automatic Stripe payout. Dashboard shows `Available / Pending / Paid`.
- Buyer receives: signed download URL (per-buyer canary token embedded in delivered copy) + license receipt with terms (internal use / model training / RL — no resale by default).

---

## 8. Data model (minimal)

```sql
orgs            (id, clerk_org_id, name, stripe_connect_id, payout_status)
users           (id, clerk_user_id, org_id, role)
api_keys        (id, org_id, key_id, secret_hash, scopes, last_used_at, revoked_at)
sources         (id, org_id, agent, machine_name, cli_version)          -- optional key pinning
traces          (id, org_id, source_id, agent, model, structure,
                 repo_url, base_commit, task_desc, n_steps, cost_usd,
                 status, scrub_report_id, verification_report_id, blob_key, content_hash)
packs           (id, org_id, title, tags[], license, price_cents, status, stripe_price_id)
pack_items      (pack_id, trace_id)
purchases       (id, pack_id, buyer_org_id, stripe_payment_id, license_terms, canary)
ledger_entries  (id, org_id, type, amount_cents, purchase_id, created_at)  -- sale/fee/payout/refund
verification_reports (id, trace_id, method, sandbox_digest, result, signature, ran_at)
```

API surface (v1, all key-or-JWT auth, org-scoped):
```
POST /v1/traces           POST /v1/traces/{id}/verify
GET  /v1/traces           GET  /v1/verification-reports/{id}
GET  /v1/traces/{id}      POST /v1/packs  ·  POST /v1/packs/{id}/publish
```

---

## 9. Build order (6 weeks)

| Wk | Ship |
|---|---|
| 1 | Clerk orgs + JWT sync, API-key create/validate/revoke, `ot login` device flow |
| 2 | `POST /v1/traces` + R2 storage + idempotency; CLI skeleton; **pi adapter** (reference impl) |
| 3 | Scrub pipeline v0 (secrets, PII, quality gate, dedup); vault list in dashboard |
| 4 | Packs CRUD + public index page; license templates + attestations |
| 5–6 | Hardening; seed pack from own pi sessions; landing page |

MVP = frontend + backend + database (store & show traces). **pi adapter first** (documented format — validates the canonical schema). Claude Code → Codex → OpenCode adapters land in Phase 2 alongside verification; Stripe payments land in Phase 1.5.

---

## 10. Decisions needed from you

1. **Consent UX default** — interactive picker per upload (my rec for v1) vs always-on auto-push with allowlist?
2. **Revenue split** — 80/20 OK to lock for launch messaging?
3. **Payout holdback** — T+7 acceptable, or shorter/longer?
4. **Screenshot/attachments** — drop always (my rec: privacy) or opt-in?
5. **CLI name/distribution** — `opentraces` on PyPI (`pipx`/`uv tool install`)?

*(Verification questions deferred to Phase 2 planning — nothing buyer-facing or verification-facing blocks the MVP.)*
