#!/usr/bin/env python3
"""Scaffold the required LiveStack guide via livestack-guide-builder."""

from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path


def copy_tree(source: Path, dest: Path, force: bool) -> None:
    if dest.exists():
        if not force:
            raise SystemExit(f"Destination exists: {dest}. Use --force to replace it.")
        shutil.rmtree(dest)
    shutil.copytree(source, dest, ignore=shutil.ignore_patterns(".DS_Store", "__pycache__"))


def try_install_bundled_helper(ensure_script: Path, skills_root: Path) -> bool:
    if not ensure_script.exists():
        return False
    try:
        subprocess.run(
            [sys.executable, str(ensure_script), "--dest-root", str(skills_root)],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
    except (OSError, subprocess.CalledProcessError):
        return False
    return True


def append_option(cmd: list[str], flag: str, value: str | None) -> None:
    if value:
        cmd.extend([flag, value])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution_root", help="Path to the LiveStacks solution root that should contain guide/.")
    parser.add_argument(
        "--guide-slug",
        default="guide",
        help="Folder name to create under the solution root. Defaults to `guide`.",
    )
    parser.add_argument("--sample", help="Optional guide sample path to copy directly.")
    parser.add_argument("--workshop-title", help="Guide workshop title.")
    parser.add_argument("--scene", action="append", help="Scene label to seed. Repeat for each scene.")
    parser.add_argument("--archive-name", help="Portable archive name for the download lab.")
    parser.add_argument("--extracted-dir", help="Extracted folder name for the download lab.")
    parser.add_argument("--app-url", help="Local application URL for the download lab.")
    parser.add_argument("--health-url", help="Local health-check URL for the download lab.")
    parser.add_argument("--author", help="Author label for Credits & Build Notes.")
    parser.add_argument("--updated", help="Updated date label for Credits & Build Notes.")
    parser.add_argument("--force", action="store_true", help="Replace an existing guide folder if present.")
    args = parser.parse_args()

    solution_root = Path(args.solution_root).expanduser().resolve()
    if not solution_root.exists():
        raise SystemExit(f"Solution root does not exist: {solution_root}")

    destination = solution_root / args.guide_slug
    skills_root = Path(__file__).resolve().parents[2]
    helper = skills_root / "livestack-guide-builder" / "scripts" / "scaffold_livestack_guide.py"
    ensure_script = Path(__file__).resolve().parent / "ensure_livestack_guide_builder.py"

    if args.sample:
        sample_root = Path(args.sample).expanduser().resolve()
        if not sample_root.exists():
            raise SystemExit(f"Sample guide path does not exist: {sample_root}")
        copy_tree(sample_root, destination, args.force)
        print(destination)
        return 0

    if not helper.exists():
        try_install_bundled_helper(ensure_script, skills_root)

    if not helper.exists():
        raise SystemExit(
            "Could not find or install livestack-guide-builder. "
            f"Missing helper: {helper}; ensure script: {ensure_script}"
        )

    cmd = [
        sys.executable,
        str(helper),
        str(solution_root),
        "--guide-slug",
        args.guide_slug,
    ]
    append_option(cmd, "--workshop-title", args.workshop_title)
    append_option(cmd, "--archive-name", args.archive_name)
    append_option(cmd, "--extracted-dir", args.extracted_dir)
    append_option(cmd, "--app-url", args.app_url)
    append_option(cmd, "--health-url", args.health_url)
    append_option(cmd, "--author", args.author)
    append_option(cmd, "--updated", args.updated)
    for scene in args.scene or []:
        cmd.extend(["--scene", scene])
    if args.force:
        cmd.append("--force")

    subprocess.run(cmd, check=True)
    print(destination)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
