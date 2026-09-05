-- OpenTraces metadata schema (D1/SQLite). Applied via `pnpm db:local` (local) or
-- `wrangler d1 execute opentraces --remote --file src/db/schema.sql` (prod).

CREATE TABLE IF NOT EXISTS orgs (
  id               TEXT PRIMARY KEY,          -- "org_" || hex
  clerk_org_id     TEXT UNIQUE,
  name             TEXT NOT NULL,
  stripe_connect_id TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS users (
  id           TEXT PRIMARY KEY,
  clerk_user_id TEXT UNIQUE,
  org_id       TEXT NOT NULL REFERENCES orgs(id),
  role         TEXT NOT NULL DEFAULT 'owner',  -- owner | member
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS api_keys (
  id            TEXT PRIMARY KEY,
  org_id        TEXT NOT NULL REFERENCES orgs(id),
  key_id        TEXT NOT NULL UNIQUE,          -- visible part of ot_live_<key_id>_<secret>
  secret_hash   TEXT NOT NULL,                 -- sha256(secret), hex
  name          TEXT,
  scopes        TEXT NOT NULL DEFAULT 'traces:write',
  last_used_at  TEXT,
  last_ip       TEXT,
  revoked_at    TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_api_keys_org ON api_keys(org_id);

CREATE TABLE IF NOT EXISTS sources (
  id           TEXT PRIMARY KEY,
  org_id       TEXT NOT NULL REFERENCES orgs(id),
  agent        TEXT NOT NULL,                  -- pi | claude-code | codex | opencode
  machine_name TEXT,
  cli_version  TEXT,
  created_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS traces (
  id            TEXT PRIMARY KEY,              -- tr_<24hex>
  org_id        TEXT NOT NULL REFERENCES orgs(id),
  source_id     TEXT REFERENCES sources(id),
  agent         TEXT NOT NULL,
  model         TEXT,
  structure     TEXT NOT NULL DEFAULT 'linear',-- linear | tree
  repo_url      TEXT,
  base_commit   TEXT,
  task_desc     TEXT,
  n_steps       INTEGER NOT NULL DEFAULT 0,
  cost_usd      REAL,
  status        TEXT NOT NULL DEFAULT 'uploaded',
  -- uploaded → scrubbing → scrubbed → indexed → listed → sold → payout_held → paid
  --                                  └→ rejected            └→ verification_queued → verified | verify_failed (Phase 2)
  scrub_report  TEXT,                          -- JSON: secrets removed, pii redactions, dropped steps
  blob_key      TEXT NOT NULL,                 -- R2 object key
  content_hash  TEXT NOT NULL UNIQUE,          -- sha256 of NDJSON payload (idempotency)
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_traces_org ON traces(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_traces_status ON traces(status);

CREATE TABLE IF NOT EXISTS packs (
  id          TEXT PRIMARY KEY,                -- pack_<24hex>
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  title       TEXT NOT NULL,
  tags        TEXT NOT NULL DEFAULT '[]',      -- JSON array
  license     TEXT NOT NULL DEFAULT 'standard',
  price_cents INTEGER NOT NULL DEFAULT 0,
  status      TEXT NOT NULL DEFAULT 'draft',   -- draft | review | live | delisted
  stripe_price_id TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS pack_items (
  pack_id  TEXT NOT NULL REFERENCES packs(id),
  trace_id TEXT NOT NULL REFERENCES traces(id),
  PRIMARY KEY (pack_id, trace_id)
);

CREATE TABLE IF NOT EXISTS ledger_entries (
  id          TEXT PRIMARY KEY,
  org_id      TEXT NOT NULL REFERENCES orgs(id),
  type        TEXT NOT NULL,                   -- sale | platform_fee | verification_fee | payout | refund
  amount_cents INTEGER NOT NULL,               -- signed; credits positive
  purchase_id TEXT,
  memo        TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ledger_org ON ledger_entries(org_id, created_at DESC);
