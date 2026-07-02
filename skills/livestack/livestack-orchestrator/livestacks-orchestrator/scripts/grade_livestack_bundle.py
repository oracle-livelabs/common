#!/usr/bin/env python3
"""Grade a generated LiveStacks bundle and pass only on A+ capability-led evidence."""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import asdict, dataclass
from pathlib import Path


SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from validate_livestack_bundle import (  # noqa: E402
    CANONICAL_CORE_FILES,
    DESTRUCTIVE_DATASET_API_ROUTES,
    Finding,
    REQUIRED_DATASET_API_ROUTES,
    Validator,
    scene_experience_summary,
    screenshot_caption_experience_summary,
)


@dataclass
class Criterion:
    name: str
    points: int
    passed: bool
    detail: str


@dataclass
class GradeResult:
    score: int
    grade: str
    passed: bool
    findings: list[Finding]
    criteria: list[Criterion]


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="ignore") if path.exists() else ""


def normalized(text: str) -> str:
    return "\n".join(line.rstrip() for line in text.replace("\r\n", "\n").splitlines()).rstrip() + "\n"


def all_solution_text(root: Path) -> str:
    parts: list[str] = []
    excluded = {"node_modules", "dist", ".git", "__pycache__", ".venv"}
    suffixes = {".py", ".js", ".ts", ".tsx", ".jsx", ".html", ".css", ".sh", ".ps1", ".md", ".json", ".sql", ".yml", ".yaml"}
    for path in root.rglob("*"):
        if not path.is_file():
            continue
        if excluded.intersection(path.parts):
            continue
        if path.suffix.lower() in suffixes:
            parts.append(read_text(path))
    return "\n".join(parts)


def golden_core_parity(root: Path) -> Criterion:
    mismatches: list[str] = []
    for relative_path, canonical_path in CANONICAL_CORE_FILES.items():
        target = root / relative_path
        if not target.exists():
            mismatches.append(relative_path)
            continue
        if normalized(read_text(target)) != normalized(read_text(canonical_path)):
            mismatches.append(relative_path)
    return Criterion(
        "golden_core_parity",
        15,
        not mismatches,
        "stack/compose.yml and stack/.env.example match the capability-led runtime baseline"
        if not mismatches
        else "golden baseline drift: " + ", ".join(mismatches),
    )


def runtime_contract(root: Path) -> Criterion:
    text = all_solution_text(root)
    lower = text.lower()
    route_ok = all(route in text or route.replace(":jobId", "") in text for route in REQUIRED_DATASET_API_ROUTES)
    destructive_ok = any(route in text for route in DESTRUCTIVE_DATASET_API_ROUTES)
    passed = all(
        (
            "/healthz" in text,
            "ORDS_BASE_URL" in text,
            "fetch(" in text or "http.request" in text or "axios" in text,
            "upload your own data" in lower or "use your own data" in lower,
            "oracle internals" in lower or "database x-ray" in lower,
            "command center" in lower,
            "data foundation" in lower,
            "scene-aware" in lower or "scene aware" in lower or "activescene" in lower,
            "aria-expanded" in lower or "collapsible" in lower or "collapsed" in lower,
            route_ok,
            destructive_ok,
            "admin_token" in lower or "authorization" in lower,
        )
    )
    return Criterion(
        "runtime_contract",
        15,
        passed,
        "runtime exposes health, ORDS-backed flows, Command Center, Data Foundation, scene-aware Oracle Internals, dataset routes, and admin-gated destructive actions",
    )


def redwood_oracle_contract(root: Path) -> Criterion:
    text = all_solution_text(root)
    lower = text.lower()
    icon_count = text.count("oj-fwk-icon-") + text.count("oj-icon-font")
    rich_oracle_internals = all(
        (
            "what's happening" in lower or "what is happening" in lower,
            "featurebadge" in lower or "oracle-feature-badge" in lower or "capability badge" in lower,
            "sqlblock" in lower or "oracle-sql-block" in lower or "pl/sql" in lower,
            "diagrambox" in lower or "oracle-diagram" in lower or "architecture flow" in lower,
            "governancecallout" in lower or "governance boundary" in lower or "security/governance" in lower,
            "liveevidence" in lower or "oracle-live-grid" in lower or "live evidence" in lower,
        )
    )
    passed = all(
        (
            "@oracle/oraclejet" in text,
            "oj-redwood" in text or "@oracle/oraclejet/dist/css/redwood" in text,
            "Oracle Sans" in text,
            "--oj-html-font-family" in text or "var(--oj-html-font-family" in text,
            icon_count >= 3,
            "sceneManifest" in text or "scene manifest" in lower,
            "app-brand-lockup" in text or "brand-lockup" in lower or "Oracle LiveStack" in text,
            "scene-rail" in text or "left-side scene navigation" in lower or "scene navigation" in lower,
            "feature-chip" in text or "oracleFeatures" in text or "feature chip" in lower,
            "right-oracle-panel" in text or "RightOraclePanel" in text,
            "RegisterOraclePanel" in text or "registerSceneEvidence" in text or "useOraclePanel" in text,
            rich_oracle_internals,
            "lucide-react" not in lower,
            "tailwindcss" not in lower,
            "@tailwind" not in lower,
        )
    )
    return Criterion(
        "redwood_oracle_contract",
        15,
        passed,
        "Oracle JET Redwood, Oracle Sans typography, JET icons, scene manifest, left rail, feature chips, Oracle lockup, and a rich right-side Oracle Internals exhibit are present without Tailwind or non-JET icon libraries",
    )


def scene_experience_contract(root: Path) -> Criterion:
    summary = scene_experience_summary(root)
    caption_summary = screenshot_caption_experience_summary(root)
    checks = {
        "scene-specific components/page modules": summary.get("has_scene_specific_components"),
        "distinct interaction patterns": summary.get("has_distinct_interaction_patterns"),
        "scene-local state": summary.get("has_scene_local_state"),
        "visible domain objects": summary.get("has_domain_objects"),
        "Oracle evidence per scene": summary.get("has_oracle_evidence_per_scene"),
        "workflow handoffs": summary.get("has_workflow_handoffs"),
        "distinct screenshot captions": caption_summary.get("passed"),
    }
    missing = [name for name, passed in checks.items() if not passed]
    passed = not missing and not summary.get("generic_repeated_scene_stage")
    if summary.get("generic_repeated_scene_stage"):
        missing.insert(0, "generic repeated scene-stage")
    return Criterion(
        "scene_experience_contract",
        15,
        passed,
        "Scene Experience Contract passes: scene-specific modules, distinct interactions, local state, domain objects, per-scene Oracle evidence, workflow handoffs, and screenshot captions prove different scenes"
        if passed
        else "Scene Experience Contract gaps: " + ", ".join(missing),
    )


def oracle_ai_evidence(root: Path) -> Criterion:
    text = all_solution_text(root).lower()
    vector_evidence_tokens = (
        "oracle ai vector search",
        "dbms_vector",
        "embedding_model",
        "vector_dimension",
        "distance_metric",
        "index_type",
        "top_k",
        "source attribution",
        "provider_boundary",
        "data_egress_caveat",
    )
    duality_evidence_tokens = (
        "json relational duality",
        "duality view",
        "provider_boundary",
        "data_egress_caveat",
        "ords",
        "sql reports",
    )
    has_visible_evidence = "oracle internals" in text or "database x-ray" in text
    vector_passed = all(token in text for token in vector_evidence_tokens)
    duality_passed = all(token in text for token in duality_evidence_tokens) and (
        "ai rejected" in text or "no llm is required" in text or "external llm answer generation rejected" in text
    )
    passed = has_visible_evidence and (vector_passed or duality_passed)
    return Criterion(
        "oracle_ai_evidence",
        15,
        passed,
        "Oracle evidence names the selected 26ai capability, provider boundary, data egress, and visible evidence surface",
    )


def guide_screenshot_evidence(root: Path) -> Criterion:
    inventory_path = root / "output/guide-screenshots/inventory.json"
    guide_images = list((root / "guide").glob("**/images/*"))
    passed = False
    captions_ok = False
    if inventory_path.exists():
        try:
            payload = json.loads(read_text(inventory_path))
        except json.JSONDecodeError:
            payload = {}
        inventory = payload.get("inventory", [])
        failures = payload.get("failures", [])
        captions_ok = bool(screenshot_caption_experience_summary(root).get("passed"))
        passed = bool(inventory) and not failures and bool(guide_images) and captions_ok
    return Criterion(
        "guide_screenshot_evidence",
        10,
        passed,
        "guide screenshots are captured, integrated, failure-free, and captioned with distinct visual/behavioral scene evidence"
        if passed
        else "guide screenshots must be captured, integrated, failure-free, and captioned with visually distinct scene workflows for A+",
    )


def red_green_test_evidence(root: Path) -> Criterion:
    text = read_text(root / "validation/test-evidence.md").lower()
    required = ("red", "fail", "green", "pass", "a+", "grade", "capability-led", "operator", "golden", "parity")
    passed = all(token in text for token in required)
    return Criterion(
        "red_green_test_evidence",
        10,
        passed,
        "validation/test-evidence.md records red tests, green tests, A+ grading, capability-led operator evidence, and golden parity"
        if passed
        else "validation/test-evidence.md must record failing-before and passing-after tests plus A+ capability-led operator and golden parity evidence",
    )


def package_hygiene(root: Path) -> Criterion:
    bad_names = {".DS_Store", "__MACOSX", "__pycache__"}
    bad_suffixes = {".pyc", ".pyo"}
    bad_paths: list[str] = []
    for path in root.rglob("*"):
        if path.name in bad_names or path.name.startswith("._") or path.suffix in bad_suffixes:
            bad_paths.append(str(path.relative_to(root)))
            if len(bad_paths) >= 5:
                break
    return Criterion(
        "package_hygiene",
        5,
        not bad_paths,
        "no transient cache or macOS metadata artifacts"
        if not bad_paths
        else "transient artifacts found: " + ", ".join(bad_paths),
    )


def grade_for_score(score: int, *, hard_failures: bool, criteria_failed: bool) -> str:
    if score == 100 and not hard_failures and not criteria_failed:
        return "A+"
    if score >= 93:
        return "A"
    if score >= 90:
        return "A-"
    if score >= 87:
        return "B+"
    if score >= 83:
        return "B"
    if score >= 80:
        return "B-"
    if score >= 70:
        return "C"
    return "F"


def grade_bundle(root: Path) -> GradeResult:
    root = root.expanduser().resolve()
    findings = Validator(root).validate()
    criteria = [
        golden_core_parity(root),
        runtime_contract(root),
        redwood_oracle_contract(root),
        scene_experience_contract(root),
        oracle_ai_evidence(root),
        guide_screenshot_evidence(root),
        red_green_test_evidence(root),
        package_hygiene(root),
    ]
    score = sum(criterion.points for criterion in criteria if criterion.passed)
    if findings:
        score = min(score, 89)
    criteria_failed = any(not criterion.passed for criterion in criteria)
    grade = grade_for_score(score, hard_failures=bool(findings), criteria_failed=criteria_failed)
    passed = grade == "A+" and score == 100 and not findings and not criteria_failed
    return GradeResult(score=score, grade=grade, passed=passed, findings=findings, criteria=criteria)


def result_to_dict(result: GradeResult) -> dict:
    return {
        "score": result.score,
        "grade": result.grade,
        "passed": result.passed,
        "findings": [asdict(finding) for finding in result.findings],
        "criteria": [asdict(criterion) for criterion in result.criteria],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution_root", help="Path to the generated LiveStacks solution folder.")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args()

    root = Path(args.solution_root)
    if not root.exists():
        raise SystemExit(f"Solution root does not exist: {root}")

    result = grade_bundle(root)
    if args.format == "json":
        print(json.dumps(result_to_dict(result), indent=2))
    else:
        print(f"Grade: {result.grade} ({result.score}/100)")
        print(f"Pass: {'yes' if result.passed else 'no'}")
        for criterion in result.criteria:
            status = "pass" if criterion.passed else "fail"
            print(f"- {status}: {criterion.name} ({criterion.points} pts) - {criterion.detail}")
        if result.findings:
            print("Findings:")
            for finding in result.findings:
                print(f"- {finding.path}:{finding.line}: {finding.message}")

    return 0 if result.passed else 1


if __name__ == "__main__":
    raise SystemExit(main())
