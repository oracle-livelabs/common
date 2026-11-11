#!/usr/bin/env python3
"""Reject newly added OCI Object Storage PAR URLs outside approved namespaces."""

from __future__ import annotations

import argparse
from dataclasses import dataclass
import re
import subprocess
import sys
from urllib.parse import unquote, urlsplit


ALLOWED_NAMESPACES = frozenset({"c4u04", "c4uo2"})
URL_PATTERN = re.compile(r"https?://\S+", re.IGNORECASE)
HUNK_PATTERN = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")
TEMPLATE_PATTERN = re.compile(r"<[^>]+>|%3c[^%]*%3e", re.IGNORECASE)
TRAILING_URL_PUNCTUATION = ".,;:!?)]}'\""


@dataclass(frozen=True)
class Finding:
    path: str
    line: int
    namespace: str | None


def par_namespace(candidate: str) -> tuple[bool, str | None]:
    """Return whether a URL is an Object Storage PAR and its namespace."""
    if TEMPLATE_PATTERN.search(candidate):
        return False, None

    cleaned = candidate.rstrip(TRAILING_URL_PUNCTUATION)
    parsed = urlsplit(cleaned)
    hostname = (parsed.hostname or "").lower()
    if "objectstorage" not in hostname.split(".") or not hostname.endswith(".oraclecloud.com"):
        return False, None

    segments = [unquote(segment) for segment in parsed.path.split("/") if segment]
    lowered = [segment.lower() for segment in segments]
    if "p" not in lowered:
        return False, None

    par_index = lowered.index("p")
    try:
        namespace_index = lowered.index("n", par_index + 2)
    except ValueError:
        return True, None

    if namespace_index + 1 >= len(segments):
        return True, None
    return True, segments[namespace_index + 1]


def findings_for_line(path: str, line_number: int, content: str) -> list[Finding]:
    findings: list[Finding] = []
    for match in URL_PATTERN.finditer(content):
        is_par, namespace = par_namespace(match.group(0))
        if not is_par:
            continue
        if namespace is None or namespace.lower() not in ALLOWED_NAMESPACES:
            findings.append(Finding(path=path, line=line_number, namespace=namespace))
    return findings


def findings_from_diff(diff_text: str) -> list[Finding]:
    findings: list[Finding] = []
    current_path = "unknown"
    new_line_number: int | None = None

    for raw_line in diff_text.splitlines():
        if raw_line.startswith("+++ "):
            current_path = raw_line[4:]
            if current_path.startswith("b/"):
                current_path = current_path[2:]
            continue

        hunk_match = HUNK_PATTERN.match(raw_line)
        if hunk_match:
            new_line_number = int(hunk_match.group(1))
            continue

        if new_line_number is None:
            continue
        if raw_line.startswith("+") and not raw_line.startswith("+++"):
            findings.extend(findings_for_line(current_path, new_line_number, raw_line[1:]))
            new_line_number += 1
        elif raw_line.startswith("-") and not raw_line.startswith("---"):
            continue
        elif raw_line.startswith(" "):
            new_line_number += 1

    return findings


def git_diff(base: str, head: str) -> str:
    result = subprocess.run(
        [
            "git",
            "diff",
            "--unified=0",
            "--no-color",
            "--no-ext-diff",
            "--diff-filter=ACMRT",
            base,
            head,
            "--",
        ],
        check=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return result.stdout


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base", required=True, help="Base Git revision")
    parser.add_argument("--head", required=True, help="Head Git revision")
    args = parser.parse_args()

    try:
        findings = findings_from_diff(git_diff(args.base, args.head))
    except subprocess.CalledProcessError as error:
        print(f"ERROR: Unable to inspect the PR diff: {error.stderr.strip()}", file=sys.stderr)
        return 2

    if not findings:
        print("PASS: All newly added OCI Object Storage PAR URLs use approved namespaces.")
        return 0

    allowed = ", ".join(sorted(ALLOWED_NAMESPACES))
    for finding in findings:
        if finding.namespace is None:
            detail = "does not expose an Object Storage namespace"
        else:
            detail = f"uses unapproved Object Storage namespace '{finding.namespace}'"
        print(
            f"ERROR: {finding.path} (line {finding.line}): PAR URL {detail}; "
            f"allowed namespaces: {allowed}."
        )
    print(f"Validation failed with {len(findings)} unapproved PAR URL(s).")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
