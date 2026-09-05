import { Hono } from "hono";
import { cors } from "hono/cors";
import { parseTraceNDJSON, TraceParseError } from "@opentraces/schema";
import { clerkAuth } from "./auth";
import { scrubTraceNdjson, type ScrubReport } from "./scrub/scrub";

// Dashboard origins allowed to call this API from a browser.
// Local dev (Vite) + the production Pages deployment.
const ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "https://opentraces.pages.dev",
  "https://opentraces-web.pages.dev",
];

type Env = {
  DB: D1Database;
  TRACES: R2Bucket;
  CLERK_ISSUER: string;
};

type Variables = { orgId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// CORS for dashboard origins — must run before auth so OPTIONS preflights pass.
app.use("/v1/*", cors({ origin: ALLOWED_ORIGINS, allowHeaders: ["Authorization", "Content-Type"], allowMethods: ["GET", "POST", "OPTIONS"] }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function newId(prefix: string): string {
  return prefix + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
}

// Human-friendly device code: no 0/O/1/I, 4+4 with a dash.
function newUserCode(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const pick = () =>
    [...crypto.getRandomValues(new Uint8Array(4))]
      .map((b) => alphabet[b % alphabet.length])
      .join("");
  return `${pick()}-${pick()}`;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newSecret(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

app.get("/v1/health", (c) => c.json({ ok: true, service: "opentraces-api" }));

// ---------------------------------------------------------------------------
// Auth — API keys (CLI) now, Clerk session JWTs (dashboard) in the next slice.
// Key format: ot_live_<key_id>_<secret>  (also ot_test_ / ot_dev_ for non-prod)
// We store only sha256(secret); lookup happens by key_id.
// ---------------------------------------------------------------------------

app.use("/v1/*", async (c, next) => {
  if (c.req.path === "/v1/health") return next();
  // Public marketplace reads (GET only): live packs + pack detail.
  if (
    c.req.method === "GET" &&
    (c.req.path === "/v1/packs" || /^\/v1\/packs\//.test(c.req.path))
  )
    return next();
  // device code + poll are public by design (that's the whole point of the flow);
  // approve does its own Clerk JWT check inside the handler.
  if (c.req.path.startsWith("/v1/device/")) return next();

  const auth = c.req.header("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";

  // Clerk session JWT (dashboard) — verified against the instance JWKS.
  if (token.split(".").length === 3 && token.startsWith("ey")) {
    try {
      const { orgId } = await clerkAuth(c.env, auth);
      c.set("orgId", orgId);
      return next();
    } catch {
      return c.json({ error: "invalid session" }, 401);
    }
  }

  const parts = token.split("_");

  if (parts.length >= 4) {
    const prefix = `${parts[0]}_${parts[1]}`; // ot_live | ot_test | ot_dev
    if (["ot_live", "ot_test", "ot_dev"].includes(prefix)) {
      const keyId = parts[2];
      const secret = parts.slice(3).join("_");

      const row = await c.env.DB.prepare(
        "SELECT id, org_id, secret_hash, revoked_at FROM api_keys WHERE key_id = ?"
      )
        .bind(keyId)
        .first<{ id: string; org_id: string; secret_hash: string; revoked_at: string | null }>();

      if (!row || row.revoked_at) return c.json({ error: "invalid api key" }, 401);
      if ((await sha256Hex(secret)) !== row.secret_hash) {
        return c.json({ error: "invalid api key" }, 401);
      }

      c.set("orgId", row.org_id);
      c.executionCtx.waitUntil(
        c.env.DB.prepare("UPDATE api_keys SET last_used_at = datetime('now'), last_ip = ? WHERE id = ?")
          .bind(c.req.header("CF-Connecting-IP") ?? null, row.id)
          .run()
      );
      return next();
    }
  }

  // TODO: rate limiting per key.
  return c.json({ error: "unsupported authorization scheme" }, 401);
});

// ---------------------------------------------------------------------------
// Packs — seller CRUD (Clerk JWT) + public marketplace reads (no auth).
// Public detail exposes trace stats only (agent/model/steps), never task text.
// ---------------------------------------------------------------------------

const PACK_SELECT = `
  SELECT p.id, p.title, p.tags, p.license, p.price_cents, p.status, p.created_at,
         o.name AS org_name, o.github_url AS org_github_url, o.verified AS org_verified,
         (SELECT COUNT(*) FROM pack_items pi JOIN traces t ON t.id = pi.trace_id
           WHERE pi.pack_id = p.id) AS trace_count,
         (SELECT COALESCE(SUM(t.n_steps), 0) FROM pack_items pi JOIN traces t ON t.id = pi.trace_id
           WHERE pi.pack_id = p.id) AS step_count
  FROM packs p JOIN orgs o ON o.id = p.org_id`;

app.get("/v1/packs", async (c) => {
  const { results } = await c.env.DB.prepare(
    `${PACK_SELECT} WHERE p.status = 'live' ORDER BY p.created_at DESC LIMIT 100`
  ).all();
  const packs = (results as Record<string, unknown>[]).map((p) => ({
    ...p,
    tags: JSON.parse((p.tags as string) ?? "[]"),
  }));
  return c.json({ packs });
});

app.get("/v1/packs/:id", async (c) => {
  const pack = await c.env.DB.prepare(
    `${PACK_SELECT} WHERE p.id = ? AND p.status = 'live'`
  )
    .bind(c.req.param("id"))
    .first<Record<string, unknown>>();
  if (!pack) return c.json({ error: "not found" }, 404);

  const { results } = await c.env.DB.prepare(
    `SELECT t.id, t.agent, t.model, t.n_steps, t.cost_usd
     FROM pack_items pi JOIN traces t ON t.id = pi.trace_id WHERE pi.pack_id = ?`
  )
    .bind(pack.id)
    .all();
  return c.json({ pack: { ...pack, tags: JSON.parse((pack.tags as string) ?? "[]") }, traces: results });
});

app.get("/v1/my/packs", async (c) => {
  const orgId = c.get("orgId");
  const { results } = await c.env.DB.prepare(
    `${PACK_SELECT} WHERE p.org_id = ? ORDER BY p.created_at DESC`
  )
    .bind(orgId)
    .all<{ id: string; tags: string }>();
  const packs = [];
  for (const p of results) {
    const items = await c.env.DB.prepare(
      `SELECT t.id, t.status, t.n_steps FROM pack_items pi JOIN traces t ON t.id = pi.trace_id
       WHERE pi.pack_id = ?`
    )
      .bind(p.id)
      .all();
    packs.push({ ...p, tags: JSON.parse(p.tags ?? "[]"), traces: items.results });
  }
  return c.json({ packs });
});

app.post("/v1/packs", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json<{
    title?: string;
    tags?: string[];
    price_cents?: number;
    license?: string;
    trace_ids?: string[];
  }>();

  const title = body.title?.trim() ?? "";
  const traceIds = [...new Set(body.trace_ids ?? [])];
  if (!title) return c.json({ error: "title required" }, 400);
  if (!traceIds.length) return c.json({ error: "at least one trace required" }, 400);
  if (!Number.isInteger(body.price_cents) || body.price_cents! < 0) {
    return c.json({ error: "price_cents must be a non-negative integer" }, 400);
  }

  // Only this org's scrubbed traces can be packed (never sell uncleaned data).
  const placeholders = traceIds.map(() => "?").join(",");
  const { results } = await c.env.DB.prepare(
    `SELECT id FROM traces WHERE id IN (${placeholders}) AND org_id = ? AND status = 'scrubbed'`
  )
    .bind(...traceIds, orgId)
    .all<{ id: string }>();
  const valid = new Set(results.map((r) => r.id));
  const invalid = traceIds.filter((id) => !valid.has(id));
  if (invalid.length) {
    return c.json({ error: "traces must be yours and scrubbed", invalid }, 400);
  }

  const packId = "pack_" + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO packs (id, org_id, title, tags, license, price_cents, status) VALUES (?, ?, ?, ?, ?, ?, 'draft')"
    ).bind(
      packId,
      orgId,
      title,
      JSON.stringify(body.tags ?? []),
      body.license ?? "standard",
      body.price_cents
    ),
    ...traceIds.map((tid) =>
      c.env.DB.prepare("INSERT INTO pack_items (pack_id, trace_id) VALUES (?, ?)").bind(packId, tid)
    ),
  ]);
  return c.json({ pack_id: packId, status: "draft" }, 201);
});

async function ownedPack(c: { env: Env; req: { param(k: string): string } }, orgId: string) {
  return c.env.DB.prepare("SELECT id, status FROM packs WHERE id = ? AND org_id = ?")
    .bind(c.req.param("id"), orgId)
    .first<{ id: string; status: string }>();
}

app.post("/v1/packs/:id/publish", async (c) => {
  const orgId = c.get("orgId");
  const pack = await ownedPack(c, orgId);
  if (!pack) return c.json({ error: "not found" }, 404);
  if (pack.status === "live") return c.json({ status: "live" });

  // Publish gate: buyers must see who they are buying from.
  const org = await c.env.DB.prepare("SELECT github_url FROM orgs WHERE id = ?")
    .bind(orgId)
    .first<{ github_url: string | null }>();
  if (!org?.github_url) {
    return c.json({ error: "set your seller GitHub profile before publishing" }, 400);
  }

  // Publish gate: every item must still be scrubbed.
  const bad = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM pack_items pi JOIN traces t ON t.id = pi.trace_id
     WHERE pi.pack_id = ? AND t.status != 'scrubbed'`
  )
    .bind(pack.id)
    .first<{ n: number }>();
  if (!bad || bad.n > 0) return c.json({ error: "all items must be scrubbed to publish" }, 400);

  await c.env.DB.prepare("UPDATE packs SET status = 'live' WHERE id = ?").bind(pack.id).run();
  return c.json({ status: "live" });
});

app.get("/v1/my/profile", async (c) => {
  const orgId = c.get("orgId");
  const org = await c.env.DB.prepare("SELECT name, github_url, created_at FROM orgs WHERE id = ?")
    .bind(orgId)
    .first();
  return c.json({ profile: org });
});

app.patch("/v1/my/profile", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.json<{ github_url?: string }>();
  const url = body.github_url?.trim() ?? "";
  if (url && !/^https:\/\/github\.com\/[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?\/?$/.test(url)) {
    return c.json({ error: "github_url must look like https://github.com/<username>" }, 400);
  }
  await c.env.DB.prepare("UPDATE orgs SET github_url = ? WHERE id = ?")
    .bind(url || null, orgId)
    .run();
  return c.json({ ok: true });
});

app.post("/v1/packs/:id/delist", async (c) => {
  const orgId = c.get("orgId");
  const pack = await ownedPack(c, orgId);
  if (!pack) return c.json({ error: "not found" }, 404);
  await c.env.DB.prepare("UPDATE packs SET status = 'delisted' WHERE id = ?").bind(pack.id).run();
  return c.json({ status: "delisted" });
});

// ---------------------------------------------------------------------------
// Device flow — `ot login` without copy-pasting keys.
// CLI: POST /v1/device/code → opens {verify_url}?user_code=… in the browser.
// Dashboard (/cli/auth, Clerk session): POST /v1/device/approve.
// CLI polls POST /v1/device/poll until the key is handed over (single read).
// ---------------------------------------------------------------------------

app.post("/v1/device/code", async (c) => {
  // opportunistic cleanup of expired rows
  await c.env.DB.prepare("DELETE FROM device_auths WHERE expires_at < datetime('now')").run();

  const deviceCode = newSecret(); // 32 bytes, url-safe, also unguessable
  const userCode = newUserCode();
  await c.env.DB.prepare(
    "INSERT INTO device_auths (device_code, user_code, status, expires_at) VALUES (?, ?, 'pending', datetime('now', '+10 minutes'))"
  )
    .bind(deviceCode, userCode)
    .run();

  return c.json({
    device_code: deviceCode,
    user_code: userCode,
    verify_url: "https://opentraces.pages.dev/cli/auth",
    expires_in: 600,
    interval: 2,
  }, 201);
});

app.post("/v1/device/approve", async (c) => {
  let orgId: string;
  try {
    ({ orgId } = await clerkAuth(c.env, c.req.header("Authorization")));
  } catch {
    return c.json({ error: "invalid session" }, 401);
  }

  const { user_code } = (await c.req.json<{ user_code?: string }>()) ?? {};
  if (!user_code) return c.json({ error: "user_code required" }, 400);

  const row = await c.env.DB.prepare(
    "SELECT device_code, status FROM device_auths WHERE user_code = ? AND status = 'pending' AND expires_at > datetime('now')"
  )
    .bind(user_code.trim().toUpperCase())
    .first<{ device_code: string }>();
  if (!row) return c.json({ error: "unknown or expired code" }, 404);

  const keyId = crypto.randomUUID().replaceAll("-", "").slice(0, 12);
  const secret = newSecret();
  await c.env.DB.batch([
    c.env.DB.prepare(
      "INSERT INTO api_keys (id, org_id, key_id, secret_hash, name) VALUES (?, ?, ?, ?, 'device login')"
    ).bind("ak_" + keyId, orgId, keyId, await sha256Hex(secret)),
    c.env.DB.prepare(
      "UPDATE device_auths SET status = 'approved', org_id = ?, key_id = ?, secret = ? WHERE device_code = ?"
    ).bind(orgId, keyId, secret, row.device_code),
  ]);

  // The full secret is deliberately NOT shown in the browser. It is handed
  // to the CLI exactly once via /v1/device/poll.
  return c.json({ approved: true, key_id: keyId });
});

app.post("/v1/device/poll", async (c) => {
  const { device_code } = (await c.req.json<{ device_code?: string }>()) ?? {};
  if (!device_code) return c.json({ error: "device_code required" }, 400);

  const row = await c.env.DB.prepare(
    "SELECT status, key_id, secret, expires_at FROM device_auths WHERE device_code = ?"
  )
    .bind(device_code)
    .first<{ status: string; key_id: string | null; secret: string | null; expires_at: string }>();

  if (!row || row.expires_at < new Date().toISOString().replace("T", " ").slice(0, 19)) {
    await c.env.DB.prepare("DELETE FROM device_auths WHERE device_code = ?").bind(device_code).run();
    return c.json({ error: "expired" }, 410);
  }
  if (row.status !== "approved" || !row.secret || !row.key_id) {
    return c.json({ status: "pending" }, 202);
  }

  // Single read: hand the secret over and burn the stash.
  await c.env.DB.prepare(
    "UPDATE device_auths SET secret = NULL WHERE device_code = ?"
  ).bind(device_code).run();

  return c.json({ key: `ot_live_${row.key_id}_${row.secret}`, key_id: row.key_id });
});

// ---------------------------------------------------------------------------
// Traces — ingest
// ---------------------------------------------------------------------------

app.post("/v1/traces", async (c) => {
  const orgId = c.get("orgId");
  const body = await c.req.text();

  let parsed;
  try {
    parsed = parseTraceNDJSON(body);
  } catch (e) {
    if (e instanceof TraceParseError) return c.json({ error: e.message }, 400);
    throw e;
  }

  // Idempotency: identical payloads never create a second trace.
  const contentHash = await sha256Hex(body);
  const existing = await c.env.DB.prepare("SELECT id, status FROM traces WHERE content_hash = ?")
    .bind(contentHash)
    .first<{ id: string; status: string }>();
  if (existing) {
    return c.json({ trace_id: existing.id, status: existing.status, duplicate: true }, 200);
  }

  const traceId = newId("tr_");
  const blobKey = `traces/${orgId}/${traceId}.jsonl`;
  await c.env.TRACES.put(blobKey, body, {
    httpMetadata: { contentType: "application/x-ndjson" },
  });

  await c.env.DB.prepare(
    `INSERT INTO traces (id, org_id, agent, model, structure, repo_url, base_commit, task_desc,
                         n_steps, cost_usd, status, blob_key, content_hash)
     VALUES (?, ?, ?, ?, 'linear', ?, ?, ?, ?, ?, 'uploaded', ?, ?)`
  )
    .bind(
      traceId,
      orgId,
      parsed.header.agent.name,
      parsed.header.agent.model ?? null,
      parsed.header.env.repo_url ?? null,
      parsed.header.env.base_commit ?? null,
      parsed.header.task?.description ?? null,
      parsed.steps.length,
      parsed.header.usage?.cost_usd ?? null,
      blobKey,
      contentHash
    )
    .run();

  return c.json({ trace_id: traceId, status: "uploaded" }, 202);
});

// ---------------------------------------------------------------------------
// Scrub pipeline — uploaded → scrubbing → scrubbed | rejected.
// v0 runs on a Cron Trigger sweep (free tier); the function is queue-ready:
// swap sweepUploaded() for a queue consumer without touching scrub logic.
// ---------------------------------------------------------------------------

async function scrubTraceById(env: Env, traceId: string): Promise<ScrubReport | null> {
  const row = await env.DB.prepare("SELECT org_id, blob_key, status FROM traces WHERE id = ?")
    .bind(traceId)
    .first<{ org_id: string; blob_key: string; status: string }>();
  if (!row) return null;

  await env.DB.prepare("UPDATE traces SET status = 'scrubbing' WHERE id = ?").bind(traceId).run();

  try {
    const obj = await env.TRACES.get(row.blob_key);
    if (!obj) throw new Error("blob missing");
    const text = await obj.text();

    const outcome = scrubTraceNdjson(text);

    if (outcome.rejected) {
      await env.DB.prepare(
        "UPDATE traces SET status = 'rejected', scrub_report = ? WHERE id = ?"
      )
        .bind(JSON.stringify(outcome.report), traceId)
        .run();
      return outcome.report;
    }

    // Scrubbed blob replaces the served blob; the original stays at its
    // traces/{org}/{id} key for audit (derivable from org_id + id).
    const scrubbedKey = row.blob_key.replace(/^traces\//, "scrubbed/");
    await env.TRACES.put(scrubbedKey, outcome.ndjson!, {
      httpMetadata: { contentType: "application/x-ndjson" },
    });

    // Refresh scrubbed metadata into D1: task_desc was copied at ingest from
    // the unredacted header, and listings must never leak pre-scrub text.
    let redactedTask: string | null = null;
    try {
      const firstLine = outcome.ndjson!.slice(0, outcome.ndjson!.indexOf("\n"));
      redactedTask = (JSON.parse(firstLine) as { task?: { description?: string } }).task?.description ?? null;
    } catch {
      redactedTask = null;
    }
    await env.DB.prepare(
      "UPDATE traces SET status = 'scrubbed', scrub_report = ?, blob_key = ?, task_desc = ? WHERE id = ?"
    )
      .bind(JSON.stringify(outcome.report), scrubbedKey, redactedTask, traceId)
      .run();
    return outcome.report;
  } catch (e) {
    // Put the trace back so the sweep retries it next minute.
    await env.DB.prepare("UPDATE traces SET status = 'uploaded' WHERE id = ?").bind(traceId).run();
    throw e;
  }
}

async function sweepUploaded(env: Env): Promise<number> {
  const { results } = await env.DB.prepare(
    "SELECT id FROM traces WHERE status = 'uploaded' ORDER BY created_at LIMIT 50"
  ).all<{ id: string }>();
  let done = 0;
  for (const r of results) {
    try {
      await scrubTraceById(env, r.id);
      done++;
    } catch {
      // retried by the next sweep; errors must not block the batch
    }
  }
  return done;
}

// ---------------------------------------------------------------------------
// Traces — read back (vault list + detail)
// ---------------------------------------------------------------------------

app.get("/v1/traces", async (c) => {
  const orgId = c.get("orgId");
  const { results } = await c.env.DB.prepare(
    `SELECT id, agent, model, repo_url, base_commit, task_desc, n_steps, cost_usd, status, created_at
     FROM traces WHERE org_id = ? ORDER BY created_at DESC LIMIT 100`
  )
    .bind(orgId)
    .all();
  return c.json({ traces: results });
});

app.get("/v1/traces/:id", async (c) => {
  const orgId = c.get("orgId");
  const trace = await c.env.DB.prepare(
    `SELECT id, agent, model, structure, repo_url, base_commit, task_desc, n_steps, cost_usd,
            status, scrub_report, blob_key, content_hash, created_at
     FROM traces WHERE id = ? AND org_id = ?`
  )
    .bind(c.req.param("id"), orgId)
    .first();
  if (!trace) return c.json({ error: "not found" }, 404);

  // Parse the stored NDJSON into header + steps for the trace viewer.
  const obj = await c.env.TRACES.get(trace.blob_key as string);
  let header: unknown = null;
  let steps: unknown[] = [];
  let parse_error: string | null = null;
  if (obj) {
    try {
      const parsed = parseTraceNDJSON(await obj.text());
      header = parsed.header;
      steps = parsed.steps;
    } catch (e) {
      parse_error = e instanceof TraceParseError ? e.message : "unreadable blob";
    }
  }

  return c.json({ trace, header, steps, parse_error });
});

// Manual (re-)scrub: same path the cron uses. Useful for tests and a future
// "rescrub" action in the vault.
app.post("/v1/traces/:id/scrub", async (c) => {
  const orgId = c.get("orgId");
  const id = c.req.param("id");
  const owned = await c.env.DB.prepare("SELECT id FROM traces WHERE id = ? AND org_id = ?")
    .bind(id, orgId)
    .first();
  if (!owned) return c.json({ error: "not found" }, 404);
  const report = await scrubTraceById(c.env, id);
  if (!report) return c.json({ error: "not found" }, 404);
  return c.json({ status: report.rejected ? "rejected" : "scrubbed", report });
});

export default {
  fetch: app.fetch,
  async scheduled(_controller: ScheduledController, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(sweepUploaded(env));
  },
};
