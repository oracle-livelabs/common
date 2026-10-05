#!/usr/bin/env python3
"""Create task-planner artifact folders, including durable PlanOps projects."""

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


def next_version_label(project_dir: Path) -> str:
    versions_dir = project_dir / "versions"
    if not versions_dir.exists():
        return "v1"
    highest = 0
    for child in versions_dir.iterdir():
        if child.is_dir():
            match = re.fullmatch(r"v(\d+)", child.name.strip().lower())
            if match:
                highest = max(highest, int(match.group(1)))
    return f"v{highest + 1}"


def now_iso() -> str:
    return datetime.now().astimezone().replace(microsecond=0).isoformat()


def build_plan_template(title: str, plan_mode: str, output_mode: str = "Artifact Mode") -> str:
    return f"""# {title}

## Objective

TBD

## Planning Mode

{plan_mode}

## Output Mode

{output_mode}

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


def build_project_yaml(title: str, slug: str, plan_mode: str, created: str) -> str:
    return f"""schema_version: "1"
title: "{title}"
slug: "{slug}"
planning_mode: "{plan_mode}"
created_at: "{created}"
updated_at: "{created}"
"""


def build_status_yaml(title: str, version_label: str, plan_mode: str, created: str) -> str:
    return f"""schema_version: "1"
title: "{title}"
state: "draft"
current_version: "{version_label}"
planning_mode: "{plan_mode}"
created_at: "{created}"
updated_at: "{created}"
completion_evidence:
  - "TBD"
open_questions_count: 0
blockers: []
"""


def build_progress_log(title: str, version_label: str, created: str) -> str:
    return f"""# Progress Log - {title}

## {created}

- Created PlanOps project.
- Current version: {version_label}.
- State: draft.
"""


def build_execution_brief(title: str, version_label: str) -> str:
    return f"""# Execution Brief - {title} ({version_label})

## Purpose

Summarize what a future Codex execution run should do after the plan is approved.

## Start Here

- Approved plan version: {version_label}
- Primary plan file: `PLAN.md`
- Validation file: `VALIDATION_MATRIX.md`

## Execution Inputs

- Source material: TBD
- Target project paths: TBD
- Required approvals: TBD

## First Execution Actions

1. Re-read `PLAN.md`, `VALIDATION_MATRIX.md`, and `RISKS_AND_STOP_POINTS.md`.
2. Confirm no stop point is unresolved.
3. Inspect only the files and systems listed in the approved plan.
4. Implement in the planned order.
5. Update validation evidence before final reporting.

## Do Not Do

- Do not execute blocked, destructive, publishing, credential, billing, or external-system actions without user approval.
- Do not broaden scope beyond the approved plan without recording a decision.
"""


def build_validation_matrix(title: str) -> str:
    return f"""# Validation Matrix - {title}

| Requirement | Evidence Needed | Command Or Check | Owner | Status |
| --- | --- | --- | --- | --- |
| Objective is correctly scoped | Approved objective in `PLAN.md` | Review objective against source request | Codex | TBD |
| Plan can be executed safely | Stop points and blockers are explicit | Review `RISKS_AND_STOP_POINTS.md` | Codex | TBD |
| Expected outputs are clear | Output list and acceptance criteria exist | Review `PLAN.md` and `PLAN_QA.md` | Codex | TBD |
| Implementation can be verified | Tests or inspection steps are concrete | Run listed checks after execution | Codex | TBD |
"""


def build_risks_and_stop_points(title: str) -> str:
    return f"""# Risks And Stop Points - {title}

## Risks

| Risk | Impact | Mitigation | Status |
| --- | --- | --- | --- |
| TBD | TBD | TBD | Open |

## Stop Points

| Stop Point | Why It Matters | Resume Condition | Status |
| --- | --- | --- | --- |
| TBD | TBD | TBD | Open |
"""


def build_questions(title: str) -> str:
    return f"""# Review Questions - {title}

Use these questions after reviewing the current plan version. Answering them should produce the next version, not restart planning from scratch.

1. Which assumption is most likely wrong or incomplete?
2. Which output must be visible as proof that the task is done?
3. Which step should require explicit user approval before execution?
4. Which validation check would make you trust the result?
5. What should be removed because it adds process without reducing risk?
"""


def build_decisions(title: str) -> str:
    return f"""# Decisions - {title}

| Date | Decision | Reason | Impact | Owner |
| --- | --- | --- | --- | --- |
| TBD | TBD | TBD | TBD | TBD |
"""


def build_planops_plan(title: str, version_label: str, plan_mode: str) -> str:
    return f"""# {title} - {version_label}

## Objective

TBD

## Planning Mode

{plan_mode}

## Output Mode

PlanOps Mode

## Current Understanding

- TBD

## Assumptions

- Assumption: TBD

## Recommended Approach

TBD

## Execution Plan

1. TBD

## Acceptance Criteria

- TBD

## Validation

- See `VALIDATION_MATRIX.md`.

## Risks And Stop Points

- See `RISKS_AND_STOP_POINTS.md`.

## Questions For Next Version

- See `QUESTIONS.md`.

## Immediate Next Action

TBD
"""


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Create task-planner output folders.")
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
    parser.add_argument("--planops", action="store_true", help="Create a durable PlanOps project with status, versions, execution brief, validation matrix, decisions, logs, and questions.")
    parser.add_argument("--project-root", default="", help="Existing or desired PlanOps project root. When omitted, a new project is created under --root.")
    parser.add_argument("--reuse-project", action="store_true", help="Allow writing a new version into an existing --project-root.")
    parser.add_argument("--version", default="", help="PlanOps version label. Defaults to the next vN folder.")
    return parser.parse_args()


def resolve_prompt_file(value: str) -> Path | None:
    prompt_file = Path(value).expanduser().resolve() if value else None
    if prompt_file and not prompt_file.is_file():
        print(f"Error: --prompt-file not found: {prompt_file}", file=sys.stderr)
        raise SystemExit(1)
    return prompt_file


def create_artifact_output(args: argparse.Namespace, prompt_file: Path | None) -> dict[str, str | bool]:
    root = Path(args.root)
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

        if args.with_resources or request_path:
            resources_dir.mkdir(exist_ok=True)
            write_if_missing(resources_dir / "README.md", build_resources_readme(args.title))
        if request_path:
            write_if_missing(request_path, build_request_notes(args.title, prompt_file, args.notes))

    return {
        "mode": "artifact",
        "dry_run": args.dry_run,
        "output_dir": str(output_dir),
        "plan": str(plan_path),
        "qa": str(qa_path),
        "resources": str(resources_dir) if args.with_resources or request_path else "",
        "request": str(request_path) if request_path else "",
    }


def create_planops_output(args: argparse.Namespace, prompt_file: Path | None) -> dict[str, str | bool]:
    root = Path(args.root)
    slug = slugify(args.slug or args.title)
    timestamp = args.timestamp.strip() or datetime.now().strftime("%Y%m%d-%H%M%S")
    created = now_iso()

    if args.project_root:
        project_dir = Path(args.project_root)
        if project_dir.exists() and not args.reuse_project and not args.version:
            version_label = next_version_label(project_dir)
        else:
            version_label = args.version.strip() or next_version_label(project_dir)
    else:
        project_dir = unique_output_dir(root, f"{timestamp}-{slug}")
        version_label = args.version.strip() or "v1"

    version_label = version_label.strip() or "v1"
    version_dir = project_dir / "versions" / version_label
    resources_dir = project_dir / "resources"
    logs_dir = project_dir / "logs"
    decisions_path = project_dir / "DECISIONS.md"
    project_yaml = project_dir / "project.yaml"
    status_yaml = project_dir / "status.yaml"
    progress_log = logs_dir / "progress.md"
    request_path = resources_dir / "REQUEST.md" if prompt_file or args.notes.strip() else None

    plan_path = version_dir / "PLAN.md"
    qa_path = version_dir / "PLAN_QA.md"
    execution_brief = version_dir / "EXECUTION_BRIEF.md"
    validation_matrix = version_dir / "VALIDATION_MATRIX.md"
    risks = version_dir / "RISKS_AND_STOP_POINTS.md"
    questions = version_dir / "QUESTIONS.md"

    if version_dir.exists() and not args.dry_run:
        print(f"Error: PlanOps version already exists: {version_dir}", file=sys.stderr)
        return {"mode": "planops", "dry_run": args.dry_run, "error": f"version exists: {version_dir}"}

    if not args.dry_run:
        version_dir.mkdir(parents=True, exist_ok=False)
        resources_dir.mkdir(parents=True, exist_ok=True)
        logs_dir.mkdir(parents=True, exist_ok=True)

        write_if_missing(project_yaml, build_project_yaml(args.title, slug, args.plan_mode, created))
        write_if_missing(status_yaml, build_status_yaml(args.title, version_label, args.plan_mode, created))
        write_if_missing(progress_log, build_progress_log(args.title, version_label, created))
        write_if_missing(decisions_path, build_decisions(args.title))
        write_if_missing(resources_dir / "README.md", build_resources_readme(args.title))
        if request_path:
            write_if_missing(request_path, build_request_notes(args.title, prompt_file, args.notes))

        write_if_missing(plan_path, build_planops_plan(args.title, version_label, args.plan_mode))
        write_if_missing(qa_path, build_qa_template(args.title))
        write_if_missing(execution_brief, build_execution_brief(args.title, version_label))
        write_if_missing(validation_matrix, build_validation_matrix(args.title))
        write_if_missing(risks, build_risks_and_stop_points(args.title))
        write_if_missing(questions, build_questions(args.title))

    return {
        "mode": "planops",
        "dry_run": args.dry_run,
        "project_root": str(project_dir),
        "version": version_label,
        "version_dir": str(version_dir),
        "status": str(status_yaml),
        "project": str(project_yaml),
        "plan": str(plan_path),
        "qa": str(qa_path),
        "execution_brief": str(execution_brief),
        "validation_matrix": str(validation_matrix),
        "risks": str(risks),
        "questions": str(questions),
        "decisions": str(decisions_path),
        "progress_log": str(progress_log),
        "resources": str(resources_dir),
        "request": str(request_path) if request_path else "",
    }


def print_result(result: dict[str, str | bool]) -> None:
    if result.get("mode") == "planops":
        action = "Would create" if result["dry_run"] else "Created"
        print(f"{action} PlanOps project: {result.get('project_root', '')}")
        print(f"version: {result.get('version', '')}")
        print(f"version_dir: {result.get('version_dir', '')}")
        print(f"status: {result.get('status', '')}")
        print(f"PLAN: {result.get('plan', '')}")
        print(f"PLAN_QA: {result.get('qa', '')}")
        print(f"EXECUTION_BRIEF: {result.get('execution_brief', '')}")
        print(f"VALIDATION_MATRIX: {result.get('validation_matrix', '')}")
        print(f"QUESTIONS: {result.get('questions', '')}")
        print(f"resources: {result.get('resources', '')}")
        return

    action = "Would create" if result["dry_run"] else "Created"
    print(f"{action} plan output: {result['output_dir']}")
    print(f"PLAN: {result['plan']}")
    print(f"PLAN_QA: {result['qa']}")
    if result.get("resources"):
        print(f"resources: {result['resources']}")
    if result.get("request"):
        print(f"request: {result['request']}")


def main() -> int:
    args = parse_args()
    prompt_file = resolve_prompt_file(args.prompt_file)

    result = create_planops_output(args, prompt_file) if args.planops else create_artifact_output(args, prompt_file)
    if "error" in result:
        return 1

    if args.json:
        print(json.dumps(result, indent=2))
    else:
        print_result(result)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
