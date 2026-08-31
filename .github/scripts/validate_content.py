#!/usr/bin/env python3
"""Review changed Markdown files for recurring editorial AI-content signals."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable


@dataclass
class Match:
    rule_id: str
    category: str
    line: int
    text: str
    rationale: str


def load_rules(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        return json.load(handle)


def changed_files(base: str, head: str) -> list[str]:
    result = subprocess.run(
        ["git", "diff", "--name-only", "--diff-filter=AM", base, head, "--"],
        check=True,
        capture_output=True,
        text=True,
    )
    return [line.strip() for line in result.stdout.splitlines() if line.strip()]


def supported_file(path: str) -> bool:
    normalized = path.replace("\\", "/")
    name = Path(normalized).name.lower()
    return (
        normalized.lower().endswith(".md")
        and ".github/" not in normalized.lower()
        and name not in {"skill.md"}
        and "node_modules/" not in normalized.lower()
    )


def prose_lines(text: str) -> list[tuple[int, str]]:
    """Return prose lines while excluding fenced code blocks."""
    lines: list[tuple[int, str]] = []
    in_fence = False
    for number, raw in enumerate(text.splitlines(), start=1):
        stripped = raw.strip()
        if stripped.startswith("```"):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        cleaned = re.sub(r"`[^`]*`", "", raw)
        lines.append((number, cleaned))
    return lines


def find_matches(lines: Iterable[tuple[int, str]], rules: Iterable[dict], category: str) -> list[Match]:
    matches: list[Match] = []
    for rule in rules:
        expression = re.compile(rule["pattern"], re.IGNORECASE)
        for line_number, line in lines:
            for found in expression.finditer(line):
                matches.append(Match(rule["id"], category, line_number, found.group(0), rule["rationale"]))
    return matches


def first_title(text: str) -> tuple[int, str] | None:
    for number, raw in enumerate(text.splitlines(), start=1):
        if raw.startswith("# "):
            return number, raw[2:].strip()
    return None


def analyze(path: str, rules: dict) -> dict:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    lines = prose_lines(text)
    title = first_title(text)
    high = find_matches(lines, rules["high_signal_terms"], "high-signal term")
    context = find_matches(lines, rules["context_terms"], "context term")
    phrases = find_matches(lines, rules["phrases"], "phrase")

    styles: list[Match] = []
    thresholds = rules["policy"]["style_thresholds"]
    style_rules = {item["id"]: item for item in rules["style_signals"]}
    full_prose = "\n".join(line for _, line in lines)
    style_counts = {
        "em-dash": len(re.findall(style_rules["em-dash"]["pattern"], full_prose)),
        "semicolon": len(re.findall(style_rules["semicolon"]["pattern"], full_prose)),
        "colon-explanation": len(re.findall(style_rules["colon-explanation"]["pattern"], full_prose)),
        "parenthetical-aside": len(re.findall(style_rules["parenthetical-aside"]["pattern"], full_prose)),
        "bold-emphasis": len(re.findall(style_rules["bold-emphasis"]["pattern"], full_prose)),
        "slash-construction": len(re.findall(style_rules["slash-construction"]["pattern"], full_prose)),
    }
    for style_id, count in style_counts.items():
        if count < thresholds[style_id.replace("-", "_")]:
            continue
        rule = style_rules[style_id]
        styles.append(Match(style_id, "style signal", 0, f"{count} matches", rule["rationale"]))

    distinct_high = len({match.rule_id for match in high})
    distinct_phrases = len({match.rule_id for match in phrases})
    total_signals = distinct_high + len({match.rule_id for match in context}) + distinct_phrases
    policy = rules["policy"]["review_required"]
    review_required = (
        distinct_high >= policy["minimum_high_signal_terms"]
        or distinct_phrases >= policy["minimum_phrase_matches"]
        or total_signals >= policy["minimum_total_signals"]
    )
    return {
        "path": path,
        "title": title,
        "title_matches": [match for match in high + phrases if title and match.line == title[0]],
        "high": high,
        "context": context,
        "phrases": phrases,
        "styles": styles,
        "distinct_high": distinct_high,
        "distinct_phrases": distinct_phrases,
        "total_signals": total_signals,
        "review_required": review_required,
    }


def render_report(results: list[dict], files: list[str]) -> str:
    lines = ["## Content validation workflow", "", "Editorial review signals only; findings are not proof of AI authorship.", ""]
    if not files:
        lines.append("No changed Markdown files were found.")
        return "\n".join(lines) + "\n"
    blocking = [result for result in results if result["review_required"]]
    lines.append(f"Checked **{len(results)}** Markdown file(s); **{len(blocking)}** require clustered-signal review.")
    lines.append("")
    for result in results:
        status = "REVIEW REQUIRED" if result["review_required"] else "PASS"
        title_text = result["title"][1] if result["title"] else "(no H1 title found)"
        lines.append(f"### {status}: `{result['path']}`")
        lines.append(f"- Title: {title_text}")
        lines.append(f"- Signal counts: {result['distinct_high']} high-signal term(s), {result['distinct_phrases']} phrase(s), {result['total_signals']} total distinct signal(s)")
        if result["title_matches"]:
            lines.append("- Title matches: " + ", ".join(f"`{match.text}` (line {match.line})" for match in result["title_matches"]))
        for label, key in (("High-signal terms", "high"), ("Phrases", "phrases"), ("Context terms", "context")):
            matches = result[key]
            if matches:
                lines.append(f"- {label}: " + ", ".join(f"`{match.text}` (line {match.line})" for match in matches[:12]))
        if result["styles"]:
            lines.append("- Repeated style signals: " + ", ".join(f"{match.rule_id} ({match.text})" for match in result["styles"]))
        lines.append("")
    lines.append("A review-required result indicates a cluster and exits non-zero. Inspect context, preserve technical terminology, and revise only where the wording is vague, inflated, or formulaic.")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rules", type=Path, default=Path(".github/content-validation/rules.json"))
    parser.add_argument("--files", nargs="*", default=None)
    parser.add_argument("--base")
    parser.add_argument("--head")
    parser.add_argument("--report", type=Path)
    args = parser.parse_args(argv)
    if args.files is not None:
        requested = args.files
    elif args.base and args.head:
        requested = changed_files(args.base, args.head)
    else:
        parser.error("provide --files or both --base and --head")
    files = [path for path in requested if supported_file(path) and Path(path).is_file()]
    rules = load_rules(args.rules)
    results = [analyze(path, rules) for path in files]
    report = render_report(results, files)
    print(report, end="")
    if args.report:
        args.report.write_text(report, encoding="utf-8")
    return 1 if any(result["review_required"] for result in results) else 0


if __name__ == "__main__":
    sys.exit(main())
