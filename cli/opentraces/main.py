"""OpenTraces CLI — `ot login`, `ot whoami`, `ot push`.

MVP flow: paste an API key from the dashboard, scan pi sessions, select, upload.
Server-side scrubbing runs after upload; traces land in the seller's vault.
"""

from __future__ import annotations

import getpass
import time
import webbrowser
from pathlib import Path

import httpx
import rich
import rich.progress
import typer

from . import __version__
from .adapters import SessionRef, idempotency_key, parse_session, scan_sessions, to_ndjson
from .pi_integration import EXTENSION_TS, SKILL_MD
from .config import CREDENTIALS_PATH, get_api_key, get_api_url, save_credentials

app = typer.Typer(
    name="ot",
    help="Sell your coding agent's traces.",
    no_args_is_help=True,
)
state = {"verbose": False}


def _client() -> httpx.Client:
    key = get_api_key()
    if not key:
        rich.print("[red]Not logged in.[/red] Run [bold]ot login[/bold] first.")
        raise typer.Exit(1)
    return httpx.Client(base_url=get_api_url(), headers={"Authorization": f"Bearer {key}"}, timeout=120)


def _require_key_prefix(key: str) -> str:
    if not key.startswith(("ot_live_", "ot_test_", "ot_dev_")):
        rich.print("[red]Key must start with ot_live_, ot_test_ or ot_dev_[/red]")
        raise typer.Exit(1)
    return key


@app.command()
def version() -> None:
    """Print the CLI version."""
    rich.print(f"ot {__version__}")


@app.command()
def login(
    key: str = typer.Option(None, "--key", help="Paste an API key directly (CI/service use). Default: device flow in your browser."),
    api_url: str = typer.Option(None, "--api-url", help="Override the API base URL for this login."),
) -> None:
    """Log in. Default: approve in your browser with your OpenTraces account."""
    url = api_url or get_api_url()

    if key:  # direct paste flow (CI / service accounts)
        key = _require_key_prefix(key.strip() or getpass.getpass("API key: "))
        with httpx.Client(base_url=url, headers={"Authorization": f"Bearer {key}"}, timeout=30) as client:
            try:
                resp = client.get("/v1/traces")
            except httpx.HTTPError as e:
                rich.print(f"[red]Could not reach {url}: {e}[/red]")
                raise typer.Exit(1)
        if resp.status_code != 200:
            rich.print(f"[red]Key rejected ({resp.status_code}): {resp.text}[/red]")
            raise typer.Exit(1)
        save_credentials(key, url)
        rich.print(f"[green]✓ Logged in.[/green] Credentials saved to {CREDENTIALS_PATH}")
        if rich.prompt.Confirm.ask(
            "Install the pi integration? (/sell command + auto-push skill)", default=True
        ):
            _install_pi_integration()
        return

    # Device flow: approve in the browser, the key never touches the clipboard.
    with httpx.Client(base_url=url, timeout=30) as client:
        try:
            resp = client.post("/v1/device/code")
        except httpx.HTTPError as e:
            rich.print(f"[red]Could not reach {url}: {e}[/red]")
            raise typer.Exit(1)
        if resp.status_code != 201:
            rich.print(f"[red]Could not start login ({resp.status_code}): {resp.text}[/red]")
            raise typer.Exit(1)
        d = resp.json()
        device_code, user_code = d["device_code"], d["user_code"]
        interval, deadline = d.get("interval", 2), time.time() + d.get("expires_in", 600)
        verify_url = f"{d['verify_url']}?user_code={user_code}"

        rich.print(f"Open [bold]{verify_url}[/bold] and approve the login for [bold]{user_code}[/bold]")
        try:
            webbrowser.open(verify_url)
        except Exception:
            pass

        with rich.progress.Progress(
            rich.progress.SpinnerColumn(), rich.progress.TextColumn("Waiting for approval…")
        ) as progress:
            progress.add_task("login", total=None)
            while time.time() < deadline:
                time.sleep(interval)
                try:
                    poll = client.post("/v1/device/poll", json={"device_code": device_code})
                except httpx.HTTPError as e:
                    rich.print(f"[red]Connection lost: {e}[/red]")
                    raise typer.Exit(1)
                if poll.status_code == 200:
                    creds = poll.json()
                    save_credentials(creds["key"], url)
                    rich.print(f"[green]✓ Logged in as {creds['key_id']}.[/green] Saved to {CREDENTIALS_PATH}")
                    if rich.prompt.Confirm.ask(
                        "Install the pi integration? (/sell command + auto-push skill)", default=True
                    ):
                        _install_pi_integration()
                    return
                if poll.status_code == 410:
                    rich.print("[red]This login request expired. Run ot login again.[/red]")
                    raise typer.Exit(1)
                # 202 pending: keep polling

        rich.print("[red]Timed out waiting for approval.[/red]")
        raise typer.Exit(1)


@app.command()
def whoami() -> None:
    """Verify credentials and show what the API sees."""
    with _client() as client:
        resp = client.get("/v1/traces")
        if resp.status_code != 200:
            rich.print(f"[red]{resp.status_code}: {resp.text}[/red]")
            raise typer.Exit(1)
        traces = resp.json().get("traces", [])
        rich.print(f"[green]✓ Authenticated[/green] as org @ {get_api_url()}")
        rich.print(f"Vault: {len(traces)} trace(s)")


@app.command()
def push(
    agent: str = typer.Option("pi", "--agent", "-a", help="Agent to scan (pi; more coming)."),
    limit: int = typer.Option(10, "--limit", "-n", help="Max sessions to list."),
    all: bool = typer.Option(False, "--all", help="Upload every listed session without a picker."),
    session: str = typer.Option(None, "--session", help="Upload one session file (path to .jsonl)."),
    last: bool = typer.Option(False, "--last", help="Upload the most recent session."),
    yes: bool = typer.Option(False, "--yes", "-y", help="Skip confirmation prompts (for automation)."),
) -> None:
    """Scan local agent sessions and upload the ones you pick."""
    if session or last:
        if session:
            p = Path(session).expanduser().resolve()
            if not p.exists():
                rich.print(f"[red]Session file not found: {p}[/red]")
                raise typer.Exit(1)
            n_entries = sum(1 for line in p.read_text(errors="replace").splitlines() if line.strip())
            refs = [SessionRef(agent=agent, path=p, name=p.stem, n_entries=n_entries)]
        else:
            refs = scan_sessions(agent)[:1]
            if not refs:
                rich.print(f"No {agent} sessions found.")
                raise typer.Exit(0)
        rich.print(
            f"Uploading [cyan]{refs[0].name[:70]}[/cyan] ({refs[0].n_entries} entries)"
        )
        if not yes:
            if not rich.prompt.Confirm.ask("Upload this session?"):
                raise typer.Exit(0)
        sessions, chosen = refs, [0]
    else:
        sessions = scan_sessions(agent)[:limit]
        if not sessions:
            rich.print(f"No {agent} sessions found.")
            raise typer.Exit(0)

        table = rich.table.Table(title=f"{agent} sessions")
        table.add_column("#", justify="right")
        table.add_column("Session", style="cyan", max_width=60)
        table.add_column("Entries", justify="right")
        table.add_column("Path", style="dim", max_width=48)
        for i, s in enumerate(sessions, 1):
            table.add_row(str(i), s.name.replace("\n", " "), str(s.n_entries), str(s.path.parent.name))
        rich.print(table)

        if all:
            chosen = list(range(len(sessions)))
        else:
            raw = rich.prompt.Prompt.ask("Upload which? (e.g. 1,3-5, 'a' for all, empty to cancel)").strip()
            if not raw:
                raise typer.Exit(0)
            chosen = _parse_selection(raw, len(sessions))

    uploaded = 0
    with _client() as client:
        for idx in chosen:
            ref = sessions[idx]
            trace = parse_session(ref.agent, ref.path)
            payload = to_ndjson(trace)
            label = ref.name.replace("\n", " ")[:48]
            # Idempotent server-side (content-hash dedup), so retrying a timeout
            # can never create a duplicate trace.
            resp = None
            for attempt in range(3):
                try:
                    resp = client.post(
                        "/v1/traces",
                        content=payload.encode("utf-8"),
                        headers={
                            "Content-Type": "application/x-ndjson",
                            "Idempotency-Key": idempotency_key(ref.agent, ref.path),
                        },
                    )
                    break
                except httpx.HTTPError as e:
                    if attempt == 2:
                        rich.print(f"[red]✗ {label} → upload failed after 3 tries: {e}[/red]")
                        continue
                    rich.print(f"[yellow]… {label} → retry {attempt + 1}/2 ({type(e).__name__})[/yellow]")
                    time.sleep(2)
            if resp is None:
                continue
            if resp.status_code in (200, 202):
                data = resp.json()
                dup = " (duplicate)" if data.get("duplicate") else ""
                rich.print(f"[green]✓ {label}[/green] → {data['trace_id']} [{data['status']}]{dup}")
                if trace.skipped and state["verbose"]:
                    rich.print(f"    dropped: {trace.skipped}")
                uploaded += 1
            else:
                rich.print(f"[red]✗ {label} → {resp.status_code}: {resp.text[:200]}[/red]")

    rich.print(f"\n{uploaded} trace(s) uploaded. View them in your vault.")
    rich.print("[dim]Note: scrubbing runs server-side; secrets/PII are removed before listing.[/dim]")


@app.command("install-skill")
def install_skill() -> None:
    """Install the pi extension + skill for selling traces from inside pi."""
    _install_pi_integration()


def _install_pi_integration() -> None:
    ext_path = Path.home() / ".pi" / "agent" / "extensions" / "opentraces-seller.ts"
    skill_path = Path.home() / ".pi" / "agent" / "skills" / "opentraces-seller" / "SKILL.md"
    ext_path.parent.mkdir(parents=True, exist_ok=True)
    skill_path.parent.mkdir(parents=True, exist_ok=True)
    ext_path.write_text(EXTENSION_TS)
    skill_path.write_text(SKILL_MD)
    rich.print(f"[green]✓ pi extension installed:[/green] {ext_path}")
    rich.print(f"[green]✓ pi skill installed:[/green] {skill_path}")
    rich.print("Restart pi (or run /reload) to pick them up.")
    rich.print("In pi: [bold]/sell[/bold] pushes this session. Set OT_AUTO_PUSH=1 to auto-push on quit.")


def _parse_selection(raw: str, n: int) -> list[int]:
    if raw.lower() in ("a", "all"):
        return list(range(n))
    out: list[int] = []
    for part in raw.split(","):
        part = part.strip()
        if "-" in part:
            a, _, b = part.partition("-")
            out.extend(range(int(a) - 1, int(b)))
        elif part:
            out.append(int(part) - 1)
    invalid = [i for i in out if i < 0 or i >= n]
    if invalid:
        rich.print(f"[red]Invalid selection: {invalid}[/red]")
        raise typer.Exit(1)
    return sorted(set(out))


if __name__ == "__main__":
    app()
