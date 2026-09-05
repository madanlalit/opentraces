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
