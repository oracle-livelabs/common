#!/usr/bin/env python3
"""Review Markdown workshop content for recurring editorial AI-content signals."""

from __future__ import annotations

import argparse
import json
import os
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
    severity: str = "warning"


def load_rules(path: Path) -> dict:
    with path.open(encoding="utf-8") as handle:
        rules = json.load(handle)
    validate_rules(rules)
    return rules


def validate_rules(rules: dict) -> None:
    if not isinstance(rules, dict):
        raise ValueError("configuration root must be an object")
    required = {"schema_version", "rule_version", "policy", "high_signal_terms", "context_terms", "phrases", "style_signals"}
    missing = sorted(required - rules.keys())
    if missing:
        raise ValueError(f"missing required sections: {', '.join(missing)}")
    if not isinstance(rules["schema_version"], int) or not rules["rule_version"]:
        raise ValueError("schema_version must be an integer and rule_version must be non-empty")
    policy = rules["policy"]
    if not isinstance(policy, dict):
        raise ValueError("policy must be an object")
    if policy.get("default_severity") not in {"informational", "warning", "blocking"}:
        raise ValueError("policy.default_severity must be informational, warning, or blocking")
    if not isinstance(policy.get("blocking_review_required"), bool):
        raise ValueError("policy.blocking_review_required must be true or false")
    review_policy = policy.get("review_required")
    if not isinstance(review_policy, dict) or any(
        not isinstance(review_policy.get(key), int) or review_policy[key] < 0
        for key in ("minimum_high_signal_terms", "minimum_phrase_matches", "minimum_total_signals")
    ):
        raise ValueError("policy.review_required must define non-negative integer thresholds")
    style_thresholds = policy.get("style_thresholds")
    if not isinstance(style_thresholds, dict) or any(
        not isinstance(style_thresholds.get(key), int) or style_thresholds[key] < 0
        for key in ("em_dash", "semicolon", "colon_explanation", "parenthetical_aside", "bold_emphasis", "slash_construction")
    ):
        raise ValueError("policy.style_thresholds must define non-negative integer thresholds")
    for section in ("high_signal_terms", "context_terms", "phrases", "style_signals"):
        if not isinstance(rules[section], list):
            raise ValueError(f"{section} must be a list")
        for rule in rules[section]:
            if not isinstance(rule, dict):
                raise ValueError(f"{section} contains a rule that is not an object")
            if not all(rule.get(key) for key in ("id", "pattern", "rationale")):
                raise ValueError(f"{section} contains a rule missing id, pattern, or rationale")
            try:
                re.compile(rule["pattern"], re.IGNORECASE)
            except re.error as exc:
                raise ValueError(f"invalid pattern for {rule['id']}: {exc}") from exc
            if rule.get("severity", policy["default_severity"]) not in {"informational", "warning", "blocking"}:
                raise ValueError(f"invalid severity for {rule['id']}")
    required_style_ids = {"em-dash", "semicolon", "colon-explanation", "parenthetical-aside", "bold-emphasis", "slash-construction"}
    style_ids = {rule["id"] for rule in rules["style_signals"]}
    if not required_style_ids.issubset(style_ids):
        raise ValueError("style_signals is missing one or more required style rules")


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


def find_matches(lines: Iterable[tuple[int, str]], rules: Iterable[dict], category: str, default_severity: str) -> list[Match]:
    matches: list[Match] = []
    for rule in rules:
        expression = re.compile(rule["pattern"], re.IGNORECASE)
        for line_number, line in lines:
            for found in expression.finditer(line):
                matches.append(Match(rule["id"], category, line_number, found.group(0), rule["rationale"], rule.get("severity", default_severity)))
    return matches


def analyze(path: str, rules: dict) -> dict:
    file_path = Path(path)
    text = file_path.read_text(encoding="utf-8")
    lines = prose_lines(text)
    h1_lines = {number for number, line in lines if line.startswith("# ")}
    lines = [(number, line) for number, line in lines if number not in h1_lines]
    default_severity = rules["policy"]["default_severity"]
    high = find_matches(lines, rules["high_signal_terms"], "high-signal term", default_severity)
    context = find_matches(lines, rules["context_terms"], "context term", default_severity)
    phrases = find_matches(lines, rules["phrases"], "phrase", default_severity)
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
        styles.append(Match(style_id, "style signal", 0, f"{count} matches", rule["rationale"], rule.get("severity", default_severity)))

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
        "high": high,
        "context": context,
        "phrases": phrases,
        "styles": styles,
        "distinct_high": distinct_high,
        "distinct_phrases": distinct_phrases,
        "total_signals": total_signals,
        "review_required": review_required,
        "blocking": any(match.severity == "blocking" for match in high + context + phrases + styles) or (review_required and rules["policy"].get("blocking_review_required", False)),
        "rule_version": rules.get("rule_version", rules.get("schema_version", "unknown")),
    }


def render_report(results: list[dict], files: list[str], repository: str) -> str:
    rule_version = results[0]["rule_version"] if results else "unknown"
    lines = ["## Content validation workflow", "", f"Repository: `{repository}`", f"Rule version: `{rule_version}`", "Editorial review signals only; findings are not proof of AI authorship.", ""]
    if not files:
        lines.append("No changed Markdown files were found.")
        return "\n".join(lines) + "\n"
    blocking = [result for result in results if result["review_required"]]
    lines.append(f"Checked **{len(results)}** Markdown file(s); **{len(blocking)}** require clustered-signal review.")
    lines.append("")
    for result in results:
        status = "REVIEW REQUIRED" if result["review_required"] else "PASS"
        lines.append(f"### {status}: `{result['path']}`")
        lines.append(f"- Signal counts: {result['distinct_high']} high-signal term(s), {result['distinct_phrases']} phrase(s), {result['total_signals']} total distinct signal(s)")
        matches = result["high"] + result["context"] + result["phrases"] + result["styles"]
        if matches:
            lines.append("- Findings:")
            for match in matches:
                line = f"line {match.line}" if match.line else "file-level"
                lines.append(f"  - field: `workshop content`; rule: `{match.rule_id}`; severity: `{match.severity}`; matching value: `{match.text}`; {line}; guidance: {match.rationale}")
        lines.append("")
    lines.append("A review-required result is an editorial signal. The workflow exits non-zero only when the configured policy marks a finding as blocking.")
    return "\n".join(lines) + "\n"


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rules", type=Path, default=Path(".github/content-validation/rules.json"))
    parser.add_argument("--files", nargs="*", default=None)
    parser.add_argument("--base")
    parser.add_argument("--head")
    parser.add_argument("--report", type=Path)
    parser.add_argument("--repository", default=os.environ.get("GITHUB_REPOSITORY", "local"))
    args = parser.parse_args(argv)
    if args.files is not None:
        requested = args.files
    elif args.base and args.head:
        requested = changed_files(args.base, args.head)
    else:
        parser.error("provide --files or both --base and --head")
    files = [path for path in requested if supported_file(path) and Path(path).is_file()]
    try:
        rules = load_rules(args.rules)
    except (OSError, json.JSONDecodeError, ValueError) as exc:
        print(f"Configuration error: {exc}", file=sys.stderr)
        return 2
    results = [analyze(path, rules) for path in files]
    report = render_report(results, files, args.repository)
    print(report, end="")
    if args.report:
        args.report.write_text(report, encoding="utf-8")
    return 1 if any(result["blocking"] for result in results) else 0


if __name__ == "__main__":
    sys.exit(main())
