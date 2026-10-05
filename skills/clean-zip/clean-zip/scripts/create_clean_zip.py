#!/usr/bin/env python3
"""Create a clean ZIP archive without common OS, VCS, or generated metadata."""

from __future__ import annotations

import argparse
import fnmatch
import os
from pathlib import Path
import stat
import sys
import zipfile


DEFAULT_EXACT_NAMES = {
    ".appledouble",
    ".documentrevisions-v100",
    ".fseventsd",
    ".lsoverride",
    ".spotlight-v100",
    ".temporaryitems",
    ".trashes",
    ".com.apple.timemachine.donotpresent",
    "desktop.ini",
    "thumbs.db",
}
DEFAULT_DIRECTORY_NAMES = {
    ".eggs",
    ".git",
    ".hg",
    ".idea",
    ".mypy_cache",
    ".nox",
    ".pytest_cache",
    ".ruff_cache",
    ".svn",
    ".tox",
    ".vscode",
    "__macosx",
    "__pycache__",
}
DEFAULT_SUFFIXES = (".pyc", ".pyo")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a clean ZIP while omitting common OS, VCS, editor, and generated metadata."
    )
    parser.add_argument("source", type=Path, help="Source file or directory to archive")
    parser.add_argument("output", type=Path, help="Destination .zip path")
    parser.add_argument(
        "--contents-only",
        action="store_true",
        help="For a directory source, omit its top-level directory from archive paths",
    )
    parser.add_argument(
        "--root-name",
        help="Override the top-level archive directory name (ignored with --contents-only)",
    )
    parser.add_argument(
        "--exclude",
        action="append",
        default=[],
        metavar="PATTERN",
        help="Additional case-insensitive glob matched against relative paths or basenames; repeatable",
    )
    parser.add_argument(
        "--no-default-excludes",
        action="store_true",
        help="Disable built-in metadata and generated-file exclusions",
    )
    return parser.parse_args()


def is_default_excluded(relative_path: str, *, is_dir: bool) -> bool:
    """Return whether a normalized relative source path is disposable metadata."""
    parts = [part.casefold() for part in Path(relative_path).parts]
    basename = parts[-1] if parts else ""

    if basename == ".ds_store" or basename.startswith("._"):
        return True
    if basename in DEFAULT_EXACT_NAMES:
        return True
    if any(part in DEFAULT_DIRECTORY_NAMES for part in parts):
        return True
    if not is_dir and (basename.endswith(DEFAULT_SUFFIXES) or basename.endswith((".swp", ".swo", "~"))):
        return True
    return False


def matches_custom_exclude(relative_path: str, patterns: list[str]) -> bool:
    normalized = relative_path.replace(os.sep, "/")
    basename = Path(relative_path).name
    return any(
        fnmatch.fnmatchcase(normalized.casefold(), pattern.casefold())
        or fnmatch.fnmatchcase(basename.casefold(), pattern.casefold())
        for pattern in patterns
    )


def should_exclude(relative_path: str, *, is_dir: bool, args: argparse.Namespace) -> bool:
    if matches_custom_exclude(relative_path, args.exclude):
        return True
    return not args.no_default_excludes and is_default_excluded(relative_path, is_dir=is_dir)


def archive_name(relative_path: Path, args: argparse.Namespace, source: Path) -> str:
    if args.contents_only or not source.is_dir():
        name = relative_path
    else:
        root = args.root_name or source.name
        name = Path(root) / relative_path
    return name.as_posix().lstrip("/")


def collect_paths(source: Path, output: Path, args: argparse.Namespace) -> tuple[list[tuple[Path, str, bool]], list[str]]:
    """Collect regular files and directories in stable order."""
    entries: list[tuple[Path, str, bool]] = []
    skipped: list[str] = []
    output_resolved = output.resolve()

    if source.is_file():
        relative = Path(source.name)
        if should_exclude(relative.as_posix(), is_dir=False, args=args):
            return [], [source.as_posix()]
        return [(source, archive_name(relative, args, source), False)], []

    if not source.is_dir():
        raise ValueError(f"Source does not exist or is not a regular file/directory: {source}")

    for current, dirnames, filenames in os.walk(source, topdown=True, followlinks=False):
        current_path = Path(current)
        dirnames.sort(key=str.casefold)
        filenames.sort(key=str.casefold)

        kept_dirs: list[str] = []
        for dirname in dirnames:
            path = current_path / dirname
            relative = path.relative_to(source)
            relative_text = relative.as_posix()
            if path.is_symlink():
                skipped.append(f"symlink directory: {relative_text}")
            elif should_exclude(relative_text, is_dir=True, args=args):
                skipped.append(f"excluded directory: {relative_text}")
            else:
                kept_dirs.append(dirname)
                entries.append((path, archive_name(relative, args, source) + "/", True))
        dirnames[:] = kept_dirs

        for filename in filenames:
            path = current_path / filename
            relative = path.relative_to(source)
            relative_text = relative.as_posix()
            if path.resolve() == output_resolved:
                skipped.append(f"output path: {relative_text}")
            elif path.is_symlink():
                skipped.append(f"symlink file: {relative_text}")
            elif should_exclude(relative_text, is_dir=False, args=args):
                skipped.append(f"excluded file: {relative_text}")
            else:
                entries.append((path, archive_name(relative, args, source), False))

    entries.sort(key=lambda item: item[1].casefold())
    return entries, skipped


def write_zip(entries: list[tuple[Path, str, bool]], output: Path) -> None:
    output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(
        output,
        mode="w",
        compression=zipfile.ZIP_DEFLATED,
        compresslevel=9,
        allowZip64=True,
    ) as archive:
        for path, name, is_dir in entries:
            if is_dir:
                info = zipfile.ZipInfo(name)
                info.create_system = 3
                info.external_attr = (stat.S_IFDIR | 0o755) << 16
                archive.writestr(info, b"")
            else:
                archive.write(path, arcname=name)


def validate_zip(output: Path, args: argparse.Namespace) -> int:
    with zipfile.ZipFile(output) as archive:
        bad_member = archive.testzip()
        if bad_member is not None:
            raise ValueError(f"ZIP integrity check failed at entry: {bad_member}")
        names = archive.namelist()
        if not args.no_default_excludes:
            dirty = [
                name
                for name in names
                if is_default_excluded(name.rstrip("/"), is_dir=name.endswith("/"))
            ]
            if dirty:
                raise ValueError("ZIP contains excluded metadata: " + ", ".join(dirty[:5]))
        return len(names)


def main() -> int:
    args = parse_args()
    source = args.source.expanduser().resolve()
    output = args.output.expanduser().resolve()

    if output == source:
        raise ValueError("Output ZIP cannot be the source path")
    if output.suffix.casefold() != ".zip":
        raise ValueError("Output path must have a .zip extension")
    if args.root_name and ("/" in args.root_name or "\\" in args.root_name or args.root_name in {".", ".."}):
        raise ValueError("--root-name must be a single safe directory name")

    entries, skipped = collect_paths(source, output, args)
    write_zip(entries, output)
    member_count = validate_zip(output, args)

    print(f"Created {output}")
    print(f"Archived {member_count} entries ({sum(not is_dir for _, _, is_dir in entries)} files)")
    if skipped:
        print(f"Skipped {len(skipped)} paths:")
        for item in skipped:
            print(f"  - {item}")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (OSError, ValueError, zipfile.BadZipFile) as exc:
        print(f"clean-zip: error: {exc}", file=sys.stderr)
        raise SystemExit(2)
