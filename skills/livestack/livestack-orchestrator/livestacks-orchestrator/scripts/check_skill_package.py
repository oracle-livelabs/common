#!/usr/bin/env python3
"""Check livestacks-orchestrator package hygiene before sharing or bundling."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


REQUIRED_PATHS = (
    "SKILL.md",
    "VERSION",
    "update.json",
    "agents/openai.yaml",
    "scripts/discover_specialist_skills.py",
    "scripts/self_update.py",
    "scripts/init_livestack_bundle.py",
    "scripts/validate_livestack_bundle.py",
    "scripts/grade_livestack_bundle.py",
    "scripts/find_scaffold_markers.py",
    "scripts/ensure_oracle_db_skill.py",
    "scripts/ensure_livestack_guide_builder.py",
    "scripts/ensure_redwood_creator.py",
    "scripts/sync_oracle_db_bundle.py",
    "scripts/sync_livestack_guide_builder_bundle.py",
    "references/golden-core-overlay-contract.md",
    "references/prd-build-contract.md",
    "references/role-playbooks.md",
    "references/full-stack-delivery.md",
    "references/guide-deliverable.md",
    "references/package-contract.md",
    "references/architecture-guardrails.md",
    "assets/templates/golden-livestack-baseline/compose.yml",
    "assets/templates/golden-livestack-baseline/.env.example",
    "assets/bundled/oracle-db-skills/BUNDLED_SKILL.md",
    "assets/bundled/livestack-guide-builder/BUNDLED_SKILL.md",
    "assets/bundled/redwood-creator/BUNDLED_SKILL.md",
    "tests/test_grading_gate.py",
)

TRANSIENT_DIR_NAMES = {
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".ruff_cache",
    "__MACOSX",
}

TRANSIENT_FILE_NAMES = {
    ".DS_Store",
}

TRANSIENT_SUFFIXES = {
    ".pyc",
    ".pyo",
}


@dataclass
class Finding:
    path: str
    message: str


def relative(path: Path, root: Path) -> str:
    try:
        return str(path.relative_to(root))
    except ValueError:
        return str(path)


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore")


def parse_frontmatter(text: str) -> dict[str, str]:
    match = re.match(r"^---\n(?P<body>.*?)\n---\n", text, re.DOTALL)
    if not match:
        return {}

    values: dict[str, str] = {}
    for line in match.group("body").splitlines():
        if ":" not in line:
            continue
        key, value = line.split(":", 1)
        values[key.strip()] = value.strip().strip("'\"")
    return values


def check_required_paths(root: Path, findings: list[Finding]) -> None:
    for path in REQUIRED_PATHS:
        if not (root / path).exists():
            findings.append(Finding(path, "required package path is missing"))


def check_frontmatter(root: Path, findings: list[Finding]) -> None:
    skill_path = root / "SKILL.md"
    if not skill_path.exists():
        return

    metadata = parse_frontmatter(read_text(skill_path))
    if metadata.get("name") != "livestacks-orchestrator":
        findings.append(Finding("SKILL.md", "frontmatter `name` must be `livestacks-orchestrator`"))
    description = metadata.get("description", "")
    for token in ("PRD", "LiveStacks", "Oracle"):
        if token.lower() not in description.lower():
            findings.append(Finding("SKILL.md", f"frontmatter description should mention `{token}`"))


def check_version_surfaces(root: Path, findings: list[Finding]) -> None:
    version_path = root / "VERSION"
    if not version_path.exists():
        return

    version = read_text(version_path).strip()
    if not version:
        findings.append(Finding("VERSION", "version file is empty"))
        return

    for path in ("README.md", "CHANGELOG.md", "NOTICE"):
        target = root / path
        if target.exists() and version not in read_text(target):
            findings.append(Finding(path, f"does not mention current version `{version}`"))


def check_openai_yaml(root: Path, findings: list[Finding]) -> None:
    path = root / "agents" / "openai.yaml"
    if not path.exists():
        return

    text = read_text(path)
    for key in ("display_name:", "short_description:", "default_prompt:"):
        if key not in text:
            findings.append(Finding("agents/openai.yaml", f"missing `{key}`"))


def check_transient_artifacts(root: Path, findings: list[Finding]) -> None:
    for path in root.rglob("*"):
        name = path.name
        if path.is_dir() and name in TRANSIENT_DIR_NAMES:
            findings.append(Finding(relative(path, root), "transient cache directory must not be packaged"))
            continue
        if not path.is_file():
            continue
        if name in TRANSIENT_FILE_NAMES or name.startswith("._") or path.suffix in TRANSIENT_SUFFIXES:
            findings.append(Finding(relative(path, root), "transient metadata or bytecode file must not be packaged"))


def check_script_syntax(root: Path, findings: list[Finding]) -> None:
    scripts_root = root / "scripts"
    if not scripts_root.exists():
        return

    for path in sorted(scripts_root.glob("*.py")):
        try:
            compile(read_text(path), str(path), "exec")
        except SyntaxError as error:
            rel = relative(path, root)
            findings.append(Finding(rel, f"Python syntax error at line {error.lineno}: {error.msg}"))


def check_package(root: Path) -> list[Finding]:
    findings: list[Finding] = []
    check_required_paths(root, findings)
    check_frontmatter(root, findings)
    check_version_surfaces(root, findings)
    check_openai_yaml(root, findings)
    check_transient_artifacts(root, findings)
    check_script_syntax(root, findings)
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "skill_root",
        nargs="?",
        default=str(Path(__file__).resolve().parents[1]),
        help="Path to the livestacks-orchestrator skill root. Defaults to this script's parent skill.",
    )
    args = parser.parse_args()

    root = Path(args.skill_root).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Skill root does not exist: {root}")

    findings = check_package(root)
    if findings:
        for finding in findings:
            print(f"{root / finding.path}: {finding.message}", file=sys.stderr)
        return 1

    print("Skill package hygiene checks passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
