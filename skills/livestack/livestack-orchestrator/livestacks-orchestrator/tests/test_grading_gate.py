from __future__ import annotations

import importlib.util
import json
import subprocess
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
marker_module = load_module("find_scaffold_markers", SCRIPTS_DIR / "find_scaffold_markers.py")


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


STANDARD_BODY = """This section is complete for a capability-led operator application with golden parity.

story_mode: operator_workbench
scene_count_target: 4
primary_cta_path: /api/workflow/advance
primary_user_loop: review queue, choose action, confirm Oracle evidence
first_scene_goal: resolve the highest-priority operating decision
first_interaction: click the primary action and see Oracle-backed state change
first_decision_point: accept, defer, or escalate the recommended action
first_oracle_evidence: Oracle Internals shows ORDS route, PL/SQL package, and SQL evidence
oracle_26ai_primary_capability: Oracle AI Vector Search
oracle_26ai_secondary_capabilities: DBMS_VECTOR_CHAIN and constrained Select AI review
feature_usage_pattern: semantic retrieval with operator decision support
why_this_oracle_feature_fits: the pain point requires ranked evidence, source attribution, and explainable operator decisions
evidence_surface_per_scene: Command Center, Data Foundation, and Capability Decision each populate Oracle Internals
oracle_internals_scene_payload: active scene ORDS route, SQL, PL/SQL package, vector evidence, provider boundary, data egress, and security control
upload_your_own_data: top-right Use Your Own Data opens Dataset Admin
redwood_jet_ui_quality_bar: premium Oracle JET Redwood app using Oracle Sans typography, font variables, and JET icon classes
ai_capability_mode: Oracle AI Vector Search with DBMS_VECTOR and DBMS_VECTOR_CHAIN
provider_boundary: local Oracle Database and local Ollama helper only
data_egress_caveat: no customer row data leaves the local LiveStack
The UI concept uses a scene manifest / sceneManifest.js source for navigation, guide order, screenshot names, Oracle feature chips, primary CTA paths, and Oracle Internals payloads.
The app shell includes an Oracle logo/name lockup, left-side scene navigation / scene rail with oj-fwk-icon glyphs, per-scene Oracle feature chips, and a right-side Oracle Internals rail.
Scene Experience Contract: each scene owns a scene-specific component or page module, distinct interaction pattern, scene-local state, visible domain objects, real Oracle evidence per scene, workflow handoffs, and screenshot captions that prove visual and behavioral distinction.
Interaction patterns include queue triage, schema lineage, evidence ranking, dataset manager, report runner, API workbench, map, graph, chat, and architecture comparison as appropriate for the domain.
Dataset Admin supports validate, upload, restore, active dataset state, and job status behind ADMIN_TOKEN authorization.
Oracle Internals is persistent, clickable, collapsible, scene-aware, and populated by the active scene with Database X-Ray evidence.
Oracle AI Vector Search evidence uses embedding_model text-embedding-3-small, vector_dimension 768, distance_metric cosine, index_type HNSW, top_k 5, source attribution with source_id and chunk_id, and exact search vs ANN behavior.
Constrained Select AI review uses object_list scoped to curated views, SHOWSQL or DBMS_CLOUD_AI.GENERATE review before execution, and read-only no DML no DDL guardrails.
Command Center, Data Foundation, Capability Decision, and Use Your Own Data scenes are documented and guide aligned.
Tailwind is explicitly excluded; Oracle JET icon usage is required.
Podman compose starts the app at http://localhost:8505 and /healthz verifies readiness.
Red tests fail before the implementation change, green tests pass after the implementation change, and the A+ grade confirms capability-led operator evidence plus golden parity.
"""


def markdown_with_sections(title: str, headings: list[str]) -> str:
    parts = [f"# {title}", ""]
    for heading in headings:
        parts.extend([heading, "", STANDARD_BODY, ""])
    return "\n".join(parts)


def scene_lab(title: str) -> str:
    return f"""# {title}

## Task 1: Operate the scene

Click the primary action and review scene-aware Oracle Internals for the current scene.

Expected result: the UI changes state, the ORDS-backed action completes, and Oracle evidence appears.

## Task 2: Why this matters

Why this matters: the business signal is visible to the operator and tied to Oracle Database evidence.

## Credits & Build Notes

Built from the capability-led operator application runbook pattern.
"""


def manifest() -> str:
    payload = {
        "workshoptitle": "Golden LiveStack Test",
        "tutorials": [
            {"title": "Introduction", "filename": "../../introduction/introduction.md"},
            {"title": "Download", "filename": "../../download-livestack/download-livestack.md"},
            {"title": "Command Center", "filename": "../../scene-01-command-center/command-center.md"},
            {"title": "Data Foundation", "filename": "../../scene-02-data-foundation/data-foundation.md"},
            {"title": "Capability Decision", "filename": "../../scene-03-capability-decision/capability-decision.md"},
            {"title": "Use Your Own Data", "filename": "../../scene-04-use-your-own-data/use-your-own-data.md"},
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
    write(
        root / "docs/architecture-decisions.md",
        markdown_with_sections(
            "Architecture Decisions",
            [
                "## Chosen Architecture",
                "## Key Decisions",
                "## Rejected Alternatives",
                "## Chosen Implementation",
            ],
        ),
    )

    write(
        root / "input/template-provenance.json",
        json.dumps(
            {
                "baseline": "capability-led-operator-application-core",
                "baseline_version": "0.1.0",
                "overlay_source": "working-prd",
                "overlay_layers": [
                    "oracle_26ai_capability_strategy",
                    "feature_usage_pattern",
                    "industry_vocabulary",
                    "pain_point_workflow",
                    "dynamic_scene_architecture",
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
                "experience_pattern": "capability-led operator application",
            },
            indent=2,
        ),
    )
    write(root / "stack/compose.yml", (SKILL_ROOT / "assets/templates/golden-livestack-baseline/compose.yml").read_text(encoding="utf-8"))
    write(root / "stack/.env.example", (SKILL_ROOT / "assets/templates/golden-livestack-baseline/.env.example").read_text(encoding="utf-8"))
    write(root / "stack/Containerfile", "FROM node:20-bookworm\nWORKDIR /workspace/app\nEXPOSE 3001\nCMD [\"npm\", \"start\"]\n")
    write(
        root / "stack/scripts/bootstrap_db.sh",
        "#!/bin/sh\nset -eu\nsqlplus app_user/golden-secret@db:1521/FREEPDB1 @database/sql/030_ords.sql\n# apply sql database/sql 001-baseline.sql 020_api_packages.sql 030_ords.sql 040_security.sql 050_demo_seed.sql\n",
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
  res.json({ panel: "Oracle Internals", feature: "Database X-Ray", sceneAware: true, activeScene: "Command Center" });
});
app.listen(3001);
""",
    )
    write(root / "stack/frontend/package.json", json.dumps({"dependencies": {"@oracle/oraclejet": "^17.0.0"}}, indent=2))
    write(
        root / "stack/frontend/src/sceneManifest.js",
        """
export const sceneManifest = [
  {
    id: "command-center",
    label: "Command Center",
    navIcon: "oj-fwk-icon-grid",
    guideSlug: "scene-01-command-center",
    screenshotName: "command-center.png",
    sceneType: "command-center",
    interactionPattern: "queue triage",
    evidenceObject: "ORDS decision queue",
    handoffTargets: ["data-foundation", "capability-decision"],
    oracleFeatures: ["ORDS", "PL/SQL package API", "Oracle AI Vector Search"],
    primaryAction: "Advance Capability Decision",
    oracleInternalsScenePayload: "active scene ORDS route, SQL, PL/SQL package, vector evidence, provider boundary, data egress, and security control",
    oracleInternals: {
      whatsHappening: "The active scene calls ORDS, which executes PL/SQL and SQL before the right rail refreshes live evidence.",
      badges: ["ORDS", "PL/SQL", "Oracle AI Vector Search"],
      sqlSnippet: "SELECT source_id, chunk_id FROM vector_docs FETCH FIRST 5 ROWS ONLY;",
      governance: "The scene-specific security/governance callout names the Authorization boundary and data-egress caveat.",
      flow: ["React scene", "ORDS route", "PL/SQL package", "Oracle VECTOR table"]
    }
  },
  {
    id: "data-foundation",
    label: "Data Foundation",
    navIcon: "oj-fwk-icon-folderhierarchy",
    guideSlug: "scene-02-data-foundation",
    screenshotName: "data-foundation.png",
    sceneType: "data-foundation",
    interactionPattern: "schema lineage inspector",
    evidenceObject: "APP_DATASET_STATE",
    handoffTargets: ["capability-decision"],
    oracleFeatures: ["Dataset state", "Curated views"],
    primaryAction: "Verify data foundation",
    oracleInternalsScenePayload: "dataset-state table, import contract, curated views, and schema lineage evidence",
    oracleInternals: {
      whatsHappening: "The scene inspects Oracle tables, dataset state, and curated views before a capability workflow runs.",
      badges: ["Dataset State", "Curated Views"],
      sqlSnippet: "SELECT dataset_label, last_loaded_at FROM app_dataset_state;",
      governance: "Uploads must update Oracle-backed dataset state before reports or derived artifacts are active.",
      flow: ["Template ZIP", "Validate route", "Oracle staging", "APP_DATASET_STATE"]
    }
  },
  {
    id: "capability-decision",
    label: "Capability Decision",
    navIcon: "oj-fwk-icon-sortrelevancehigh",
    guideSlug: "scene-03-capability-decision",
    screenshotName: "capability-decision.png",
    sceneType: "capability-workflow",
    interactionPattern: "ranked evidence workbench",
    evidenceObject: "Oracle AI Vector Search result set",
    handoffTargets: ["command-center"],
    oracleFeatures: ["Oracle AI Vector Search", "Source attribution"],
    primaryAction: "Run ranked evidence search",
    oracleInternalsScenePayload: "embedding model, vector distance, source chunks, and ORDS evidence route",
    oracleInternals: {
      whatsHappening: "The scene ranks Oracle-owned evidence and returns source attribution before the operator acts.",
      badges: ["Vector Search", "Source Attribution"],
      sqlSnippet: "SELECT source_id, chunk_id FROM vector_docs ORDER BY VECTOR_DISTANCE(embedding, :query_vector, COSINE) FETCH FIRST 5 ROWS ONLY;",
      governance: "Retrieved records and source attribution ground any AI-assisted answer.",
      flow: ["Operator question", "ORDS search", "Oracle VECTOR table", "Ranked evidence"]
    }
  }
];
""",
    )
    write(
        root / "stack/frontend/src/context/OraclePanelContext.jsx",
        """
export function useOraclePanel() {
  return { registerSceneEvidence: () => undefined, sceneEvidence: {} };
}
""",
    )
    write(
        root / "stack/frontend/src/components/RegisterOraclePanel.jsx",
        """
export default function RegisterOraclePanel() {
  const registerSceneEvidence = true;
  return null;
}
""",
    )
    write(
        root / "stack/frontend/src/components/RightOraclePanel.jsx",
        """
import OracleInternalsContent from "./OracleInternalsContent";
export default function RightOraclePanel() {
  const activeScene = { label: "Command Center", title: "Command Center", oracleFeatures: ["ORDS", "Oracle AI Vector Search"] };
  return (
    <aside className="right-oracle-panel">
      <button aria-expanded="true">Oracle Internals</button>
      <OracleInternalsContent activeScene={activeScene} health={{ status: "ok" }} datasetOverlayOpen={false} />
    </aside>
  );
}
""",
    )
    write(
        root / "stack/frontend/src/components/OracleInternalsContent.jsx",
        """
function FeatureBadge({ label }) {
  return <span className="oracle-feature-badge">{label}</span>;
}
function SqlBlock({ code }) {
  return <pre className="oracle-sql-block">{code}</pre>;
}
function DiagramBox({ label }) {
  return <div className="oracle-diagram-box">{label}</div>;
}
function GovernanceCallout({ children }) {
  return <aside className="oracle-governance-callout">Security/governance: {children}</aside>;
}
function LiveEvidence() {
  return <dl className="oracle-live-grid"><dt>Live evidence</dt><dd>health ok, selectedRequest 1, datasetState active</dd></dl>;
}
export default function OracleInternalsContent({ activeScene, datasetOverlayOpen, health }) {
  return (
    <>
      <section>
        <p>What's Happening</p>
        <p>{activeScene.label} uses ORDS, PL/SQL, and Oracle SQL to refresh scene-aware evidence.</p>
      </section>
      <FeatureBadge label="Oracle capability badge" />
      <FeatureBadge label="Oracle AI Vector Search" />
      <SqlBlock code={`SELECT source_id, chunk_id
FROM vector_docs
ORDER BY vector_distance(embedding, :query_vector, COSINE)
FETCH FIRST 5 ROWS ONLY;`} />
      <div className="architecture flow"><DiagramBox label="React -> ORDS -> PL/SQL -> Oracle VECTOR table" /></div>
      <GovernanceCallout>Authorization boundary, provider_boundary, and data_egress_caveat are visible per scene.</GovernanceCallout>
      <LiveEvidence health={health} datasetOverlayOpen={datasetOverlayOpen} />
      <section>Use Your Own Data dataset internals show datasetOverlayOpen, datasetState, validate, upload, restore-demo, and job status.</section>
    </>
  );
}
""",
    )
    write(
        root / "stack/frontend/src/App.jsx",
        """
import "@oracle/oraclejet/dist/css/redwood/oj-redwood-min.css";
import RegisterOraclePanel from "./components/RegisterOraclePanel";
import RightOraclePanel from "./components/RightOraclePanel";
import { sceneManifest } from "./sceneManifest";

function SceneLead({ scene }) {
  return <header><h2>{scene.label}</h2><p>{scene.interactionPattern}</p></header>;
}

function CommandCenterScene({ scene, onNavigate }) {
  const [selectedQueueItem, setSelectedQueueItem] = React.useState("CASE-1001");
  return (
    <section className="scene-body scene-body--command">
      <SceneLead scene={scene} />
      <div className="triage-board" data-interaction-pattern="queue triage">
        <button onClick={() => setSelectedQueueItem("CASE-1002")}>Select domain object</button>
        <p>Visible domain object: {selectedQueueItem}</p>
        <button onClick={() => onNavigate("capability-decision")}>Handoff to ranked evidence</button>
      </div>
    </section>
  );
}

function DataFoundationScene({ scene }) {
  const [selectedSchemaObject, setSelectedSchemaObject] = React.useState("APP_DATASET_STATE");
  return (
    <section className="scene-body scene-body--foundation">
      <SceneLead scene={scene} />
      <div className="schema-lineage-inspector" data-interaction-pattern="schema lineage">
        <button onClick={() => setSelectedSchemaObject("LIVE_CASES_V")}>Select Oracle object</button>
        <p>Scene-local state selected schema object: {selectedSchemaObject}</p>
      </div>
    </section>
  );
}

function CapabilityDecisionScene({ scene }) {
  const [selectedEvidence, setSelectedEvidence] = React.useState("source_id:CHUNK-001");
  return (
    <section className="scene-body scene-body--capability">
      <SceneLead scene={scene} />
      <div className="ranked-evidence-workbench" data-interaction-pattern="ranked evidence">
        <button onClick={() => setSelectedEvidence("source_id:CHUNK-002")}>Run Oracle evidence search</button>
        <p>Real Oracle evidence per scene: {selectedEvidence}</p>
      </div>
    </section>
  );
}

export default function App() {
  const [activeSceneId, setActiveSceneId] = React.useState("command-center");
  const activeScene = sceneManifest.find((scene) => scene.id === activeSceneId) || sceneManifest[0];
  const oracleInternalsCollapsed = false;
  const runPrimaryAction = () => fetch("/api/workflow/advance");
  function renderScene() {
    if (activeScene.id === "data-foundation") return <DataFoundationScene scene={activeScene} />;
    if (activeScene.id === "capability-decision") return <CapabilityDecisionScene scene={activeScene} />;
    return <CommandCenterScene scene={activeScene} onNavigate={setActiveSceneId} />;
  }
  return (
    <main className="app-shell">
      <RegisterOraclePanel />
      <aside className="left-oracle-rail">
        <div className="app-brand-lockup" aria-label="Oracle LiveStack"><span className="oracle-logo-mark">ORACLE</span><strong>Golden LiveStack</strong></div>
        <nav className="scene-rail" aria-label="Scene navigation">
          {sceneManifest.map((scene) => (
            <button className="scene-nav-item" key={scene.id}>
              <span className={`oj-fwk-icon ${scene.navIcon}`} />
              <span>{scene.label}</span>
              <span className="feature-chip">{scene.oracleFeatures[0]}</span>
            </button>
          ))}
        </nav>
      </aside>
      {renderScene()}
      <button onClick={runPrimaryAction}><span className="oj-fwk-icon-checkmark" />Advance Capability Decision</button>
      <button><span className="oj-fwk-icon-upload" />Use Your Own Data</button>
      <button aria-expanded={!oracleInternalsCollapsed} aria-controls="oracle-internals-panel">
        <span className="oj-fwk-icon-database" />Oracle Internals
      </button>
      <section id="oracle-internals-panel">
        Oracle Internals Database X-Ray is clickable, collapsible, scene-aware, and populated by the active scene {activeScene.label}.
      </section>
      <RightOraclePanel />
    </main>
  );
}
""",
    )
    write(root / "stack/frontend/src/styles.css", ':root { --oj-html-font-family: "Oracle Sans"; }\nbody { font-family: var(--oj-html-font-family); }\n.scene-rail {}\n.feature-chip {}\n.right-oracle-panel {}\n.app-brand-lockup {}\n.triage-board {}\n.schema-lineage-inspector {}\n.ranked-evidence-workbench {}\n')
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
    write(root / "guide/scene-02-data-foundation/data-foundation.md", scene_lab("Data Foundation"))
    write(root / "guide/scene-03-capability-decision/capability-decision.md", scene_lab("Capability Decision"))
    write(
        root / "guide/scene-04-use-your-own-data/use-your-own-data.md",
        scene_lab("Use Your Own Data")
        + "\nThe dataset tool opens from the top-right Use Your Own Data control. It shows active dataset state, downloads a template ZIP, accepts a completed ZIP, validates the package before upload or replace, restores the seeded demo dataset, reports job status, and documents synthetic customer data expectations.\n",
    )
    write(root / "guide/conclusion/conclusion.md", scene_lab("Conclusion"))
    canonical_index = (
        SKILL_ROOT
        / "assets/bundled/livestack-guide-builder/assets/templates/workshops/index.html"
    ).read_text(encoding="utf-8")
    for profile in ("desktop", "sandbox", "tenancy"):
        write(root / f"guide/workshops/{profile}/index.html", canonical_index)
        write(root / f"guide/workshops/{profile}/manifest.json", manifest())

    write(root / "output/guide-screenshots/command-center.png", "png bytes")
    write(root / "output/guide-screenshots/data-foundation.png", "png bytes")
    write(root / "output/guide-screenshots/capability-decision.png", "png bytes")
    write(root / "output/guide-screenshots/use-your-own-data.png", "png bytes")
    write(root / "guide/scene-01-command-center/images/command-center.png", "png bytes")
    write(root / "guide/scene-02-data-foundation/images/data-foundation.png", "png bytes")
    write(root / "guide/scene-03-capability-decision/images/capability-decision.png", "png bytes")
    write(root / "guide/scene-04-use-your-own-data/images/use-your-own-data.png", "png bytes")
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
                        "caption": "Command Center queue triage board with selectable domain objects, ORDS evidence refresh, and handoff to ranked evidence.",
                        "alt": "Command center",
                        "note": "Captured from running app",
                    },
                    {
                        "file": "data-foundation.png",
                        "view": "Data Foundation",
                        "caption": "Data Foundation schema lineage inspector showing selected Oracle object, dataset state, and import contract.",
                        "alt": "Data Foundation",
                        "note": "Captured from running app",
                    },
                    {
                        "file": "capability-decision.png",
                        "view": "Capability Decision",
                        "caption": "Capability Decision ranked evidence workbench with source attribution and Oracle AI Vector Search results.",
                        "alt": "Capability Decision",
                        "note": "Captured from running app",
                    },
                    {
                        "file": "use-your-own-data.png",
                        "view": "Use Your Own Data",
                        "caption": "Use Your Own Data dataset manager",
                        "alt": "Use Your Own Data dataset manager with validation controls",
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
            test_evidence_findings = [
                finding
                for finding in result.findings
                if finding.path == "validation/test-evidence.md"
            ]
            self.assertEqual(len(test_evidence_findings), 1)
            self.assertEqual(test_evidence_findings[0].message, "missing required file")
            marker_findings = marker_module.scan(root)
            self.assertEqual(
                [
                    (Path(path).relative_to(root).as_posix(), message)
                    for path, _line, message in marker_findings
                    if Path(path).relative_to(root).as_posix() == "validation/test-evidence.md"
                ],
                [("validation/test-evidence.md", "missing required file")],
            )

    def test_starter_contract_blocks_validator_and_grader(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "starter-marker"
            create_golden_bundle(root)
            server_path = root / "stack/backend/server.js"
            server_path.write_text(
                server_path.read_text(encoding="utf-8") + "\n// starter_contract\n",
                encoding="utf-8",
            )

            findings = validator_module.Validator(root).validate()
            result = grade_module.grade_bundle(root)

            marker_findings = [
                finding
                for finding in findings
                if finding.path == "stack/backend/server.js"
                and finding.message == "starter_contract"
            ]
            self.assertEqual(len(marker_findings), 1)
            self.assertGreater(marker_findings[0].line, 1)
            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            self.assertLess(result.score, 90)
            self.assertTrue(
                any(
                    finding.path == "stack/backend/server.js"
                    and finding.message == "starter_contract"
                    for finding in result.findings
                )
            )

    def test_markers_in_dependency_generated_and_control_dirs_are_ignored(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "excluded-marker-dirs"
            create_golden_bundle(root)
            required_exclusions = {
                "node_modules",
                "dist",
                "build",
                ".git",
                ".venv",
                "venv",
                "__pycache__",
                ".pytest_cache",
                ".mypy_cache",
                ".ruff_cache",
                ".cache",
            }
            self.assertTrue(required_exclusions.issubset(marker_module.EXCLUDED_SCAN_DIR_NAMES))
            excluded_dirs = marker_module.EXCLUDED_SCAN_DIR_NAMES
            for directory in excluded_dirs:
                generated_path = root / "stack/frontend" / directory / "README.md"
                generated_path.parent.mkdir(parents=True, exist_ok=True)
                generated_path.write_text(
                    "generated dependency contains starter_contract\n",
                    encoding="utf-8",
                )

            marker_findings = marker_module.scan(root)
            validator_findings = validator_module.Validator(root).validate()

            self.assertFalse(
                any(
                    set(Path(path).relative_to(root).parts).intersection(excluded_dirs)
                    for path, _line, _message in marker_findings
                )
            )
            self.assertFalse(
                any(
                    set(Path(finding.path).parts).intersection(excluded_dirs)
                    for finding in validator_findings
                )
            )

    def test_optional_conclusion_is_not_required(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "no-conclusion"
            create_golden_bundle(root)
            (root / "guide/conclusion/conclusion.md").unlink()
            for profile in ("desktop", "sandbox", "tenancy"):
                manifest_path = root / f"guide/workshops/{profile}/manifest.json"
                payload = json.loads(manifest_path.read_text(encoding="utf-8"))
                payload["tutorials"] = [
                    tutorial
                    for tutorial in payload["tutorials"]
                    if tutorial["title"] != "Conclusion"
                ]
                manifest_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

            marker_findings = marker_module.scan(root)
            result = grade_module.grade_bundle(root)

            self.assertFalse(
                any("guide/conclusion/conclusion.md" in path for path, _line, _message in marker_findings)
            )
            self.assertTrue(result.passed)
            self.assertEqual(result.grade, "A+")

    def test_duplicate_findings_are_suppressed(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            validator = validator_module.Validator(Path(temp_dir))
            validator.add("stack/backend/server.js", "starter_contract", 42)
            validator.add("stack/backend/server.js", "starter_contract", 42)

            self.assertEqual(
                validator.findings,
                [
                    validator_module.Finding(
                        path="stack/backend/server.js",
                        message="starter_contract",
                        line=42,
                    )
                ],
            )

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
            self.assertIn("capability-led operator application runtime baseline", messages)

    def test_generic_centered_shell_blocks_a_plus(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "generic-shell"
            create_golden_bundle(root)
            (root / "stack/frontend/src/sceneManifest.js").unlink()
            (root / "stack/frontend/src/App.jsx").write_text(
                """
import "@oracle/oraclejet/dist/css/redwood/oj-redwood-min.css";
export default function App() {
  const runPrimaryAction = () => fetch("/api/workflow/advance");
  return (
    <main>
      <section>Command Center</section>
      <section>Data Foundation</section>
      <button onClick={runPrimaryAction}><span className="oj-fwk-icon-checkmark" />Advance</button>
      <button><span className="oj-fwk-icon-upload" />Use Your Own Data</button>
      <button aria-expanded="true"><span className="oj-fwk-icon-database" />Oracle Internals</button>
      <section>Oracle Internals is clickable, collapsible, scene-aware, and populated by the active scene.</section>
    </main>
  );
}
""",
                encoding="utf-8",
            )

            result = grade_module.grade_bundle(root)

            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            messages = "\n".join(finding.message for finding in result.findings)
            self.assertIn("scene metadata manifest", messages)
            self.assertIn("left-side scene navigation", messages)

    def test_shallow_oracle_internals_blocks_a_plus(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "shallow-oracle-internals"
            create_golden_bundle(root)
            (root / "stack/frontend/src/components/OracleInternalsContent.jsx").unlink()
            (root / "stack/frontend/src/components/RightOraclePanel.jsx").write_text(
                """
export default function RightOraclePanel() {
  return (
    <aside className="right-oracle-panel">
      <button aria-expanded="true">Oracle Internals</button>
      <p>Oracle Internals is clickable, collapsible, scene-aware, and populated by the active scene.</p>
    </aside>
  );
}
""",
                encoding="utf-8",
            )

            result = grade_module.grade_bundle(root)

            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            messages = "\n".join(finding.message for finding in result.findings)
            self.assertIn("What's Happening", messages)
            self.assertIn("real SQL or PL/SQL snippets", messages)
            self.assertIn("diagram boxes", messages)

    def test_repeated_scene_stage_blocks_a_plus(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "repeated-scene-stage"
            create_golden_bundle(root)
            (root / "stack/frontend/src/App.jsx").write_text(
                """
import "@oracle/oraclejet/dist/css/redwood/oj-redwood-min.css";
import RegisterOraclePanel from "./components/RegisterOraclePanel";
import RightOraclePanel from "./components/RightOraclePanel";
import { sceneManifest } from "./sceneManifest";

export default function App() {
  const activeScene = sceneManifest[0];
  const runPrimaryAction = () => fetch(`/api/oracle/evidence?scene=${activeScene.id}`);
  return (
    <main className="app-shell">
      <RegisterOraclePanel />
      <aside className="left-oracle-rail">
        <div className="app-brand-lockup"><span className="oracle-logo-mark">ORACLE</span></div>
        <nav className="scene-rail">
          {sceneManifest.map((scene) => (
            <button className="scene-nav-item" key={scene.id}>
              <span className={`oj-fwk-icon ${scene.navIcon}`} />
              <span>{scene.label}</span>
              <span className="feature-chip">{scene.oracleFeatures[0]}</span>
            </button>
          ))}
        </nav>
      </aside>
      <section className="scene-stage">
        <div className="scene-stage__intro">
          <h2>{activeScene.label}</h2>
          <p>Every scene uses the same generic scene-stage and runtime cards.</p>
          <button onClick={runPrimaryAction}>Run primary action</button>
        </div>
        <div className="runtime-grid">Command Center Data Foundation Oracle evidence selected domain object</div>
      </section>
      <button aria-expanded="true" aria-controls="oracle-internals-panel">Oracle Internals</button>
      <section id="oracle-internals-panel">Oracle Internals is clickable, collapsible, scene-aware, and populated by the active scene.</section>
      <RightOraclePanel />
    </main>
  );
}
""",
                encoding="utf-8",
            )

            result = grade_module.grade_bundle(root)

            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            messages = "\n".join(finding.message for finding in result.findings)
            self.assertIn("Scene Experience Contract", messages)
            self.assertIn("scene-specific component", messages)

    def test_screenshot_inventory_requires_distinct_scene_captions(self) -> None:
        grade_module = load_module("grade_livestack_bundle", SCRIPTS_DIR / "grade_livestack_bundle.py")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir) / "weak-captions"
            create_golden_bundle(root)
            inventory_path = root / "output/guide-screenshots/inventory.json"
            payload = json.loads(inventory_path.read_text(encoding="utf-8"))
            for entry in payload["inventory"]:
                entry["caption"] = "Scene screenshot with Oracle Internals open."
                entry["note"] = "Captured from running app."
            inventory_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")

            result = grade_module.grade_bundle(root)

            self.assertFalse(result.passed)
            self.assertNotEqual(result.grade, "A+")
            messages = "\n".join(finding.message for finding in result.findings)
            self.assertIn("screenshot captions", messages)
            self.assertIn("visually and behaviorally different", messages)

    def test_default_scaffold_emits_scene_experience_contract(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            output_dir = Path(temp_dir)
            subprocess.run(
                [
                    sys.executable,
                    str(SCRIPTS_DIR / "init_livestack_bundle.py"),
                    str(output_dir),
                    "scene-experience-test",
                ],
                check=True,
                capture_output=True,
                text=True,
            )
            root = output_dir / "scene-experience-test"
            app_text = (root / "stack/frontend/src/App.jsx").read_text(encoding="utf-8")
            manifest_text = (root / "stack/frontend/src/sceneManifest.js").read_text(encoding="utf-8")

            self.assertIn("renderScene", app_text)
            self.assertIn("CommandCenterScene", app_text)
            self.assertIn("DataFoundationScene", app_text)
            self.assertIn("CapabilityWorkflowScene", app_text)
            self.assertIn("OperatorActionScene", app_text)
            self.assertNotIn("<section className=\"scene-stage\"", app_text)
            self.assertIn("interactionPattern", manifest_text)
            self.assertIn("evidenceObject", manifest_text)
            self.assertIn("handoffTargets", manifest_text)

    def test_vector_claim_matching_avoids_rag_substrings(self) -> None:
        self.assertFalse(validator_module.contains_claim_token("resizing handle for dragging with local storage", "rag"))
        self.assertFalse(validator_module.contains_claim_token("package artifacts and paragraph text", "rag"))
        self.assertTrue(validator_module.contains_claim_token("RAG evidence uses source chunks", "rag"))
        self.assertTrue(validator_module.contains_claim_token("Oracle AI Vector Search evidence is present", "ai vector search"))


if __name__ == "__main__":
    unittest.main()
