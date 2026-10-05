#!/usr/bin/env python3
"""Quick audit for Confluence storage-format structure."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


MACRO_OPEN_RE = re.compile(r"<ac:structured-macro\b")
MACRO_CLOSE_RE = re.compile(r"</ac:structured-macro>")
MACRO_SELF_RE = re.compile(r"<ac:structured-macro\b[^>]+/>")
BODY_OPEN_RE = re.compile(r"<ac:rich-text-body>")
BODY_CLOSE_RE = re.compile(r"</ac:rich-text-body>")
HEADING_RE = re.compile(r"<h([1-6])>(.*?)</h\1>", re.DOTALL)


def clean_heading(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return " ".join(text.split())


def audit(path: Path) -> None:
    text = path.read_text(encoding="utf-8", errors="replace")
    open_macro = len(MACRO_OPEN_RE.findall(text))
    close_macro = len(MACRO_CLOSE_RE.findall(text))
    self_macro = len(MACRO_SELF_RE.findall(text))
    open_body = len(BODY_OPEN_RE.findall(text))
    close_body = len(BODY_CLOSE_RE.findall(text))

    print(f"File: {path}")
    print(f"structured-macro open: {open_macro}")
    print(f"structured-macro close: {close_macro}")
    print(f"structured-macro self-closing: {self_macro}")
    print(f"structured-macro effective open: {open_macro - self_macro}")
    print(f"rich-text-body open: {open_body}")
    print(f"rich-text-body close: {close_body}")
    print()

    macro_ok = (open_macro - self_macro) == close_macro
    body_ok = open_body == close_body
    print(f"macro balance ok: {macro_ok}")
    print(f"body balance ok: {body_ok}")
    print()

    print("Headings:")
    for match in HEADING_RE.finditer(text):
        level = match.group(1)
        heading = clean_heading(match.group(2))
        if heading:
            print(f"  h{level}: {heading}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Path to Confluence storage-format file")
    args = parser.parse_args()
    audit(args.path)


if __name__ == "__main__":
    main()
