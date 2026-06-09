#!/usr/bin/env python3
from __future__ import annotations

import argparse
import os
import socket
import subprocess
import sys
import time
import webbrowser
import zipfile
from pathlib import Path
from urllib.request import urlopen
import json


DASHBOARD_FOLDER = "OutboundPM-operations-dashboard-v13-operating-hub"
ZIP_NAME = f"{DASHBOARD_FOLDER}.zip"


def skill_dir() -> Path:
    return Path(__file__).resolve().parents[1]


def default_install_parent() -> Path:
    return Path.home() / "Documents" / "Codex"


def port_accepts_connections(bind_host: str, port: int) -> bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.settimeout(0.25)
        return sock.connect_ex((bind_host, port)) == 0


def dashboard_responds(url: str) -> bool:
    try:
        with urlopen(url, timeout=1.5) as response:
            body = response.read(4096).decode("utf-8", errors="ignore")
        return "Outbound PM Operations Hub" in body or "Outbound PM Operations" in body
    except Exception:
        return False


def dashboard_supports_required_api(url: str) -> bool:
    try:
        with urlopen(f"{url.rstrip('/')}/api/health", timeout=1.5) as response:
            payload = json.loads(response.read(8192).decode("utf-8", errors="ignore"))
        return bool(payload.get("open_url_supported"))
    except Exception:
        return False


def find_port(bind_host: str, preferred_port: int, max_attempts: int = 20) -> int:
    for port in range(preferred_port, preferred_port + max_attempts):
        if not port_accepts_connections(bind_host, port):
            return port
        url = f"http://{bind_host}:{port}/"
        if dashboard_responds(url) and dashboard_supports_required_api(url):
            return port
    raise RuntimeError(f"No available local port found from {preferred_port} to {preferred_port + max_attempts - 1}")


def install_dashboard(target_dir: Path, force: bool = False) -> None:
    zip_path = skill_dir() / "assets" / ZIP_NAME
    if target_dir.exists() and not force:
        return
    if not zip_path.exists():
        raise FileNotFoundError(f"Bundled dashboard zip not found: {zip_path}")

    target_parent = target_dir.parent
    target_parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(zip_path) as archive:
        archive.extractall(target_parent)

    if not target_dir.exists():
        raise RuntimeError(f"Dashboard install did not create expected folder: {target_dir}")


def start_dashboard(target_dir: Path, bind_host: str, port: int, log_path: Path) -> None:
    log_path.parent.mkdir(parents=True, exist_ok=True)
    log_file = log_path.open("a", encoding="utf-8")
    subprocess.Popen(
        [sys.executable, "server.py", "--host", bind_host, "--port", str(port)],
        cwd=target_dir,
        stdout=log_file,
        stderr=subprocess.STDOUT,
        start_new_session=True,
    )


def wait_for_dashboard(url: str, timeout_seconds: float = 20.0) -> bool:
    deadline = time.time() + timeout_seconds
    while time.time() < deadline:
        if dashboard_responds(url):
            return True
        time.sleep(0.35)
    return False


def main() -> int:
    parser = argparse.ArgumentParser(description="Launch the Outbound PM Operations Hub Jira dashboard.")
    parser.add_argument("--host", default=os.environ.get("JIRA_DASHBOARD_HOST", "localhost"))
    parser.add_argument("--port", type=int, default=int(os.environ.get("JIRA_DASHBOARD_PORT", "8901")))
    parser.add_argument("--install-parent", default=os.environ.get("JIRA_DASHBOARD_INSTALL_PARENT", str(default_install_parent())))
    parser.add_argument("--dashboard-dir", default=os.environ.get("JIRA_DASHBOARD_DIR", ""))
    parser.add_argument("--force-install", action="store_true", help="Replace/reinstall the bundled dashboard if needed.")
    parser.add_argument("--no-open", action="store_true", help="Print the URL without opening a browser.")
    args = parser.parse_args()

    target_dir = Path(args.dashboard_dir).expanduser() if args.dashboard_dir else Path(args.install_parent).expanduser() / DASHBOARD_FOLDER
    install_dashboard(target_dir, force=args.force_install)

    port = find_port(args.host, args.port)
    url = f"http://{args.host}:{port}/"
    log_path = Path.home() / ".codex" / "jira-dashboard" / f"dashboard-{port}.log"

    if not dashboard_responds(url):
        start_dashboard(target_dir, args.host, port, log_path)
        if not wait_for_dashboard(url):
            print(f"Dashboard server did not become ready within the timeout.", file=sys.stderr)
            print(f"Log: {log_path}", file=sys.stderr)
            return 1

    if not args.no_open:
        webbrowser.open(url)

    print(f"Dashboard URL: {url}")
    print(f"Dashboard folder: {target_dir}")
    print(f"Server log: {log_path}")
    print("Use the localhost URL above. Do not open index.html directly; file:// cannot fetch live Jira tickets.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
