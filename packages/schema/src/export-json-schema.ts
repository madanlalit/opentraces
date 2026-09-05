/**
 * Exports buyer-facing JSON Schema for ot/0.2 to schema/ot-0.2.json.
 * Run: pnpm schema:export
 */
import { z } from "zod";
import { writeFileSync, mkdirSync } from "node:fs";
import { TraceHeaderSchema, StepSchema, SCHEMA_VERSION } from "./trace.js";

const out = {
  $schema: "https://json-schema.org/draft/2020-12/schema",
  title: `OpenTraces trace format ${SCHEMA_VERSION}`,
  description:
    "NDJSON: first line is a header, every following line is a step. See docs/FLOW.md.",
  oneOf: [z.toJSONSchema(TraceHeaderSchema, { io: "input" }), z.toJSONSchema(StepSchema, { io: "input" })],
  definitions: {
    header: z.toJSONSchema(TraceHeaderSchema, { io: "input" }),
    step: z.toJSONSchema(StepSchema, { io: "input" }),
  },
};

const dest = new URL("../schema/ot-0.2.json", import.meta.url);
mkdirSync(new URL("../schema/", import.meta.url), { recursive: true });
writeFileSync(dest, JSON.stringify(out, null, 2) + "\n");
console.log(`wrote ${dest.pathname}`);
