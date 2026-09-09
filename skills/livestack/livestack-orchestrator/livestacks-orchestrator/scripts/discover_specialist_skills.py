#!/usr/bin/env python3
"""Discover installed skills that best match LiveStacks specialist roles."""

from __future__ import annotations

import argparse
import json
import os
import re
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class SkillMeta:
    name: str
    description: str
    path: str


ROLE_PROFILES = [
    {
        "role": "Project Manager",
        "preferred_names": [],
        "keywords": ["plan", "workflow", "milestone", "dependency", "roadmap", "project"],
        "fallback": "references/role-playbooks.md#project-manager",
        "orchestrator_fallback": {
            "summary": "Built-in LiveStacks project-management fallback for readiness, dependencies, and convergence.",
            "references": [
                "references/role-playbooks.md#project-manager",
                "references/project-manager-execution.md",
            ],
            "artifacts": [
                "input/working-prd.md",
                "docs/implementation-plan.md",
                "docs/architecture-decisions.md",
                "validation/launch-checklist.md",
            ],
        },
    },
    {
        "role": "Solution Engineer",
        "preferred_names": [],
        "keywords": ["requirements", "prd", "product", "persona", "acceptance criteria"],
        "fallback": "references/role-playbooks.md#solution-engineer",
        "orchestrator_fallback": {
            "summary": "Built-in LiveStacks solution-engineering fallback for working-PRD synthesis and acceptance criteria.",
            "references": [
                "references/role-playbooks.md#solution-engineer",
                "references/solution-engineering-execution.md",
                "references/prd-build-contract.md",
            ],
            "artifacts": [
                "input/working-prd.md",
                "docs/problem-framing.md",
                "docs/proposed-solution.md",
                "docs/feature-inventory.md",
            ],
        },
    },
    {
        "role": "Database Specialist",
        "preferred_names": ["oracle-db-skills"],
        "keywords": ["oracle", "database", "sql", "plsql", "ords", "schema", "migration"],
        "fallback": "scripts/ensure_oracle_db_skill.py -> references/role-playbooks.md#database-specialist + references/oracle-database-fallback.md",
        "orchestrator_fallback": {
            "summary": "Built-in Oracle-first database fallback when the Oracle specialist skill is unavailable.",
            "references": [
                "references/role-playbooks.md#database-specialist",
                "references/oracle-database-fallback.md",
                "references/architecture-guardrails.md",
            ],
            "artifacts": [
                "docs/data-design.md",
                "docs/oracle-capability-map.md",
                "database/sql/020_api_packages.sql",
                "database/sql/030_ords.sql",
                "database/sql/040_security.sql",
            ],
        },
    },
    {
        "role": "UI/UX Developer",
        "preferred_names": ["redwood-creator"],
        "keywords": ["frontend", "ui", "ux", "design", "interface", "component", "layout", "redwood", "oracle jet"],
        "fallback": "scripts/ensure_redwood_creator.py -> references/role-playbooks.md#uiux-developer",
        "orchestrator_fallback": {
            "summary": "Built-in UI/UX fallback for journeys, screens, and Oracle evidence surfaces.",
            "references": [
                "references/role-playbooks.md#uiux-developer",
            ],
            "artifacts": [
                "docs/ui-concept.md",
                "guide/introduction/introduction.md",
            ],
        },
    },
    {
        "role": "Full Stack Developer",
        "preferred_names": [],
        "keywords": ["backend", "api", "service", "full stack", "full-stack", "web api"],
        "fallback": "references/role-playbooks.md#full-stack-developer",
        "orchestrator_fallback": {
            "summary": "Built-in LiveStacks implementation fallback for runtime topology, service boundaries, and Oracle evidence plumbing.",
            "references": [
                "references/role-playbooks.md#full-stack-developer",
                "references/full-stack-delivery.md",
                "references/package-contract.md",
            ],
            "artifacts": [
                "stack/compose.yml",
                "stack/Containerfile",
                "stack/.env.example",
                "docs/ui-concept.md",
                "docs/deployment-guide.md",
                "docs/customer-rebuild.md",
            ],
        },
    },
    {
        "role": "Security / Platform Engineer",
        "preferred_names": ["security-best-practices"],
        "keywords": ["security", "threat", "deploy", "platform", "hardening", "least privilege"],
        "fallback": "references/role-playbooks.md#security-platform-engineer",
        "orchestrator_fallback": {
            "summary": "Built-in security and platform fallback for secrets, auth, portability, and runtime boundaries.",
            "references": [
                "references/role-playbooks.md#security-platform-engineer",
                "references/architecture-guardrails.md",
            ],
            "artifacts": [
                "database/sql/040_security.sql",
                "docs/deployment-guide.md",
                "docs/runbook.md",
                "validation/acceptance-checklist.md",
            ],
        },
    },
    {
        "role": "Technical Writer / Documentation Lead",
        "preferred_names": ["livestack-guide-builder"],
        "keywords": [
            "documentation",
            "author",
            "writing",
            "guide",
            "markdown",
            "workshop",
            "runbook",
            "scene",
            "livestack",
        ],
        "fallback": "scripts/ensure_livestack_guide_builder.py -> references/role-playbooks.md#technical-writer-documentation-lead + references/guide-deliverable.md",
        "orchestrator_fallback": {
            "summary": "Built-in LiveStack runbook guide fallback when the guide-builder skill is unavailable.",
            "references": [
                "references/role-playbooks.md#technical-writer-documentation-lead",
                "references/guide-deliverable.md",
                "references/package-contract.md",
            ],
            "artifacts": [
                "guide/",
                "docs/deployment-guide.md",
                "docs/customer-rebuild.md",
                "output/guide-screenshots/inventory.json",
                "output/guide-screenshots/inventory.md",
            ],
        },
    },
    {
        "role": "Devil's Advocate",
        "preferred_names": [],
        "keywords": ["review", "threat", "risk", "critique", "analysis"],
        "fallback": "references/role-playbooks.md#devils-advocate",
        "orchestrator_fallback": {
            "summary": "Built-in challenge-review fallback for Oracle indispensability, portability, and drift risks.",
            "references": [
                "references/role-playbooks.md#devils-advocate",
                "references/devils-advocate-review.md",
                "references/package-contract.md",
            ],
            "artifacts": [
                "docs/risks-and-review.md",
                "docs/architecture-decisions.md",
                "validation/acceptance-checklist.md",
            ],
        },
    },
]

PROVIDER_HINTS = {
    "cloudflare": ["cloudflare-deploy"],
    "render": ["render-deploy"],
    "vercel": ["vercel-deploy"],
    "netlify": ["netlify-deploy"],
}

OPTIONAL_SUPPORT_SKILLS = {
    "guide capture helper": ["playwright", "webapp-testing"],
    "oracle redwood app-ui helper": ["redwood-creator"],
}


def parse_frontmatter(skill_file: Path) -> SkillMeta | None:
    text = skill_file.read_text(encoding="utf-8", errors="ignore")
    match = re.match(r"^---\n(.*?)\n---\n", text, re.DOTALL)
    if not match:
        return None

    frontmatter = match.group(1)

    def extract(field: str) -> str:
        field_match = re.search(rf"^{field}:\s*(.+)$", frontmatter, re.MULTILINE)
        return field_match.group(1).strip().strip("'\"") if field_match else ""

    name = extract("name")
    description = extract("description")
    if not name:
        return None
    return SkillMeta(name=name, description=description, path=str(skill_file))


def discover_skills(root: Path, exclude_names: set[str]) -> list[SkillMeta]:
    skills: list[SkillMeta] = []

    top_level_skill = root / "SKILL.md"
    if top_level_skill.exists():
        meta = parse_frontmatter(top_level_skill)
        if meta and meta.name not in exclude_names:
            skills.append(meta)

    for child in sorted(root.iterdir()):
        if not child.is_dir() or child.name.startswith("."):
            continue
        skill_file = child / "SKILL.md"
        if not skill_file.exists():
            continue
        meta = parse_frontmatter(skill_file)
        if meta and meta.name not in exclude_names:
            skills.append(meta)

    deduped: dict[str, SkillMeta] = {}
    for skill in skills:
        deduped[skill.path] = skill
    return list(deduped.values())


def score_skill(skill: SkillMeta, profile: dict, deployment_target: str) -> tuple[int, list[str]]:
    haystack = f"{skill.name} {skill.description}".lower()
    score = 0
    reasons: list[str] = []

    for preferred in profile["preferred_names"]:
        preferred_lc = preferred.lower()
        if skill.name.lower() == preferred_lc:
            score += 100
            reasons.append(f"exact name match `{preferred}`")
        elif preferred_lc in skill.name.lower():
            score += 70
            reasons.append(f"name contains `{preferred}`")
        elif preferred_lc in haystack:
            score += 35
            reasons.append(f"description references `{preferred}`")

    for keyword in profile["keywords"]:
        keyword_lc = keyword.lower()
        if keyword_lc in haystack:
            score += 8
            reasons.append(f"keyword `{keyword}`")

    deployment_lc = deployment_target.lower()
    if deployment_lc:
        for provider_key, provider_skills in PROVIDER_HINTS.items():
            if provider_key in deployment_lc and skill.name in provider_skills:
                score += 40
                reasons.append(f"deployment target mentions `{provider_key}`")

    unique_reasons = []
    for reason in reasons:
        if reason not in unique_reasons:
            unique_reasons.append(reason)
    return score, unique_reasons


def confidence_for(score: int) -> str:
    if score >= 80:
        return "strong"
    if score >= 55:
        return "borderline"
    return "none"


def default_skills_root() -> Path:
    codex_home = os.environ.get("CODEX_HOME")
    if codex_home:
        return Path(codex_home).expanduser() / "skills"
    return Path.home() / ".codex" / "skills"


def orchestrator_skill_path() -> str:
    return str(Path(__file__).resolve().parents[1] / "SKILL.md")


def find_support_matches(skills: list[SkillMeta], deployment_target: str) -> list[dict]:
    matches: list[dict] = []
    deployment_lc = deployment_target.lower()

    if deployment_lc:
        for provider_key, provider_skill_names in PROVIDER_HINTS.items():
            if provider_key not in deployment_lc:
                continue
            for skill in skills:
                if skill.name not in provider_skill_names:
                    continue
                matches.append(
                    {
                        "reason": f"deployment target mentions `{provider_key}`",
                        "name": skill.name,
                        "path": skill.path,
                        "description": skill.description,
                    }
                )

    for reason, helper_skill_names in OPTIONAL_SUPPORT_SKILLS.items():
        for skill in skills:
            if skill.name not in helper_skill_names:
                continue
            matches.append(
                {
                    "reason": f"installed optional {reason}",
                    "name": skill.name,
                    "path": skill.path,
                    "description": skill.description,
                }
            )

    deduped: dict[tuple[str, str], dict] = {}
    for match in matches:
        deduped[(match["name"], match["reason"])] = match
    return list(deduped.values())


def build_report(skills_root: str, skills: list[SkillMeta], deployment_target: str, top_n: int) -> dict:
    roles = []
    for profile in ROLE_PROFILES:
        scored = []
        for skill in skills:
            score, reasons = score_skill(skill, profile, deployment_target)
            if score <= 0:
                continue
            scored.append(
                {
                    "name": skill.name,
                    "path": skill.path,
                    "description": skill.description,
                    "score": score,
                    "reasons": reasons,
                }
            )
        scored.sort(key=lambda item: (-item["score"], item["name"]))
        top = scored[:top_n]
        selected = top[0] if top else None
        confidence = confidence_for(selected["score"]) if selected else "none"
        if confidence == "none":
            selected = None
        execution_mode = "installed_skill" if selected else "unassigned"
        fallback_owner = None
        if not selected and profile.get("orchestrator_fallback"):
            execution_mode = "orchestrator_fallback"
            confidence = "orchestrator"
            fallback_owner = {
                "name": "livestacks-orchestrator",
                "path": orchestrator_skill_path(),
                "summary": profile["orchestrator_fallback"]["summary"],
                "references": profile["orchestrator_fallback"]["references"],
                "artifacts": profile["orchestrator_fallback"]["artifacts"],
            }
        roles.append(
            {
                "role": profile["role"],
                "selected": selected,
                "confidence": confidence,
                "execution_mode": execution_mode,
                "fallback_owner": fallback_owner,
                "fallback": profile["fallback"],
                "candidates": top,
            }
        )

    return {
        "skills_root": skills_root,
        "deployment_target": deployment_target or None,
        "support_matches": find_support_matches(skills, deployment_target),
        "roles": roles,
    }


def print_table(report: dict) -> None:
    print("Role | Execution | Confidence | Selected owner | Score | Fallback")
    print("--- | --- | --- | --- | --- | ---")
    for role in report["roles"]:
        selected = role["selected"]
        fallback_owner = role["fallback_owner"]
        selected_name = selected["name"] if selected else (fallback_owner["name"] if fallback_owner else "-")
        score = selected["score"] if selected else "-"
        print(
            f"{role['role']} | {role['execution_mode']} | {role['confidence']} | {selected_name} | {score} | {role['fallback']}"
        )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--skills-root",
        default=str(default_skills_root()),
        help="Root directory containing installed skills. Defaults to $CODEX_HOME/skills or ~/.codex/skills.",
    )
    parser.add_argument(
        "--deployment-target",
        default="",
        help="Optional deployment target hint to boost provider-specific skills.",
    )
    parser.add_argument(
        "--format",
        choices=["json", "table"],
        default="json",
        help="Output format.",
    )
    parser.add_argument(
        "--top-n",
        type=int,
        default=3,
        help="Number of candidates to retain per role.",
    )
    parser.add_argument(
        "--exclude-skill",
        action="append",
        default=["livestacks-orchestrator"],
        help="Skill names to ignore during discovery.",
    )
    args = parser.parse_args()

    skills_root = Path(args.skills_root).expanduser()
    if not skills_root.exists():
        raise SystemExit(f"Skills root does not exist: {skills_root}")

    skills = discover_skills(skills_root, set(args.exclude_skill))
    report = build_report(str(skills_root), skills, args.deployment_target, args.top_n)

    if args.format == "table":
        print_table(report)
    else:
        print(json.dumps(report, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
