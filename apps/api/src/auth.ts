/**
 * Clerk session-JWT verification for dashboard-originated requests.
 *
 * Two credential types hit this API:
 *   - API keys  (ot_live_…) — CLI/machines, verified in index.ts
 *   - Clerk JWTs (eyJ…)     — humans in the dashboard, verified here
 *
 * JWTs are RS256, issuer = the Clerk instance (CLERK_ISSUER env), keys from
 * its JWKS endpoint (cached 1h). `sub` maps to users.clerk_user_id; the first
 * request lazily provisions the user's org + user rows.
 */
import { decode, verify } from "hono/jwt";

type Env = { DB: D1Database; CLERK_ISSUER: string; CLERK_SECRET_KEY?: string };

let jwksCache: { keys: Record<string, unknown>[]; fetchedAt: number } | null = null;

async function getJWKS(issuer: string): Promise<Record<string, unknown>[]> {
  const fresh = jwksCache && Date.now() - jwksCache.fetchedAt < 3600_000;
  if (fresh) return jwksCache!.keys;
  const res = await fetch(`${issuer}/.well-known/jwks.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`jwks fetch failed: ${res.status}`);
  const body = (await res.json()) as { keys: Record<string, unknown>[] };
  jwksCache = { keys: body.keys, fetchedAt: Date.now() };
  return body.keys;
}

async function verifyClerkJwt(token: string, issuer: string): Promise<{ sub: string }> {
  const { header } = decode(token);
  if (!header.kid) throw new Error("missing kid");

  const keys = await getJWKS(issuer);
  const jwk = keys.find((k) => k.kid === header.kid) as
    | { kty: string; n?: string; e?: string }
    | undefined;
  if (!jwk || jwk.kty !== "RSA" || !jwk.n || !jwk.e) throw new Error("unknown signing key");

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: "RS256", use: "sig" },
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );

  // hono/jwt checks exp/nbf; we add the issuer check.
  const payload = (await verify(token, cryptoKey, { alg: "RS256", iss: issuer })) as {
    sub?: string;
  };
  if (!payload.sub) throw new Error("missing sub");
  return { sub: payload.sub };
}

/** Find or create the org + user rows for a Clerk user id. Returns org id. */
export async function ensureOrg(env: Env, clerkUserId: string): Promise<string> {
  const existing = await env.DB.prepare(
    "SELECT org_id FROM users WHERE clerk_user_id = ?"
  )
    .bind(clerkUserId)
    .first<{ org_id: string }>();
  if (existing) return existing.org_id;

  const orgId = "org_" + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  const userId = "usr_" + crypto.randomUUID().replaceAll("-", "").slice(0, 24);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO orgs (id, name) VALUES (?, 'My workspace')").bind(orgId),
    env.DB.prepare(
      "INSERT INTO users (id, clerk_user_id, org_id, role) VALUES (?, ?, ?, 'owner')"
    ).bind(userId, clerkUserId, orgId),
  ]);

  // Best effort: name the seller org after their Clerk profile so our DB has
  // a real seller name, not 'My workspace'. Silent failure keeps auth working.
  if (env.CLERK_SECRET_KEY) {
    try {
      const res = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
        headers: { Authorization: `Bearer ${env.CLERK_SECRET_KEY}` },
      });
      if (res.ok) {
        const u = (await res.json()) as { first_name?: string | null; last_name?: string | null };
        const name = [u.first_name, u.last_name].filter(Boolean).join(" ").trim();
        if (name) {
          await env.DB.prepare("UPDATE orgs SET name = ? WHERE id = ?").bind(name, orgId).run();
        }
      }
    } catch {
      // profile enrichment is optional; never block auth on it
    }
  }

  return orgId;
}

export type ClerkAuthResult = { orgId: string; clerkUserId: string };

/** Verify the Authorization: Bearer <clerk jwt> header. Throws on any failure. */
export async function clerkAuth(
  env: Env,
  authorizationHeader: string | undefined
): Promise<ClerkAuthResult> {
  const token = authorizationHeader?.startsWith("Bearer ")
    ? authorizationHeader.slice(7)
    : "";
  if (!token || token.startsWith("ot_")) throw new Error("not a session token");

  const { sub } = await verifyClerkJwt(token, env.CLERK_ISSUER);
  const orgId = await ensureOrg(env, sub);
  return { orgId, clerkUserId: sub };
}
