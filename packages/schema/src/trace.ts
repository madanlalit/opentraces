/**
 * OpenTraces canonical trace format `ot/0.2`.
 *
 * Wire format: NDJSON — first line is a header, every following line is a step.
 * Field names are snake_case on the wire (shared with the Python CLI / buyers).
 *
 * This file is the single source of truth. JSON Schema for buyers is exported
 * from these Zod schemas (`pnpm schema:export`), and the Python CLI's Pydantic
 * models are generated from that export in CI.
 */
import { z } from "zod";

export const SCHEMA_VERSION = "ot/0.2";
export const SchemaVersion = z.literal(SCHEMA_VERSION);

// ---------------------------------------------------------------------------
// Usage
// ---------------------------------------------------------------------------

export const UsageSchema = z.object({
  input: z.number().int().nonnegative().optional(),
  output: z.number().int().nonnegative().optional(),
  cache_read: z.number().int().nonnegative().optional(),
  cache_write: z.number().int().nonnegative().optional(),
  total_tokens: z.number().int().nonnegative().optional(),
  cost_usd: z.number().nonnegative().optional(),
});
export type Usage = z.infer<typeof UsageSchema>;

// ---------------------------------------------------------------------------
// Content blocks (inside messages)
// ---------------------------------------------------------------------------

export const TextBlockSchema = z.object({ type: z.literal("text"), text: z.string() });
export const ThinkingBlockSchema = z.object({ type: z.literal("thinking"), thinking: z.string() });
export const ToolCallBlockSchema = z.object({
  type: z.literal("toolCall"),
  id: z.string(),
  name: z.string(),
  arguments: z.record(z.string(), z.unknown()),
});
export const ImageBlockSchema = z.object({
  type: z.literal("image"),
  data: z.string(), // base64
  mime_type: z.string(),
});

export const ContentBlockSchema = z.discriminatedUnion("type", [
  TextBlockSchema,
  ThinkingBlockSchema,
  ToolCallBlockSchema,
  ImageBlockSchema,
]);
export type ContentBlock = z.infer<typeof ContentBlockSchema>;

// ---------------------------------------------------------------------------
// Steps (one NDJSON line each)
// ---------------------------------------------------------------------------

const StepMeta = {
  type: z.literal("step"),
  i: z.number().int().nonnegative(),
  /** ISO timestamp, optional */
  ts: z.string().optional(),
  /**
   * ot/0.2 stores the *active path* as a linear list. Adapters linearize
   * tree-shaped sessions (pi branches, compactions) before upload.
   * `id`/`parent_id` for full-tree round-tripping lands in ot/0.3.
   */
  id: z.string().optional(),
  parent_id: z.string().nullable().optional(),
};

export const UserStepSchema = z.object({
  ...StepMeta,
  role: z.literal("user"),
  content: z.union([z.string(), z.array(ContentBlockSchema)]),
});

export const AssistantStepSchema = z.object({
  ...StepMeta,
  role: z.literal("assistant"),
  content: z.array(ContentBlockSchema),
  model: z.string().optional(),
  stop_reason: z.string().optional(),
  usage: UsageSchema.optional(),
});

export const ToolResultStepSchema = z.object({
  ...StepMeta,
  role: z.literal("tool_result"),
  tool_call_id: z.string(),
  tool_name: z.string().optional(),
  content: z.array(ContentBlockSchema),
  is_error: z.boolean().optional(),
  usage: UsageSchema.optional(),
});

export const StepSchema = z.discriminatedUnion("role", [
  UserStepSchema,
  AssistantStepSchema,
  ToolResultStepSchema,
]);
export type Step = z.infer<typeof StepSchema>;
export type UserStep = z.infer<typeof UserStepSchema>;
export type AssistantStep = z.infer<typeof AssistantStepSchema>;
export type ToolResultStep = z.infer<typeof ToolResultStepSchema>;

// ---------------------------------------------------------------------------
// Header (first NDJSON line)
// ---------------------------------------------------------------------------

export const AttestationSchema = z.object({
  /** Seller asserts they hold the rights to this trace. */
  rights_holder: z.boolean(),
  /** License key from the license registry; "standard" permits SFT/RL, no resale. */
  license: z.string().default("standard"),
  /** How consent was captured, e.g. "cli-interactive", "cli-auto-allowlist". */
  consent: z.string().optional(),
});

export const TraceHeaderSchema = z.object({
  type: z.literal("header"),
  schema: SchemaVersion,
  /** Assigned server-side if absent. */
  trace_id: z.string().optional(),
  created_at: z.string().optional(),
  agent: z.object({
    name: z.string(), // "pi" | "claude-code" | "codex" | "opencode" | ...
    version: z.string().optional(),
    model: z.string().optional(),
    provider: z.string().optional(),
    temperature: z.number().optional(),
    seed: z.number().int().nullable().optional(),
  }),
  env: z.object({
    repo_url: z.string().nullable().optional(),
    base_commit: z.string().nullable().optional(),
    branch: z.string().nullable().optional(),
    image_digest: z.string().nullable().optional(),
    files_touched: z.array(z.string()).optional(),
  }),
  task: z
    .object({
      description: z.string().optional(),
      source: z.string().optional(), // "user_prompt" | "github_issue" | ...
    })
    .optional(),
  /** Seller-claimed outcome. Platform verification (Phase 2) replaces this. */
  outcome: z
    .object({
      self_reported: z.string().optional(), // "success" | "failure" | "partial"
    })
    .optional(),
  usage: UsageSchema.optional(),
  attestation: AttestationSchema,
  privacy: z
    .object({
      scrub: z.string().optional(), // "pending" | "clean" | report id
      secrets_removed: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
export type TraceHeader = z.infer<typeof TraceHeaderSchema>;

// ---------------------------------------------------------------------------
// Structured parse errors
// ---------------------------------------------------------------------------

export class TraceParseError extends Error {}
