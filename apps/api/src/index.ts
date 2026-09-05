import { Hono } from "hono";
import { parseTraceNDJSON, TraceParseError } from "@opentraces/schema";

type Env = {
  DB: D1Database;
  TRACES: R2Bucket;
};

type Variables = { orgId: string };

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newId(prefix: string): string {
  return prefix + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
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

  const auth = c.req.header("Authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : "";
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

  // TODO(next slice): Clerk session JWT verification via JWKS for dashboard calls.
  return c.json({ error: "unsupported authorization scheme" }, 401);
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

  const obj = await c.env.TRACES.get(trace.blob_key as string);
  const steps = obj ? (await obj.text()).split("\n").filter(Boolean).length - 1 : 0;
  return c.json({ trace, header_and_steps_lines: steps + 1 });
});

export default app;
