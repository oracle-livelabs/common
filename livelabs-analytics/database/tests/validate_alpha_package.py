#!/usr/bin/env python3
"""Static validation for the LiveLabs Analytics ADB alpha package."""

from __future__ import annotations

import re
import sys
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DATABASE = ROOT / "database"
MIGRATIONS = DATABASE / "migrations" / "alpha"


passes: list[str] = []
failures: list[str] = []
warnings: list[str] = []


def ok(name: str, detail: str = "") -> None:
    passes.append(f"PASS {name}" + (f" - {detail}" if detail else ""))


def fail(name: str, detail: str = "") -> None:
    failures.append(f"FAIL {name}" + (f" - {detail}" if detail else ""))


def warn(name: str, detail: str = "") -> None:
    warnings.append(f"WARN {name}" + (f" - {detail}" if detail else ""))


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def normalized(text: str) -> str:
    return re.sub(r"\s+", " ", text.lower())


def strip_sql_comments(text: str) -> str:
    text = re.sub(r"/\*.*?\*/", "", text, flags=re.S)
    return "\n".join(line for line in text.splitlines() if not line.strip().startswith("--"))


def check_expected_files() -> list[Path]:
    expected = [
        "A001__alpha_security_roles.sql",
        "A002__alpha_control_lineage.sql",
        "A003__alpha_stage_tables.sql",
        "A004__alpha_curated_model.sql",
        "A005__alpha_export_contract.sql",
        "A006__alpha_optional_ords_read_surface.template.sql",
        "A007__alpha_vector_search_gate.template.sql",
        "A008__alpha_ingestion_integration_control.sql",
        "A009__alpha_runtime_grants.sql",
        "A010__alpha_search_and_performance_indexes.sql",
        "A011__alpha_quality_validation_views.sql",
        "A012__alpha_load_control_api.sql",
    ]
    actual = sorted(path.name for path in MIGRATIONS.glob("A*__alpha_*"))
    if actual == expected:
      ok("alpha migration file set", f"{len(actual)} file(s)")
    else:
      fail("alpha migration file set", f"expected {expected}, found {actual}")
    return [MIGRATIONS / name for name in expected]


def check_alpha_headers(files: list[Path]) -> None:
    for path in files:
        if not path.exists():
            continue
        text = read(path)
        stem = path.name.split("__", 1)[0]
        expected_change = f"ALPHA-{stem[1:]}"
        checks = [
            ("release channel header", "Release channel: ALPHA" in text),
            ("alpha status header", "Alpha status: ALPHA_DRAFT" in text),
            ("alpha change id", expected_change in text),
            ("alpha change log insert", "ALPHA_SCHEMA_CHANGE_LOG" in text),
        ]
        for name, condition in checks:
            if condition:
                ok(f"{path.name} {name}")
            else:
                fail(f"{path.name} {name}")


def check_alpha_language(files: list[Path]) -> None:
    forbidden = [
        r"release_channel\s*=\s*'PROD'",
        r"release_channel\s*=\s*'PRODUCTION'",
        r"\bIN_PROD\b",
        r"\bPRODUCTION_READY\b",
        r"change_state\s+.*\bMIGRATED\b",
        r"export_status\s+.*\bPROD",
    ]
    for path in files:
        if not path.exists():
            continue
        body = strip_sql_comments(read(path))
        hits = [pattern for pattern in forbidden if re.search(pattern, body, flags=re.I | re.S)]
        if hits:
            fail(f"{path.name} alpha-only status language", ", ".join(hits))
        else:
            ok(f"{path.name} alpha-only status language")


def check_secret_hygiene(files: list[Path]) -> None:
    secret_patterns = [
        r"IDENTIFIED\s+BY\s+['\"]",
        r"ADB_ADMIN_PASSWORD",
        r"Wallet_",
        r"\.env",
        r"LiveLabsAdmin#[0-9]+!?",
        r"fixedAdminCredentials",
    ]
    for path in files:
        if not path.exists():
            continue
        body = strip_sql_comments(read(path))
        hits = [pattern for pattern in secret_patterns if re.search(pattern, body, flags=re.I)]
        if hits:
            fail(f"{path.name} secret hygiene", ", ".join(hits))
        else:
            ok(f"{path.name} secret hygiene")

    admin_html = read(ROOT / "admin" / "index.html")
    smoke_admin = read(ROOT / "scripts" / "smoke-admin-route.mjs")
    legacy_static_secret = re.compile(r"LiveLabsAdmin#[0-9]+!?", flags=re.I)
    if legacy_static_secret.search(admin_html) or "fixedAdminCredentials" in admin_html:
        fail("static admin secret removed", "admin/index.html still contains browser-visible credential code")
    elif legacy_static_secret.search(smoke_admin):
        fail("static admin secret removed", "smoke-admin-route.mjs still contains old static credential")
    elif "staticAdminAuthDisabled = true" not in admin_html:
        fail("static admin secret removed", "static admin auth is not disabled")
    else:
        ok("static admin secret removed", "static route is blocked and old credential is gone")


def check_required_objects(files: list[Path]) -> None:
    required_by_file = {
        "A001__alpha_security_roles.sql": [
            "CODEX_DEPLOY", "CODEX_STAGE", "CODEX_ANALYTICS", "CODEX_APP", "CODEX_AI",
            "CODEX_ANALYTICS_READ", "CODEX_ETL_RUNNER", "CODEX_EXPORT_RUNNER", "CODEX_ORDS_READ",
        ],
        "A002__alpha_control_lineage.sql": [
            "LOAD_BATCH", "DATASET_FILE", "LOAD_REJECT", "FOREIGN KEY", "CHECK",
        ],
        "A003__alpha_stage_tables.sql": [
            "STG_SANDBOX_REPORT", "STG_WORKSHOP_REPORT", "STG_RANK_SECTION", "STG_VIEW_OUTLIER", "STG_VIEW_STAT",
        ],
        "A004__alpha_curated_model.sql": [
            "DIM_CONTENT_ITEM", "IDENTITY_REVIEW_EXCEPTION", "FACT_WORKSHOP_SNAPSHOT", "FACT_DEMAND_METRIC",
            "FACT_REPO_EVIDENCE", "FACT_REPLACEMENT_CANDIDATE", "FACT_GOVERNANCE_DECISION",
            "WORKSHOP_SEARCH_DOCUMENT",
        ],
        "A005__alpha_export_contract.sql": [
            "EXPORT_BATCH", "EXPORT_OBJECT", "V_WORKSHOP_CURRENT", "V_DEMAND_RANKING",
            "V_PORTFOLIO_INVENTORY_EXPORT", "V_FULL_CONTENT_SEARCH_EXPORT", "V_GOVERNANCE_DECISION_EXPORT",
        ],
        "A006__alpha_optional_ords_read_surface.template.sql": [
            "STOP POINT", "NOT_PUBLISHED", "ORDS.DEFINE_MODULE", "p_method      => 'GET'",
        ],
        "A007__alpha_vector_search_gate.template.sql": [
            "STOP POINT", "VECTOR_MODEL", "WORKSHOP_SEARCH_EMBEDDING", "vector(&&EMBEDDING_DIMENSIONS, FLOAT32)",
        ],
        "A008__alpha_ingestion_integration_control.sql": [
            "SOURCE_SYSTEM", "SOURCE_PRIORITY_RULE", "INTEGRATION_RUN", "INTEGRATION_WATERMARK",
            "MANUAL_CHANGE_REQUEST", "CURATED_MERGE_ACTION", "CONTENT_CHANGE_HISTORY",
        ],
        "A009__alpha_runtime_grants.sql": [
            "CODEX_APP", "CODEX_ORDS_READ", "CODEX_ETL_RUNNER", "CODEX_EXPORT_RUNNER",
            "V_PORTFOLIO_INVENTORY_EXPORT", "WORKSHOP_SEARCH_DOCUMENT",
        ],
        "A010__alpha_search_and_performance_indexes.sql": [
            "IX_SEARCH_DOC_TEXT_CTX", "CTXSYS.CONTEXT", "IX_FACT_SNAPSHOT_BATCH_DATE",
            "IX_FACT_DEMAND_DATE_WINDOW", "IX_EXPORT_OBJECT_CURRENT",
        ],
        "A011__alpha_quality_validation_views.sql": [
            "V_LOAD_BATCH_RECONCILIATION", "V_MANUAL_CHANGE_QUEUE", "V_WMS_INTEGRATION_STATUS",
            "V_MERGE_CONFLICT_QUEUE", "V_IDENTITY_DUPLICATE_LIVELABS_ID",
            "V_REPLACEMENT_SAME_FAMILY_REVIEW", "TRG_REPLACEMENT_NO_SAME_WMS",
        ],
        "A012__alpha_load_control_api.sql": [
            "PKG_ALPHA_LOAD_CONTROL", "START_BATCH", "START_INTEGRATION_RUN",
            "FINISH_INTEGRATION_RUN", "ADVANCE_WATERMARK", "SUBMIT_MANUAL_CHANGE",
        ],
    }
    for path in files:
        if not path.exists():
            continue
        text = read(path)
        compact = normalized(text)
        missing = [token for token in required_by_file[path.name] if normalized(token) not in compact]
        if missing:
            fail(f"{path.name} required objects", ", ".join(missing))
        else:
            ok(f"{path.name} required objects")


def check_gated_templates(files: list[Path]) -> None:
    template_files = [path for path in files if path.name.endswith(".template.sql")]
    if len(template_files) == 2:
        ok("gated template count", "2 template(s)")
    else:
        fail("gated template count", f"{len(template_files)} template(s)")

    for path in template_files:
        text = read(path)
        if "STOP POINT" in text and "ALPHA_DRAFT" in text:
            ok(f"{path.name} gated stop point")
        else:
            fail(f"{path.name} gated stop point")

    vector = MIGRATIONS / "A007__alpha_vector_search_gate.template.sql"
    if vector.exists():
        uncommented = strip_sql_comments(read(vector))
        if re.search(r"\bcreate\s+vector\s+index\b", uncommented, flags=re.I):
            fail("vector index remains gated", "active CREATE VECTOR INDEX found")
        else:
            ok("vector index remains gated", "index example is commented")


def check_docs() -> None:
    docs = {
        "database README": DATABASE / "README.md",
        "alpha versioning doc": DATABASE / "docs" / "alpha-versioning.md",
        "ADB alpha model doc": DATABASE / "docs" / "adb-alpha-model.md",
        "manual and WMS ingestion doc": DATABASE / "docs" / "manual-and-wms-ingestion-alpha.md",
        "Object Storage contract doc": DATABASE / "docs" / "object-storage-export-contract-alpha.md",
    }
    for label, path in docs.items():
        if path.exists() and path.stat().st_size > 200:
            ok(label, path.name)
        else:
            fail(label, f"missing or too small: {path}")

    contract = read(docs["Object Storage contract doc"]) if docs["Object Storage contract doc"].exists() else ""
    if (
        "manifest.json" in contract
        and "checksum_sha256" in contract
        and "dashboard_payload.json" in contract
        and "integration_watermarks" in contract
        and "merge_conflict_count" in contract
    ):
        ok("Object Storage contract fields")
    else:
        fail("Object Storage contract fields")

    root_ignore = read(ROOT / ".gitignore")
    if ".env" in root_ignore and "dataset/" in root_ignore and "_local/" in root_ignore:
        ok("publish-root ignore rules", ".env, dataset, and _local are ignored")
    else:
        fail("publish-root ignore rules", "expected .env, dataset, and _local ignores")

    if (ROOT / ".env").exists():
        fail("publish-root .env removed", ".env exists in static frontend root")
    else:
        ok("publish-root .env removed")

    if (ROOT / "dataset").exists():
        warn("dataset remains in root", "kept intentionally as ignored historical input, not for Object Storage upload")


def check_manual_wms_readiness() -> None:
    ingestion = read(MIGRATIONS / "A008__alpha_ingestion_integration_control.sql")
    load_api = read(MIGRATIONS / "A012__alpha_load_control_api.sql")
    docs = read(DATABASE / "docs" / "manual-and-wms-ingestion-alpha.md")
    load_api_upper = load_api.upper()

    checks = [
        ("manual source registry", "'MANUAL_ADMIN'" in ingestion and "MANUAL_CHANGE_REQUEST" in ingestion),
        ("WMS source registry", "'WMS_SANDBOX_REPORT'" in ingestion and "'WMS_ALL_WORKSHOPS'" in ingestion),
        ("overwrite precedence policies", "MANUAL_WINS" in ingestion and "NEWER_SNAPSHOT_WINS" in ingestion),
        ("integration watermarks", "INTEGRATION_WATERMARK" in ingestion and "ADVANCE_WATERMARK" in load_api_upper),
        ("curated merge audit", "CURATED_MERGE_ACTION" in ingestion and "CONTENT_CHANGE_HISTORY" in ingestion),
        ("unique current guards", "UQ_SOURCE_PRIORITY_CURRENT" in ingestion and "UQ_CONTENT_CHANGE_CURRENT" in ingestion),
        ("manual/WMS docs", "WMS integration" in docs and "manual corrections" in docs and "Object Storage" in docs),
    ]
    for name, condition in checks:
        if condition:
            ok(name)
        else:
            fail(name)


def check_runtime_performance_fixes() -> None:
    ords = read(MIGRATIONS / "A006__alpha_optional_ords_read_surface.template.sql")
    grants = read(MIGRATIONS / "A009__alpha_runtime_grants.sql")
    indexes = read(MIGRATIONS / "A010__alpha_search_and_performance_indexes.sql")
    quality = read(MIGRATIONS / "A011__alpha_quality_validation_views.sql")

    checks = [
        ("ORDS direct grants to runtime schema", "grant select on CODEX_ANALYTICS.V_PORTFOLIO_INVENTORY_EXPORT to CODEX_APP" in grants),
        ("ORDS search uses indexed base table", "WORKSHOP_SEARCH_DOCUMENT d" in ords and "contains(d.search_text" in ords),
        ("Oracle Text search index", "IX_SEARCH_DOC_TEXT_CTX" in indexes and "indextype is CTXSYS.CONTEXT" in indexes),
        ("targeted reporting indexes", "IX_FACT_DEMAND_DATE_WINDOW" in indexes and "IX_SEARCH_DOC_SCOPE_TYPE" in indexes),
        ("batch reconciliation view", "V_LOAD_BATCH_RECONCILIATION" in quality and "open_merge_conflicts" in quality),
        ("same WMS family replacement guardrail", "TRG_REPLACEMENT_NO_SAME_WMS" in quality and "V_REPLACEMENT_SAME_FAMILY_REVIEW" in quality),
    ]
    for name, condition in checks:
        if condition:
            ok(name)
        else:
            fail(name)


def main() -> int:
    files = check_expected_files()
    check_alpha_headers(files)
    check_alpha_language(files)
    check_secret_hygiene(files)
    check_required_objects(files)
    check_gated_templates(files)
    check_docs()
    check_manual_wms_readiness()
    check_runtime_performance_fixes()

    for line in passes:
        print(line)
    for line in warnings:
        print(line)
    for line in failures:
        print(line)

    print(f"\nSummary: {len(passes)} passed, {len(warnings)} warning(s), {len(failures)} failure(s).")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
