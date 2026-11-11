#!/usr/bin/env python3
"""Delivery QA gate for Confluence storage-format pages."""

from __future__ import annotations

import argparse
import re
import sys
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path


MACRO_OPEN_RE = re.compile(r"<ac:structured-macro\b")
MACRO_CLOSE_RE = re.compile(r"</ac:structured-macro>")
MACRO_SELF_RE = re.compile(r"<ac:structured-macro\b[^>]+/>")
BODY_OPEN_RE = re.compile(r"<ac:rich-text-body>")
BODY_CLOSE_RE = re.compile(r"</ac:rich-text-body>")
MACRO_ID_RE = re.compile(r'ac:macro-id="([^"]+)"')
HEADING_RE = re.compile(r"<h([1-6])>(.*?)</h\1>", re.DOTALL)
TAG_RE = re.compile(r"<[^>]+>")
PLACEHOLDER_RE = re.compile(r"\{\{[^}]+\}\}")
UNESCAPED_AMP_RE = re.compile(r"&(?!amp;|lt;|gt;|quot;|apos;|#\d+;)")
PARAGRAPH_RE = re.compile(r"<p\b[^>]*>(.*?)</p>", re.DOTALL)


@dataclass(frozen=True)
class Heading:
    level: int
    title: str
    normalized: str


def clean_inline(text: str) -> str:
    text = TAG_RE.sub("", text)
    text = (
        text.replace("&amp;", "&")
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", '"')
        .replace("&apos;", "'")
    )
    return " ".join(text.split())


def normalize(text: str) -> str:
    text = clean_inline(text).lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return " ".join(text.split())


def headings(text: str) -> list[Heading]:
    found: list[Heading] = []
    for match in HEADING_RE.finditer(text):
        title = clean_inline(match.group(2))
        if title:
            found.append(Heading(int(match.group(1)), title, normalize(title)))
    return found


def paragraph_texts(text: str) -> list[str]:
    values: list[str] = []
    for match in PARAGRAPH_RE.finditer(text):
        value = normalize(match.group(1))
        if value:
            values.append(value)
    return values


def repeated_heading_findings(found: list[Heading]) -> list[str]:
    by_level: defaultdict[int, list[str]] = defaultdict(list)
    for heading in found:
        by_level[heading.level].append(heading.normalized)

    findings: list[str] = []
    for level, titles in sorted(by_level.items()):
        duplicates = [title for title, count in Counter(titles).items() if count > 1]
        for title in duplicates:
            findings.append(f"Duplicate h{level} heading: {title!r}")
    return findings


def parent_child_label_findings(found: list[Heading]) -> list[str]:
    findings: list[str] = []
    for index, parent in enumerate(found):
        for child in found[index + 1 :]:
            if child.level <= parent.level:
                break
            if child.level == parent.level + 1 and child.normalized.startswith(parent.normalized + " "):
                findings.append(
                    f"Redundant parent/child heading labels: {parent.title!r} -> {child.title!r}"
                )
    return findings


def faq_pattern_findings(text: str, found: list[Heading]) -> list[str]:
    normalized_headings = [heading.normalized for heading in found]
    findings: list[str] = []

    if "faq questions" in normalized_headings:
        findings.append("Use child heading 'Questions' instead of duplicated heading 'FAQ Questions'.")

    if "faq" in normalized_headings and {"legend", "questions"}.issubset(set(normalized_headings)):
        findings.append("Use parent heading 'Legend And FAQ' instead of 'FAQ' with child Legend/Questions sections.")

    prose = normalize(text)
    blocked_phrases = (
        "questions below are grouped",
        "use the legend tabs first",
    )
    for phrase in blocked_phrases:
        if phrase in prose:
            findings.append(f"Remove redundant instructional FAQ prose: {phrase!r}.")
    return findings


def duplicate_paragraph_findings(text: str) -> list[str]:
    values = paragraph_texts(text)
    duplicates = [value for value, count in Counter(values).items() if count > 1 and len(value) > 30]
    return [f"Duplicate paragraph text: {value[:90]!r}" for value in duplicates]


def audit(path: Path) -> tuple[list[str], list[str]]:
    text = path.read_text(encoding="utf-8", errors="replace")
    failures: list[str] = []
    warnings: list[str] = []

    open_macro = len(MACRO_OPEN_RE.findall(text))
    close_macro = len(MACRO_CLOSE_RE.findall(text))
    self_macro = len(MACRO_SELF_RE.findall(text))
    open_body = len(BODY_OPEN_RE.findall(text))
    close_body = len(BODY_CLOSE_RE.findall(text))

    if (open_macro - self_macro) != close_macro:
        failures.append(
            f"Macro balance failed: effective opens={open_macro - self_macro}, closes={close_macro}."
        )
    if open_body != close_body:
        failures.append(f"Rich-text body balance failed: opens={open_body}, closes={close_body}.")

    placeholders = PLACEHOLDER_RE.findall(text)
    if placeholders:
        failures.append(f"Unresolved placeholders remain: {', '.join(sorted(set(placeholders)))}.")

    ampersands = UNESCAPED_AMP_RE.findall(text)
    if ampersands:
        failures.append(f"Found {len(ampersands)} unescaped ampersand character(s).")

    macro_ids = MACRO_ID_RE.findall(text)
    duplicate_macro_ids = [macro_id for macro_id, count in Counter(macro_ids).items() if count > 1]
    if duplicate_macro_ids:
        failures.append(f"Duplicate macro IDs: {', '.join(sorted(duplicate_macro_ids))}.")

    found_headings = headings(text)
    failures.extend(repeated_heading_findings(found_headings))
    failures.extend(parent_child_label_findings(found_headings))
    failures.extend(faq_pattern_findings(text, found_headings))
    warnings.extend(duplicate_paragraph_findings(text))

    if not found_headings:
        warnings.append("No headings found; confirm this is intentional.")

    return failures, warnings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Path to a Confluence storage-format file")
    args = parser.parse_args()

    failures, warnings = audit(args.path)

    print(f"File: {args.path}")
    print(f"QA gate status: {'PASS' if not failures else 'FAIL'}")
    print()

    if failures:
        print("Failures:")
        for failure in failures:
            print(f"  - {failure}")
    else:
        print("Failures: none")

    print()
    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")
    else:
        print("Warnings: none")

    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
