/**
 * Trace scrubber: turns a stored `uploaded` trace into a training-ready one.
 *
 * Passes (v0, deterministic):
 *   1. secret redaction      (rules.ts — provably complete, never LLM)
 *   2. path redaction        (identity out, project structure kept)
 *   3. quality gates         (reject junk: too few steps, no tool calls, no task)
 *   4. contamination flags   (benchmark repos, flagged not rejected)
 *   5. report + rewritten blob
 *
 * Future stage (designed for): LLM semantic-PII pass. It must run AFTER this
 * pass and its output must be re-scanned through rules.ts before storage.
 */
import { parseTraceNDJSON, TraceParseError, SCHEMA_VERSION } from "@opentraces/schema";
import { redactString, CONTAMINATION_REPOS } from "./rules";

export interface ScrubReport {
  version: 1;
  redactions: Record<string, number>;
  total_redactions: number;
  gates: Record<string, "pass" | "fail">;
  rejected: string | null;
  contamination: string[];
  steps: number;
}

export type ScrubOutcome =
  | { ok: true; rejected: null; report: ScrubReport; ndjson: string }
  | { ok: true; rejected: string; report: ScrubReport; ndjson: null }
  | { ok: false; rejected: "unparseable"; report: ScrubReport; ndjson: null };

function walkRedact(value: unknown, counts: Map<string, number>): unknown {
  if (typeof value === "string") return redactString(value, counts);
  if (Array.isArray(value)) return value.map((v) => walkRedact(v, counts));
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = walkRedact(v, counts);
    }
    return out;
  }
  return value;
}

export function scrubTraceNdjson(text: string): ScrubOutcome {
  const report: ScrubReport = {
    version: 1,
    redactions: {},
    total_redactions: 0,
    gates: {},
    rejected: null,
    contamination: [],
    steps: 0,
  };

  let parsed;
  try {
    parsed = parseTraceNDJSON(text);
  } catch (e) {
    report.gates.parse = "fail";
    report.rejected = "unparseable";
    return { ok: false, rejected: "unparseable", report, ndjson: null };
  }

  const { header, steps } = parsed;
  report.steps = steps.length;

  // --- quality gates -------------------------------------------------------
  const gate = (name: string, pass: boolean, reason: string) => {
    report.gates[name] = pass ? "pass" : "fail";
    if (!pass) report.rejected = reason;
  };

  gate("min_steps", steps.length >= 4, "too_few_steps");

  const hasToolCall = steps.some(
    (s) =>
      s.role === "assistant" &&
      Array.isArray(s.content) &&
      s.content.some((b) => b.type === "toolCall")
  );
  gate("tool_calls", hasToolCall, "no_tool_calls");

  const hasTask =
    (header.task?.description ?? "").trim().length > 0 ||
    steps.some(
      (s) =>
        s.role === "user" &&
        (typeof s.content === "string" ? s.content.trim().length > 0 : true)
    );
  gate("task_present", hasTask, "no_task");

  // --- contamination flags (flag, don't reject; labs filter) ---------------
  const repo = (header.env.repo_url ?? "").toLowerCase();
  report.contamination = CONTAMINATION_REPOS.filter((r) => repo.includes(r));

  if (report.rejected) {
    return { ok: true, rejected: report.rejected, report, ndjson: null };
  }

  // --- redaction pass ------------------------------------------------------
  const counts = new Map<string, number>();
  const redHeader = walkRedact(header, counts) as typeof header;
  const redSteps = walkRedact(steps, counts) as typeof steps;
  report.redactions = Object.fromEntries(counts);
  for (const n of counts.values()) report.total_redactions += n;

  // The scrubbed blob's own header reflects its scrub state.
  redHeader.privacy = {
    scrub: "clean",
    secrets_removed: report.total_redactions,
  };
  redHeader.schema = SCHEMA_VERSION;

  const ndjson =
    JSON.stringify(redHeader) + "\n" + redSteps.map((s) => JSON.stringify(s)).join("\n") + "\n";

  return { ok: true, rejected: null, report, ndjson };
}
