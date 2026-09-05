"""pi integration assets — written to ~/.pi by `ot install-skill`.

The extension adds a /sell command (push the current session) and optional
auto-push when pi quits (OT_AUTO_PUSH=1). The skill teaches the agent when
and how to sell, so it can offer it when a task completes.
"""

EXTENSION_TS = """\
/**
 * OpenTraces seller — push the current pi session as a sellable trace.
 *
 * Commands:
 *   /sell   Confirm + upload this session (ot push --session … --yes)
 *
 * Auto-push: set OT_AUTO_PUSH=1 in your environment to upload when pi quits.
 * Requires the OpenTraces CLI: https://github.com/madanlalit/opentraces
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { spawn } from "node:child_process";

function runOt(args: string[]): Promise<{ code: number; out: string }> {
  return new Promise((resolve) => {
    const p = spawn("ot", args, { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    p.stdout?.on("data", (d) => (out += String(d)));
    p.stderr?.on("data", (d) => (out += String(d)));
    p.on("error", () =>
      resolve({
        code: 1,
        out:
          "ot CLI not found. Install it with: uv tool install 'opentraces @ git+https://github.com/madanlalit/opentraces#subdirectory=cli'",
      })
    );
    p.on("close", (code) => resolve({ code: code ?? 1, out }));
  });
}

export default function (pi: ExtensionAPI) {
  const pushSession = async (
    sessionFile: string,
    ctx: { ui: { notify(msg: string, level?: string): void; setStatus?(k: string, v?: string): void } }
  ) => {
    ctx.ui.setStatus?.("opentraces", "Pushing trace…");
    const { code, out } = await runOt(["push", "--session", sessionFile, "--yes"]);
    ctx.ui.setStatus?.("opentraces", undefined);
    if (code === 0) {
      const m = out.match(/tr_[a-z0-9]+/);
      ctx.ui.notify(
        `OpenTraces: uploaded ${m?.[0] ?? ""}. Vault: https://opentraces.pages.dev/dashboard`,
        "info"
      );
    } else {
      ctx.ui.notify(`OpenTraces push failed: ${out.trim().slice(0, 200)}`, "error");
    }
  };

  pi.registerCommand("sell", {
    description: "Sell this session: push it to OpenTraces",
    handler: async (_args, ctx) => {
      const sessionFile = ctx.sessionManager.getSessionFile();
      if (!sessionFile) {
        ctx.ui.notify("OpenTraces: no session file to sell.", "error");
        return;
      }
      const ok = await ctx.ui.confirm(
        "Sell this trace?",
        "Upload this session to OpenTraces? Secrets are scrubbed server-side."
      );
      if (!ok) return;
      await pushSession(sessionFile, ctx);
    },
  });

  pi.on("session_shutdown", async (event, ctx) => {
    if (process.env.OT_AUTO_PUSH !== "1") return;
    if (event.reason !== "quit") return;
    const sessionFile = ctx.sessionManager.getSessionFile();
    if (!sessionFile) return;
    setTimeout(() => {
      spawn("ot", ["push", "--session", sessionFile, "--yes"], {
        detached: true,
        stdio: "ignore",
      }).unref();
    }, 200);
  });
}
"""

SKILL_MD = """\
---
name: opentraces-seller
description: Sell the current session's work as an OpenTraces trace. Use when the user finishes a coding task and wants to sell it, get paid for it, or push/upload the trace (e.g. "sell this", "push the trace", "get paid for this", "sell my traces when the task is done").
---

# Sell this trace (OpenTraces)

When the user asks to sell, push, or upload the current work:

1. Briefly confirm what will be uploaded: summarize the task completed in this
   session in one sentence, then proceed (no extra questions if the user
   already asked clearly).
2. Run:

   ```
   ot push --last --yes
   ```

   `--last` targets the most recent pi session, which is this one. The upload
   is idempotent, so running it twice never creates duplicates.

3. Report the trace id (looks like `tr_xxxxxxxx`) from the command output and
   the dashboard link: https://opentraces.pages.dev/dashboard

If the command fails:
- `ot CLI not found` → give the install command:
  `uv tool install 'opentraces @ git+https://github.com/madanlalit/opentraces#subdirectory=cli'`
- auth / 401 errors → tell the user to run `ot login`.

If the user says something like "when I finish this task, sell it", remember
the request and run the push as soon as the task is verified complete.
"""
