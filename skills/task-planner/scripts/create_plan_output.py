#!/usr/bin/env python3
"""Create a lightweight task-planner artifact folder."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path


DEFAULT_ROOT = Path(os.environ.get("CODEX_TASK_PLANS_DIR", str(Path.cwd() / "Tasks" / "plans")))


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = re.sub(r"-{2,}", "-", value).strip("-")
    return value[:80] or "task-plan"


def write_if_missing(path: Path, content: str) -> None:
    if path.exists():
        return
    path.write_text(content, encoding="utf-8")


def unique_output_dir(root: Path, folder_name: str) -> Path:
    output_dir = root / folder_name
    if not output_dir.exists():
        return output_dir
    for index in range(2, 100):
        candidate = root / f"{folder_name}-{index:02d}"
        if not candidate.exists():
            return candidate
    raise RuntimeError(f"Unable to choose an unused output folder for {folder_name!r}")


def build_plan_template(title: str, plan_mode: str) -> str:
    return f"""# {title}

## Objective

TBD

## Planning Mode

{plan_mode}

## Output Mode

Artifact Mode

## Current Understanding

- TBD

## Recommended Approach

TBD

## Execution Plan

1. TBD

## Validation

- TBD

## Risks And Stop Points

- Risk: TBD
- Stop Point: TBD

## Immediate Next Action

TBD
"""


def build_qa_template(title: str) -> str:
    return f"""# Plan QA - {title}

## Plan QA

- Objective is specific and completion evidence is visible: TBD
- Steps are ordered so discovery happens before edits: TBD
- Assumptions, risks, and stop points are explicit: TBD
- Validation proves the implementation worked: TBD
- Immediate next action is clear: TBD

## Output QA

- Expected files, resources, behavior, reports, or user-visible outputs: TBD
- Checks Codex should run against those outputs after implementation: TBD

## Testing Technique Decider

- Applicable task type: TBD
- Selected techniques and rationale: TBD

## Post-Implementation Test Proposals

- TBD
"""


def build_resources_readme(title: str) -> str:
    return f"""# Planning Resources - {title}

Store generated planning support material here, such as source request notes, command matrices, acceptance criteria, test data notes, checklists, or small reference extracts.
"""


def build_request_notes(title: str, prompt_file: Path | None, notes: str) -> str:
    lines = [f"# Source Request - {title}", ""]
    if prompt_file:
        lines.append(f"Prompt file: `{prompt_file}`")
        lines.append("")
        lines.append("## Prompt")
        lines.append("")
        lines.append(prompt_file.read_text(encoding="utf-8", errors="replace").strip())
        lines.append("")
    if notes.strip():
        lines.append("## Notes")
        lines.append("")
        lines.append(notes.strip())
        lines.append("")
    return "\n".join(lines)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create a task-planner output folder.")
    parser.add_argument("--title", required=True, help="Human-readable task title.")
    parser.add_argument("--plan-mode", default="Standard Plan", help="Planning mode label.")
    parser.add_argument("--root", default=str(DEFAULT_ROOT), help="Root folder for plan outputs.")
    parser.add_argument("--slug", default="", help="Optional stable slug. Defaults to title slug.")
    parser.add_argument("--timestamp", default="", help="Optional timestamp prefix for deterministic tests. Defaults to current local time.")
    parser.add_argument("--with-resources", action="store_true", help="Create resources folder with README.")
    parser.add_argument("--prompt-file", default="", help="Optional source prompt file to copy into resources/REQUEST.md.")
    parser.add_argument("--notes", default="", help="Optional source request notes to write into resources/REQUEST.md.")
    parser.add_argument("--dry-run", action="store_true", help="Preview the output paths without creating files.")
    parser.add_argument("--json", action="store_true", help="Print machine-readable output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    root = Path(args.root)
    prompt_file = Path(args.prompt_file).expanduser().resolve() if args.prompt_file else None
    if prompt_file and not prompt_file.is_file():
        print(f"Error: --prompt-file not found: {prompt_file}", file=sys.stderr)
        return 1
    slug = slugify(args.slug or args.title)
    timestamp = args.timestamp.strip() or datetime.now().strftime("%Y%m%d-%H%M%S")
    output_dir = unique_output_dir(root, f"{timestamp}-{slug}")

    plan_path = output_dir / "PLAN.md"
    qa_path = output_dir / "PLAN_QA.md"
    resources_dir = output_dir / "resources"
    request_path = resources_dir / "REQUEST.md" if prompt_file or args.notes.strip() else None

    if not args.dry_run:
        output_dir.mkdir(parents=True, exist_ok=False)
        write_if_missing(plan_path, build_plan_template(args.title, args.plan_mode))
        write_if_missing(qa_path, build_qa_template(args.title))

        resources_readme = None
        if args.with_resources or request_path:
            resources_dir.mkdir(exist_ok=True)
            resources_readme = resources_dir / "README.md"
            write_if_missing(resources_readme, build_resources_readme(args.title))
        if request_path:
            write_if_missing(request_path, build_request_notes(args.title, prompt_file, args.notes))

    result = {
        "dry_run": args.dry_run,
        "output_dir": str(output_dir),
        "plan": str(plan_path),
        "qa": str(qa_path),
        "resources": str(resources_dir) if args.with_resources or request_path else "",
        "request": str(request_path) if request_path else "",
    }

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        action = "Would create" if args.dry_run else "Created"
        print(f"{action} plan output: {output_dir}")
        print(f"PLAN: {plan_path}")
        print(f"PLAN_QA: {qa_path}")
        if args.with_resources or request_path:
            print(f"resources: {resources_dir}")
        if request_path:
            print(f"request: {request_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
