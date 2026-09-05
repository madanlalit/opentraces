# Code Map — per-file documentation for review

Living doc. **Rule: every new/changed file gets an entry here in the same change.**
Read order for a first review: ① schema → ② api → ③ cli → ④ web.

Status legend: ✅ implemented · 🟡 stub/TODO noted · 🔜 planned

---

## 1. `packages/schema` — canonical format (source of truth)

| File | Purpose | Review notes |
|---|---|---|
| `src/trace.ts` | **The `ot/0.2` spec in code.** Zod schemas: `TraceHeaderSchema`, `StepSchema` (discriminated union on role: user/assistant/tool_result), content blocks (text/thinking/toolCall/image), `UsageSchema`, `AttestationSchema`. | Wire fields are **snake_case** (shared with Python CLI + buyers). Steps are linear; `id`/`parent_id` reserved for ot/0.3 tree support. `attestation.license` defaults to `"standard"`. 🔜 Phase 2: `outcome.verification` fields. |
| `src/ndjson.ts` | NDJSON ↔ objects. `parseTraceNDJSON(text)` (strict: header must be line 1, every line validated, raises `TraceParseError` with line numbers) and `toNDJSON(header, steps)`. | Server uses this for ingest validation; CLI serializes with it. Errors include line numbers — keep that property when editing. |
| `src/index.ts` | Public exports + `SCHEMA_VERSION`. | Version bump here is a breaking change by definition. |
| `src/export-json-schema.ts` | Generates buyer-facing JSON Schema (`schema/ot-0.2.json`) via `z.toJSONSchema`. | Run `pnpm… npm run schema:export` after any trace.ts change. Output is gitignored (regenerate in CI). |

**Why this package exists:** the API validates against it, the CLI's Pydantic models are generated from its JSON Schema, buyers consume its JSON Schema. One spec, three consumers.

---

## 2. `apps/api` — Hono on Cloudflare Workers (ingest API)

| File | Purpose | Review notes |
|---|---|---|
| `src/index.ts` | All routes: `GET /v1/health`; auth middleware on `/v1/*`; `POST /v1/traces` (validate → sha256 idempotency → R2 put → D1 insert → 202); `GET /v1/traces` (vault list); `GET /v1/traces/:id` (detail + line count). | **API-key auth only right now** (`ot_live|ot_test|ot_dev_<key_id>_<secret>`, sha256(secret) compare, `last_used_at` updated via `waitUntil`). 🟡 Clerk JWT verification is a TODO in the middleware. `trace_id`/`blob_key` format: `tr_<24hex>`, `traces/<org>/<id>.jsonl`. Duplicates return 200 + `duplicate: true`. |
| `src/db/schema.sql` | D1/SQLite tables: `orgs`, `users`, `api_keys`, `sources`, `traces` (status enum in comment), `packs`, `pack_items`, `ledger_entries`. | Matches FLOW.md §8. `content_hash UNIQUE` is the idempotency guarantee. `traces.status` state machine: uploaded → scrubbing → scrubbed → indexed → listed → sold → payout_held → paid (scrub pipeline is 🔜 next slice). |
| `wrangler.jsonc` | Worker config: D1 binding `DB`, R2 binding `TRACES`. | 🟡 `database_id` is `REPLACE_WITH_D1_ID` until you run `wrangler d1 create opentraces`. Queue producer for scrub is commented out. |
| `scripts/mint-dev-key.mjs` | Prints a dev API key + the exact `wrangler d1 execute` SQL to register it. | Local dev only — `ot_dev_` prefix works in prod auth check too but keys must be registered in D1. |
| `.dev.vars.example` | Template for local secrets (Clerk secret key later). | Never commit `.dev.vars`. |

**Not implemented yet (tracked):** scrub pipeline (Queues consumer), Clerk JWT auth, packs routes, presigned multipart for big uploads (currently one-shot `c.req.text()` — fine under Workers' 100MB-ish body limits, revisit for giant traces), gzip on blobs.

---

## 3. `cli` — Python CLI (`ot`)

| File | Purpose | Review notes |
|---|---|---|
| `opentraces/main.py` | Typer app: `ot version`, `ot login` (paste key → verify against `/v1/traces` → save), `ot whoami`, `ot push --agent pi` (scan → rich table → selection `1,3-5|a` → upload with `Idempotency-Key`). | `--verbose` flag is declared in `state` but not wired to the typer option yet 🟡. Errors are non-fatal per session; summary printed. |
| `opentraces/config.py` | Credentials: `~/.opentraces/credentials` (chmod 600), env overrides `OT_API_URL` / `OT_API_KEY`. | Key never logged. Default API URL `http://localhost:8787`. |
| `opentraces/adapters/base.py` | Adapter shared types: `SessionRef`, `Trace`, `content_blocks()` (vendor block → canonical block, drop-and-count), `to_ndjson()`. | `content_blocks` drops unknown block types silently — callers must surface counts. |
| `opentraces/adapters/pi.py` | **Reference adapter.** Scans `~/.pi/agent/sessions/*/*.jsonl`; parses pi session JSONL (header + message entries); maps user/assistant/toolResult → canonical steps; captures model/provider/usage.cost; task description = first user text. | 🟡 Linearizes tree in file order (pi branches flattened) — ot/0.3 will carry `id`/`parent_id`. Skipped entry types counted in `Trace.skipped` (`model_change`, `thinking_level_change`, …). Session label = first user text (truncated). |
| `opentraces/adapters/__init__.py` | Registry: `scan_sessions(agent)`, `parse_session(agent, path)`, `idempotency_key()`; `IMPLEMENTED_AGENTS = ["pi"]`. | Adding an agent = new sibling module + register here. |
| `pyproject.toml` | Package + `ot` entry point; deps typer/rich/httpx/pydantic. | pydantic declared for future generated models (from JSON Schema) — not used yet 🟡. |

---

## 4. `apps/web` — React dashboard (skeleton)

| File | Purpose | Review notes |
|---|---|---|
| `src/main.tsx` | `ClerkProvider` + root render; fails fast if `VITE_CLERK_PUBLISHABLE_KEY` missing. **v6 note:** `afterSignOutUrl` lives on `ClerkProvider`, not `UserButton`. | Package is **`@clerk/react`** (v6) — `@clerk/clerk-react` is a legacy Core 2 name (per clerk.com/SKILL.md). |
| `src/App.tsx` | Landing (signed out, `SignInButton mode="modal"`) + placeholder vault (signed in). **v6 API:** conditional rendering via `<Show when="signed-in|signed-out">` — `SignedIn`/`SignedOut` were removed in v6. | 🔜 Vault list wired to `GET /v1/traces` via Clerk JWT → API. |
| `vite.config.ts` | Vite + React + Tailwind v4 plugins. | — |
| `index.html`, `src/index.css` | Shell + Tailwind import. | — |
| `.env.example` | Clerk publishable key template. | — |

**Not implemented yet:** Clerk JWT → API auth path, vault table UI, pack builder, public index page.

**Clerk setup state:** linked to Clerk app `opentraces` (`app_3ItnpTq4s4IPPWYZhEBhpapNfLZ`) via `clerk link`; publishable key in `apps/web/.env` (value never read/printed); verified with `clerk doctor`. `clerk init` was run but only installs optional agent skills — the framework wiring here is manual per the React quickstart. First test user: sign up on the landing page.

---

## 5. Root

| File | Purpose |
|---|---|
| `package.json` | npm workspaces (`apps/*`, `packages/*`); scripts: `dev:api`, `dev:web`, `db:local`, `schema:export`, `typecheck`. |
| `tsconfig.base.json` | Shared TS config (ES2022, bundler resolution, strict). |
| `.gitignore` | node_modules, .wrangler, .dev.vars, .venv, generated `schema/ot-0.2.json`. |
| `PLAN.md`, `docs/FLOW.md`, `README.md` | Strategy, technical spec, overview. `docs/CODEMAP.md` is this file. |

---

## Conventions (enforced across the repo)

1. **Wire format is snake_case** — TS code uses it for schema fields; TS-only internals are camelCase.
2. **Single source of truth**: `packages/schema/src/trace.ts`. Any format change → bump `SCHEMA_VERSION` + `npm run schema:export` + regenerate CLI models.
3. **Adapters drop-and-count**: never silently drop; always surface skipped counts to the seller.
4. **Idempotent ingest**: content sha256 + client `Idempotency-Key`; duplicates never create rows.
5. **Secrets never stored plaintext**; key shown once; credentials file chmod 600.
6. **Every file documented here** in the same change that touches it.
