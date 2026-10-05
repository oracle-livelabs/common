#!/usr/bin/env python3
"""Build or verify a deterministic livestacks-orchestrator release archive."""

from __future__ import annotations

import argparse
import datetime as dt
import json
import os
import stat
import sys
import tempfile
import uuid
import zipfile
from pathlib import Path
from typing import Any

# Importing local release helpers must not contaminate the package being built.
sys.dont_write_bytecode = True

import check_skill_package  # noqa: E402
import self_update  # noqa: E402


ARCHIVE_ROOT = "livestacks-orchestrator"
ZIP_TIMESTAMP = (1980, 1, 1, 0, 0, 0)


class ReleaseError(Exception):
    """A release could not be built or verified safely."""


def is_within(path: Path, root: Path) -> bool:
    try:
        path.relative_to(root)
    except ValueError:
        return False
    return True


def validate_output_paths(skill_root: Path, archive_path: Path, manifest_path: Path) -> None:
    for label, path in (("archive", archive_path), ("manifest", manifest_path)):
        if is_within(path, skill_root):
            raise ReleaseError(f"{label} path must be outside the skill root: {path}")
    if archive_path == manifest_path:
        raise ReleaseError("archive and manifest paths must be different")


def included_paths(skill_root: Path) -> list[Path]:
    paths: list[Path] = []
    for path in skill_root.rglob("*"):
        relative = path.relative_to(skill_root)
        if any(part in self_update.EXCLUDED_DIR_NAMES for part in relative.parts):
            continue
        if self_update.should_exclude(path):
            continue
        if path.is_symlink():
            raise ReleaseError(f"release archives do not support symbolic links: {relative.as_posix()}")
        paths.append(path)
    return paths


def zip_info(archive_name: str, path: Path, *, directory: bool) -> zipfile.ZipInfo:
    if directory and not archive_name.endswith("/"):
        archive_name += "/"
    info = zipfile.ZipInfo(archive_name, date_time=ZIP_TIMESTAMP)
    info.create_system = 3
    info.compress_type = zipfile.ZIP_STORED if directory else zipfile.ZIP_DEFLATED
    source_mode = stat.S_IMODE(path.stat().st_mode)
    mode = 0o755 if directory or source_mode & 0o111 else 0o644
    file_type = stat.S_IFDIR if directory else stat.S_IFREG
    info.external_attr = (file_type | mode) << 16
    if directory:
        info.external_attr |= 0x10
    return info


def write_deterministic_archive(skill_root: Path, archive_path: Path) -> None:
    skill_root = skill_root.resolve()
    if not skill_root.is_dir():
        raise ReleaseError(f"skill root is not a directory: {skill_root}")

    entries: list[tuple[str, Path, bool]] = [
        (f"{ARCHIVE_ROOT}/", skill_root, True),
    ]
    for path in included_paths(skill_root):
        relative = path.relative_to(skill_root).as_posix()
        directory = path.is_dir()
        archive_name = f"{ARCHIVE_ROOT}/{relative}"
        if directory:
            archive_name += "/"
        entries.append((archive_name, path, directory))
    entries.sort(key=lambda entry: entry[0])

    archive_path.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(archive_path, "w", allowZip64=True) as archive:
        for archive_name, source, directory in entries:
            info = zip_info(archive_name, source, directory=directory)
            data = b"" if directory else source.read_bytes()
            archive.writestr(
                info,
                data,
                compress_type=info.compress_type,
                compresslevel=9 if not directory else None,
            )


def run_package_hygiene(skill_root: Path) -> None:
    findings = check_skill_package.check_package(skill_root)
    if not findings:
        return
    detail = "\n".join(f"  - {finding.path}: {finding.message}" for finding in findings)
    raise ReleaseError(f"package hygiene checks failed:\n{detail}")


def read_manifest(manifest_path: Path) -> dict[str, Any]:
    try:
        value = json.loads(manifest_path.read_text(encoding="utf-8"))
    except FileNotFoundError as error:
        raise ReleaseError(f"manifest does not exist: {manifest_path}") from error
    except json.JSONDecodeError as error:
        raise ReleaseError(f"manifest is invalid JSON at line {error.lineno}: {manifest_path}") from error
    if not isinstance(value, dict):
        raise ReleaseError("manifest must contain a JSON object")
    if value.get("name") != ARCHIVE_ROOT:
        raise ReleaseError(f"manifest name must be {ARCHIVE_ROOT!r}")
    return value


def read_version(skill_root: Path) -> str:
    version_path = skill_root / "VERSION"
    try:
        version = version_path.read_text(encoding="utf-8").strip()
    except FileNotFoundError as error:
        raise ReleaseError(f"VERSION does not exist: {version_path}") from error
    if not version:
        raise ReleaseError(f"VERSION is empty: {version_path}")
    return version


def published_at() -> str:
    raw_epoch = os.environ.get("SOURCE_DATE_EPOCH")
    if raw_epoch is None:
        value = dt.datetime.now(dt.timezone.utc)
    else:
        try:
            epoch = int(raw_epoch)
            value = dt.datetime.fromtimestamp(epoch, tz=dt.timezone.utc)
        except (ValueError, OverflowError, OSError) as error:
            raise ReleaseError("SOURCE_DATE_EPOCH must be a valid integer Unix timestamp") from error
    return value.replace(microsecond=0).isoformat().replace("+00:00", "Z")


def write_json(path: Path, value: dict[str, Any]) -> None:
    path.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")


def transaction_path(target: Path, purpose: str) -> Path:
    return target.parent / f".{target.name}.{purpose}-{os.getpid()}-{uuid.uuid4().hex}"


def remove_transaction_file(path: Path) -> None:
    try:
        path.unlink()
    except FileNotFoundError:
        pass


def activate_release_pair(
    prepared_archive: Path,
    archive_path: Path,
    prepared_manifest: Path,
    manifest_path: Path,
) -> None:
    outputs = [
        {
            "label": "archive",
            "prepared": prepared_archive,
            "target": archive_path,
            "backup": transaction_path(archive_path, "rollback-archive"),
            "backed_up": False,
            "activated": False,
        },
        {
            "label": "manifest",
            "prepared": prepared_manifest,
            "target": manifest_path,
            "backup": transaction_path(manifest_path, "rollback-manifest"),
            "backed_up": False,
            "activated": False,
        },
    ]

    try:
        for output in outputs:
            target = output["target"]
            backup = output["backup"]
            if target.exists():
                os.replace(target, backup)
                output["backed_up"] = True

        for output in outputs:
            os.replace(output["prepared"], output["target"])
            output["activated"] = True
    except OSError as activation_error:
        rollback_errors: list[str] = []
        for output in reversed(outputs):
            target = output["target"]
            backup = output["backup"]
            try:
                if output["activated"]:
                    remove_transaction_file(target)
                if output["backed_up"]:
                    os.replace(backup, target)
            except OSError as rollback_error:
                rollback_errors.append(f"{output['label']}: {rollback_error}")

        cleanup_errors: list[str] = []
        for output in outputs:
            try:
                remove_transaction_file(output["prepared"])
            except OSError as cleanup_error:
                cleanup_errors.append(f"{output['prepared']}: {cleanup_error}")

        if rollback_errors:
            detail = "; ".join(rollback_errors)
            recovery_paths = ", ".join(
                str(output["backup"])
                for output in outputs
                if output["backup"].exists()
            )
            recovery_detail = f"; recovery backups: {recovery_paths}" if recovery_paths else ""
            raise ReleaseError(
                "release activation failed and rollback was incomplete; "
                f"activation error: {activation_error}; rollback errors: {detail}{recovery_detail}"
            ) from activation_error

        reason = f"release activation failed; previous release outputs restored: {activation_error}"
        if cleanup_errors:
            reason += "; transaction cleanup errors: " + "; ".join(cleanup_errors)
        raise ReleaseError(reason) from activation_error

    cleanup_errors = []
    for output in outputs:
        for path in (output["prepared"], output["backup"]):
            try:
                remove_transaction_file(path)
            except OSError as cleanup_error:
                cleanup_errors.append(f"{path}: {cleanup_error}")
    if cleanup_errors:
        raise ReleaseError(
            "release activated, but transaction cleanup failed: " + "; ".join(cleanup_errors)
        )


def publish_release(skill_root: Path, archive_path: Path, manifest_path: Path) -> dict[str, Any]:
    run_package_hygiene(skill_root)
    manifest = read_manifest(manifest_path)
    version = read_version(skill_root)

    archive_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    staged_archive = transaction_path(archive_path, "prepared-archive")
    staged_manifest = transaction_path(manifest_path, "prepared-manifest")
    try:
        write_deterministic_archive(skill_root, staged_archive)

        manifest.update(
            {
                "version": version,
                "published_at": published_at(),
                "archive_sha256": self_update.sha256_file(staged_archive),
                "content_hash": self_update.content_hash(skill_root),
            }
        )
        try:
            self_update.validate_manifest(manifest)
        except self_update.UpdateError as error:
            raise ReleaseError(str(error)) from error
        write_json(staged_manifest, manifest)

        activate_release_pair(
            staged_archive,
            archive_path,
            staged_manifest,
            manifest_path,
        )
    finally:
        remove_transaction_file(staged_archive)
        remove_transaction_file(staged_manifest)

    return manifest


def valid_published_at(value: object) -> bool:
    if not isinstance(value, str) or not value.endswith("Z"):
        return False
    try:
        dt.datetime.fromisoformat(value[:-1] + "+00:00")
    except ValueError:
        return False
    return True


def check_release(skill_root: Path, archive_path: Path, manifest_path: Path) -> list[str]:
    run_package_hygiene(skill_root)
    manifest = read_manifest(manifest_path)
    problems: list[str] = []

    if not archive_path.is_file():
        return [f"archive does not exist: {archive_path}"]

    try:
        self_update.validate_manifest(manifest)
    except self_update.UpdateError as error:
        problems.append(str(error))

    with tempfile.TemporaryDirectory(prefix="livestacks-orchestrator-release-check-") as temp_dir:
        expected_archive = Path(temp_dir) / archive_path.name
        write_deterministic_archive(skill_root, expected_archive)
        if archive_path.read_bytes() != expected_archive.read_bytes():
            problems.append("archive does not exactly match the deterministic build from source")

    expected = {
        "version": read_version(skill_root),
        "archive_sha256": self_update.sha256_file(archive_path),
        "content_hash": self_update.content_hash(skill_root),
    }
    for key, value in expected.items():
        if manifest.get(key) != value:
            problems.append(f"manifest {key} does not match the release source/archive")
    if not valid_published_at(manifest.get("published_at")):
        problems.append("manifest published_at must be an ISO-8601 UTC timestamp ending in Z")
    return problems


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skill-root",
        default=str(Path(__file__).resolve().parents[1]),
        help="Source skill root. Defaults to this script's parent skill.",
    )
    parser.add_argument("--archive", required=True, help="Release ZIP path, outside the skill root.")
    parser.add_argument("--manifest", required=True, help="Release manifest path, outside the skill root.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--publish", action="store_true", help="Build the ZIP and update release manifest fields.")
    mode.add_argument("--check", action="store_true", help="Verify the ZIP and manifest without modifying either.")
    args = parser.parse_args()

    skill_root = Path(args.skill_root).expanduser().resolve()
    archive_path = Path(args.archive).expanduser().resolve()
    manifest_path = Path(args.manifest).expanduser().resolve()
    try:
        validate_output_paths(skill_root, archive_path, manifest_path)
        if args.publish:
            manifest = publish_release(skill_root, archive_path, manifest_path)
            print(
                f"Published {manifest['version']} to {archive_path} "
                f"(sha256 {manifest['archive_sha256']})."
            )
            return 0

        problems = check_release(skill_root, archive_path, manifest_path)
        if problems:
            for problem in problems:
                print(f"release check failed: {problem}", file=sys.stderr)
            return 1
        print("Release archive and manifest match the deterministic source build.")
        return 0
    except (OSError, ReleaseError, zipfile.BadZipFile) as error:
        print(f"release error: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
