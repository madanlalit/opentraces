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
| `src/index.ts` | All routes: `GET /v1/health`; CORS; auth middleware on `/v1/*` (API keys + Clerk JWTs; public exemptions: health, GET `/v1/packs*`, `/v1/device/*`); device flow (code/approve/poll); traces ingest + list + detail (parsed header + steps); `POST /v1/traces/:id/scrub`; scrub cron via `scheduled` (1 min sweep, R2 `scrubbed/` key, report, task_desc refresh); **packs**: public `GET /v1/packs` + `GET /v1/packs/:id` (live only; seller org_name + github_url + verified; trace stats only), JWT `GET /v1/my/packs`, `POST /v1/packs` (draft; items must be own + scrubbed), `POST /v1/packs/:id/publish` (gates: items scrubbed + seller GitHub profile set), `POST /v1/packs/:id/delist`. | `tr_<24hex>`, `traces/<org>/<id>.jsonl` → `scrubbed/<org>/<id>.jsonl` after scrub. Deployed: `opentraces-api.lalitmadan.workers.dev`. |
| `src/auth.ts` | Clerk session-JWT verification (RS256 via JWKS, 1h cache) + `ensureOrg()` lazy provisioning of `orgs`/`users` rows from the JWT `sub` claim. New orgs get named after the seller's Clerk profile (Backend API fetch, `CLERK_SECRET_KEY` — best effort, silent failure). | Issuer from `CLERK_ISSUER` var; secret via `wrangler secret put CLERK_SECRET_KEY` (prod) / `.dev.vars` (local). Uses `hono/jwt` (no new deps). Throws → 401. |
| `src/scrub/rules.ts` | Deterministic secret rules (AWS/GitHub/OpenAI/Anthropic/Slack/Stripe/Google/JWT/private-key/bearer/generic assignment) + home-path redaction + benchmark contamination list. Placeholders `[REDACTED:KIND]`. | Secrets are regex-only by design; a future LLM PII pass must re-run these on its output. |
| `src/scrub/scrub.ts` | `scrubTraceNdjson`: redaction walk over header + steps, quality gates (min steps, tool calls, task present → reject), contamination flags, report JSON, rewritten NDJSON with `privacy.scrub=clean`. | Returns scrubbed NDJSON; storage/D1 updates live in index.ts. |
| `src/db/schema.sql` | D1/SQLite tables: `orgs` (seller `github_url`, `verified` flag), `users`, `api_keys`, `sources`, `traces` (status enum in comment), `packs`, `pack_items`, `ledger_entries`, `device_auths`. | Matches FLOW.md §8. `content_hash UNIQUE` is the idempotency guarantee. Applied to remote D1 `1dce496b-f006-4616-99f3-29d499575839`. |
| `wrangler.jsonc` | Worker config: D1 binding `DB` (database_id `1dce496b…`), R2 binding `TRACES`, `vars.CLERK_ISSUER`. | Deployed: `opentraces-api.lalitmadan.workers.dev`. Queue producer for scrub is commented out. Local secrets in `.dev.vars` (CLERK_SECRET_KEY lives here, moved out of web/.env). |
| `scripts/mint-dev-key.mjs` | Prints a dev API key + the exact `wrangler d1 execute` SQL to register it. | Local dev only — `ot_dev_` prefix works in prod auth check too but keys must be registered in D1. |
| `.dev.vars.example` | Template for local secrets (Clerk secret key later). | Never commit `.dev.vars`. |

**Not implemented yet (tracked):** scrub pipeline (Queues consumer), Clerk JWT auth, packs routes, presigned multipart for big uploads (currently one-shot `c.req.text()` — fine under Workers' 100MB-ish body limits, revisit for giant traces), gzip on blobs.

---

## 3. `cli` — Python CLI (`ot`)

| File | Purpose | Review notes |
|---|---|---|
| `opentraces/pi_integration.py` | Embedded pi integration assets: `EXTENSION_TS` (/sell command + OT_AUTO_PUSH quit hook) and `SKILL_MD` (agent skill for selling when a task completes). Written to `~/.pi/agent/` by `ot install-skill`. | Mirrored to `integrations/pi/` in the repo for browsing. |
| `opentraces/main.py` | Typer app: `ot version`; **`ot login`** — device flow by default (POST /v1/device/code → opens browser → polls until approved; key handed over via single-read poll, never on the clipboard), `--key` fallback for CI (paste + verify); offers pi-integration install after login; `ot install-skill`; `ot whoami`; `ot push` (picker, `--all`, **`--session <path>`, `--last`, `--yes`** for automation, retries 3× on network errors). | `--verbose` flag declared but not wired 🟡. Idempotent uploads. |
| `opentraces/config.py` | Credentials: `~/.opentraces/credentials` (chmod 600), env overrides `OT_API_URL` / `OT_API_KEY`. | Key never logged. Default API URL is **prod** (`https://opentraces-api.lalitmadan.workers.dev`); local dev overrides with `OT_API_URL`. |
| `opentraces/adapters/base.py` | Adapter shared types: `SessionRef`, `Trace`, `content_blocks()` (vendor block → canonical block, drop-and-count), `to_ndjson()`. | `content_blocks` drops unknown block types silently — callers must surface counts. |
| `opentraces/adapters/pi.py` | **Reference adapter.** Scans `~/.pi/agent/sessions/*/*.jsonl`; parses pi session JSONL (header + message entries); maps user/assistant/toolResult → canonical steps; captures model/provider/usage.cost; task description = first user text. | 🟡 Linearizes tree in file order (pi branches flattened) — ot/0.3 will carry `id`/`parent_id`. Skipped entry types counted in `Trace.skipped` (`model_change`, `thinking_level_change`, …). Session label = first user text (truncated). |
| `opentraces/adapters/__init__.py` | Registry: `scan_sessions(agent)`, `parse_session(agent, path)`, `idempotency_key()`; `IMPLEMENTED_AGENTS = ["pi"]`. | Adding an agent = new sibling module + register here. |
| `pyproject.toml` | Package + `ot` entry point; deps typer/rich/httpx/pydantic. | pydantic declared for future generated models (from JSON Schema) — not used yet 🟡. |

---

## 4. `apps/web` — React dashboard (shadcn/ui setup)

| File | Purpose | Review notes |
|---|---|---|
| `src/components/ui/*` | **shadcn/ui** primitives pulled from the canonical `new-york-v4` registry: `button.tsx`, `badge.tsx`, `accordion.tsx`. Adapted: `@/lib/utils` alias, individual `@radix-ui/*` packages (registry now uses consolidated `radix-ui`). | Theme tokens live in `src/index.css` (`:root` vars + `@theme inline`). Add more primitives from the same registry URL pattern. |
| `src/lib/utils.ts` | `cn()` (clsx + tailwind-merge) — shadcn class merge. | — |
| `src/main.tsx` | `ClerkProvider` + root render; fails fast if `VITE_CLERK_PUBLISHABLE_KEY` missing. **v6 note:** `afterSignOutUrl` lives on `ClerkProvider`, not `UserButton`. | Package is **`@clerk/react`** (v6) — `@clerk/clerk-react` is a legacy Core 2 name (per clerk.com/SKILL.md). |
| `src/App.tsx` | **Landing + routes**: tiny dependency-free router (`usePath`/`navigate`/`Link`/`Navigate`). Routes: `/` landing · **`/marketplace` public pack index + `/marketplace/:id` detail** (cards, tags, price, seller; buy CTA is a manual email until Stripe) · **`/how` install & workflow guide** (4 HowStep blocks with real commands incl. the git+subdirectory uv install, trace-status explainer with StatusBadges, CTA; linked from hero button + footer + landing How-it-works section; marketplace linked from For-labs CTA + footer) · `/sign-up` Clerk sign-up page · `/cli/auth` **device-approval page** (auto-opens sign-in modal when signed out, approves via `POST /v1/device/approve` with Clerk JWT, key goes only to the terminal) · `/dashboard` **live vault** (stat tiles, status filter chips + counts, sort by newest/steps/cost, per-org facts, table with trace-ID copy, repo, cost; rows clickable) · **`/dashboard/traces/:id` trace viewer**: header card + MetaGrid details (repo@commit, branch, license, seller outcome, total tokens, scrub, trace ID + content hash with copy), role filter chips, step text search, timeline layout (number + role + token rail, hairline spine), 16px body text, thinking blocks (muted tinted), tool calls (dark terminal blocks, pretty-printed args), tool results (error-tinted), per-step JSON copy on hover, progressive rendering. Auth-aware CTAs; copy rules: customer-facing, zero em dashes. | API base from `VITE_API_URL` (baked at build). 🔜 Scrub report display once pipeline lands. |
| `public/_redirects` | Cloudflare Pages SPA fallback: all paths → `index.html` (client-side router needs it on refresh/direct visits). | — |
| `vite.config.ts` | Vite + React + Tailwind v4 plugins. | — |
| `index.html`, `src/index.css` | Shell, Tailwind import, **Archivo font** (Google Fonts variable 100–900, `@theme --font-sans` = brand typeface everywhere). | — |
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
