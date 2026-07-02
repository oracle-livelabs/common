#!/usr/bin/env python3
"""Update livestacks-orchestrator from a public zip manifest."""

from __future__ import annotations

import argparse
import datetime as dt
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import urllib.parse
import urllib.request
import uuid
import zipfile
from pathlib import Path
from typing import Any


DEFAULT_MANIFEST_URL = (
    "https://raw.githubusercontent.com/oracle-livelabs/common/main/"
    "skills/livestack/livestacks-orchestrator.update.json"
)
UPDATER_VERSION = "2"

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
        relative = path.relative_to(root)
        if any(part in EXCLUDED_DIR_NAMES for part in relative.parts):
            continue
        if should_exclude(path):
            continue

        rel = relative.as_posix()
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


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
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


def is_url(location: str) -> bool:
    return urllib.parse.urlparse(location).scheme in {"http", "https", "file"}


def read_location_bytes(location: str, *, timeout: int = 60) -> bytes:
    parsed = urllib.parse.urlparse(location)
    if parsed.scheme in {"http", "https", "file"}:
        with urllib.request.urlopen(location, timeout=timeout) as response:  # noqa: S310 - configured public update URL.
            return response.read()
    return Path(location).expanduser().read_bytes()


def download_location(location: str, destination: Path, *, timeout: int = 180) -> None:
    parsed = urllib.parse.urlparse(location)
    if parsed.scheme in {"http", "https", "file"}:
        with urllib.request.urlopen(location, timeout=timeout) as response:  # noqa: S310 - configured public update URL.
            with destination.open("wb") as handle:
                shutil.copyfileobj(response, handle)
        return
    shutil.copy2(Path(location).expanduser(), destination)


def read_update_config(skill_root: Path) -> dict[str, Any]:
    config_path = skill_root / "update.json"
    if not config_path.exists():
        return {}
    try:
        return json.loads(read_text(config_path))
    except json.JSONDecodeError as error:
        raise UpdateError(f"local update.json is invalid JSON: line {error.lineno}") from error


def load_manifest(manifest_url: str) -> dict[str, Any]:
    try:
        raw = read_location_bytes(manifest_url)
    except OSError as error:
        raise UpdateError(f"could not read update manifest: {error}") from error
    try:
        manifest = json.loads(raw.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise UpdateError(f"update manifest is invalid JSON: {error}") from error
    if not isinstance(manifest, dict):
        raise UpdateError("update manifest must be a JSON object")
    validate_manifest(manifest)
    return manifest


def validate_manifest(manifest: dict[str, Any]) -> None:
    expected_name = "livestacks-orchestrator"
    if manifest.get("name") != expected_name:
        raise UpdateError(f"manifest name must be {expected_name!r}")

    for key in ("version", "archive_url", "archive_sha256", "content_hash"):
        value = manifest.get(key)
        if not isinstance(value, str) or not value.strip():
            raise UpdateError(f"manifest is missing required string field: {key}")

    for key in ("archive_sha256", "content_hash"):
        value = manifest[key]
        if len(value) != 64 or any(character not in "0123456789abcdef" for character in value.lower()):
            raise UpdateError(f"manifest field {key} must be a lowercase sha256 hex digest")

    minimum = manifest.get("min_updater_version")
    if minimum is not None:
        try:
            required = int(str(minimum))
        except ValueError as error:
            raise UpdateError("manifest min_updater_version must be an integer string") from error
        if required > int(UPDATER_VERSION):
            raise UpdateError(
                f"manifest requires updater version {required}, current updater is {UPDATER_VERSION}"
            )


def resolve_archive_url(manifest_url: str, archive_url: str) -> str:
    if is_url(archive_url) or Path(archive_url).is_absolute():
        return archive_url
    if is_url(manifest_url):
        return urllib.parse.urljoin(manifest_url, archive_url)
    return str((Path(manifest_url).expanduser().parent / archive_url).resolve())


def read_version(root: Path) -> str | None:
    version_path = root / "VERSION"
    if not version_path.exists():
        return None
    return read_text(version_path).strip() or None


def version_key(version: str | None) -> tuple[int, int, int, int, int] | None:
    if not version:
        return None

    match = re.match(
        r"^v?(?P<major>\d+)\.(?P<minor>\d+)\.(?P<patch>\d+)(?:[-.]?(?P<label>[a-zA-Z]+)[-.]?(?P<label_number>\d+)?)?$",
        version.strip(),
    )
    if not match:
        return None

    label = (match.group("label") or "").lower()
    label_rank = {
        "alpha": 0,
        "a": 0,
        "beta": 1,
        "b": 1,
        "preview": 2,
        "pre": 2,
        "rc": 3,
        "": 4,
    }.get(label)
    if label_rank is None:
        return None

    label_number = int(match.group("label_number") or "0")
    return (
        int(match.group("major")),
        int(match.group("minor")),
        int(match.group("patch")),
        label_rank,
        label_number,
    )


def is_remote_downgrade(local_version: str | None, remote_version: str | None) -> bool:
    local_key = version_key(local_version)
    remote_key = version_key(remote_version)
    if local_key is None or remote_key is None:
        return False
    return remote_key < local_key


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


def safe_extract_zip(archive_path: Path, destination: Path) -> None:
    with zipfile.ZipFile(archive_path) as archive:
        for member in archive.infolist():
            member_path = Path(member.filename)
            if member_path.is_absolute() or ".." in member_path.parts:
                raise UpdateError(f"archive contains unsafe path: {member.filename}")
            if member.filename.startswith("__MACOSX/") or "/__MACOSX/" in member.filename:
                raise UpdateError(f"archive contains macOS metadata: {member.filename}")
            archive.extract(member, destination)


def find_extracted_skill_root(extracted_root: Path) -> Path:
    if (extracted_root / "SKILL.md").exists():
        return extracted_root

    candidates = [path for path in extracted_root.iterdir() if path.is_dir() and (path / "SKILL.md").exists()]
    if len(candidates) == 1:
        return candidates[0]
    if not candidates:
        raise UpdateError("archive did not contain a skill root with SKILL.md")
    raise UpdateError("archive contained multiple possible skill roots")


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
            raise UpdateError(f"archive skill is missing required update path: {rel}")

    if frontmatter_name(stage_root / "SKILL.md") != "livestacks-orchestrator":
        raise UpdateError("archive SKILL.md frontmatter name is not livestacks-orchestrator")

    check_script = stage_root / "scripts" / "check_skill_package.py"
    result = run_command([sys.executable, str(check_script), str(stage_root)], timeout=120)
    if result.returncode != 0:
        detail = (result.stderr or result.stdout).strip().splitlines()
        raise UpdateError(detail[-1] if detail else "archive package validation failed")


class UpdateLock:
    def __init__(self, skill_root: Path) -> None:
        self.lock_dir = skill_root.parent / ".locks"
        self.lock_path = self.lock_dir / "livestacks-orchestrator-update.lock"
        self.fd: int | None = None
        self.cleanup_warning: str | None = None
        self.recovery_lock: str | None = None

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
        cleanup_errors: list[str] = []
        if self.fd is not None:
            try:
                os.close(self.fd)
            except OSError as error:
                cleanup_errors.append(f"could not close lock descriptor: {error}")
            finally:
                self.fd = None
        try:
            self.lock_path.unlink()
        except FileNotFoundError:
            pass
        except OSError as error:
            cleanup_errors.append(f"could not remove stale lock at {self.lock_path}: {error}")
            self.recovery_lock = str(self.lock_path)

        if cleanup_errors:
            self.cleanup_warning = "update lock cleanup failed; " + "; ".join(cleanup_errors)


def _transaction_path(parent: Path, purpose: str) -> Path:
    return parent / f".livestacks-orchestrator.{purpose}-{os.getpid()}-{uuid.uuid4().hex}"


def _remove_transaction_path(path: Path) -> None:
    if path.exists():
        shutil.rmtree(path)


def replace_skill_root(skill_root: Path, stage_root: Path, state: dict[str, Any]) -> dict[str, str]:
    parent = skill_root.parent
    parent.mkdir(parents=True, exist_ok=True)
    prepared_root = _transaction_path(parent, "prepared")
    rollback_root: Path | None = None

    try:
        shutil.copytree(stage_root, prepared_root, ignore=copy_ignore)
        write_state(prepared_root, state)
    except (OSError, shutil.Error) as error:
        cleanup_error: OSError | None = None
        try:
            _remove_transaction_path(prepared_root)
        except OSError as caught:
            cleanup_error = caught
        reason = f"installation preparation failed; existing installation left unchanged: {error}"
        if cleanup_error is not None:
            reason += f"; prepared-copy cleanup also failed: {cleanup_error}"
        raise UpdateError(reason) from error

    active_moved = False
    try:
        if skill_root.exists():
            rollback_root = _transaction_path(parent, "rollback")
            skill_root.rename(rollback_root)
            active_moved = True
        prepared_root.rename(skill_root)
    except OSError as activation_error:
        if active_moved and rollback_root is not None:
            try:
                rollback_root.rename(skill_root)
            except OSError as rollback_error:
                raise UpdateError(
                    "installation activation failed and rollback failed; "
                    f"previous installation remains at {rollback_root}: "
                    f"activation error: {activation_error}; rollback error: {rollback_error}"
                ) from activation_error

            cleanup_error: OSError | None = None
            try:
                _remove_transaction_path(prepared_root)
            except OSError as caught:
                cleanup_error = caught
            reason = f"installation activation failed; previous installation restored: {activation_error}"
            if cleanup_error is not None:
                reason += f"; prepared-copy cleanup also failed: {cleanup_error}"
            raise UpdateError(reason) from activation_error

        cleanup_error = None
        try:
            _remove_transaction_path(prepared_root)
        except OSError as caught:
            cleanup_error = caught
        reason = f"installation activation failed; existing installation left unchanged: {activation_error}"
        if cleanup_error is not None:
            reason += f"; prepared-copy cleanup also failed: {cleanup_error}"
        raise UpdateError(reason) from activation_error

    if rollback_root is not None:
        try:
            _remove_transaction_path(rollback_root)
        except OSError as error:
            return {
                "warning": (
                    "installation activated, but rollback-backup cleanup failed; "
                    f"backup remains at {rollback_root}: {error}"
                ),
                "recovery_backup": str(rollback_root),
            }
    return {}


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
        if result.get("warning"):
            print(f"Warning: {result['warning']}")
    elif status in {"skipped", "validation_failed"}:
        print(f"livestacks-orchestrator update skipped: {result.get('reason', 'unknown reason')}")
    else:
        print(f"livestacks-orchestrator updater status: {status}")


def update(args: argparse.Namespace) -> dict[str, Any]:
    skill_root = Path(args.skill_root).expanduser().resolve()
    local_hash = content_hash(skill_root)
    local_version = read_version(skill_root)
    config = read_update_config(skill_root)
    manifest_url = args.manifest_url or str(config.get("manifest_url") or DEFAULT_MANIFEST_URL)

    manifest = load_manifest(manifest_url)
    remote_hash = manifest["content_hash"].lower()
    remote_version = manifest["version"]
    archive_url = resolve_archive_url(manifest_url, manifest["archive_url"])

    base: dict[str, Any] = {
        "status": "current",
        "updated": False,
        "update_available": False,
        "manifest_url": manifest_url,
        "archive_url": archive_url,
        "archive_sha256": manifest["archive_sha256"].lower(),
        "local_hash": local_hash,
        "remote_hash": remote_hash,
        "local_version": local_version,
        "remote_version": remote_version,
        "checked_at": utc_now(),
        "updater_version": UPDATER_VERSION,
    }

    if local_hash == remote_hash:
        return base

    if is_remote_downgrade(local_version, remote_version) and not getattr(args, "allow_downgrade", False):
        base["status"] = "skipped"
        base["reason"] = (
            f"remote version {remote_version} is older than installed version {local_version}; "
            "use --allow-downgrade to install it intentionally"
        )
        return base

    base["status"] = "update_available"
    base["update_available"] = True
    if args.check_only or not args.auto:
        return base

    with tempfile.TemporaryDirectory(prefix="livestacks-orchestrator-update-") as temp_dir:
        temp_root = Path(temp_dir)
        archive_path = temp_root / "livestacks-orchestrator.zip"
        try:
            download_location(archive_url, archive_path)
        except OSError as error:
            base["status"] = "skipped"
            base["reason"] = f"could not download archive: {error}"
            return base

        actual_archive_hash = sha256_file(archive_path)
        if actual_archive_hash != manifest["archive_sha256"].lower():
            base["status"] = "validation_failed"
            base["reason"] = "archive sha256 did not match manifest"
            base["actual_archive_sha256"] = actual_archive_hash
            return base

        extracted_root = temp_root / "extracted"
        extracted_root.mkdir()
        try:
            safe_extract_zip(archive_path, extracted_root)
            remote_root = find_extracted_skill_root(extracted_root)
            validate_stage(remote_root)
        except (OSError, zipfile.BadZipFile, UpdateError) as error:
            base["status"] = "validation_failed"
            base["reason"] = str(error)
            return base

        archive_version = read_version(remote_root)
        if archive_version != remote_version:
            base["status"] = "validation_failed"
            base["reason"] = (
                f"archive VERSION {archive_version!r} did not match manifest version {remote_version!r}"
            )
            base["archive_version"] = archive_version
            return base

        extracted_hash = content_hash(remote_root)
        if extracted_hash != remote_hash:
            base["status"] = "validation_failed"
            base["reason"] = "archive content hash did not match manifest"
            base["extracted_hash"] = extracted_hash
            return base

        installation_metadata: dict[str, str] = {}
        try:
            with UpdateLock(skill_root) as update_lock:
                state = {
                    "manifest_url": manifest_url,
                    "archive_url": archive_url,
                    "archive_sha256": manifest["archive_sha256"].lower(),
                    "content_hash": remote_hash,
                    "version": remote_version,
                    "published_at": manifest.get("published_at"),
                    "previous_local_hash": local_hash,
                    "installed_at": utc_now(),
                    "updater_version": UPDATER_VERSION,
                }
                installation_metadata = replace_skill_root(skill_root, remote_root, state)
            if update_lock.cleanup_warning is not None:
                previous_warning = installation_metadata.get("warning")
                installation_metadata["warning"] = (
                    f"{previous_warning}; {update_lock.cleanup_warning}"
                    if previous_warning
                    else update_lock.cleanup_warning
                )
            if update_lock.recovery_lock is not None:
                installation_metadata["recovery_lock"] = update_lock.recovery_lock
        except (OSError, shutil.Error, UpdateError) as error:
            base["status"] = "skipped"
            base["updated"] = False
            base["reason"] = str(error)
            return base

    base["status"] = "updated"
    base["updated"] = True
    base["installed_at"] = utc_now()
    base.update(installation_metadata)
    return base


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skill-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Local livestacks-orchestrator skill root. Defaults to this script's parent skill.",
    )
    parser.add_argument(
        "--manifest-url",
        help="Override the update manifest URL or local manifest path. Defaults to update.json, then the public GitHub manifest.",
    )
    parser.add_argument("--auto", action="store_true", help="Install the zip archive automatically when it differs.")
    parser.add_argument("--check-only", action="store_true", help="Only report whether the manifest content hash differs.")
    parser.add_argument("--allow-downgrade", action="store_true", help="Allow installing an older manifest version intentionally.")
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
            "reason": str(error),
            "checked_at": utc_now(),
            "updater_version": UPDATER_VERSION,
        }

    emit(result, json_mode=args.json)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
