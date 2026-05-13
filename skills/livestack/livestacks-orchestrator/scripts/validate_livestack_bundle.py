#!/usr/bin/env python3
"""Validate semantic cross-file consistency in a generated LiveStacks bundle."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import asdict, dataclass
from pathlib import Path


CORE_FILES = {
    "input/business-input.md",
    "input/product-requirements.md",
    "input/assumptions.md",
    "input/template-provenance.json",
    "input/working-prd.md",
    "docs/architecture-decisions.md",
    "docs/problem-framing.md",
    "docs/proposed-solution.md",
    "docs/data-design.md",
    "docs/ui-concept.md",
    "docs/implementation-plan.md",
    "docs/feature-inventory.md",
    "docs/golden-core-overlays.md",
    "docs/oracle-capability-map.md",
    "docs/risks-and-review.md",
    "docs/deployment-guide.md",
    "docs/customer-rebuild.md",
    "docs/runbook.md",
    "guide/introduction/introduction.md",
    "guide/download-livestack/download-livestack.md",
    "guide/conclusion/conclusion.md",
    "guide/workshops/desktop/index.html",
    "guide/workshops/desktop/manifest.json",
    "guide/workshops/sandbox/index.html",
    "guide/workshops/sandbox/manifest.json",
    "guide/workshops/tenancy/index.html",
    "guide/workshops/tenancy/manifest.json",
    "output/guide-screenshots/inventory.json",
    "output/guide-screenshots/inventory.md",
    "stack/compose.yml",
    "stack/Containerfile",
    "stack/.env.example",
    "stack/scripts/bootstrap_db.sh",
    "stack/scripts/bootstrap_ollama_models.sh",
    "stack/scripts/bootstrap_ollama_models.ps1",
    "database/migrations/changes/001-baseline.sql",
    "database/sql/020_api_packages.sql",
    "database/sql/030_ords.sql",
    "database/sql/040_security.sql",
    "database/seed/050_demo_seed.sql",
    "validation/acceptance-checklist.md",
    "validation/launch-checklist.md",
    "validation/data-onboarding-checklist.md",
    "validation/test-evidence.md",
}

REQUIRED_ENV_KEYS = {
    "APP_ENV",
    "ADMIN_TOKEN",
    "ORDS_BASE_URL",
    "ORDS_PUBLIC_URL",
    "DB_HOST",
    "DB_SERVICE",
    "DB_APP_USER",
    "DB_APP_PASSWORD",
    "ORACLE_PWD",
    "OLLAMA_BASE_URL",
    "OLLAMA_HOST_URL",
    "OLLAMA_MODEL",
    "OLLAMA_EXTRA_MODELS",
}

FIXED_PORT_MAPPINGS = {
    "db": "1521:1521",
    "ords": "8181:8080",
    "ollama": "11434:11434",
    "app": "8505:3001",
}

FORBIDDEN_PORT_ENV_KEYS = {
    "APP_PORT",
    "DB_PORT",
    "ORDS_PORT",
    "OLLAMA_PORT",
}

ORDS_CONFIG_BIND = "./ords-config:/etc/ords/config:Z,U"

SECTION_REQUIREMENTS = {
    "input/working-prd.md": [
        "## Business Scenario",
        "## Business Outcomes",
        "## Personas",
        "## Pain-Point Classification",
        "## Core Workflow",
        "## Story Architecture",
        "## First Iteration Experience",
        "## Oracle AI Database 26ai Protagonist Story",
        "## AI Capability Mode",
        "## Provider Boundary And Data Egress",
        "## Oracle Feature Candidates",
        "## Recommended Oracle Feature Set",
        "## Rejected Features And Why",
        "## Oracle Capability Mapping",
        "## MVP Scope",
        "## Non-Goals",
        "## Feature Inventory",
        "## Feature-To-Scene Mapping",
        "## Data Contract",
        "## Deployment And Runtime Assumptions",
        "## Security And Trust Boundaries",
        "## Redwood JET UI Quality Bar",
        "## Non-Functional Requirements",
        "## Acceptance Criteria",
        "## Success Metrics",
        "## Assumptions",
        "## Open Questions",
    ],
    "docs/problem-framing.md": [
        "## Pain Point",
        "## Users",
        "## Business Outcomes",
        "## Scope Boundaries",
    ],
    "docs/proposed-solution.md": [
        "## Summary",
        "## Why Oracle Database Is The Engine",
        "## Why This LiveStacks Shape Fits The Problem",
    ],
    "docs/data-design.md": [
        "## Domain Model",
        "## Oracle Feature Mapping",
        "## ORDS Resource Plan",
        "## Dataset Onboarding And State",
        "## Oracle Evidence Map",
        "## Migrations And Seed Strategy",
    ],
    "docs/ui-concept.md": [
        "## Personas To Screens",
        "## Story Mode",
        "## First Scene Interaction",
        "## Scene Sequence",
        "## Primary CTA Path",
        "## Screen Inventory",
        "## Oracle Feature-To-Scene Map",
        "## Dataset Admin Flow",
        "## Upload Your Own Data Runtime Contract",
        "## Oracle Internals Or Database X-Ray",
        "## Oracle AI Evidence Fields",
        "## Redwood JET Polish Bar",
        "## Critical Interactions",
        "## Loading, Empty, And Error States",
    ],
    "docs/implementation-plan.md": [
        "## Milestones",
        "## Dependencies",
        "## Critical Path",
        "## Validation Plan",
        "## Open Issues",
    ],
    "docs/feature-inventory.md": [
        "## Primary Workflow Features",
        "## Operator And Admin Features",
        "## Oracle Evidence Features",
        "## Deferred Or Out Of Scope",
    ],
    "docs/golden-core-overlays.md": [
        "## Baseline",
        "## Industry Vocabulary",
        "## Pain-Point Workflow",
        "## Story Scenes",
        "## Oracle Capability Map",
        "## Data Contract",
        "## Guide Runbook",
        "## Residue Review",
    ],
    "docs/oracle-capability-map.md": [
        "## Protagonist Story",
        "## Candidate Features Considered",
        "## Chosen Feature Set",
        "## Rejected Features And Why",
        "## Capability To Business Mapping",
        "## Required Oracle Dependencies",
        "## AI Capability Mode",
        "## Provider Boundary And Data Egress",
        "## Security And Data-Egress Caveats",
        "## Scene Evidence Mapping",
        "## Oracle Evidence Surfaces",
        "## Customer Rebuild Implications",
    ],
    "docs/risks-and-review.md": [
        "## Challenged Assumptions",
        "## Devil's Advocate Findings",
        "## Revisions Made",
        "## Remaining Risks",
    ],
    "docs/deployment-guide.md": [
        "## Prerequisites",
        "## Environment Variables",
        "## Build And Run",
        "## Ollama Model Bootstrap",
        "## Health Checks",
    ],
    "docs/customer-rebuild.md": [
        "## Dataset Admin Workflow",
        "## Dataset Package Contract",
        "## Replace Demo Data",
        "## Adapt Integrations",
        "## Restore Demo Baseline",
        "## Validate In Customer Environment",
    ],
    "docs/runbook.md": [
        "## Startup",
        "## Ollama Model Bootstrap",
        "## Operational Checks",
        "## Troubleshooting",
        "## Recovery Notes",
    ],
    "validation/launch-checklist.md": [
        "## Environment Readiness",
        "## Service Startup",
        "## Health Checks",
        "## First Workflow Verification",
        "## Guide Alignment",
    ],
    "validation/data-onboarding-checklist.md": [
        "## Source Contract",
        "## Validate-Only Checks",
        "## Upload Or Replace Checks",
        "## Restore-Demo Checks",
        "## Derived Artifact Rebuild",
        "## Failure Handling",
    ],
    "validation/test-evidence.md": [
        "## Red Tests",
        "## Green Tests",
        "## A+ Grading Gate",
        "## Golden Parity",
    ],
    "validation/acceptance-checklist.md": [
        "## External Readiness",
        "## Multi-Agent Execution Evidence",
        "## Oracle Feature Evidence",
        "## Security Posture",
        "## Live Runtime Proof",
        "## Remaining Risks",
    ],
}

PLACEHOLDER_STRINGS = (
    "Replace this",
    "Replace with",
    "Replace Me",
    "LiveStacks App Shell",
    "Oracle JET Redwood App Shell",
    "Oracle JET / Redwood shell",
    "LiveStack Operator Workbench Starter",
    "starter_contract",
    "replace-with-",
    "replace-with-oracle",
)

RUNTIME_TEXT_SUFFIXES = {
    ".py",
    ".js",
    ".ts",
    ".tsx",
    ".jsx",
    ".html",
    ".css",
    ".cs",
    ".sh",
    ".ps1",
    ".md",
    ".yml",
    ".yaml",
    ".sql",
    ".xml",
}

TAILWIND_UTILITY_CLASS_RE = re.compile(
    r"""(?x)
    \b(?:className|class)\s*=\s*["'][^"']*
    \b(?:flex|grid|items-center|justify-[a-z-]+|px-\d+|py-\d+|p-\d+|m-\d+|text-[a-z0-9\[\]#/-]+|bg-[a-z0-9\[\]#/-]+|rounded-[a-z0-9-]+|shadow-[a-z0-9-]+|gap-\d+|space-[xy]-\d+|w-[a-z0-9\[\]/-]+|h-[a-z0-9\[\]/-]+|min-h-[a-z0-9\[\]/-]+|max-w-[a-z0-9\[\]/-]+)\b
    [^"']*
    \b(?:items-center|justify-[a-z-]+|px-\d+|py-\d+|p-\d+|m-\d+|text-[a-z0-9\[\]#/-]+|bg-[a-z0-9\[\]#/-]+|rounded-[a-z0-9-]+|shadow-[a-z0-9-]+|gap-\d+|space-[xy]-\d+|w-[a-z0-9\[\]/-]+|h-[a-z0-9\[\]/-]+|min-h-[a-z0-9\[\]/-]+|max-w-[a-z0-9\[\]/-]+)\b
    [^"']*["']
    """
)

MOCK_RUNTIME_PATH_TOKENS = ("demo-state", "/mock/", "\\mock\\", "/fixtures/", "\\fixtures\\")
MOCK_RUNTIME_DOC_PHRASES = ("mock-backed", "mock backed", "demo-state", "in-memory demo state", "mock backend")
MOCK_RUNTIME_IMPORT_PATTERN = re.compile(
    r"(?im)^\s*(?:import|from|const|let|var|using)\b.*(?:demo-state|mock|fixture|fake|stub)"
)

BOOTSTRAP_ARTIFACT_HINTS = (
    "database/sql",
    "database/migrations",
    "database/seed",
    "../database",
    "./database",
    "001-baseline.sql",
    "020_api_packages.sql",
    "030_ords.sql",
    "040_security.sql",
    "050_demo_seed.sql",
    "changelog-root.xml",
)

BOOTSTRAP_AUTOMATION_HINTS = (
    "sqlplus",
    "sqlcl",
    "liquibase",
    "flyway",
    "schemachange",
    "bootstrap_db",
    "bootstrap database",
    "apply migrations",
    "apply sql",
    "run migrations",
    "/opt/oracle/scripts/startup",
    "/docker-entrypoint-initdb.d",
)

ORDS_RUNTIME_HINTS = ("ords_base_url", "ords_public_url", "/ords/")
ORDS_CALL_HINTS = (
    "fetch(",
    "axios",
    "proxy",
    "createproxymiddleware",
    "http.request",
    "https.request",
    "requests.",
    "httpclient",
    "invoke-restmethod",
    "urllib.request",
    "got(",
    "undici",
)

REQUIRED_DATASET_API_ROUTES = (
    "/api/import/dataset",
    "/api/import/template",
    "/api/import/validate",
    "/api/import/upload",
    "/api/import/restore-demo/validate",
    "/api/import/restore-demo",
    "/api/import/status/:jobId",
)

DESTRUCTIVE_DATASET_API_ROUTES = (
    "/api/import/upload",
    "/api/import/restore-demo",
)

AUTH_GUARD_HINTS = (
    "admin_token",
    "admin token",
    "authorization",
    "bearer",
    "requireadmin",
    "require_admin",
    "requires_admin",
    "x-admin-token",
    "csrf",
    "jwt",
)

DIRECT_DB_RUNTIME_PATTERNS = (
    re.compile(r"(?im)^\s*(?:const|let|var)\s+\w+\s*=\s*require\([\"']oracledb[\"']\)"),
    re.compile(r"(?im)^\s*import\s+.*\s+from\s+[\"']oracledb[\"']"),
    re.compile(r"(?im)^\s*import\s+(?:oracledb|cx_Oracle)\b"),
    re.compile(r"(?im)^\s*from\s+(?:oracledb|cx_Oracle)\s+import\b"),
    re.compile(r"(?im)\bimport\s+Oracle\.ManagedDataAccess\b"),
    re.compile(r"(?i)\bjdbc:oracle:"),
    re.compile(r"(?i)\bOracleConnection\b"),
)

DIRECT_DB_EXCEPTION_TOKENS = (
    "direct app-to-database",
    "direct app to database",
    "direct oracle admin",
    "direct database admin",
)

DIRECT_DB_EXCEPTION_JUSTIFICATIONS = (
    "bootstrap",
    "migration",
    "migrations",
    "admin",
    "health",
    "readiness",
)

DIRECT_DB_EXCEPTION_DECISION_TOKENS = (
    "exception",
    "justified",
    "justification",
)

REQUIRED_TEMPLATE_OVERLAY_LAYERS = {
    "industry_vocabulary",
    "pain_point_workflow",
    "story_scenes",
    "oracle_capability_map",
    "data_contract",
    "guide_runbook",
}

EXPECTED_GOLDEN_BASELINE = "neutral-golden-livestack-core"

SKILL_ROOT = Path(__file__).resolve().parents[1]
CANONICAL_CORE_FILES = {
    "stack/compose.yml": SKILL_ROOT / "assets" / "templates" / "golden-livestack-baseline" / "compose.yml",
    "stack/.env.example": SKILL_ROOT / "assets" / "templates" / "golden-livestack-baseline" / ".env.example",
}

JET_FRAMEWORK_ICON_RE = re.compile(r"\boj-fwk-icon-[a-z0-9-]+\b")

NON_JET_ICON_LIBRARY_HINTS = (
    "lucide-react",
    "@heroicons/",
    "react-icons",
    "fontawesome",
    "fa-solid",
    "fa-regular",
)

WRONG_LINEAGE_TERMS = (
    "social-commerce",
    "social commerce",
    "newfold digital",
    "bluehost",
    "hostgator",
    "managed wordpress",
)

FIRST_ITERATION_PRD_KEYS = (
    "primary_user_loop",
    "first_scene_goal",
    "first_interaction",
    "first_decision_point",
    "first_oracle_evidence",
    "upload_your_own_data",
    "redwood_jet_ui_quality_bar",
)

AI_PRD_KEYS = (
    "ai_capability_mode",
    "provider_boundary",
    "data_egress_caveat",
)

ORACLE_AI_FEATURE_TOKENS = (
    "ai vector search",
    "dbms_vector",
    "dbms_vector_chain",
    "select ai",
    "dbms_cloud_ai",
    "vector(",
    "create vector index",
    "vector_distance",
    "vector_embedding",
    "nl-to-sql",
    "natural language to sql",
)

VECTOR_CLAIM_TOKENS = (
    "ai vector search",
    "dbms_vector",
    "dbms_vector_chain",
    "rag",
    "retrieval augmented",
    "semantic retrieval",
    "semantic search",
    "embedding",
    "vector(",
)

VECTOR_EVIDENCE_REQUIREMENTS = (
    (("embedding_model", "embedding model", "model_name", "model name"), "vector/RAG evidence must name the embedding model"),
    (("vector_dimension", "vector dimension", "dimensions:", "vector("), "vector/RAG evidence must name the vector dimension"),
    (("distance_metric", "distance metric", "cosine", "euclidean", "dot"), "vector/RAG evidence must name the distance metric"),
    (("index_type", "index type", "hnsw", "ivf", "vector index"), "vector/RAG evidence must name the vector index type or exact-search mode"),
    (("top_k", "top-k", "top k", "fetch first"), "vector/RAG evidence must name the top-k retrieval contract"),
    (("source attribution", "source_id", "chunk_id", "chunk id", "chunk/source"), "vector/RAG evidence must name source or chunk attribution"),
    (("ann", "approx", "approximate", "exact search", "exact-vs-ann", "exact vs ann"), "vector/RAG evidence must distinguish ANN from exact retrieval"),
)

SELECT_AI_CLAIM_TOKENS = (
    "select ai",
    "dbms_cloud_ai",
)

SELECT_AI_EVIDENCE_REQUIREMENTS = (
    (("object_list", "object list"), "Select AI usage must scope `object_list` to curated objects or views"),
    (("curated view", "curated views", "scoped view", "scoped views"), "Select AI usage must document the curated view or scoped object boundary"),
    (("showsql", "dbms_cloud_ai.generate", "deterministic template"), "Select AI usage must document `SHOWSQL`, `DBMS_CLOUD_AI.GENERATE`, or a deterministic template review path before execution"),
    (("read-only", "read only", "no dml", "no ddl"), "Select AI usage must document no-DML/no-DDL or read-only execution guardrails"),
)

AI_REJECTION_TOKENS = (
    "ai is out of scope",
    "no ai",
    "ai rejected",
    "reject ai",
    "without ai",
)

FIRST_INTERACTION_RUNTIME_HINTS = (
    "onclick",
    "addeventlistener",
    "aria-pressed",
    "fetch(",
    "form method=",
    "handleprimaryaction",
    "runprimaryaction",
)

GUIDE_ACTION_HINTS = (
    "click ",
    "open ",
    "review ",
    "inspect ",
    "run ",
    "load ",
    "compare ",
    "select ",
    "verify ",
)

MANUAL_BOOTSTRAP_PATTERNS = (
    r"(after|once).{0,140}(podman compose up|containers?.{0,40}(running|up)|startup|start the stack).{0,220}(sqlplus|sqlcl|\.sql|liquibase|flyway|apply)",
    r"manual(?:ly)? .{0,120}(apply|run).{0,120}(sqlplus|sqlcl|liquibase|flyway|migration|\.sql)",
    r"(run|apply).{0,120}(001-baseline\.sql|020_api_packages\.sql|030_ords\.sql|040_security\.sql|050_demo_seed\.sql)",
)


@dataclass
class Finding:
    path: str
    message: str
    line: int = 1


class Validator:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.findings: list[Finding] = []

    def add(self, relative_path: str, message: str, line: int = 1) -> None:
        self.findings.append(Finding(path=relative_path, message=message, line=line))

    def exists(self, relative_path: str) -> bool:
        return (self.root / relative_path).exists()

    def read_text(self, relative_path: str) -> str:
        return (self.root / relative_path).read_text(encoding="utf-8", errors="ignore")

    def line_number(self, text: str, needle: str) -> int:
        index = text.find(needle)
        if index < 0:
            return 1
        return text[:index].count("\n") + 1

    def has_valid_copy_markers(self, text: str) -> bool:
        open_count = text.count("<copy>")
        close_count = text.count("</copy>")
        if open_count == 0 and close_count == 0:
            return True
        if close_count > open_count:
            return False
        return (open_count - close_count) % 2 == 0

    def iter_runtime_text_files(self) -> list[Path]:
        stack_root = self.root / "stack"
        if not stack_root.exists():
            return []

        excluded_parts = {"node_modules", "dist", ".git", "__pycache__"}
        paths: list[Path] = []
        for path in stack_root.rglob("*"):
            if not path.is_file():
                continue
            if excluded_parts.intersection(path.parts):
                continue
            if path.suffix.lower() not in RUNTIME_TEXT_SUFFIXES:
                continue
            paths.append(path)
        return paths

    def has_real_ords_runtime_usage(self, text: str) -> bool:
        lower = text.lower()
        return any(hint in lower for hint in ORDS_RUNTIME_HINTS) and any(hint in lower for hint in ORDS_CALL_HINTS)

    def has_bootstrap_evidence(self, text: str) -> bool:
        lower = text.lower()
        return any(hint in lower for hint in BOOTSTRAP_ARTIFACT_HINTS) and any(
            hint in lower for hint in BOOTSTRAP_AUTOMATION_HINTS
        )

    def has_mock_runtime_indicator(self, relative_path: str, text: str) -> bool:
        lower_path = relative_path.lower()
        lower = text.lower()
        if any(token in lower_path for token in MOCK_RUNTIME_PATH_TOKENS):
            return True
        if any(token in lower for token in MOCK_RUNTIME_DOC_PHRASES):
            return True
        return bool(MOCK_RUNTIME_IMPORT_PATTERN.search(text))

    def has_direct_db_runtime_indicator(self, relative_path: str, text: str) -> bool:
        normalized_path = relative_path.replace("\\", "/")
        if normalized_path.startswith(("stack/scripts/", "stack/db/")):
            return False
        return any(pattern.search(text) for pattern in DIRECT_DB_RUNTIME_PATTERNS)

    def has_direct_db_exception_documented(self) -> bool:
        for relative_path in (
            "docs/architecture-decisions.md",
            "docs/data-design.md",
            "docs/deployment-guide.md",
            "validation/acceptance-checklist.md",
        ):
            if self.exists(relative_path):
                text = self.read_text(relative_path).lower()
                if (
                    any(token in text for token in DIRECT_DB_EXCEPTION_TOKENS)
                    and any(token in text for token in DIRECT_DB_EXCEPTION_JUSTIFICATIONS)
                    and any(token in text for token in DIRECT_DB_EXCEPTION_DECISION_TOKENS)
                ):
                    return True

        return False

    def iter_solution_text_files(self) -> list[Path]:
        excluded_parts = {"node_modules", "dist", ".git", "__pycache__", ".venv"}
        paths: list[Path] = []
        for path in self.root.rglob("*"):
            if not path.is_file():
                continue
            if excluded_parts.intersection(path.parts):
                continue
            suffix = path.suffix.lower()
            if suffix not in RUNTIME_TEXT_SUFFIXES and suffix != ".json":
                continue
            paths.append(path)
        return paths

    def read_json(self, relative_path: str) -> dict | None:
        if not self.exists(relative_path):
            return None

        text = self.read_text(relative_path)
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as error:
            self.add(relative_path, f"JSON is invalid: {error.msg}", error.lineno)
            return None

        if not isinstance(payload, dict):
            self.add(relative_path, "JSON payload must be an object")
            return None

        return payload

    def validate_template_provenance(self) -> None:
        relative_path = "input/template-provenance.json"
        payload = self.read_json(relative_path)
        if payload is None:
            return

        baseline = str(payload.get("baseline", "")).strip()
        if baseline != EXPECTED_GOLDEN_BASELINE:
            self.add(relative_path, f"`baseline` must be `{EXPECTED_GOLDEN_BASELINE}`")

        baseline_version = str(payload.get("baseline_version", "")).strip()
        if not baseline_version:
            self.add(relative_path, "`baseline_version` must be populated")

        overlay_source = str(payload.get("overlay_source", "")).strip()
        if not overlay_source:
            self.add(relative_path, "`overlay_source` must be populated")

        overlay_layers = payload.get("overlay_layers")
        if not isinstance(overlay_layers, list):
            self.add(relative_path, "`overlay_layers` must be a list")
            overlay_layers = []
        missing_layers = sorted(REQUIRED_TEMPLATE_OVERLAY_LAYERS - {str(layer) for layer in overlay_layers})
        for layer in missing_layers:
            self.add(relative_path, f"`overlay_layers` is missing `{layer}`")

        if payload.get("oracle_jet_redwood") is not True:
            self.add(relative_path, "`oracle_jet_redwood` must be true")
        if payload.get("ords_first") is not True:
            self.add(relative_path, "`ords_first` must be true")
        if payload.get("tailwind_allowed") is not False:
            self.add(relative_path, "`tailwind_allowed` must be false")

        for key in ("industry", "pain_point"):
            if not str(payload.get(key, "")).strip():
                self.add(relative_path, f"`{key}` must be populated after working PRD finalization")

    def normalize_core_text(self, text: str) -> str:
        return "\n".join(line.rstrip() for line in text.replace("\r\n", "\n").splitlines()).rstrip() + "\n"

    def validate_canonical_core_files(self) -> None:
        for relative_path, canonical_path in CANONICAL_CORE_FILES.items():
            if not self.exists(relative_path):
                continue
            if not canonical_path.exists():
                self.add(relative_path, f"validator canonical baseline is missing `{canonical_path.name}`")
                continue

            actual = self.normalize_core_text(self.read_text(relative_path))
            expected = self.normalize_core_text(canonical_path.read_text(encoding="utf-8", errors="ignore"))
            if actual != expected:
                self.add(
                    relative_path,
                    "file must match the neutral golden LiveStack core baseline; move industry, pain-point, and story variation into app/database/config overlays instead of changing this core file",
                )

    def validate_lineage_residue(self) -> None:
        provenance = self.read_json("input/template-provenance.json") or {}
        industry = str(provenance.get("industry", "")).lower()
        allow_newfold = "newfold" in industry

        findings = 0
        for path in self.iter_solution_text_files():
            if findings >= 5:
                break
            relative_path = str(path.relative_to(self.root))
            text = path.read_text(encoding="utf-8", errors="ignore")
            lower = text.lower()
            for term in WRONG_LINEAGE_TERMS:
                if term in {"newfold digital", "bluehost", "hostgator", "managed wordpress"} and allow_newfold:
                    continue
                if term in lower:
                    self.add(
                        relative_path,
                        f"wrong-template lineage residue found: `{term}`",
                        self.line_number(lower, term),
                    )
                    findings += 1
                    break

    def extract_heading_body(self, relative_path: str, heading: str) -> str:
        if not self.exists(relative_path):
            return ""

        lines = self.read_text(relative_path).splitlines()
        try:
            start = lines.index(heading)
        except ValueError:
            return ""

        end = len(lines)
        for idx in range(start + 1, len(lines)):
            if lines[idx].startswith("## "):
                end = idx
                break

        body_lines = []
        for line in lines[start + 1 : end]:
            stripped = line.strip()
            if not stripped or stripped.startswith("## "):
                continue
            body_lines.append(stripped)

        return "\n".join(body_lines).strip()

    def extract_scene_count_target(self, text: str) -> int | None:
        match = re.search(r"scene_count_target[^0-9]{0,20}(\d+)", text, re.IGNORECASE)
        if not match:
            return None
        try:
            return int(match.group(1))
        except ValueError:
            return None

    def scene_labels(self) -> list[str]:
        labels: list[str] = []
        for path in sorted((self.root / "guide").glob("scene-*/*.md")):
            folder = path.parent.name
            label = re.sub(r"^scene-\d+-", "", folder).replace("-", " ").strip()
            if label:
                labels.append(label)
        return labels

    def validate(self) -> list[Finding]:
        self.validate_core_files()
        self.validate_template_provenance()
        self.validate_canonical_core_files()
        self.validate_markdown_sections()
        self.validate_compose_contract()
        self.validate_env_contract()
        self.validate_containerfile()
        self.validate_app_contract()
        self.validate_bootstrap_scripts()
        self.validate_database_artifacts()
        self.validate_runtime_bootstrap_contract()
        self.validate_docs_alignment()
        self.validate_lineage_residue()
        self.validate_guide_contract()
        self.validate_screenshot_inventory()
        self.validate_oracle_evidence_surface()
        return self.findings

    def validate_core_files(self) -> None:
        for relative_path in sorted(CORE_FILES):
            if not self.exists(relative_path):
                self.add(relative_path, "missing core semantic-validation file")

        scene_files = sorted(self.root.glob("guide/scene-*/*.md"))
        if not scene_files:
            self.add("guide", "missing scene lab for semantic validation")

    def validate_markdown_sections(self) -> None:
        for relative_path, headings in SECTION_REQUIREMENTS.items():
            if not self.exists(relative_path):
                continue

            lines = self.read_text(relative_path).splitlines()
            for heading in headings:
                try:
                    start = lines.index(heading)
                except ValueError:
                    self.add(relative_path, f"missing required heading `{heading}`")
                    continue

                end = len(lines)
                for idx in range(start + 1, len(lines)):
                    if lines[idx].startswith("## "):
                        end = idx
                        break

                body_lines = []
                for line in lines[start + 1 : end]:
                    stripped = line.strip()
                    if not stripped:
                        continue
                    if stripped.startswith("## "):
                        continue
                    body_lines.append(stripped)

                if not body_lines:
                    self.add(relative_path, f"heading `{heading}` has no content", start + 1)

    def extract_service_block(self, compose_text: str, service: str) -> str | None:
        pattern = re.compile(
            rf"(?ms)^  {re.escape(service)}:\n(?P<body>.*?)(?=^  [A-Za-z0-9_-]+:\n|^networks:\n|^volumes:\n|\Z)"
        )
        match = pattern.search(compose_text)
        if not match:
            return None
        return match.group("body")

    def extract_compose_env_defaults(self, block_text: str) -> dict[str, str]:
        defaults: dict[str, str] = {}
        for match in re.finditer(
            r"(?m)^\s+([A-Z0-9_]+):\s*\$\{[A-Z0-9_]+:-([^}]+)\}\s*$",
            block_text,
        ):
            defaults[match.group(1)] = match.group(2)
        return defaults

    def has_fixed_port_mapping(self, block_text: str, published: str, target: str) -> bool:
        short_form = re.search(rf'(?m)^\s*-\s*["\']?{published}:{target}["\']?\s*$', block_text)
        long_form = re.search(
            rf"published:\s*[\"']?{published}[\"']?.*?target:\s*[\"']?{target}[\"']?",
            block_text,
            re.DOTALL,
        ) or re.search(
            rf"target:\s*[\"']?{target}[\"']?.*?published:\s*[\"']?{published}[\"']?",
            block_text,
            re.DOTALL,
        )
        return bool(short_form or long_form)

    def has_dependency(self, block_text: str, dependency: str) -> bool:
        list_form = re.search(rf"(?m)^\s*-\s*{re.escape(dependency)}\s*$", block_text)
        mapping_form = re.search(rf"(?m)^\s*{re.escape(dependency)}:\s*$", block_text)
        return bool(list_form or mapping_form)

    def has_bind_mount(self, block_text: str, mount: str) -> bool:
        return bool(re.search(rf'(?m)^\s*-\s*["\']?{re.escape(mount)}["\']?\s*$', block_text))

    def validate_compose_contract(self) -> None:
        relative_path = "stack/compose.yml"
        if not self.exists(relative_path):
            return

        text = self.read_text(relative_path)
        if re.search(r"(?m)^networks:\n  default:\s*(?:\{\})?\s*$", text) is None:
            self.add(relative_path, "missing top-level `networks.default` contract")

        for key in sorted(FORBIDDEN_PORT_ENV_KEYS):
            if re.search(rf"(?m)\b{re.escape(key)}\b", text):
                self.add(relative_path, f"compose contract must not expose `{key}`")

        expected_dependencies = {"app": ("ords", "ollama")}
        for service, mapping in FIXED_PORT_MAPPINGS.items():
            block = self.extract_service_block(text, service)
            if block is None:
                self.add(relative_path, f"missing `{service}` service block")
                continue

            if f"hostname: {service}" not in block:
                self.add(relative_path, f"`{service}` is missing `hostname: {service}`")
            if service not in block or f"- {service}" not in block:
                self.add(relative_path, f"`{service}` is missing its network alias")
            published, target = mapping.split(":")
            if not self.has_fixed_port_mapping(block, published, target):
                self.add(relative_path, f"`{service}` is missing fixed port mapping `{mapping}`")

            for dependency in expected_dependencies.get(service, ()):
                if not self.has_dependency(block, dependency):
                    self.add(relative_path, f"`{service}` is missing dependency on `{dependency}`")

        app_block = self.extract_service_block(text, "app")
        if app_block:
            if "/healthz" not in app_block:
                self.add(relative_path, "`app` healthcheck must probe `/healthz`")
            if "dockerfile: Containerfile" not in app_block:
                self.add(relative_path, "`app` must build from `Containerfile`")

        ords_block = self.extract_service_block(text, "ords")
        if ords_block:
            if "ORDS_PUBLIC_URL" not in ords_block:
                self.add(relative_path, "`ords` is missing `ORDS_PUBLIC_URL` environment wiring")
            if not self.has_bind_mount(ords_block, ORDS_CONFIG_BIND):
                self.add(relative_path, f"`ords` must mount `{ORDS_CONFIG_BIND}`")

    def parse_env_file(self, text: str) -> dict[str, str]:
        values: dict[str, str] = {}
        for raw_line in text.splitlines():
            line = raw_line.strip()
            if not line or line.startswith("#") or "=" not in raw_line:
                continue
            key, value = raw_line.split("=", 1)
            values[key.strip()] = value.strip()
        return values

    def validate_env_contract(self) -> None:
        relative_path = "stack/.env.example"
        if not self.exists(relative_path):
            return

        text = self.read_text(relative_path)
        env_values = self.parse_env_file(text)

        missing = sorted(REQUIRED_ENV_KEYS - set(env_values))
        for key in missing:
            self.add(relative_path, f"missing required env key `{key}`")

        for key in sorted(FORBIDDEN_PORT_ENV_KEYS):
            if key in env_values:
                self.add(relative_path, f"env example must not expose `{key}`")

        compose_path = "stack/compose.yml"
        if self.exists(compose_path):
            compose_text = self.read_text(compose_path)
            for service in ("ords", "app"):
                block = self.extract_service_block(compose_text, service)
                if not block:
                    continue
                defaults = self.extract_compose_env_defaults(block)
                for key, value in defaults.items():
                    if key in env_values and env_values[key] != value:
                        self.add(
                            relative_path,
                            f"`{key}` does not match compose default `{value}`",
                            self.line_number(text, f"{key}="),
                        )

    def validate_containerfile(self) -> None:
        relative_path = "stack/Containerfile"
        if not self.exists(relative_path):
            return

        text = self.read_text(relative_path)
        if "EXPOSE 3001" not in text:
            self.add(relative_path, "Containerfile must expose port `3001`")

    def validate_app_contract(self) -> None:
        stack_root = self.root / "stack"
        if not stack_root.exists():
            return

        frontend_pkg = stack_root / "frontend" / "package.json"
        if frontend_pkg.exists():
            text = frontend_pkg.read_text(encoding="utf-8", errors="ignore")
            if "@oracle/oraclejet" not in text:
                self.add("stack/frontend/package.json", "frontend package must include `@oracle/oraclejet`")
            if "tailwindcss" in text.lower():
                self.add("stack/frontend/package.json", "frontend package must not include `tailwindcss`; LiveStacks app UI must use Oracle JET / Redwood styling")
            if "lucide-react" in text.lower():
                self.add("stack/frontend/package.json", "frontend package must not include `lucide-react`; app chrome must use Oracle JET glyph classes")

        for tailwind_config in stack_root.glob("**/tailwind.config.*"):
            self.add(
                str(tailwind_config.relative_to(self.root)),
                "Tailwind config is not allowed; generated LiveStacks must use Oracle JET / Redwood styling",
            )

        health_route_found = False
        redwood_theme_found = False
        jet_icon_usage_found = False
        jet_icon_count = 0
        jet_typography_found = False
        oracle_sans_found = False
        tailwind_utility_findings = 0
        upload_data_runtime_found = False
        oracle_internals_runtime_found = False
        first_interaction_runtime_found = False
        ords_runtime_usage_found = False
        mock_indicator_count = 0
        dataset_route_found = {route: False for route in REQUIRED_DATASET_API_ROUTES}
        destructive_dataset_route_found = False
        auth_guard_found = False
        direct_db_runtime_paths: list[str] = []
        for path in self.iter_runtime_text_files():
            relative_path = str(path.relative_to(self.root))
            text = path.read_text(encoding="utf-8", errors="ignore")
            lower = text.lower()
            if '"/healthz"' in text or "'/healthz'" in text or "/healthz" in text:
                health_route_found = True
            if "oj-redwood" in text or "@oracle/oraclejet/dist/css/redwood" in text:
                redwood_theme_found = True
            framework_icon_matches = JET_FRAMEWORK_ICON_RE.findall(text)
            if framework_icon_matches or "oj-icon-font" in text or "oj-ux-ico-" in text:
                jet_icon_usage_found = True
                jet_icon_count += len(framework_icon_matches) + text.count("oj-ux-ico-")
            if "oj-ux-ico-" in text:
                self.add(
                    relative_path,
                    "`oj-ux-ico-*` usage must be backed by bundled/rendered glyph fonts; prefer known-rendering `oj-fwk-icon-*` classes",
                    self.line_number(text, "oj-ux-ico-"),
                )
            for library_hint in NON_JET_ICON_LIBRARY_HINTS:
                if library_hint in lower:
                    self.add(
                        relative_path,
                        f"non-JET icon library `{library_hint}` is not allowed for generated app chrome",
                        self.line_number(lower, library_hint),
                    )
                    break
            if "--oj-html-font-family" in text or "var(--oj-html-font-family" in text:
                jet_typography_found = True
            if "oracle sans" in lower:
                oracle_sans_found = True
            if "@tailwind" in lower or "tailwindcss" in lower:
                self.add(relative_path, "Tailwind is not allowed; generated LiveStacks must use Oracle JET / Redwood styling")
            if tailwind_utility_findings < 3 and TAILWIND_UTILITY_CLASS_RE.search(text):
                self.add(
                    relative_path,
                    "Tailwind-style utility classes are not allowed as the app UI foundation; use Oracle JET / Redwood structure and tokens",
                    self.line_number(text, TAILWIND_UTILITY_CLASS_RE.search(text).group(0)[:20]),
                )
                tailwind_utility_findings += 1
            if "upload your own data" in lower:
                upload_data_runtime_found = True
            if "Oracle Internals" in text or "Database X-Ray" in text:
                oracle_internals_runtime_found = True
            if any(hint in lower for hint in FIRST_INTERACTION_RUNTIME_HINTS):
                first_interaction_runtime_found = True
            if not ords_runtime_usage_found and self.has_real_ords_runtime_usage(text):
                ords_runtime_usage_found = True
            for route in REQUIRED_DATASET_API_ROUTES:
                if route in text or route.replace(":jobId", "") in text:
                    dataset_route_found[route] = True
            if any(route in text for route in DESTRUCTIVE_DATASET_API_ROUTES):
                destructive_dataset_route_found = True
            if any(hint in lower for hint in AUTH_GUARD_HINTS):
                auth_guard_found = True
            if self.has_direct_db_runtime_indicator(relative_path, text):
                direct_db_runtime_paths.append(relative_path)
            if mock_indicator_count < 3 and self.has_mock_runtime_indicator(relative_path, text):
                self.add(
                    relative_path,
                    "runtime file still indicates mock or demo-state business data; production-ready bundles must use real ORDS-backed flows",
                )
                mock_indicator_count += 1

        if not health_route_found:
            self.add("stack", "stack is missing an app-visible `/healthz` route or reference")
        if not redwood_theme_found:
            self.add("stack/frontend", "frontend must wire an Oracle JET Redwood theme import")
        if not jet_icon_usage_found:
            self.add("stack/frontend", "frontend must use Oracle JET icon classes for app UI iconography")
        if jet_icon_count < 3:
            self.add("stack/frontend", "frontend must use Oracle JET icons across navigation, actions, status, dataset controls, or Oracle Internals")
        if not jet_typography_found or not oracle_sans_found:
            self.add(
                "stack/frontend",
                "frontend must use Oracle JET typography/font variables backed by Oracle Sans",
            )
        if not upload_data_runtime_found:
            self.add("stack/frontend", "runtime UI must expose the persistent `Upload Your Own Data` dataset-admin entry")
        else:
            for route, found in dataset_route_found.items():
                if not found:
                    self.add(
                        "stack",
                        f"`Upload Your Own Data` is visible but the runtime is missing dataset API route `{route}`",
                    )
        if destructive_dataset_route_found and not auth_guard_found:
            self.add(
                "stack/backend",
                "destructive dataset routes must fail closed behind an admin token, Authorization header, CSRF, or equivalent operator-admin guard",
            )
        if direct_db_runtime_paths and not self.has_direct_db_exception_documented():
            for relative_path in sorted(set(direct_db_runtime_paths))[:3]:
                self.add(
                    relative_path,
                    "runtime appears to use direct Oracle database access; generated apps must route through ORDS unless a bootstrap, migration, health, or admin exception is documented",
                )
        if not oracle_internals_runtime_found:
            self.add("stack/frontend", "runtime UI must expose Oracle Internals or Database X-Ray evidence")
        if not first_interaction_runtime_found:
            self.add("stack/frontend", "runtime UI must include a first-screen interaction such as a primary CTA, event handler, or form")
        if self.exists("database/sql/030_ords.sql") and not ords_runtime_usage_found:
            self.add(
                "stack",
                "ORDS SQL exists but the runtime app does not appear to proxy or call ORDS using `ORDS_BASE_URL` or `ORDS_PUBLIC_URL`",
            )

    def validate_bootstrap_scripts(self) -> None:
        sh_path = "stack/scripts/bootstrap_ollama_models.sh"
        ps_path = "stack/scripts/bootstrap_ollama_models.ps1"

        if self.exists(sh_path):
            text = self.read_text(sh_path)
            for needle in ("OLLAMA_HOST_URL", "/api/tags", "/api/pull", "/api/generate"):
                if needle not in text:
                    self.add(sh_path, f"bootstrap script is missing `{needle}`")

        if self.exists(ps_path):
            text = self.read_text(ps_path)
            for needle in ("OLLAMA_HOST_URL", "/api/tags", "/api/pull", "/api/generate"):
                if needle not in text:
                    self.add(ps_path, f"bootstrap script is missing `{needle}`")

    def validate_database_artifacts(self) -> None:
        checks = {
            "database/sql/020_api_packages.sql": ("package",),
            "database/sql/030_ords.sql": ("ords.", "ords_"),
            "database/sql/040_security.sql": ("grant", "role"),
            "database/migrations/changes/001-baseline.sql": ("create table",),
        }

        for relative_path, needles in checks.items():
            if not self.exists(relative_path):
                continue
            text = self.read_text(relative_path).lower()
            if not any(needle in text for needle in needles):
                self.add(relative_path, f"expected one of {needles!r} to appear")

    def validate_runtime_bootstrap_contract(self) -> None:
        database_artifacts = (
            "database/migrations/changes/001-baseline.sql",
            "database/sql/020_api_packages.sql",
            "database/sql/030_ords.sql",
            "database/sql/040_security.sql",
            "database/seed/050_demo_seed.sql",
        )
        if not any(self.exists(path) for path in database_artifacts):
            return

        bootstrap_found = False
        if self.exists("stack/compose.yml") and self.has_bootstrap_evidence(self.read_text("stack/compose.yml")):
            bootstrap_found = True

        if not bootstrap_found:
            for path in self.iter_runtime_text_files():
                text = path.read_text(encoding="utf-8", errors="ignore")
                if self.has_bootstrap_evidence(text):
                    bootstrap_found = True
                    break

        if not bootstrap_found:
            self.add(
                "stack",
                "database artifacts exist but the stack does not show an automated bootstrap path that applies them during normal startup",
            )

        bootstrap_script_path = "stack/scripts/bootstrap_db.sh"
        if self.exists("database/sql/030_ords.sql") and self.exists(bootstrap_script_path):
            bootstrap_script = self.read_text(bootstrap_script_path)
            if "030_ords.sql" not in bootstrap_script:
                self.add(
                    bootstrap_script_path,
                    "database bootstrap must apply `030_ords.sql` so ORDS modules exist during normal startup",
                )

        doc_paths = list(sorted((self.root / "docs").glob("*.md"))) + [
            self.root / "guide" / "download-livestack" / "download-livestack.md"
        ]
        for path in doc_paths:
            if not path.exists():
                continue
            relative_path = str(path.relative_to(self.root))
            text = path.read_text(encoding="utf-8", errors="ignore")
            lower = text.lower()
            if any(phrase in lower for phrase in MOCK_RUNTIME_DOC_PHRASES):
                self.add(
                    relative_path,
                    "documentation admits a mock-backed or in-memory runtime; production-ready bundles must remove that fallback or label the bundle as a prototype",
                )
            for pattern in MANUAL_BOOTSTRAP_PATTERNS:
                if re.search(pattern, text, re.IGNORECASE | re.DOTALL):
                    self.add(
                        relative_path,
                        "documentation appears to require manual SQL or bootstrap work after startup; production-ready bundles must automate database apply in the normal startup path",
                    )
                    break

    def validate_docs_alignment(self) -> None:
        deployment_path = "docs/deployment-guide.md"
        download_path = "guide/download-livestack/download-livestack.md"
        launch_path = "validation/launch-checklist.md"
        rebuild_path = "docs/customer-rebuild.md"
        onboarding_path = "validation/data-onboarding-checklist.md"
        test_evidence_path = "validation/test-evidence.md"
        ui_path = "docs/ui-concept.md"

        if self.exists(deployment_path):
            text = self.read_text(deployment_path)
            lower_text = text.lower()
            if "podman compose" not in text.lower():
                self.add(deployment_path, "deployment guide must document `podman compose` startup")
            if "http://localhost:8505" not in text:
                self.add(deployment_path, "deployment guide must reference the app URL `http://localhost:8505`")
            if "admin_token" not in lower_text and "authorization" not in lower_text:
                self.add(deployment_path, "deployment guide must document the admin token or Authorization boundary for destructive operator routes")

        if self.exists(download_path):
            text = self.read_text(download_path)
            if "podman compose" not in text.lower():
                self.add(download_path, "download guide must document `podman compose` startup")
            if "http://localhost:8505" not in text:
                self.add(download_path, "download guide must reference the app URL `http://localhost:8505`")
            if not self.has_valid_copy_markers(text):
                self.add(download_path, "download guide copy markers must use paired `<copy>` markers, wrapped `<copy>...</copy>` markers, or a valid mix")

        if self.exists(launch_path):
            text = self.read_text(launch_path)
            if "/healthz" not in text:
                self.add(launch_path, "launch checklist must mention `/healthz`")
            if "8505" not in text:
                self.add(launch_path, "launch checklist must mention the published app port `8505`")

        if self.exists(rebuild_path):
            text = self.read_text(rebuild_path).lower()
            for needle in ("validate", "upload", "restore"):
                if needle not in text:
                    self.add(rebuild_path, f"customer rebuild guide must cover `{needle}`")
            if "admin_token" not in text and "authorization" not in text:
                self.add(rebuild_path, "customer rebuild guide must explain the admin token or Authorization boundary for dataset replacement")

        if self.exists(onboarding_path):
            text = self.read_text(onboarding_path).lower()
            for needle in ("validate", "upload", "restore"):
                if needle not in text:
                    self.add(onboarding_path, f"data-onboarding checklist must cover `{needle}`")
            if "admin_token" not in text and "authorization" not in text:
                self.add(onboarding_path, "data-onboarding checklist must include the admin token or Authorization check for destructive dataset flows")

        if self.exists(test_evidence_path):
            text = self.read_text(test_evidence_path).lower()
            for needle in ("red", "fail", "green", "pass", "a+", "grade", "golden", "parity"):
                if needle not in text:
                    self.add(test_evidence_path, f"test evidence must mention `{needle}`")

        working_prd_path = "input/working-prd.md"
        if self.exists(working_prd_path):
            text = self.read_text(working_prd_path)
            for key in ("story_mode", "scene_count_target", "primary_cta_path"):
                if key not in text:
                    self.add(working_prd_path, f"working PRD must declare `{key}`")
            for key in FIRST_ITERATION_PRD_KEYS:
                if key not in text:
                    self.add(working_prd_path, f"working PRD must declare `{key}`")
            for key in AI_PRD_KEYS:
                if key not in text:
                    self.add(working_prd_path, f"working PRD must declare `{key}`")

        if self.exists(ui_path):
            text = self.read_text(ui_path)
            lower_text = text.lower()
            if "Dataset Admin" not in text:
                self.add(ui_path, "UI concept must describe the dataset-admin experience")
            if "Upload Your Own Data" not in text:
                self.add(ui_path, "UI concept must describe the `Upload Your Own Data` first-iteration entry")
            if "Oracle Internals" not in text and "Database X-Ray" not in text:
                self.add(ui_path, "UI concept must describe Oracle Internals or database X-Ray")
            if "Oracle AI" not in text and "AI Vector" not in text and "Select AI" not in text and "DBMS_VECTOR" not in text:
                self.add(ui_path, "UI concept must describe visible Oracle AI capability evidence, not only generic Oracle branding")
            if "Oracle JET" not in text and "Redwood" not in text:
                self.add(ui_path, "UI concept must describe the Oracle JET / Redwood frontend contract")
            if "Oracle Sans" not in text or ("typography" not in text.lower() and "font" not in text.lower()):
                self.add(ui_path, "UI concept must describe Oracle JET typography/font usage backed by Oracle Sans")
            if "Oracle JET icon" not in text and "JET icon" not in text and "oj-fwk-icon" not in text:
                self.add(ui_path, "UI concept must describe Oracle JET icon usage for app controls")
            if "Tailwind" not in text:
                self.add(ui_path, "UI concept must explicitly exclude Tailwind for generated app UI")
            if "premium" not in text.lower():
                self.add(ui_path, "UI concept must describe the premium Redwood/JET polish bar")
            if "story_mode" not in text:
                self.add(ui_path, "UI concept must declare `story_mode`")
            if "scene_count_target" not in text:
                self.add(ui_path, "UI concept must declare `scene_count_target`")
            if "primary_cta_path" not in text:
                self.add(ui_path, "UI concept must declare `primary_cta_path`")
            for key in FIRST_ITERATION_PRD_KEYS:
                if key not in text:
                    self.add(ui_path, f"UI concept must declare `{key}`")
            for key in AI_PRD_KEYS:
                if key not in text:
                    self.add(ui_path, f"UI concept must declare `{key}`")
            if "bottom-left" in lower_text or "bottom left" in lower_text:
                self.add(ui_path, "UI concept must use the top-right masthead pattern for `Upload Your Own Data`, not a bottom-left CTA")

            if any(token in lower_text for token in ("dashboard", "overview", "analytics")) and not any(
                token in lower_text for token in ("journey", "story", "cta", "scene sequence", "story mode")
            ):
                self.add(ui_path, "UI concept reads like a generic dashboard inventory instead of a story-driven journey")

            scene_labels = self.scene_labels()
            for label in scene_labels:
                if label.lower() not in lower_text:
                    self.add(ui_path, f"UI concept does not reference guide scene `{label}`")

            scene_count_target = self.extract_scene_count_target(text)
            if scene_count_target is None and self.exists(working_prd_path):
                scene_count_target = self.extract_scene_count_target(self.read_text(working_prd_path))
            if scene_count_target is None:
                self.add(ui_path, "missing numeric `scene_count_target` in the UI concept or working PRD")
            elif scene_labels and scene_count_target != len(scene_labels):
                self.add(
                    ui_path,
                    f"`scene_count_target` is `{scene_count_target}` but the guide contains `{len(scene_labels)}` scene labs",
                )

        oracle_map_path = "docs/oracle-capability-map.md"
        if self.exists(oracle_map_path):
            text = self.read_text(oracle_map_path)
            lower_text = text.lower()
            scene_mapping_body = self.extract_heading_body(oracle_map_path, "## Scene Evidence Mapping")
            scene_labels = self.scene_labels()
            lower_mapping = scene_mapping_body.lower()
            if scene_labels and not any(label.lower() in lower_mapping for label in scene_labels):
                self.add(oracle_map_path, "scene evidence mapping must reference the visible scene set")
            if not any(token in lower_text for token in ORACLE_AI_FEATURE_TOKENS) and not any(
                token in lower_text for token in AI_REJECTION_TOKENS
            ):
                self.add(
                    oracle_map_path,
                    "Oracle capability map must name a concrete AI capability such as AI Vector Search, DBMS_VECTOR, DBMS_VECTOR_CHAIN, Select AI, or DBMS_CLOUD_AI, or explicitly reject AI for this run",
                )
            for key in AI_PRD_KEYS:
                if key not in text:
                    self.add(oracle_map_path, f"Oracle capability map must declare `{key}`")
            if "provider boundary" not in lower_text:
                self.add(oracle_map_path, "Oracle capability map must describe the AI provider boundary")
            if "data egress" not in lower_text and "data-egress" not in lower_text:
                self.add(oracle_map_path, "Oracle capability map must describe AI data-egress posture")

    def validate_guide_contract(self) -> None:
        guide_root = self.root / "guide"
        scene_paths = sorted(path.relative_to(guide_root) for path in guide_root.glob("scene-*/*.md"))
        if not scene_paths:
            return

        for path in (
            guide_root / "introduction" / "introduction.md",
            guide_root / "download-livestack" / "download-livestack.md",
            guide_root / "conclusion" / "conclusion.md",
            *[guide_root / relative_path for relative_path in scene_paths],
        ):
            if not path.exists():
                continue
            text = path.read_text(encoding="utf-8", errors="ignore")
            relative_path = str(path.relative_to(self.root))
            if "## Credits & Build Notes" not in text:
                self.add(relative_path, "guide lab is missing `## Credits & Build Notes`")
            if not self.has_valid_copy_markers(text):
                self.add(relative_path, "guide lab copy markers must use paired `<copy>` markers, wrapped `<copy>...</copy>` markers, or a valid mix")
            for placeholder in PLACEHOLDER_STRINGS:
                if placeholder in text:
                    self.add(relative_path, f"guide lab still contains placeholder text `{placeholder}`")

            if "/scene-" in relative_path:
                lower_text = text.lower()
                if "Expected result:" not in text:
                    self.add(relative_path, "scene runbook lab must include `Expected result:` after user actions")
                if "Why this matters" not in text:
                    self.add(relative_path, "scene runbook lab must include a `Why this matters` task")
                if not any(hint in lower_text for hint in GUIDE_ACTION_HINTS):
                    self.add(relative_path, "scene runbook lab must tell the user what to interact with")
                if not any(token in lower_text for token in ("business", "signal", "outcome")):
                    self.add(relative_path, "scene runbook lab must state the expected business outcome or signal")

        desktop_refs = self.validate_manifest("guide/workshops/desktop/manifest.json")
        sandbox_refs = self.validate_manifest("guide/workshops/sandbox/manifest.json")
        tenancy_refs = self.validate_manifest("guide/workshops/tenancy/manifest.json")

        scene_ref_set = {str(path).replace("\\", "/") for path in scene_paths}
        if desktop_refs and scene_ref_set != desktop_refs["scene_refs"]:
            self.add(
                "guide/workshops/desktop/manifest.json",
                "desktop manifest scene refs do not match the scene labs on disk",
            )
        if sandbox_refs and scene_ref_set != sandbox_refs["scene_refs"]:
            self.add(
                "guide/workshops/sandbox/manifest.json",
                "sandbox manifest scene refs do not match the scene labs on disk",
            )
        if tenancy_refs and scene_ref_set != tenancy_refs["scene_refs"]:
            self.add(
                "guide/workshops/tenancy/manifest.json",
                "tenancy manifest scene refs do not match the scene labs on disk",
            )

    def validate_manifest(self, relative_path: str) -> dict[str, set[str]] | None:
        if not self.exists(relative_path):
            return None

        path = self.root / relative_path
        text = path.read_text(encoding="utf-8", errors="ignore")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            self.add(relative_path, f"invalid JSON: {exc.msg}", exc.lineno)
            return None

        title = str(payload.get("workshoptitle", "")).strip()
        if not title or "Replace" in title:
            self.add(relative_path, "manifest has placeholder or empty `workshoptitle`")

        tutorials = payload.get("tutorials")
        if not isinstance(tutorials, list) or not tutorials:
            self.add(relative_path, "manifest is missing tutorials")
            return None

        required_local_refs = {
            "guide/introduction/introduction.md",
            "guide/download-livestack/download-livestack.md",
            "guide/conclusion/conclusion.md",
        }
        local_refs: set[str] = set()
        scene_refs: set[str] = set()

        for tutorial in tutorials:
            if not isinstance(tutorial, dict):
                self.add(relative_path, "manifest tutorial entry must be an object")
                continue
            filename = tutorial.get("filename")
            if not isinstance(filename, str) or not filename.strip():
                self.add(relative_path, "manifest tutorial entry is missing `filename`")
                continue
            if filename.startswith(("http://", "https://")):
                continue

            resolved = (path.parent / filename).resolve()
            try:
                relative_ref = str(resolved.relative_to(self.root)).replace("\\", "/")
            except ValueError:
                self.add(relative_path, f"manifest tutorial points outside the bundle: `{filename}`")
                continue

            local_refs.add(relative_ref)
            if not resolved.exists():
                self.add(relative_path, f"manifest tutorial target does not exist: `{filename}`")
            if "/scene-" in relative_ref:
                scene_refs.add(relative_ref.removeprefix("guide/"))

        missing_required = sorted(required_local_refs - local_refs)
        for missing in missing_required:
            self.add(relative_path, f"manifest is missing required guide ref `{missing}`")

        return {"scene_refs": scene_refs}

    def validate_screenshot_inventory(self) -> None:
        json_path = "output/guide-screenshots/inventory.json"
        md_path = "output/guide-screenshots/inventory.md"
        if not self.exists(json_path):
            return

        text = self.read_text(json_path)
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            self.add(json_path, f"invalid JSON: {exc.msg}", exc.lineno)
            return

        for key in ("baseUrl", "capturedAt", "inventory", "failures"):
            if key not in payload:
                self.add(json_path, f"inventory JSON is missing `{key}`")

        base_url = str(payload.get("baseUrl", "")).strip()
        if not base_url:
            self.add(json_path, "inventory JSON must set `baseUrl`")

        captured_at = str(payload.get("capturedAt", "")).strip()
        if not captured_at:
            self.add(json_path, "inventory JSON must set `capturedAt`")

        inventory = payload.get("inventory", [])
        failures = payload.get("failures", [])

        if not isinstance(inventory, list):
            self.add(json_path, "`inventory` must be a list")
            inventory = []
        if not isinstance(failures, list):
            self.add(json_path, "`failures` must be a list")
            failures = []

        if not inventory and not failures:
            self.add(json_path, "inventory must contain screenshots or explicit failure reasons")

        for entry in inventory:
            if not isinstance(entry, dict):
                self.add(json_path, "inventory entry must be an object")
                continue
            for key in ("file", "view", "caption", "alt", "note"):
                value = str(entry.get(key, "")).strip()
                if not value:
                    self.add(json_path, f"inventory entry is missing `{key}`")
            file_value = str(entry.get("file", "")).strip()
            if file_value:
                file_path = (self.root / "output" / "guide-screenshots" / file_value).resolve()
                if not file_path.exists():
                    self.add(json_path, f"inventory screenshot file does not exist: `{file_value}`")

        guide_image_files = list((self.root / "guide").glob("**/images/*"))
        if inventory and not guide_image_files:
            self.add("guide", "guide is missing integrated screenshots under `guide/**/images`")

        if self.exists(md_path):
            md_text = self.read_text(md_path)
            if "Replace this placeholder" in md_text:
                self.add(md_path, "inventory markdown still contains placeholder text")
            if failures and not any(failure in md_text for failure in failures):
                self.add(md_path, "inventory markdown does not explain the recorded screenshot failures")

    def validate_oracle_evidence_surface(self) -> None:
        app_root = self.root / "stack"
        evidence_found = False
        if app_root.exists():
            for path in app_root.rglob("*"):
                if not path.is_file():
                    continue
                if path.suffix.lower() not in {".py", ".html", ".js", ".ts", ".tsx", ".jsx", ".md"}:
                    continue
                text = path.read_text(encoding="utf-8", errors="ignore")
                if "Oracle Internals" in text or "database X-Ray" in text or "Database X-Ray" in text:
                    evidence_found = True
                    break

        if not evidence_found:
            self.add("stack/app", "app layer is missing a visible Oracle evidence surface")

        combined_parts: list[str] = []
        for path in self.iter_solution_text_files():
            try:
                combined_parts.append(path.read_text(encoding="utf-8", errors="ignore"))
            except OSError:
                continue
        combined = "\n".join(combined_parts).lower()

        ai_rejected = any(token in combined for token in AI_REJECTION_TOKENS)
        ai_claimed = any(token in combined for token in ORACLE_AI_FEATURE_TOKENS)
        if not ai_claimed and not ai_rejected:
            self.add(
                "docs/oracle-capability-map.md",
                "solution must include a visible Oracle AI capability or explicitly reject AI with a reason",
            )

        if ai_claimed:
            if "provider_boundary" not in combined and "provider boundary" not in combined:
                self.add("docs/oracle-capability-map.md", "AI-enabled solution must describe the provider boundary")
            if "data_egress_caveat" not in combined and "data egress" not in combined and "data-egress" not in combined:
                self.add("docs/oracle-capability-map.md", "AI-enabled solution must describe data-egress posture")

        vector_claimed = any(token in combined for token in VECTOR_CLAIM_TOKENS)
        if vector_claimed:
            for needles, message in VECTOR_EVIDENCE_REQUIREMENTS:
                if not any(needle in combined for needle in needles):
                    self.add("docs/oracle-capability-map.md", message)
            db_text = ""
            for folder in ("database", "stack/backend", "stack/frontend/src"):
                root = self.root / folder
                if root.exists():
                    db_text += "\n".join(
                        path.read_text(encoding="utf-8", errors="ignore")
                        for path in root.rglob("*")
                        if path.is_file() and path.suffix.lower() in RUNTIME_TEXT_SUFFIXES
                    ).lower()
            for needle, message in (
                (("vector(", "dbms_vector", "dbms_vector_chain", "vector_distance", "vector_embedding"), "claimed vector/RAG flow must include a VECTOR column or DBMS_VECTOR/DBMS_VECTOR_CHAIN/vector query implementation"),
                (("chunk", "source"), "claimed vector/RAG flow must include chunk/source attribution metadata"),
                (("top-k", "top k", "fetch first", "vector_distance", "<=>"), "claimed vector/RAG flow must expose a top-k retrieval path"),
            ):
                if not any(item in db_text for item in needle):
                    self.add("database", message)

        select_ai_claimed = any(token in combined for token in SELECT_AI_CLAIM_TOKENS)
        if select_ai_claimed:
            for needles, message in SELECT_AI_EVIDENCE_REQUIREMENTS:
                if not any(needle in combined for needle in needles):
                    self.add("docs/oracle-capability-map.md", message)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution_root", help="Path to the generated LiveStacks solution folder.")
    parser.add_argument(
        "--format",
        choices=("text", "json"),
        default="text",
        help="Output format. Defaults to `text`.",
    )
    args = parser.parse_args()

    root = Path(args.solution_root).expanduser().resolve()
    if not root.exists():
        raise SystemExit(f"Solution root does not exist: {root}")

    validator = Validator(root)
    findings = validator.validate()

    if args.format == "json":
        print(json.dumps([asdict(finding) for finding in findings], indent=2))
    elif not findings:
        print("No semantic validation issues found.")
    else:
        for finding in findings:
            print(f"{root / finding.path}:{finding.line}: {finding.message}")

    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
