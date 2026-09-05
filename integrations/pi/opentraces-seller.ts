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
