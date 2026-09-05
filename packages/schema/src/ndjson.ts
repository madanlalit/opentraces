import { TraceHeaderSchema, StepSchema, TraceParseError, SCHEMA_VERSION } from "./trace.js";
import type { TraceHeader, Step } from "./trace.js";

export interface ParsedTrace {
  header: TraceHeader;
  steps: Step[];
}

/** Parse an `ot/0.2` NDJSON payload: first line header, then steps. */
export function parseTraceNDJSON(text: string): ParsedTrace {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) throw new TraceParseError("empty payload");

  const json: unknown[] = lines.map((line, idx) => {
    try {
      return JSON.parse(line);
    } catch {
      throw new TraceParseError(`line ${idx + 1}: invalid JSON`);
    }
  });

  const header = TraceHeaderSchema.safeParse(json[0]);
  if (!header.success) {
    throw new TraceParseError(`line 1 is not a valid ${SCHEMA_VERSION} header: ${header.error.message}`);
  }

  const steps: Step[] = [];
  for (let idx = 1; idx < json.length; idx++) {
    const res = StepSchema.safeParse(json[idx]);
    if (!res.success) {
      throw new TraceParseError(`line ${idx + 1}: invalid step: ${res.error.message}`);
    }
    steps.push(res.data);
  }
  return { header: header.data, steps };
}

/** Serialize a trace to `ot/0.2` NDJSON (trailing newline included). */
export function toNDJSON(header: TraceHeader, steps: Step[]): string {
  return [JSON.stringify(header), ...steps.map((s) => JSON.stringify(s))].join("\n") + "\n";
}
