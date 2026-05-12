#!/usr/bin/env python3
"""Extract a compact outline from Confluence storage-format markup."""

from __future__ import annotations

import argparse
import re
from pathlib import Path


HEADING_RE = re.compile(r"<h([1-6])>(.*?)</h\1>", re.DOTALL)
TAB_RE = re.compile(
    r'<ac:structured-macro\b[^>]*ac:name="ui-tab"[^>]*>.*?<ac:parameter ac:name="title">(.*?)</ac:parameter>',
    re.DOTALL,
)
EXPAND_RE = re.compile(
    r'<ac:structured-macro\b[^>]*ac:name="ui-expand"[^>]*>.*?<ac:parameter ac:name="title">(.*?)</ac:parameter>',
    re.DOTALL,
)


def clean(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return " ".join(text.split())


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("path", type=Path, help="Path to Confluence storage-format file")
    args = parser.parse_args()

    text = args.path.read_text(encoding="utf-8", errors="replace")

    print(f"File: {args.path}")
    print()
    print("Headings")
    for match in HEADING_RE.finditer(text):
        level = match.group(1)
        title = clean(match.group(2))
        if title:
            print(f"  h{level}: {title}")

    print()
    print("Tabs")
    for title in TAB_RE.findall(text):
        print(f"  - {clean(title)}")

    print()
    print("Expand Sections")
    for title in EXPAND_RE.findall(text):
        print(f"  - {clean(title)}")


if __name__ == "__main__":
    main()
