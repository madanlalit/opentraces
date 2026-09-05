/**
 * Deterministic scrub rules. Secrets MUST be regex (provably complete);
 * LLMs are only allowed for semantic PII later, and even then their output
 * gets re-scanned through these same rules.
 *
 * Placeholder style: [REDACTED:KIND] — preserves conversational structure,
 * which matters more for training value than silent deletion.
 */

export interface Rule {
  kind: string;
  re: RegExp;
}

// Ordered: structural patterns first (they swallow the most), specific tokens
// next, generic assignments last (highest false-positive risk).
export const SECRET_RULES: Rule[] = [
  {
    kind: "PRIVATE_KEY",
    re: /-----BEGIN [A-Z0-9 ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z0-9 ]*PRIVATE KEY-----/g,
  },
  { kind: "AWS_ACCESS_KEY", re: /\bAKIA[0-9A-Z]{16}\b/g },
  {
    kind: "AWS_SECRET_KEY",
    re: /aws.{0,25}?['"][A-Za-z0-9/+=]{40}['"]/gi,
  },
  { kind: "GITHUB_TOKEN", re: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g },
  { kind: "GITHUB_PAT", re: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g },
  { kind: "OPENAI_KEY", re: /\bsk-proj-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "OPENAI_KEY", re: /\bsk-[A-Za-z0-9_-]{20,}\b/g },
  { kind: "ANTHROPIC_KEY", re: /\bsk-ant-[A-Za-z0-9_-]{24,}\b/g },
  { kind: "SLACK_TOKEN", re: /\bxox[abprs]-[A-Za-z0-9-]{10,}\b/g },
  { kind: "STRIPE_KEY", re: /\b[sr]k_live_[A-Za-z0-9]{20,}\b/g },
  { kind: "STRIPE_WEBHOOK", re: /\bwhsec_[A-Za-z0-9]{20,}\b/g },
  { kind: "GOOGLE_KEY", re: /\bAIza[0-9A-Za-z_-]{35}\b/g },
  {
    kind: "JWT",
    re: /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
  },
  {
    kind: "BEARER_TOKEN",
    re: /\bBearer\s+[A-Za-z0-9._~+/=-]{24,}/g,
  },
  {
    kind: "ASSIGNMENT",
    re: /\b(api[_-]?key|secret|token|password|passwd|auth)[a-z0-9_-]*["']?\s*[:=]\s*["']?[^"'\s]{12,}["']?/gi,
  },
];

export const PATH_RULES: Rule[] = [
  { kind: "PATH", re: /\/Users\/[A-Za-z0-9._-]+/g },
  { kind: "PATH", re: /\/home\/[A-Za-z0-9._-]+/g },
];

export const CONTAMINATION_REPOS = [
  "swe-bench",
  "swebench",
  "human-eval",
  "humaneval",
  "mbpp",
  "gsm8k",
  "mmlu",
  "bigcode",
  "the-stack",
];

/**
 * Redact one string in place-agnostic fashion. Returns the redacted string.
 * `counts` accumulates per-kind redaction counters for the scrub report.
 */
export function redactString(input: string, counts: Map<string, number>): string {
  let out = input;
  for (const rule of [...SECRET_RULES, ...PATH_RULES]) {
    out = out.replace(rule.re, (match) => {
      // Assignment rule: keep the key name, redact only the value.
      if (rule.kind === "ASSIGNMENT") {
        const m = match.match(/^(.{0,40}?[:=]\s*["'])/);
        const prefix = m ? m[1] : "";
        counts.set(rule.kind, (counts.get(rule.kind) ?? 0) + 1);
        return `${prefix}[REDACTED:${rule.kind}]`;
      }
      // Path rule: keep the prefix (/Users, /home), redact the username.
      if (rule.kind === "PATH") {
        counts.set(rule.kind, (counts.get(rule.kind) ?? 0) + 1);
        return match.replace(/^(\/Users\/|\/home\/)[^/]+/, "$1[REDACTED_USER]");
      }
      counts.set(rule.kind, (counts.get(rule.kind) ?? 0) + 1);
      return `[REDACTED:${rule.kind}]`;
    });
  }
  return out;
}
