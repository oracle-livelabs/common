#!/usr/bin/env python3
"""Validate LiveLabs Sprint folders.

This validator is intentionally less strict than the workshop validator. It
checks the sprint-specific publishing shape: manifest, index page, referenced
Markdown, image references, and a small set of sprint content conventions.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterable

MAX_SPRINT_MINUTES = 15
SKIP_DIRS = {".git", ".github", "node_modules", "dist", "build"}
LOCAL_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".svg", ".webp"}
LOCAL_LINK_PREFIXES = ("http://", "https://", "mailto:", "data:", "youtube:", "videohub:")

H1_RE = re.compile(r"^#\s+(.+?)\s*$")
DURATION_RE = re.compile(r"^\s*(Duration|Estimated\s+Time):\s*(.+)$", re.IGNORECASE)
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)\s]+)(?:\s+['\"][^'\"]*['\"])?\)")
HTML_ANCHOR_RE = re.compile(r"<a\s+href=", re.IGNORECASE)
QUESTION_START_RE = re.compile(
    r"^(how|what|why|when|where|which|who|can|do|does|is|are|should|will)\b",
    re.IGNORECASE,
)


@dataclass
class Issue:
    path: Path
    message: str


@dataclass
class SprintReport:
    root: Path
    errors: list[Issue] = field(default_factory=list)
    warnings: list[Issue] = field(default_factory=list)

    def error(self, path: Path, message: str) -> None:
        self.errors.append(Issue(path, message))

    def warn(self, path: Path, message: str) -> None:
        self.warnings.append(Issue(path, message))


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Validate LiveLabs Sprint folders from paths or a repository root."
    )
    parser.add_argument(
        "paths",
        nargs="*",
        default=["."],
        help="Sprint root, repository root, manifest, index.html, or Markdown paths.",
    )
    return parser.parse_args()


def is_local_ref(ref: str) -> bool:
    return not ref.lower().startswith(LOCAL_LINK_PREFIXES)


def clean_local_ref(ref: str) -> str:
    return ref.split("#", 1)[0].split("?", 1)[0].strip("<>")


def display_path(path: Path) -> str:
    try:
        return path.resolve().relative_to(Path.cwd().resolve()).as_posix()
    except ValueError:
        return path.as_posix()


def github_issue(level: str, path: Path, message: str) -> None:
    if os.environ.get("GITHUB_ACTIONS") == "true":
        print(f"::{level} file={display_path(path)}::{message}")


def has_manifest_and_index(path: Path) -> bool:
    return (path / "manifest.json").is_file() and (path / "index.html").is_file()


def should_skip_root(path: Path) -> bool:
    parts = {part.lower() for part in path.parts}
    return "workshops" in parts


def iter_manifest_roots(path: Path) -> Iterable[Path]:
    for manifest in sorted(path.rglob("manifest.json")):
        if any(part in SKIP_DIRS for part in manifest.parts):
            continue
        root = manifest.parent
        if should_skip_root(root):
            continue
        if (root / "index.html").is_file():
            yield root


def find_nearest_sprint_root(path: Path) -> Path | None:
    start = path if path.is_dir() else path.parent
    for current in [start, *start.parents]:
        if should_skip_root(current):
            return None
        if has_manifest_and_index(current):
            return current
    return None


def collect_roots(raw_paths: list[str]) -> list[Path]:
    roots: set[Path] = set()
    for raw_path in raw_paths:
        path = Path(raw_path).expanduser().resolve()
        if not path.exists():
            continue

        if path.is_dir():
            if has_manifest_and_index(path) and not should_skip_root(path):
                roots.add(path)
            else:
                roots.update(iter_manifest_roots(path))
            continue

        root = find_nearest_sprint_root(path)
        if root is not None:
            roots.add(root)

    return sorted(roots)


def load_json(report: SprintReport, path: Path) -> dict | None:
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        report.error(path, f"manifest.json is invalid JSON: {exc}")
    except OSError as exc:
        report.error(path, f"Could not read manifest.json: {exc}")
    return None


def looks_like_question(text: str) -> bool:
    cleaned = text.strip()
    return cleaned.endswith("?") or bool(QUESTION_START_RE.match(cleaned))


def parse_duration_minutes(value: str) -> float | None:
    matches = re.findall(r"(\d+(?:\.\d+)?)\s*(hours?|hrs?|minutes?|mins?)?", value, re.IGNORECASE)
    if not matches:
        return None

    minutes: list[float] = []
    for number, unit in matches:
        amount = float(number)
        if unit.lower().startswith(("hour", "hr")):
            amount *= 60
        minutes.append(amount)

    return max(minutes) if minutes else None


def read_lines(report: SprintReport, path: Path) -> list[str] | None:
    try:
        return path.read_text(encoding="utf-8").splitlines()
    except UnicodeDecodeError:
        report.error(path, "Markdown file must be UTF-8 encoded.")
    except OSError as exc:
        report.error(path, f"Could not read Markdown file: {exc}")
    return None


def first_nonempty(lines: list[str]) -> str | None:
    for line in lines:
        if line.strip():
            return line
    return None


def section_exists(lines: list[str], heading: str) -> bool:
    expected = heading.lower()
    return any(line.strip().lower() == expected for line in lines)


def has_task_or_intro(lines: list[str]) -> bool:
    return any(
        line.startswith("## Task") or line.strip().lower() == "## introduction"
        for line in lines
    )


def validate_images(report: SprintReport, md_path: Path, content: str) -> None:
    for match in IMAGE_RE.finditer(content):
        alt_text = match.group(1).strip()
        raw_ref = match.group(2).strip()

        if not alt_text:
            report.error(md_path, f"Image reference must include alt text: {raw_ref}")

        if not is_local_ref(raw_ref):
            continue

        image_ref = clean_local_ref(raw_ref)
        if not image_ref:
            continue

        image_path = (md_path.parent / image_ref).resolve()
        if image_path.suffix.lower() in LOCAL_IMAGE_EXTS and not image_path.is_file():
            report.error(md_path, f"Referenced image does not exist: {raw_ref}")

        if image_ref != image_ref.lower():
            report.error(md_path, f"Image path must be lowercase: {raw_ref}")

        normalized_parts = Path(image_ref.replace("\\", "/")).parts
        if image_path.suffix.lower() in LOCAL_IMAGE_EXTS and "images" not in normalized_parts:
            report.warn(md_path, f"Local sprint images should live in an images folder: {raw_ref}")


def validate_markdown(report: SprintReport, md_path: Path, *, is_primary: bool, is_multi_lab: bool) -> None:
    lines = read_lines(report, md_path)
    if lines is None:
        return
    if not lines:
        report.error(md_path, "Markdown file is empty.")
        return

    first = first_nonempty(lines)
    if first is None:
        report.error(md_path, "Markdown file has no content.")
        return

    h1_lines = [(idx, line) for idx, line in enumerate(lines, start=1) if H1_RE.match(line.strip())]
    if not first.startswith("# "):
        report.error(md_path, "First non-empty line must be an H1 heading (# Title).")
    if len(h1_lines) != 1:
        report.error(md_path, f"Markdown file must contain exactly one H1 heading; found {len(h1_lines)}.")
    elif (is_primary or not is_multi_lab) and not looks_like_question(H1_RE.match(h1_lines[0][1].strip()).group(1)):
        report.warn(md_path, "Sprint title should usually be phrased as a user question.")

    duration_values = [match.group(2) for line in lines if (match := DURATION_RE.match(line))]
    if not duration_values:
        if is_multi_lab and is_primary:
            report.warn(md_path, "Primary multi-lab sprint page should include Duration: or Estimated Time: when practical.")
        elif is_multi_lab:
            report.warn(md_path, "Lab Markdown should include Duration: or Estimated Time:.")
        else:
            report.error(md_path, "Sprint Markdown must include Duration: or Estimated Time:.")
    else:
        duration_minutes = parse_duration_minutes(duration_values[0])
        if duration_minutes is not None and duration_minutes > MAX_SPRINT_MINUTES:
            report.warn(
                md_path,
                f"Sprint duration is {duration_minutes:g} minutes; sprints should stay near 10-15 minutes.",
            )

    if not is_multi_lab and not section_exists(lines, "## Answer") and not has_task_or_intro(lines):
        report.warn(md_path, "Sprint Markdown should include ## Answer, or use task/introduction structure intentionally.")

    if (is_primary or not is_multi_lab) and not section_exists(lines, "## Learn More"):
        report.warn(md_path, "Consider adding ## Learn More with useful follow-up links.")

    if (is_primary or not is_multi_lab) and not section_exists(lines, "## Acknowledgements"):
        report.warn(md_path, "Missing ## Acknowledgements section.")

    content = "\n".join(lines)
    copy_opens = content.count("<copy>")
    copy_closes = content.count("</copy>")
    if copy_opens != copy_closes:
        report.error(md_path, f"Mismatched <copy> tags (open: {copy_opens}, close: {copy_closes}).")

    if HTML_ANCHOR_RE.search(content):
        report.error(md_path, "HTML <a href=...> tags are not allowed; use Markdown links.")

    if "````" in content:
        report.error(md_path, "Use triple backticks for code fences, not four backticks.")

    validate_images(report, md_path, content)


def validate_manifest(report: SprintReport) -> list[Path]:
    root = report.root
    manifest_path = root / "manifest.json"
    index_path = root / "index.html"
    markdown_files: list[Path] = []
    seen_markdown_files: set[Path] = set()

    if not manifest_path.is_file():
        report.error(manifest_path, "Missing manifest.json.")
        return markdown_files
    if not index_path.is_file():
        report.error(index_path, "Missing index.html.")

    manifest = load_json(report, manifest_path)
    if manifest is None:
        return markdown_files

    workshoptitle = manifest.get("workshoptitle")
    if not isinstance(workshoptitle, str) or not workshoptitle.strip():
        report.error(manifest_path, "manifest.json must include a non-empty workshoptitle.")

    help_value = manifest.get("help")
    if not isinstance(help_value, str) or not help_value.strip():
        report.warn(manifest_path, "manifest.json should include a help email.")
    elif "**" in help_value or "enterarea" in help_value.lower():
        report.warn(manifest_path, "manifest.json help value still looks like a placeholder.")

    task_type = manifest.get("task_type")
    if task_type is not None and task_type != "Sections":
        report.warn(manifest_path, "Sprint manifest task_type is usually Sections.")

    tutorials = manifest.get("tutorials")
    if not isinstance(tutorials, list) or not tutorials:
        report.error(manifest_path, "manifest.json must include a non-empty tutorials array.")
        return markdown_files

    if len(tutorials) > 7:
        report.warn(manifest_path, "Sprint manifests should usually include one primary sprint and no more than six related sprints.")

    for idx, tutorial in enumerate(tutorials, start=1):
        if not isinstance(tutorial, dict):
            report.error(manifest_path, f"tutorials[{idx}] must be an object.")
            continue

        title = tutorial.get("title")
        if not isinstance(title, str) or not title.strip():
            report.error(manifest_path, f"tutorials[{idx}] must include a non-empty title.")
        elif idx == 1 and not looks_like_question(title):
            report.warn(manifest_path, "The primary sprint tutorial title should usually be phrased as a user question.")

        filename = tutorial.get("filename")
        if not isinstance(filename, str) or not filename.strip():
            report.error(manifest_path, f"tutorials[{idx}] must include a non-empty filename.")
            continue

        if not is_local_ref(filename):
            continue

        target = (root / clean_local_ref(filename)).resolve()
        if not target.exists():
            report.error(manifest_path, f"tutorials[{idx}] references a missing file: {filename}")
            continue

        if target.suffix.lower() == ".md":
            if target not in seen_markdown_files:
                markdown_files.append(target)
                seen_markdown_files.add(target)

    return markdown_files


def validate_sprint_root(root: Path) -> SprintReport:
    report = SprintReport(root=root)
    markdown_files = validate_manifest(report)
    is_multi_lab = len(markdown_files) > 1
    primary_md = markdown_files[0] if markdown_files else None

    if not markdown_files:
        report.warn(root / "manifest.json", "No local Markdown tutorial files were found in the manifest.")

    for md_path in markdown_files:
        validate_markdown(report, md_path, is_primary=md_path == primary_md, is_multi_lab=is_multi_lab)

    return report


def print_report(reports: list[SprintReport]) -> int:
    total_errors = sum(len(report.errors) for report in reports)
    total_warnings = sum(len(report.warnings) for report in reports)

    print("LiveLabs Sprint Validation")
    print(f"Checked sprint roots: {len(reports)}")
    print(f"Errors: {total_errors}")
    print(f"Warnings: {total_warnings}")
    print("")

    for report in reports:
        print(f"## {display_path(report.root)}")
        if not report.errors and not report.warnings:
            print("- OK")
        for issue in report.errors:
            print(f"- ERROR {display_path(issue.path)}: {issue.message}")
            github_issue("error", issue.path, issue.message)
        for issue in report.warnings:
            print(f"- WARNING {display_path(issue.path)}: {issue.message}")
            github_issue("warning", issue.path, issue.message)
        print("")

    return 1 if total_errors else 0


def main() -> int:
    args = parse_args()
    roots = collect_roots(args.paths)
    if not roots:
        print("No LiveLabs Sprint roots found for validation.")
        return 0

    reports = [validate_sprint_root(root) for root in roots]
    return print_report(reports)


if __name__ == "__main__":
    sys.exit(main())
