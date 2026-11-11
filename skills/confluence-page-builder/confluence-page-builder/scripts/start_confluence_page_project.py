#!/usr/bin/env python3
"""Create a versioned Confluence page builder workspace on the user's Desktop."""

from __future__ import annotations

import argparse
import datetime as dt
import re
from pathlib import Path


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    return value.strip("-") or "confluence-page-project"


def desktop_root() -> Path:
    home = Path.home()
    desktop = home / "Desktop"
    return desktop if desktop.exists() else home


def unique_project_path(base: Path, slug: str, reuse: bool) -> Path:
    candidate = base / slug
    if reuse or not candidate.exists():
        return candidate
    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    return base / f"{slug}-{stamp}"


def write_if_missing(path: Path, text: str, overwrite: bool = False) -> None:
    if overwrite or not path.exists():
        path.write_text(text, encoding="utf-8")


def user_guide(title: str, slug: str) -> str:
    return f"""# Confluence Page Builder Usage Guide

## Project

- Title: {title}
- Slug: {slug}

## How To Use This Workspace

1. Put source notes, screenshots, exports, or examples in `resources/`.
2. Review the latest page under `versions/vN/`.
3. Read `versions/vN/TASK_REPORT.md` after each iteration.
4. Use the proposed questions in the task report to decide whether to accept, stop, or create another version.
5. Keep reusable observations in `lessons-learned/LESSONS.md`.

## How To Improve Your Prompt

Include:

- page purpose
- audience
- source material or links
- sections that must stay visible
- sections that can be collapsible
- required tables, tabs, expands, or status macros
- examples of pages you like or dislike
- what decision or action the reader should take after reading

## Recommended Follow-Up Prompt

```text
Use $confluence-page-builder to create the next version in this workspace.
Current workspace: <this folder>
What I liked:
What I want changed:
What should stay visible:
What should move into tabs or expands:
Missing data:
```

## Expected Version Contents

Each `versions/vN/` folder should contain:

- storage-format page code
- `TASK_REPORT.md`
- `VALIDATION_REPORT.md`
- optional source notes or comparison files
"""


def project_prompt(title: str, prompt: str) -> str:
    now = dt.datetime.now(dt.timezone.utc).replace(microsecond=0).isoformat()
    return f"""# Project Prompt

- Created: {now}
- Title: {title}

## Original Prompt

{prompt.strip() if prompt.strip() else "No prompt captured. Add the user request here."}
"""


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--title", required=True, help="Human-readable project title")
    parser.add_argument("--prompt", default="", help="Original user prompt or short project brief")
    parser.add_argument("--root", type=Path, default=None, help="Optional root directory for all projects")
    parser.add_argument("--slug", default="", help="Optional folder slug")
    parser.add_argument("--reuse", action="store_true", help="Reuse the target folder if it already exists")
    args = parser.parse_args()

    slug = slugify(args.slug or args.title)
    base = args.root or (desktop_root() / "Confluence Page Builder Projects")
    project = unique_project_path(base, slug, args.reuse)
    version = project / "versions" / "v1"

    for folder in (
        version,
        project / "logs",
        project / "lessons-learned",
        project / "reports",
        project / "resources",
    ):
        folder.mkdir(parents=True, exist_ok=True)

    write_if_missing(project / "USER_GUIDE.md", user_guide(args.title, slug))
    write_if_missing(project / "PROJECT_PROMPT.md", project_prompt(args.title, args.prompt))
    write_if_missing(project / "lessons-learned" / "LESSONS.md", "# Lessons Learned\n\n")
    write_if_missing(project / "resources" / "README.md", "# Resources\n\nPut source material for the page here.\n")
    write_if_missing(version / "README.md", "# Version 1\n\nPlace the first storage-format page and reports here.\n")

    stamp = dt.datetime.now().strftime("%Y%m%d-%H%M%S")
    log = project / "logs" / f"{stamp}-workspace-created.md"
    write_if_missing(
        log,
        f"# Workspace Created\n\n- Project: {project}\n- Version directory: {version}\n- Usage guide: {project / 'USER_GUIDE.md'}\n",
        overwrite=True,
    )

    print(f"project_root={project}")
    print(f"current_version_dir={version}")
    print(f"usage_guide={project / 'USER_GUIDE.md'}")
    print(f"lessons={project / 'lessons-learned' / 'LESSONS.md'}")
    print(f"log={log}")


if __name__ == "__main__":
    main()
