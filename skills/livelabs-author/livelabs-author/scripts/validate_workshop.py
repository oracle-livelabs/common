#!/usr/bin/env python3
"""Validate LiveLabs workshop repositories and emit VALIDATION-RESULT.md."""
from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import List, Optional, Sequence

LANHAM_PASSIVE_RE = re.compile(r"\b(is|are|was|were|be|been|being)\s+\w+ed\b", re.IGNORECASE)
CONTRACTION_RE = re.compile(r"\b\w+'\w+\b")
NOMINALIZATION_RE = re.compile(r"\b\w+(tion|ment|ance|ence|ity|ism|ness)\b", re.IGNORECASE)
EM_DASH_RE = re.compile(r"—")
TASK_HEADER_RE = re.compile(r"^## Task \d+: ")
YOUTUBE_BAD_RE = re.compile(r"\[[^\]]+\]\(youtube:")
IMAGE_ALT_EMPTY_RE = re.compile(r"!\[\]\s*\((?!youtube:)")
IMAGE_PATH_RE = re.compile(r"!\[[^\]]*\]\((images/[^)]+)\)")
HTML_ANCHOR_RE = re.compile(r"<a\s+href=", re.IGNORECASE)
ESTIMATED_TIME_RE = re.compile(r"Estimated\s+Time:\s*", re.IGNORECASE)
ESTIMATED_WORKSHOP_TIME_RE = re.compile(r"Estimated\s+Workshop\s+Time:\s*", re.IGNORECASE)


@dataclass
class FileReport:
    path: Path
    markdown_errors: List[str] = field(default_factory=list)
    lanham_notes: List[str] = field(default_factory=list)
    lanham_score: int = 5


@dataclass
class StructureReport:
    missing_items: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class ManifestReport:
    path: Path
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)


@dataclass
class ValidationResult:
    structure: StructureReport
    manifests: List[ManifestReport]
    files: List[FileReport]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Validate LiveLabs workshop content")
    parser.add_argument(
        "root",
        help="Path to the workshop root (folder containing labs + workshops directory)",
    )
    parser.add_argument(
        "--files",
        nargs="+",
        default=[],
        help="Optional list of markdown files relative to the workshop root to validate",
    )
    return parser.parse_args()


def collect_markdown_files(root: Path) -> List[Path]:
    return sorted(p for p in root.rglob("*.md") if p.name != "VALIDATION-RESULT.md")


def collect_target_markdown_files(root: Path, relative_paths: Sequence[str]) -> List[Path]:
    paths: List[Path] = []
    for rel in relative_paths:
      candidate = (root / rel).resolve()
      if not candidate.exists():
          raise SystemExit(f"Requested markdown file does not exist: {rel}")
      if candidate.suffix.lower() != ".md":
          raise SystemExit(f"Requested file is not markdown: {rel}")
      paths.append(candidate)
    return sorted(paths)


def load_lines(path: Path) -> List[str]:
    return path.read_text(encoding="utf-8").splitlines()


def first_nonempty_line(lines: Sequence[str]) -> Optional[str]:
    for line in lines:
        if line.strip():
            return line
    return None


def check_markdown_rules(path: Path, lines: Sequence[str]) -> List[str]:
    errors: List[str] = []
    content_first = first_nonempty_line(lines)
    if content_first is None:
        errors.append("File is empty; add required sections and headings.")
        return errors
    if not content_first.startswith("# "):
        errors.append("First non-empty line must be an H1 (# Title).")

    h1_count = 0
    in_code = False
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith("```"):
            in_code = not in_code
            continue
        if not in_code and stripped.startswith("# "):
            h1_count += 1
            if h1_count > 1:
                errors.append(f"Line {idx}: Only one H1 allowed per file.")
                break

    if not any(line.startswith("## Acknowledgements") for line in lines):
        errors.append("Missing '## Acknowledgements' section.")

    for _ in IMAGE_ALT_EMPTY_RE.finditer("\n".join(lines)):
        errors.append("Image references must include alt text (use ![alt](images/file.png)).")
        break

    if HTML_ANCHOR_RE.search("\n".join(lines)):
        errors.append("HTML <a> tags are not allowed; use Markdown links.")

    if YOUTUBE_BAD_RE.search("\n".join(lines)):
        errors.append("YouTube embeds must use [](youtube:VIDEO_ID) format with empty brackets.")

    for idx, line in enumerate(lines, start=1):
        if line.startswith("## Task") and not TASK_HEADER_RE.match(line):
            errors.append(f"Line {idx}: Task headers must match '## Task N: Description'.")

    copy_opens = sum(line.count("<copy>") for line in lines)
    copy_closes = sum(line.count("</copy>") for line in lines)
    if copy_opens != copy_closes:
        errors.append(f"Mismatched <copy> tags (open: {copy_opens}, close: {copy_closes}).")

    file_name = path.name.lower()
    has_tasks = any(line.startswith("## Task") for line in lines)
    if has_tasks:
        if not any(line.startswith("## Introduction") for line in lines):
            errors.append("Labs with tasks must include a '## Introduction' section.")
        if not any(
            line.startswith("### Objectives") or line.startswith("## Objectives")
            for line in lines
        ):
            errors.append("Labs must include a '### Objectives' (or ##) section.")

    if file_name == "introduction.md":
        if not any(ESTIMATED_WORKSHOP_TIME_RE.search(line) for line in lines):
            errors.append("introduction.md must include 'Estimated Workshop Time:'.")
    else:
        if not any(ESTIMATED_TIME_RE.search(line) for line in lines):
            errors.append("Missing 'Estimated Time:' line.")

    joined = "\n".join(lines)
    for match in IMAGE_PATH_RE.finditer(joined):
        image_path = match.group(1)
        if image_path != image_path.lower():
            errors.append(f"Image path must be lowercase: {image_path}")

    task_indices = [idx for idx, line in enumerate(lines) if line.startswith("## Task")]
    for pos, start in enumerate(task_indices):
        section_start = start + 1
        section_end = task_indices[pos + 1] if pos + 1 < len(task_indices) else len(lines)
        block = lines[section_start:section_end]
        if block and not any(re.match(r"\s*\d+\. ", ln) for ln in block):
            errors.append(f"Line {start + 1}: Task sections must contain numbered steps inside the task.")
        for offset, line in enumerate(block):
            stripped = line.lstrip(" \t")
            indent = len(line) - len(stripped)
            line_no = section_start + offset + 1
            if stripped.startswith("```") and indent < 4:
                errors.append(f"Line {line_no}: Code blocks inside tasks must be indented four spaces.")
            if stripped.startswith("![") and indent < 4:
                errors.append(
                    f"Line {line_no}: Images inside tasks must align with the numbered step (indent)."
                )

    return errors


def analyze_lanham(lines: Sequence[str]) -> tuple[int, List[str]]:
    text = " ".join(line.strip() for line in lines if line.strip())
    if not text:
        return 0, ["File has no prose to evaluate."]

    sentences = [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
    long_sentences = [s for s in sentences if len(s.split()) > 20]
    passive_hits = LANHAM_PASSIVE_RE.findall(text)
    contractions = CONTRACTION_RE.findall(text)
    nominalizations = NOMINALIZATION_RE.findall(text)
    em_dashes = EM_DASH_RE.findall(text)

    notes: List[str] = []
    score = 5

    if long_sentences:
        notes.append(f"{len(long_sentences)} sentence(s) exceed 20 words; tighten wording.")
        score -= 1
    if passive_hits:
        notes.append(f"Passive voice detected in {len(passive_hits)} instance(s).")
        score -= 1
    if contractions:
        notes.append("Contractions found; expand them per Lanham rules.")
        score -= 1
    if em_dashes:
        notes.append("Em dashes detected; swap for commas, colons, or periods.")
        score -= 1
    if nominalizations and len(nominalizations) > 10:
        notes.append("Heavy nominalization usage; prefer vivid verbs.")
        score -= 1

    if score < 0:
        score = 0

    return score, notes


def validate_structure(root: Path) -> StructureReport:
    report = StructureReport()
    workshops_dir = root / "workshops"
    if not workshops_dir.is_dir():
        report.missing_items.append("Missing 'workshops/' directory at root level.")
        return report

    variant_dirs = [path for path in workshops_dir.iterdir() if path.is_dir()]
    if not variant_dirs:
        report.missing_items.append("No workshop deployment variants found inside 'workshops/'.")

    for variant in variant_dirs:
        manifest = variant / "manifest.json"
        index_html = variant / "index.html"
        if not manifest.is_file():
            report.missing_items.append(f"{variant.relative_to(root)} missing manifest.json")
        if not index_html.is_file():
            report.missing_items.append(f"{variant.relative_to(root)} missing index.html")

    for entry in root.iterdir():
        if not entry.is_dir() or entry.name.startswith(".") or entry.name == "workshops":
            continue
        canonical_md = entry / f"{entry.name}.md"
        if not canonical_md.is_file():
            report.missing_items.append(f"{entry.relative_to(root)} missing {entry.name}.md file.")
        images_dir = entry / "images"
        if not images_dir.is_dir():
            report.warnings.append(
                f"{entry.relative_to(root)} missing images/ folder (required for screenshots)."
            )
    return report


def validate_structure_for_targets(root: Path, targets: Sequence[Path]) -> StructureReport:
    report = StructureReport()
    workshops_dir = root / "workshops"
    if not workshops_dir.is_dir():
        report.missing_items.append("Missing 'workshops/' directory at root level.")
        return report

    for target in targets:
        if not target.exists():
            report.missing_items.append(f"Missing target markdown file: {target.relative_to(root)}")
        if target.name == "introduction.md":
            continue
        if target.parent == root:
            continue
        images_dir = target.parent / "images"
        if not images_dir.is_dir():
            report.warnings.append(
                f"{target.parent.relative_to(root)} missing images/ folder (required for screenshots)."
            )
    return report


def validate_manifests(root: Path) -> List[ManifestReport]:
    reports: List[ManifestReport] = []
    for manifest in root.glob("workshops/**/manifest.json"):
        report = ManifestReport(path=manifest)
        try:
            payload = json.loads(manifest.read_text(encoding="utf-8"))
        except json.JSONDecodeError as exc:
            report.errors.append(f"Invalid JSON: {exc}")
            reports.append(report)
            continue

        for key in ("workshoptitle", "tutorials"):
            if key not in payload:
                report.errors.append(f"Missing required key '{key}'.")
        if "tutorials" in payload:
            tutorials = payload["tutorials"]
            if not isinstance(tutorials, list) or not tutorials:
                report.errors.append("'tutorials' must be a non-empty list.")
            else:
                for idx, tutorial in enumerate(tutorials, start=1):
                    filename = tutorial.get("filename") if isinstance(tutorial, dict) else None
                    if not filename:
                        report.errors.append(f"Tutorial #{idx} missing 'filename' attribute.")
                        continue
                    if filename.startswith("http"):
                        continue
                    absolute_target = (manifest.parent / filename).resolve()
                    if not absolute_target.exists():
                        report.errors.append(
                            f"Tutorial #{idx} references missing file: {filename}"
                        )
        reports.append(report)
    return reports


def build_report(result: ValidationResult, root: Path) -> str:
    lines: List[str] = []
    lines.append(f"# LiveLabs Workshop Validation – {root.name}")
    lines.append("")
    lines.append(f"Generated on {datetime.now(timezone.utc).isoformat()}")
    lines.append("")

    lines.append("## Structure Check")
    if result.structure.missing_items:
        lines.append("- ❌ Issues detected:")
        for item in result.structure.missing_items:
            lines.append(f"  - {item}")
    else:
        lines.append("- ✅ Required folders and workshop variants present.")
    if result.structure.warnings:
        lines.append("- ⚠️ Warnings:")
        for item in result.structure.warnings:
            lines.append(f"  - {item}")
    lines.append("")

    lines.append("## Manifest Review")
    if not result.manifests:
        lines.append("- No manifest files found.")
    for manifest_report in result.manifests:
        rel = manifest_report.path.relative_to(root)
        lines.append(f"### {rel}")
        if manifest_report.errors:
            for err in manifest_report.errors:
                lines.append(f"- ❌ {err}")
        else:
            lines.append("- ✅ Manifest structure looks good.")
        for warn in manifest_report.warnings:
            lines.append(f"- ⚠️ {warn}")
        lines.append("")

    lines.append("## Markdown File Ratings")
    for file_report in result.files:
        rel = file_report.path.relative_to(root)
        lines.append(f"### {rel}")
        if file_report.markdown_errors:
            lines.append("- ❌ Formatting issues:")
            for err in file_report.markdown_errors:
                lines.append(f"  - {err}")
        else:
            lines.append("- ✅ LiveLabs formatting checks passed.")
        lines.append(f"- ✍️ Lanham score: {file_report.lanham_score}/5")
        if file_report.lanham_notes:
            for note in file_report.lanham_notes:
                lines.append(f"  - {note}")
        lines.append("")

    return "\n".join(lines)


def main() -> None:
    args = parse_args()
    root = Path(args.root).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Root path does not exist: {root}")

    target_files = (
        collect_target_markdown_files(root, args.files)
        if args.files
        else collect_markdown_files(root)
    )

    structure = (
        validate_structure_for_targets(root, target_files)
        if args.files
        else validate_structure(root)
    )
    manifests = validate_manifests(root)
    file_reports: List[FileReport] = []

    for md_path in target_files:
        lines = load_lines(md_path)
        md_errors = check_markdown_rules(md_path, lines)
        lanham_score, lanham_notes = analyze_lanham(lines)
        file_reports.append(
            FileReport(
                path=md_path,
                markdown_errors=md_errors,
                lanham_notes=lanham_notes,
                lanham_score=lanham_score,
            )
        )

    result = ValidationResult(structure=structure, manifests=manifests, files=file_reports)
    report_text = build_report(result, root)
    output_path = root / "VALIDATION-RESULT.md"
    output_path.write_text(report_text, encoding="utf-8")
    print(f"Validation complete. Report saved to {output_path}")


if __name__ == "__main__":
    main()
