#!/usr/bin/env python3
"""Install the bundled oracle-db-skills snapshot into $CODEX_HOME/skills if missing."""

from __future__ import annotations

import argparse
import os
import re
import shutil
from pathlib import Path

BUNDLED_SKILL_FILE = "BUNDLED_SKILL.md"
LIVE_SKILL_FILE = "SKILL.md"
COPY_IGNORE_PATTERNS = ("__pycache__", ".DS_Store", ".git", ".pytest_cache", "*.pyc", "._*", "__MACOSX")


def skills_root() -> Path:
    codex_home = os.environ.get("CODEX_HOME")
    if codex_home:
        return Path(codex_home).expanduser() / "skills"
    return Path.home() / ".codex" / "skills"


def bundled_skill_root() -> Path:
    return Path(__file__).resolve().parents[1] / "assets" / "bundled" / "oracle-db-skills"


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


def find_existing_oracle_skill(root: Path) -> Path | None:
    if not root.exists():
        return None

    top_level = root / LIVE_SKILL_FILE
    if top_level.exists() and parse_skill_name(top_level) == "oracle-db-skills":
        return top_level.parent

    for child in sorted(root.iterdir()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        skill_file = child / LIVE_SKILL_FILE
        if skill_file.exists() and parse_skill_name(skill_file) == "oracle-db-skills":
            return child
    return None


def materialize_skill_metadata(destination: Path) -> None:
    bundled_skill = destination / BUNDLED_SKILL_FILE
    live_skill = destination / LIVE_SKILL_FILE
    if bundled_skill.exists():
        bundled_skill.rename(live_skill)
        return
    if live_skill.exists():
        return
    raise SystemExit(
        f"Bundled oracle-db-skills snapshot is missing {BUNDLED_SKILL_FILE} or {LIVE_SKILL_FILE}: {destination}"
    )


def install_bundled_skill(dest_root: Path, force: bool) -> Path:
    source = bundled_skill_root()
    if not source.exists():
        raise SystemExit(f"Bundled oracle-db-skills snapshot not found: {source}")

    destination = dest_root / "oracle-db-skills"
    if destination.exists():
        if not force:
            raise SystemExit(f"Destination already exists: {destination}")
        shutil.rmtree(destination)

    dest_root.mkdir(parents=True, exist_ok=True)
    shutil.copytree(source, destination, ignore=shutil.ignore_patterns(*COPY_IGNORE_PATTERNS))
    materialize_skill_metadata(destination)
    return destination


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dest-root",
        help="Skills root to install into. Defaults to $CODEX_HOME/skills or ~/.codex/skills.",
    )
    parser.add_argument(
        "--force",
        action="store_true",
        help="Replace an existing bundled-install destination named oracle-db-skills.",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="Only report whether oracle-db-skills is already available; do not install it.",
    )
    args = parser.parse_args()

    dest_root = Path(args.dest_root).expanduser() if args.dest_root else skills_root()
    existing = find_existing_oracle_skill(dest_root)
    if existing:
        print(existing)
        return 0

    if args.check:
        return 1

    installed = install_bundled_skill(dest_root, force=args.force)
    print(installed)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
