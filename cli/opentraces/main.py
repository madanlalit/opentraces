"""OpenTraces CLI — `ot login`, `ot whoami`, `ot push`.

MVP flow: paste an API key from the dashboard, scan pi sessions, select, upload.
Server-side scrubbing runs after upload; traces land in the seller's vault.
"""

from __future__ import annotations

import getpass
from pathlib import Path

import httpx
import rich
import typer

from . import __version__
from .adapters import idempotency_key, parse_session, scan_sessions, to_ndjson
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
def login() -> None:
    """Store your API key (create one in the dashboard → Settings → API Keys)."""
    rich.print("Create a key at [bold]Dashboard → Settings → API Keys[/bold], then paste it.")
    key = _require_key_prefix(getpass.getpass("API key: ").strip())
    url = get_api_url()

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
) -> None:
    """Scan local agent sessions and upload the ones you pick."""
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
            resp = client.post(
                "/v1/traces",
                content=payload.encode("utf-8"),
                headers={
                    "Content-Type": "application/x-ndjson",
                    "Idempotency-Key": idempotency_key(ref.agent, ref.path),
                },
            )
            label = ref.name.replace("\n", " ")[:48]
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
