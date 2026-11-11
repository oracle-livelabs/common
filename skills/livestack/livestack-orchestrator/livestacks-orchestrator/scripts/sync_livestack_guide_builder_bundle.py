#!/usr/bin/env python3
"""Refresh the bundled livestack-guide-builder snapshot from the installed live skill."""

from __future__ import annotations

import argparse
import re
import shutil
import tempfile
from pathlib import Path


SKILL_NAME = "livestack-guide-builder"
LIVE_SKILL_FILE = "SKILL.md"
BUNDLED_SKILL_FILE = "BUNDLED_SKILL.md"
IGNORE_PATTERNS = ("__pycache__", ".DS_Store", ".git", ".pytest_cache", "*.pyc", "._*", "__MACOSX")


def parse_skill_name(skill_file: Path) -> str | None:
    text = skill_file.read_text(encoding="utf-8", errors="ignore")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        return None
    frontmatter = match.group(1)
    name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
    if not name_match:
        return None
    return name_match.group(1).strip().strip("'\"")


def find_live_skill(skills_root: Path) -> Path:
    top_level = skills_root / LIVE_SKILL_FILE
    if top_level.exists() and parse_skill_name(top_level) == SKILL_NAME:
        return skills_root

    direct_child = skills_root / SKILL_NAME
    direct_child_skill = direct_child / LIVE_SKILL_FILE
    if direct_child_skill.exists() and parse_skill_name(direct_child_skill) == SKILL_NAME:
        return direct_child

    if skills_root.exists():
        for subdir in sorted(skills_root.iterdir()):
            if not subdir.is_dir() or subdir.name.startswith("."):
                continue
            skill_file = subdir / LIVE_SKILL_FILE
            if skill_file.exists() and parse_skill_name(skill_file) == SKILL_NAME:
                return subdir

    raise SystemExit(f"Could not find a live {SKILL_NAME} install under {skills_root}")


def bundled_root() -> Path:
    return Path(__file__).resolve().parents[1] / "assets" / "bundled" / SKILL_NAME


def materialize_bundled_metadata(destination: Path) -> None:
    live_skill = destination / LIVE_SKILL_FILE
    bundled_skill = destination / BUNDLED_SKILL_FILE
    if not live_skill.exists():
        raise SystemExit(f"Copied {SKILL_NAME} snapshot is missing {LIVE_SKILL_FILE}: {destination}")
    if parse_skill_name(live_skill) != SKILL_NAME:
        raise SystemExit(f"Copied {LIVE_SKILL_FILE} does not describe {SKILL_NAME}: {live_skill}")
    if bundled_skill.exists():
        bundled_skill.unlink()
    live_skill.rename(bundled_skill)


def sync_bundle(source_root: Path, destination_root: Path) -> None:
    if not (source_root / LIVE_SKILL_FILE).exists():
        raise SystemExit(f"Live {SKILL_NAME} is missing {LIVE_SKILL_FILE}: {source_root}")
    if parse_skill_name(source_root / LIVE_SKILL_FILE) != SKILL_NAME:
        raise SystemExit(f"Source {LIVE_SKILL_FILE} does not describe {SKILL_NAME}: {source_root}")

    source_resolved = source_root.resolve()
    destination_resolved = destination_root.resolve()
    if source_resolved == destination_resolved:
        raise SystemExit("Source and bundled destination are the same directory; refusing to sync in place.")

    destination_root.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix=f"{SKILL_NAME}-bundle-") as temp_dir:
        staged = Path(temp_dir) / SKILL_NAME
        shutil.copytree(source_root, staged, ignore=shutil.ignore_patterns(*IGNORE_PATTERNS))
        materialize_bundled_metadata(staged)
        if destination_root.exists():
            shutil.rmtree(destination_root)
        shutil.copytree(staged, destination_root, ignore=shutil.ignore_patterns(*IGNORE_PATTERNS))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skills-root",
        default=str(Path.home() / ".codex" / "skills"),
        help=f"Skills root containing the live {SKILL_NAME} install. Defaults to ~/.codex/skills.",
    )
    parser.add_argument(
        "--source",
        help=f"Explicit live {SKILL_NAME} directory to sync from. Overrides --skills-root discovery.",
    )
    args = parser.parse_args()

    source_root = Path(args.source).expanduser() if args.source else find_live_skill(Path(args.skills_root).expanduser())
    destination_root = bundled_root()
    sync_bundle(source_root, destination_root)

    print(f"Synced bundled {SKILL_NAME} snapshot from {source_root} to {destination_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
