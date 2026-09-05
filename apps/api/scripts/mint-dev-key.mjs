// Mints a dev API key + the SQL to register it. Local dev only.
// Usage: node scripts/mint-dev-key.mjs
// Then:  pnpm db:local  (apply schema) and paste the SQL into
//        `wrangler d1 execute opentraces --local --command "<sql>"`
import { createHash, randomBytes } from "node:crypto";

const keyId = randomBytes(6).toString("hex"); // 12 chars
const secret = randomBytes(24).toString("base64url");
const hash = createHash("sha256").update(secret).digest("hex");

console.log(`API key:  ot_dev_${keyId}_${secret}`);
console.log(`\nRegister it (local D1):\n`);
console.log(
  `wrangler d1 execute opentraces --local --command "INSERT INTO orgs (id, name) VALUES ('org_dev','Dev Org') ON CONFLICT(id) DO NOTHING; INSERT INTO api_keys (id, org_id, key_id, secret_hash, name) VALUES ('key_${keyId}','org_dev','${keyId}','${hash}','dev key');"`
);
