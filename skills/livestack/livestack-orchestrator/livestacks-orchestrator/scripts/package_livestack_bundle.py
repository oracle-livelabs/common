#!/usr/bin/env python3
"""Create and verify a clean distributable ZIP for a completed LiveStack."""

from __future__ import annotations

import argparse
import hashlib
import os
from pathlib import Path
import subprocess
import sys
import zipfile


SKILL_ROOT = Path(__file__).resolve().parents[1]
CLEAN_ZIP_HELPER = SKILL_ROOT / "assets" / "bundled" / "clean-zip" / "scripts" / "create_clean_zip.py"
GENERATED_EXCLUDES = ("node_modules", ".npm", ".pnpm-store", "coverage", "ords-config", "*.log", "*.pid")
ALLOWED_ENV_FILE = ".env.example"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Completed LiveStack solution root or stack directory")
    parser.add_argument("output", type=Path, help="Destination .zip path")
    parser.add_argument("--root-name", help="Override the archive's single top-level directory name")
    parser.add_argument(
        "--contents-only",
        action="store_true",
        help="Archive source contents directly instead of retaining one top-level directory",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        metavar="PATTERN",
        help="Additional clean-zip exclusion; repeatable",
    )
    parser.add_argument(
        "--allow-env-files",
        action="store_true",
        help="Include local .env* files. Use only after explicitly confirming they contain no secrets.",
    )
    return parser.parse_args()


def ensure_livestack_source(source: Path) -> None:
    if not source.is_dir():
        raise ValueError(f"LiveStack source must be a directory: {source}")
    compose_candidates = (source / "stack" / "compose.yml", source / "compose.yml")
    if not any(path.is_file() for path in compose_candidates):
        raise ValueError(f"LiveStack source must contain stack/compose.yml or compose.yml: {source}")


def find_symlinks(source: Path) -> list[str]:
    return [path.relative_to(source).as_posix() for path in source.rglob("*") if path.is_symlink()]


def local_env_excludes(source: Path) -> list[str]:
    excluded: list[str] = []
    for path in source.rglob(".env*"):
        if path.is_file() and path.name != ALLOWED_ENV_FILE:
            excluded.append(path.relative_to(source).as_posix())
    return sorted(excluded, key=str.casefold)


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def run_clean_zip(args: argparse.Namespace, source: Path, output: Path) -> None:
    if not CLEAN_ZIP_HELPER.is_file():
        raise ValueError(f"Bundled clean-zip helper is missing: {CLEAN_ZIP_HELPER}")

    command = [sys.executable, str(CLEAN_ZIP_HELPER), str(source), str(output)]
    if args.contents_only:
        command.append("--contents-only")
    elif args.root_name:
        command.extend(("--root-name", args.root_name))

    excludes = list(GENERATED_EXCLUDES)
    excludes.extend(args.exclude)
    if not args.allow_env_files:
        excludes.extend(local_env_excludes(source))
    for pattern in excludes:
        command.extend(("--exclude", pattern))

    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    result = subprocess.run(command, text=True, capture_output=True, env=env, check=False)
    if result.stdout:
        print(result.stdout, end="")
    if result.stderr:
        print(result.stderr, end="", file=sys.stderr)
    if result.returncode != 0:
        raise ValueError(f"clean-zip helper failed with exit code {result.returncode}")


def verify_archive(args: argparse.Namespace, source: Path, output: Path) -> tuple[int, str]:
    if not output.is_file() or output.stat().st_size == 0:
        raise ValueError(f"Archive was not created or is empty: {output}")

    with zipfile.ZipFile(output) as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise ValueError(f"ZIP integrity check failed at entry: {bad_member}")
        names = archive.namelist()

    if not names:
        raise ValueError("Clean archive contains no entries")

    if not args.allow_env_files:
        leaked_env = [
            name
            for name in names
            if Path(name.rstrip("/")).name.startswith(".env")
            and Path(name.rstrip("/")).name != ALLOWED_ENV_FILE
        ]
        if leaked_env:
            raise ValueError("Clean archive contains local environment files: " + ", ".join(leaked_env[:5]))

    if args.contents_only:
        root = "<contents-only>"
    else:
        expected_root = args.root_name or source.name
        wrong_root = [name for name in names if name.split("/", 1)[0] != expected_root]
        if wrong_root:
            raise ValueError(
                f"Archive entries must share top-level root {expected_root!r}; first mismatch: {wrong_root[0]}"
            )
        root = expected_root

    return len(names), root


def main() -> int:
    args = parse_args()
    source = args.source.expanduser().resolve()
    output = args.output.expanduser().resolve()

    ensure_livestack_source(source)
    if output.suffix.casefold() != ".zip":
        raise ValueError("Output path must have a .zip extension")
    if args.root_name and ("/" in args.root_name or "\\" in args.root_name or args.root_name in {".", ".."}):
        raise ValueError("--root-name must be a single safe directory name")

    symlinks = find_symlinks(source)
    if symlinks:
        raise ValueError(
            "LiveStack contains symlinks that clean-zip would skip; resolve them before packaging: "
            + ", ".join(symlinks[:5])
        )

    run_clean_zip(args, source, output)
    member_count, root = verify_archive(args, source, output)
    print(f"Clean LiveStack archive verified: {member_count} entries; root={root}")
    print(f"SHA-256: {sha256_file(output)}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f"package-livestack: error: {exc}", file=sys.stderr)
        raise SystemExit(2)
