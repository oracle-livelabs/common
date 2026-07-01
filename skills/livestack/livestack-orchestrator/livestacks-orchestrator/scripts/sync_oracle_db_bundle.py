#!/usr/bin/env python3
"""Refresh the bundled oracle-db-skills snapshot from the installed live skill."""

from __future__ import annotations

import argparse
import re
import shutil
from pathlib import Path


CATEGORY_DIRS = [
    "admin",
    "agent",
    "appdev",
    "architecture",
    "containers",
    "design",
    "devops",
    "features",
    "frameworks",
    "migrations",
    "monitoring",
    "ords",
    "performance",
    "plsql",
    "security",
    "sql-dev",
    "sqlcl",
]

IGNORE_PATTERNS = ("__pycache__", ".DS_Store", ".git", ".pytest_cache", "*.pyc", "._*", "__MACOSX")

LAYOUT_BLOCK = """## Packaged Directory Layout

```text
skills/
├── admin/          Database administration
├── agent/          Agent and NL-to-SQL safety patterns
├── appdev/         Drivers and application-development topics
├── architecture/   Infrastructure and deployment architecture
├── containers/     Oracle and adjacent container images and runtimes
├── design/         Schema design and data modeling
├── devops/         CI/CD and deployment operations
├── features/       Oracle database features, including AI/vector topics
├── frameworks/     ORM and framework integrations
├── migrations/     Migration guides to Oracle
├── monitoring/     Diagnostics and operational monitoring
├── ords/           Oracle REST Data Services
├── performance/    SQL and database tuning
├── plsql/          PL/SQL development
├── security/       Oracle security
├── sql-dev/        SQL development patterns
└── sqlcl/          SQLcl
```
"""


def parse_skill_name(skill_file: Path) -> str | None:
    text = skill_file.read_text(encoding="utf-8", errors="ignore")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        return None
    frontmatter = match.group(1)
    name_match = re.search(r"^name:\s*(.+)$", frontmatter, re.MULTILINE)
    if not name_match:
        return None
    return name_match.group(1).strip().strip("'\"")


def find_live_oracle_skill(skills_root: Path) -> Path:
    top_level_skill = skills_root / "SKILL.md"
    if top_level_skill.exists() and parse_skill_name(top_level_skill) == "oracle-db-skills":
        return skills_root

    child = skills_root / "oracle-db-skills"
    child_skill = child / "SKILL.md"
    if child_skill.exists() and parse_skill_name(child_skill) == "oracle-db-skills":
        return child

    for subdir in sorted(skills_root.iterdir()):
        if not subdir.is_dir():
            continue
        skill_file = subdir / "SKILL.md"
        if skill_file.exists() and parse_skill_name(skill_file) == "oracle-db-skills":
            return subdir

    raise SystemExit(f"Could not find a live oracle-db-skills install under {skills_root}")


def bundled_root() -> Path:
    return Path(__file__).resolve().parents[1] / "assets" / "bundled" / "oracle-db-skills"


def adapt_skill_markdown(live_text: str) -> str:
    text = live_text
    text = text.replace(
        "A curated Oracle Database reference library installed directly at this skills root.",
        "A curated Oracle Database reference library packaged as a standalone skill.",
    )
    text = text.replace(
        "3. **Use the live install paths at this root**: `admin/`, `agent/`, `appdev/`, `containers/`, and so on.",
        "3. **Use the bundled snapshot paths** under `skills/`.",
    )

    for directory in CATEGORY_DIRS:
        text = text.replace(f"`{directory}/`", f"`skills/{directory}/`")

    text = re.sub(
        r"## Installed Directory Layout\s+```text.*?```",
        LAYOUT_BLOCK,
        text,
        flags=re.DOTALL,
    )

    key_starting_points = [
        "sqlcl/sqlcl-mcp-server.md",
        "features/vector-search.md",
        "agent/nl-to-sql-patterns.md",
        "migrations/migration-assessment.md",
        "performance/explain-plan.md",
        "plsql/plsql-package-design.md",
        "containers/free.md",
        "frameworks/sqlalchemy-oracle.md",
    ]
    for path in key_starting_points:
        text = text.replace(f"`{path}`", f"`skills/{path}`")

    text = text.replace(
        "via the SQLcl MCP server",
        "via the SQLcl MCP server",
    )
    return text


def sync_categories(source_root: Path, destination_root: Path) -> None:
    skills_destination = destination_root / "skills"
    skills_destination.mkdir(parents=True, exist_ok=True)

    for directory in CATEGORY_DIRS:
        source_dir = source_root / directory
        if not source_dir.exists():
            raise SystemExit(f"Live oracle-db-skills is missing expected directory: {source_dir}")

        destination_dir = skills_destination / directory
        if destination_dir.exists():
            shutil.rmtree(destination_dir)
        shutil.copytree(source_dir, destination_dir, ignore=shutil.ignore_patterns(*IGNORE_PATTERNS))


def sync_bundled_skill_file(source_root: Path, destination_root: Path) -> None:
    live_skill = source_root / "SKILL.md"
    if not live_skill.exists():
        raise SystemExit(f"Live oracle-db-skills is missing SKILL.md: {live_skill}")

    bundled_skill = destination_root / "BUNDLED_SKILL.md"
    bundled_skill.write_text(adapt_skill_markdown(live_skill.read_text(encoding="utf-8")), encoding="utf-8")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skills-root",
        default=str(Path.home() / ".codex" / "skills"),
        help="Skills root containing the live oracle-db-skills install. Defaults to ~/.codex/skills.",
    )
    args = parser.parse_args()

    live_root = find_live_oracle_skill(Path(args.skills_root).expanduser())
    destination_root = bundled_root()
    if not destination_root.exists():
        raise SystemExit(f"Bundled oracle-db-skills root does not exist: {destination_root}")

    sync_categories(live_root, destination_root)
    sync_bundled_skill_file(live_root, destination_root)

    print(f"Synced bundled oracle-db-skills snapshot from {live_root} to {destination_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
