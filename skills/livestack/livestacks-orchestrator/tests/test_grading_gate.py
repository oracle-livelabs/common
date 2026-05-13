from __future__ import annotations

import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = SKILL_ROOT / "scripts"


def load_module(name: str, path: Path):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise AssertionError(f"Could not load module at {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


validator_module = load_module("validate_livestack_bundle", SCRIPTS_DIR / "validate_livestack_bundle.py")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


STANDARD_BODY = """This section is complete for a golden parity LiveStack.

story_mode: operator_workbench
scene_count_target: 2
primary_cta_path: /api/workflow/advance
primary_user_loop: review queue, choose action, confirm Oracle evidence
first_scene_goal: resolve the highest-priority operating decision
first_interaction: click the primary action and see Oracle-backed state change
first_decision_point: accept, defer, or escalate the recommended action
first_oracle_evidence: Oracle Internals shows ORDS route, PL/SQL package, and SQL evidence
upload_your_own_data: top-right Upload Your Own Data opens Dataset Admin
redwood_jet_ui_quality_bar: premium Oracle JET Redwood app using Oracle Sans typography, font variables, and JET icon classes
ai_capability_mode: Oracle AI Vector Search with DBMS_VECTOR and DBMS_VECTOR_CHAIN
provider_boundary: local Oracle Database and local Ollama helper only
data_egress_caveat: no customer row data leaves the local LiveStack
Dataset Admin supports validate, upload, restore, active dataset state, and job status behind ADMIN_TOKEN authorization.
Oracle Internals and Database X-Ray expose Oracle AI evidence.
Oracle AI Vector Search evidence uses embedding_model text-embedding-3-small, vector_dimension 768, distance_metric cosine, index_type HNSW, top_k 5, source attribution with source_id and chunk_id, and exact search vs ANN behavior.
Command center and oracle internals scenes are documented and guide aligned.
Tailwind is explicitly excluded; Oracle JET icon usage is required.
Podman compose starts the app at http://localhost:8505 and /healthz verifies readiness.
Red tests fail before the implementation change, green tests pass after the implementation change, and the A+ grade confirms golden parity.
"""


def markdown_with_sections(title: str, headings: list[str]) -> str:
    parts = [f"# {title}", ""]
    for heading in headings:
        parts.extend([heading, "", STANDARD_BODY, ""])
    return "\n".join(parts)


def scene_lab(title: str) -> str:
    return f"""# {title}

## Task 1: Operate the scene

Click the primary action and review Oracle Internals for the current scene.

Expected result: the UI changes state, the ORDS-backed action completes, and Oracle evidence appears.

## Task 2: Why this matters

Why this matters: the business signal is visible to the operator and tied to Oracle Database evidence.

## Credits & Build Notes

Built from the golden LiveStack runbook pattern.
"""


def manifest() -> str:
    payload = {
        "workshoptitle": "Golden LiveStack Test",
        "tutorials": [
            {"title": "Introduction", "filename": "../../introduction/introduction.md"},
            {"title": "Download", "filename": "../../download-livestack/download-livestack.md"},
            {"title": "Command Center", "filename": "../../scene-01-command-center/command-center.md"},
            {"title": "Oracle Internals", "filename": "../../scene-02-oracle-internals/oracle-internals.md"},
            {"title": "Conclusion", "filename": "../../conclusion/conclusion.md"},
        ],
    }
    return json.dumps(payload, indent=2)


def create_golden_bundle(root: Path) -> None:
    for relative_path, headings in validator_module.SECTION_REQUIREMENTS.items():
        write(root / relative_path, markdown_with_sections(relative_path, headings))

    write(root / "input/business-input.md", "# Business Input\n\nGolden parity business brief for field operations.\n")
    write(root / "input/product-requirements.md", "# Product Requirements\n\nNo source PRD provided; working PRD is authoritative.\n")
    write(root / "input/assumptions.md", "# Assumptions\n\nAll assumptions are explicit and verified by the grading gate.\n")
    write(root / "docs/architecture-decisions.md", "# Architecture Decisions\n\nThe chosen architecture keeps Oracle Database, ORDS, Redwood/JET, and the golden core invariant.\n")

    write(
        root / "input/template-provenance.json",
        json.dumps(
            {
                "baseline": "neutral-golden-livestack-core",
                "baseline_version": "0.1.0",
                "overlay_source": "working-prd",
                "overlay_layers": [
                    "industry_vocabulary",
                    "pain_point_workflow",
                    "story_scenes",
                    "oracle_capability_map",
                    "data_contract",
                    "guide_runbook",
                ],
                "industry": "field operations",
                "pain_point": "missed operating decisions",
                "story_mode": "operator_workbench",
                "oracle_jet_redwood": True,
                "ords_first": True,
                "tailwind_allowed": False,
            },
            indent=2,
        ),
    )
    write(root / "stack/compose.yml", (SKILL_ROOT / "assets/templates/golden-livestack-baseline/compose.yml").read_text(encoding="utf-8"))
    write(root / "stack/.env.example", (SKILL_ROOT / "assets/templates/golden-livestack-baseline/.env.example").read_text(encoding="utf-8"))
    write(root / "stack/Containerfile", "FROM node:20-bookworm\nWORKDIR /workspace/app\nEXPOSE 3001\nCMD [\"npm\", \"start\"]\n")
    write(
        root / "stack/scripts/bootstrap_db.sh",
        "#!/bin/sh\nset -eu\nsqlplus app_user/change-me@db:1521/FREEPDB1 @database/sql/030_ords.sql\n# apply sql database/sql 001-baseline.sql 020_api_packages.sql 030_ords.sql 040_security.sql 050_demo_seed.sql\n",
    )
    write(root / "stack/scripts/bootstrap_ollama_models.sh", "#!/bin/sh\nOLLAMA_HOST_URL=http://127.0.0.1:11434\ncurl \"$OLLAMA_HOST_URL/api/tags\"\ncurl \"$OLLAMA_HOST_URL/api/pull\"\ncurl \"$OLLAMA_HOST_URL/api/generate\"\n")
    write(root / "stack/scripts/bootstrap_ollama_models.ps1", "$env:OLLAMA_HOST_URL='http://127.0.0.1:11434'\nInvoke-RestMethod \"$env:OLLAMA_HOST_URL/api/tags\"\nInvoke-RestMethod \"$env:OLLAMA_HOST_URL/api/pull\"\nInvoke-RestMethod \"$env:OLLAMA_HOST_URL/api/generate\"\n")
    write(
        root / "stack/package.json",
        json.dumps({"scripts": {"start": "node backend/server.js"}, "dependencies": {"express": "^4.21.2"}}, indent=2),
    )
    write(
        root / "stack/backend/server.js",
        """
const express = require("express");
const app = express();
const ordsBaseUrl = process.env.ORDS_BASE_URL || "http://ords:8080/ords/app";
const adminToken = process.env.ADMIN_TOKEN || "";
function requireAdmin(req, res, next) {
  if (!adminToken || req.headers.authorization !== `Bearer ${adminToken}`) {
    return res.status(403).json({ error: "ADMIN_TOKEN required" });
  }
  return next();
}
app.get("/healthz", async (_req, res) => {
  await fetch(`${ordsBaseUrl}/read/v1/health`);
  res.json({ ok: true, components: { ords: true, oracle: true, ollama: true } });
});
app.get("/api/import/dataset", (_req, res) => res.json({ source: "oracle" }));
app.get("/api/import/template", (_req, res) => res.json({ template: true }));
app.post("/api/import/validate", (_req, res) => res.json({ valid: true }));
app.post("/api/import/upload", requireAdmin, (_req, res) => res.json({ jobId: "job-1" }));
app.post("/api/import/restore-demo/validate", (_req, res) => res.json({ valid: true }));
app.post("/api/import/restore-demo", requireAdmin, (_req, res) => res.json({ restored: true }));
app.get("/api/import/status/:jobId", (_req, res) => res.json({ status: "complete" }));
app.get("/api/oracle/evidence", async (_req, res) => {
  await fetch(`${ordsBaseUrl}/read/v1/evidence`);
  res.json({ panel: "Oracle Internals", feature: "Database X-Ray" });
});
app.listen(3001);
""",
    )
    write(root / "stack/frontend/package.json", json.dumps({"dependencies": {"@oracle/oraclejet": "^17.0.0"}}, indent=2))
    write(
        root / "stack/frontend/src/App.jsx",
        """
import "@oracle/oraclejet/dist/css/redwood/oj-redwood-min.css";
export default function App() {
  const runPrimaryAction = () => fetch("/api/workflow/advance");
  return (
    <main>
      <button onClick={runPrimaryAction}><span className="oj-fwk-icon-checkmark" />Advance</button>
      <button><span className="oj-fwk-icon-upload" />Upload Your Own Data</button>
      <section><span className="oj-fwk-icon-database" />Oracle Internals Database X-Ray</section>
    </main>
  );
}
""",
    )
    write(root / "stack/frontend/src/styles.css", ':root { --oj-html-font-family: "Oracle Sans"; }\nbody { font-family: var(--oj-html-font-family); }\n')
    write(root / "stack/frontend/index.html", "<div id=\"root\"></div>\n")
    write(root / "stack/frontend/vite.config.js", "export default {};\n")

    write(root / "database/migrations/changes/001-baseline.sql", "CREATE TABLE live_cases (id NUMBER);\nCREATE TABLE vector_docs (embedding VECTOR(768), source_id VARCHAR2(30), chunk_id VARCHAR2(30));\n")
    write(root / "database/sql/020_api_packages.sql", "CREATE OR REPLACE PACKAGE app_api AS PROCEDURE search_with_dbms_vector; END;\n/\n-- DBMS_VECTOR DBMS_VECTOR_CHAIN vector_distance source chunk top-k\n")
    write(root / "database/sql/030_ords.sql", "BEGIN\n  ORDS.DEFINE_MODULE(p_module_name => 'app');\nEND;\n/\n")
    write(root / "database/sql/040_security.sql", "CREATE ROLE app_reader;\nGRANT app_reader TO app_user;\n")
    write(root / "database/seed/050_demo_seed.sql", "INSERT INTO live_cases VALUES (1);\n")
    write(root / "database/migrations/changelog-root.xml", "<databaseChangeLog></databaseChangeLog>\n")

    write(root / "guide/introduction/introduction.md", scene_lab("Introduction"))
    write(root / "guide/download-livestack/download-livestack.md", scene_lab("Download") + "\n<copy>\npodman compose up -d --build\ncurl http://localhost:8505/healthz\n</copy>\n")
    write(root / "guide/scene-01-command-center/command-center.md", scene_lab("Command Center"))
    write(root / "guide/scene-02-oracle-internals/oracle-internals.md", scene_lab("Oracle Internals"))
    write(root / "guide/conclusion/conclusion.md", scene_lab("Conclusion"))
    for profile in ("desktop", "sandbox", "tenancy"):
        write(root / f"guide/workshops/{profile}/index.html", "<!doctype html><html></html>\n")
        write(root / f"guide/workshops/{profile}/manifest.json", manifest())

    write(root / "output/guide-screenshots/command-center.png", "png bytes")
    write(root / "output/guide-screenshots/oracle-internals.png", "png bytes")
    write(root / "guide/scene-01-command-center/images/command-center.png", "png bytes")
    write(root / "guide/scene-02-oracle-internals/images/oracle-internals.png", "png bytes")
    write(
        root / "output/guide-screenshots/inventory.json",
        json.dumps(
            {
                "baseUrl": "http://localhost:8505",
                "capturedAt": "2026-05-13T00:00:00Z",
                "inventory": [
                    {
                        "file": "command-center.png",
                        "view": "Command Center",
                        "caption": "Command center",
                        "alt": "Command center",
                        "note": "Captured from running app",
                    },
                    {
                        "file": "oracle-internals.png",
                        "view": "Oracle Internals",
                        "caption": "Oracle Internals",
                        "alt": "Oracle Internals",
                        "note": "Captured from running app",
                    },
                ],
                "failures": [],
            },
            indent=2,
        ),
    )
    write(root / "output/guide-screenshots/inventory.md", "# Screenshot Inventory\n\nAll screenshots captured from the running app.\n")


class GradingGateTests(unittest.TestCase):
    def test_golden_bundle_receives_a_plus_and_passes(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "golden"
            create_golden_bundle(root)

            result = grade_module.grade_bundle(root)

            self.assertTrue(result.passed)
            self.assertEqual(result.grade, "A+")
            self.assertEqual(result.score, 100)
            self.assertEqual(result.findings, [])

    def test_missing_red_green_test_evidence_blocks_pass(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "missing-tests"
            create_golden_bundle(root)
            (root / "validation/test-evidence.md").unlink()

            result = grade_module.grade_bundle(root)

            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            self.assertTrue(any(finding.path == "validation/test-evidence.md" for finding in result.findings))

    def test_golden_core_drift_blocks_a_plus(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "drift"
            create_golden_bundle(root)
            compose = root / "stack/compose.yml"
            compose.write_text(compose.read_text(encoding="utf-8").replace('"8505:3001"', '"8506:3001"'), encoding="utf-8")

            result = grade_module.grade_bundle(root)

            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            messages = "\n".join(finding.message for finding in result.findings)
            self.assertIn("neutral golden LiveStack core baseline", messages)


if __name__ == "__main__":
    unittest.main()
