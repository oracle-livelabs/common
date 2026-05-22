#!/usr/bin/env python3
import json
import sys
from pathlib import Path


def usage() -> None:
    print(
        "Usage:\n"
        "  render_manifest.py <workshop-root> <variant> <workshop-title> <lab-slug=Lab Title> [...]\n\n"
        "Example:\n"
        "  render_manifest.py /path/to/my-workshop sandbox \"My Workshop\" "
        "setup=Setup intro=Introduction query=\"Query Data\""
    )


def rel_filename(slug: str) -> str:
    if slug == "introduction":
        return "../../introduction/introduction.md"
    return f"../../{slug}/{slug}.md"


def main() -> int:
    if len(sys.argv) < 5 or sys.argv[1] in {"-h", "--help"}:
      usage()
      return 0 if len(sys.argv) >= 2 else 1

    workshop_root = Path(sys.argv[1]).expanduser().resolve()
    variant = sys.argv[2]
    workshop_title = sys.argv[3]
    specs = sys.argv[4:]

    variant_dir = workshop_root / "workshops" / variant
    variant_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = variant_dir / "manifest.json"

    tutorials = []
    has_need_help = False
    for spec in specs:
        if "=" not in spec:
            raise SystemExit(f"Invalid lab spec '{spec}'. Expected <lab-slug=Lab Title>.")
        slug, title = spec.split("=", 1)
        slug = slug.strip()
        title = title.strip()
        if slug == "need-help":
            has_need_help = True
            tutorials.append(
                {
                    "title": title or "Need Help?",
                    "description": "Template to link to Need Help lab at the end of workshop.",
                    "filename": "https://raw.githubusercontent.com/oracle-livelabs/common/main/labs/need-help/need-help-freetier.md",
                }
            )
            continue

        markdown_path = workshop_root / slug / f"{slug}.md"
        if slug == "introduction":
            markdown_path = workshop_root / "introduction" / "introduction.md"
        if not markdown_path.exists():
            print(f"Warning: markdown file does not exist yet: {markdown_path}", file=sys.stderr)

        tutorials.append(
            {
                "title": title,
                "description": "",
                "type": "livelabs",
                "filename": rel_filename(slug),
            }
        )

    if not has_need_help:
        tutorials.append(
            {
                "title": "Need Help?",
                "description": "Template to link to Need Help lab at the end of workshop.",
                "filename": "https://raw.githubusercontent.com/oracle-livelabs/common/main/labs/need-help/need-help-freetier.md",
            }
        )

    manifest = {
        "workshoptitle": workshop_title,
        "help": "livelabs-help-db_us@oracle.com",
        "tutorials": tutorials,
    }

    manifest_path.write_text(json.dumps(manifest, indent=4) + "\n", encoding="utf-8")
    print(f"Wrote manifest: {manifest_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
