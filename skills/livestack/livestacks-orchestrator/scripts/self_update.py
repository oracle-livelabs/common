#!/usr/bin/env python3
"""Update livestacks-orchestrator from the canonical public GitHub directory."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Any


REPO_URL = "https://github.com/oracle-livelabs/common.git"
BRANCH = "main"
REMOTE_SKILL_PATH = "skills/livestack/livestacks-orchestrator"
UPDATER_VERSION = "1"

EXCLUDED_DIR_NAMES = {
    ".git",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "__MACOSX",
}

EXCLUDED_FILE_NAMES = {
    ".DS_Store",
    ".livestacks-update-state.json",
}

EXCLUDED_SUFFIXES = {
    ".pyc",
    ".pyo",
}


class UpdateError(Exception):
    """Expected fail-soft update error."""


def utc_now() -> str:
    return dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def should_exclude(path: Path) -> bool:
    name = path.name
    if name in EXCLUDED_DIR_NAMES or name in EXCLUDED_FILE_NAMES:
        return True
    if name.startswith("._"):
        return True
    return path.is_file() and path.suffix in EXCLUDED_SUFFIXES


def copy_ignore(_directory: str, names: list[str]) -> set[str]:
    ignored: set[str] = set()
    for name in names:
        candidate = Path(name)
        if name in EXCLUDED_DIR_NAMES or name in EXCLUDED_FILE_NAMES or name.startswith("._"):
            ignored.add(name)
        elif candidate.suffix in EXCLUDED_SUFFIXES:
            ignored.add(name)
    return ignored


def content_hash(root: Path) -> str | None:
    if not root.exists():
        return None
    if not root.is_dir():
        raise UpdateError(f"Skill root is not a directory: {root}")

    digest = hashlib.sha256()
    for path in sorted(root.rglob("*")):
        if any(part in EXCLUDED_DIR_NAMES for part in path.relative_to(root).parts):
            continue
        if should_exclude(path):
            continue

        rel = path.relative_to(root).as_posix()
        if path.is_symlink():
            digest.update(b"L\0")
            digest.update(rel.encode("utf-8"))
            digest.update(b"\0")
            digest.update(os.readlink(path).encode("utf-8", errors="surrogateescape"))
            digest.update(b"\0")
        elif path.is_file():
            digest.update(b"F\0")
            digest.update(rel.encode("utf-8"))
            digest.update(b"\0")
            digest.update(path.read_bytes())
            digest.update(b"\0")
    return digest.hexdigest()


def run_command(command: list[str], *, cwd: Path | None = None, timeout: int = 120) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(
        command,
        cwd=str(cwd) if cwd else None,
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout,
        check=False,
    )


def require_git() -> None:
    if shutil.which("git") is None:
        raise UpdateError("git is not available on PATH")


def clone_sparse_repo(repo_root: Path) -> None:
    require_git()
    command = [
        "git",
        "clone",
        "--depth",
        "1",
        "--filter=blob:none",
        "--sparse",
        "--branch",
        BRANCH,
        REPO_URL,
        str(repo_root),
    ]
    result = run_command(command, timeout=180)
    if result.returncode != 0:
        if repo_root.exists():
            shutil.rmtree(repo_root)
        fallback = [
            "git",
            "clone",
            "--depth",
            "1",
            "--sparse",
            "--branch",
            BRANCH,
            REPO_URL,
            str(repo_root),
        ]
        result = run_command(fallback, timeout=180)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().splitlines()
        raise UpdateError(detail[-1] if detail else "git clone failed")

    sparse = run_command(["git", "-C", str(repo_root), "sparse-checkout", "set", REMOTE_SKILL_PATH], timeout=120)
    if sparse.returncode != 0:
        detail = (sparse.stderr or sparse.stdout).strip().splitlines()
        raise UpdateError(detail[-1] if detail else "git sparse-checkout failed")


def git_commit(repo_root: Path) -> str:
    result = run_command(["git", "-C", str(repo_root), "rev-parse", "HEAD"], timeout=30)
    if result.returncode != 0:
        return "unknown"
    return result.stdout.strip() or "unknown"


def read_version(root: Path) -> str | None:
    version_path = root / "VERSION"
    if not version_path.exists():
        return None
    return read_text(version_path).strip() or None


def frontmatter_name(skill_md: Path) -> str | None:
    if not skill_md.exists():
        return None
    text = read_text(skill_md)
    if not text.startswith("---\n"):
        return None
    for line in text.splitlines()[1:]:
        if line == "---":
            break
        if line.startswith("name:"):
            return line.split(":", 1)[1].strip().strip("'\"")
    return None


def validate_stage(stage_root: Path) -> None:
    required = [
        "SKILL.md",
        "VERSION",
        "update.json",
        "scripts/self_update.py",
        "scripts/check_skill_package.py",
    ]
    for rel in required:
        if not (stage_root / rel).exists():
            raise UpdateError(f"remote skill is missing required update path: {rel}")

    if frontmatter_name(stage_root / "SKILL.md") != "livestacks-orchestrator":
        raise UpdateError("remote SKILL.md frontmatter name is not livestacks-orchestrator")

    update_config = stage_root / "update.json"
    try:
        config = json.loads(read_text(update_config))
    except json.JSONDecodeError as error:
        raise UpdateError(f"remote update.json is invalid JSON: line {error.lineno}") from error

    expected = {
        "repo_url": REPO_URL,
        "branch": BRANCH,
        "skill_path": REMOTE_SKILL_PATH,
    }
    for key, value in expected.items():
        if config.get(key) != value:
            raise UpdateError(f"remote update.json has unexpected {key}: {config.get(key)!r}")

    check_script = stage_root / "scripts" / "check_skill_package.py"
    result = run_command([sys.executable, str(check_script), str(stage_root)], timeout=120)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().splitlines()
        raise UpdateError(detail[-1] if detail else "remote package validation failed")


class UpdateLock:
    def __init__(self, skill_root: Path) -> None:
        self.lock_dir = skill_root.parent / ".locks"
        self.lock_path = self.lock_dir / "livestacks-orchestrator-update.lock"
        self.fd: int | None = None

    def __enter__(self) -> "UpdateLock":
        self.lock_dir.mkdir(parents=True, exist_ok=True)
        flags = os.O_CREAT | os.O_EXCL | os.O_WRONLY
        try:
            self.fd = os.open(str(self.lock_path), flags, 0o644)
        except FileExistsError as error:
            raise UpdateError(f"another update is already running: {self.lock_path}") from error
        payload = f"pid={os.getpid()}\nstarted_at={utc_now()}\n"
        os.write(self.fd, payload.encode("utf-8"))
        return self

    def __exit__(self, _exc_type: object, _exc: object, _tb: object) -> None:
        if self.fd is not None:
            os.close(self.fd)
            self.fd = None
        try:
            self.lock_path.unlink()
        except FileNotFoundError:
            pass


def replace_skill_root(skill_root: Path, stage_root: Path) -> None:
    parent = skill_root.parent
    parent.mkdir(parents=True, exist_ok=True)
    temp_target = parent / f".livestacks-orchestrator.updating-{os.getpid()}"
    if temp_target.exists():
        shutil.rmtree(temp_target)
    shutil.copytree(stage_root, temp_target, ignore=copy_ignore)

    # The active directory is untouched until the staged copy is complete.
    if skill_root.exists():
        shutil.rmtree(skill_root)
    temp_target.rename(skill_root)


def write_state(skill_root: Path, state: dict[str, Any]) -> None:
    state_path = skill_root / ".livestacks-update-state.json"
    state_path.write_text(json.dumps(state, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def emit(result: dict[str, Any], *, json_mode: bool) -> None:
    if json_mode:
        print(json.dumps(result, sort_keys=True))
        return

    status = result.get("status", "unknown")
    if status == "current":
        print("livestacks-orchestrator is current.")
    elif status == "update_available":
        print("livestacks-orchestrator update is available.")
    elif status == "updated":
        print(f"livestacks-orchestrator updated to {result.get('remote_version') or 'remote version'}.")
    elif status in {"skipped", "validation_failed"}:
        print(f"livestacks-orchestrator update skipped: {result.get('reason', 'unknown reason')}")
    else:
        print(f"livestacks-orchestrator updater status: {status}")


def update(args: argparse.Namespace) -> dict[str, Any]:
    skill_root = Path(args.skill_root).expanduser().resolve()
    local_hash = content_hash(skill_root)
    local_version = read_version(skill_root)

    with tempfile.TemporaryDirectory(prefix="livestacks-orchestrator-update-") as temp_dir:
        repo_root = Path(temp_dir) / "repo"
        clone_sparse_repo(repo_root)
        remote_root = repo_root / REMOTE_SKILL_PATH
        if not remote_root.exists():
            raise UpdateError(f"remote skill path does not exist: {REMOTE_SKILL_PATH}")

        remote_hash = content_hash(remote_root)
        remote_version = read_version(remote_root)
        commit = git_commit(repo_root)
        base: dict[str, Any] = {
            "status": "current",
            "updated": False,
            "update_available": False,
            "repo_url": REPO_URL,
            "branch": BRANCH,
            "skill_path": REMOTE_SKILL_PATH,
            "commit": commit,
            "local_hash": local_hash,
            "remote_hash": remote_hash,
            "local_version": local_version,
            "remote_version": remote_version,
            "checked_at": utc_now(),
        }

        if local_hash == remote_hash:
            return base

        base["status"] = "update_available"
        base["update_available"] = True
        if args.check_only or not args.auto:
            return base

        try:
            validate_stage(remote_root)
        except UpdateError as error:
            base["status"] = "validation_failed"
            base["reason"] = str(error)
            return base

        try:
            with UpdateLock(skill_root):
                replace_skill_root(skill_root, remote_root)
                state = {
                    "repo_url": REPO_URL,
                    "branch": BRANCH,
                    "skill_path": REMOTE_SKILL_PATH,
                    "commit": commit,
                    "remote_hash": remote_hash,
                    "previous_local_hash": local_hash,
                    "installed_at": utc_now(),
                    "updater_version": UPDATER_VERSION,
                }
                write_state(skill_root, state)
        except UpdateError as error:
            base["status"] = "skipped"
            base["reason"] = str(error)
            return base

        base["status"] = "updated"
        base["updated"] = True
        base["installed_at"] = utc_now()
        return base


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skill-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Local livestacks-orchestrator skill root. Defaults to this script's parent skill.",
    )
    parser.add_argument("--auto", action="store_true", help="Install the GitHub copy automatically when it differs.")
    parser.add_argument("--check-only", action="store_true", help="Only report whether the GitHub copy differs.")
    parser.add_argument("--json", action="store_true", help="Emit machine-readable JSON.")
    args = parser.parse_args()

    if args.auto and args.check_only:
        parser.error("--auto and --check-only cannot be used together")

    try:
        result = update(args)
    except (OSError, subprocess.SubprocessError, UpdateError) as error:
        result = {
            "status": "skipped",
            "updated": False,
            "update_available": False,
            "offline": True,
            "reason": str(error),
            "repo_url": REPO_URL,
            "branch": BRANCH,
            "skill_path": REMOTE_SKILL_PATH,
            "checked_at": utc_now(),
        }

    emit(result, json_mode=args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
