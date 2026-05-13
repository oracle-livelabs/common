#!/usr/bin/env python3
"""Find leftover scaffold markers in a generated LiveStacks bundle."""

from __future__ import annotations

import argparse
import os
from pathlib import Path


MARKERS = [
    "Replace this shell with the domain-specific application.",
    "Replace this app shell with the solution-specific experience.",
    "Replace this Oracle JET / Redwood shell with the solution-specific experience.",
    "Replace this LiveStack guide placeholder with solution-specific content.",
    "Replace this product requirements placeholder with the source PRD if one was provided for this run.",
    "Replace this working PRD placeholder with the synthesized build contract before delegation.",
    "Replace with the baseline schema migration.",
    "Insert demo-only seed data here.",
    "Replace this placeholder inventory by running automated guide screenshot capture against the live app.",
    "change-me",
    "LiveStacks App Shell",
    "Oracle JET Redwood App Shell",
    "LiveStack Operator Workbench Starter",
    "starter_contract",
    "replace-with-",
    "replace-with-oracle",
]

ALLOWED_CHANGE_ME_PATHS = {
    "stack/.env.example",
    "stack/backend/server.js",
    "stack/compose.yml",
}

REQUIRED_PATHS = {
    "input/business-input.md",
    "input/product-requirements.md",
    "input/working-prd.md",
    "input/assumptions.md",
    "input/template-provenance.json",
    "docs/problem-framing.md",
    "docs/proposed-solution.md",
    "docs/architecture-decisions.md",
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
}

REQUIRED_HEADINGS = {
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
    "docs/architecture-decisions.md": [
        "## Chosen Architecture",
        "## Key Decisions",
        "## Rejected Alternatives",
        "## Chosen Implementation",
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
    "validation/acceptance-checklist.md": [
        "## External Readiness",
        "## Multi-Agent Execution Evidence",
        "## Oracle Feature Evidence",
        "## Security Posture",
        "## Live Runtime Proof",
        "## Remaining Risks",
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
}

CANONICAL_WORKSHOP_INDEX_PATHS = {
    "guide/workshops/desktop/index.html": "workshops/desktop/index.html",
    "guide/workshops/sandbox/index.html": "workshops/sandbox/index.html",
    "guide/workshops/tenancy/index.html": "workshops/tenancy/index.html",
}

UNMODIFIED_SCAFFOLDS = {
    "input/business-input.md": """# Business Input

Paste the raw user brief, workbook notes, PRD excerpts, or copied source material for this run in this file.

## Industry

## Category

## Pain Point

## Oracle Feature Mapping

## Implementation Notes

## Limitations / Risks

## Target Users

## Desired Demo Outcome

## Deployment Target

## Optional Services
""",
    "input/product-requirements.md": """# Product Requirements

## Source Mode

- Replace with `User-supplied PRD`, `Merged partial PRD`, or `No source PRD provided for this run`.

## Source Document

Replace this product requirements placeholder with the source PRD if one was provided for this run. Otherwise state that the build started from a brief and defer to `working-prd.md`.
""",
    "input/working-prd.md": """# Working PRD

This file becomes the build contract for the specialist wave. Create or update it before delegation. Every inferred item should be marked `Assumption:` until confirmed.

## Input Mode

- Replace with `PRD`, `Merge`, or `Bootstrap`.

## Source Inputs

## Program Context

Replace this working PRD placeholder with the synthesized build contract before delegation.

## Business Scenario

## Business Outcomes

## Personas

## Pain-Point Classification

## Core Workflow

## Story Architecture

## First Iteration Experience

## Oracle AI Database 26ai Protagonist Story

## Oracle Feature Candidates

## Recommended Oracle Feature Set

## Rejected Features And Why

## Oracle Capability Mapping

## MVP Scope

## Non-Goals

## Feature Inventory

## Feature-To-Scene Mapping

## Data Contract

## Deployment And Runtime Assumptions

## Security And Trust Boundaries

## Redwood JET UI Quality Bar

## Non-Functional Requirements

## Acceptance Criteria

## Success Metrics

## Assumptions

## Open Questions
""",
    "input/assumptions.md": """# Assumptions

- Record only explicit assumptions made during orchestration.
- Remove assumptions that become confirmed requirements.
""",
    "docs/problem-framing.md": """# Problem Framing

## Pain Point

## Users

## Business Outcomes

## Scope Boundaries
""",
    "docs/proposed-solution.md": """# Proposed Solution

## Summary

## Why Oracle Database Is The Engine

## Why This LiveStacks Shape Fits The Problem
""",
    "docs/architecture-decisions.md": """# Architecture Decisions

## Chosen Architecture

## Key Decisions

## Rejected Alternatives

## Chosen Implementation
""",
    "docs/data-design.md": """# Data Design

## Domain Model

## Oracle Feature Mapping

## ORDS Resource Plan

## Dataset Onboarding And State

## Oracle Evidence Map

## Migrations And Seed Strategy
""",
    "docs/ui-concept.md": """# UI Concept

Document the application in premium Oracle JET / Redwood terms. Use `$redwood-creator` as the app-UI lane source of truth when it is available.

## Personas To Screens

## Story Mode

## First Scene Interaction

## Scene Sequence

## Primary CTA Path

## Screen Inventory

## Oracle Feature-To-Scene Map

## Dataset Admin Flow

## Upload Your Own Data Runtime Contract

## Oracle Internals Or Database X-Ray

## Redwood JET Polish Bar

## Critical Interactions

## Loading, Empty, And Error States
""",
    "docs/implementation-plan.md": """# Implementation Plan

## Milestones

## Dependencies

## Critical Path

## Validation Plan

## Open Issues
""",
    "docs/feature-inventory.md": """# Feature Inventory

## Primary Workflow Features

## Operator And Admin Features

## Oracle Evidence Features

## Deferred Or Out Of Scope
""",
    "docs/oracle-capability-map.md": """# Oracle Capability Map

## Protagonist Story

## Candidate Features Considered

## Chosen Feature Set

## Rejected Features And Why

## Capability To Business Mapping

## Required Oracle Dependencies

## Scene Evidence Mapping

## Oracle Evidence Surfaces

## Customer Rebuild Implications
""",
    "docs/risks-and-review.md": """# Risks And Review

## Challenged Assumptions

## Devil's Advocate Findings

## Revisions Made

## Remaining Risks
""",
    "docs/deployment-guide.md": """# Deployment Guide

## Prerequisites

## Environment Variables

## Build And Run

## Ollama Model Bootstrap

## Health Checks
""",
    "docs/customer-rebuild.md": """# Customer Rebuild Guide

## Dataset Admin Workflow

## Dataset Package Contract

## Replace Demo Data

## Adapt Integrations

## Restore Demo Baseline

## Validate In Customer Environment
""",
    "docs/runbook.md": """# Runbook

## Startup

## Ollama Model Bootstrap

## Operational Checks

## Troubleshooting

## Recovery Notes
""",
    "validation/acceptance-checklist.md": """# Acceptance Checklist

- `input/working-prd.md` exists and is the current build contract.
- Problem framing is explicit and traceable to the user input.
- `docs/problem-framing.md`, `docs/proposed-solution.md`, `docs/implementation-plan.md`, and `docs/risks-and-review.md` are populated as real role-owned artifacts.
- Oracle Database is the engine of the solution.
- Oracle AI Database 26ai capabilities are mapped explicitly to the business outcome.
- The first app screen opens on an interactive operator workflow with a primary CTA, state change, and scene-aware Oracle evidence.
- The app meets the premium Oracle Redwood / Oracle JET UI bar, including Oracle Sans, documented Redwood colors, restrained geometry, and Oracle JET icons for controls.
- ORDS routes are defined or clearly specified.
- The stack includes the baseline services and justified optional services.
- Portable Ollama model bootstrap wrappers exist and are documented for operators.
- The LiveStack guide exists under `guide/`, matches the real app flow, and includes screenshot-backed labs.
- Security, portability, and operations notes are present.
- Customer rebuild guidance explains how demo data is replaced.
- Replaceable demo-data solutions include a top-right `Upload Your Own Data` masthead utility plus template download, validate preview, upload status, active dataset state, and demo restore.
- The application includes a visible Oracle Internals panel or database X-Ray mode tied to real Oracle behavior.
""",
    "validation/launch-checklist.md": """# Launch Checklist

## Environment Readiness

## Service Startup

## Health Checks

## First Workflow Verification

## Guide Alignment
""",
    "validation/data-onboarding-checklist.md": """# Data Onboarding Checklist

## Source Contract

## Validate-Only Checks

## Upload Or Replace Checks

## Restore-Demo Checks

## Derived Artifact Rebuild

## Failure Handling
""",
    "output/guide-screenshots/inventory.md": """# Guide Screenshot Inventory

Replace this placeholder inventory by running automated guide screenshot capture against the live app.
""",
    "output/guide-screenshots/inventory.json": """{
  "baseUrl": "",
  "capturedAt": "",
  "inventory": [],
  "failures": [
    "Replace this placeholder inventory by running automated guide screenshot capture against the live app."
  ]
}
""",
}

TEXT_SUFFIXES = {
    ".md",
    ".py",
    ".sql",
    ".xml",
    ".yml",
    ".yaml",
    ".txt",
    ".html",
    ".css",
    ".js",
    ".json",
    ".env",
    ".example",
}


def is_text_file(path: Path) -> bool:
    return path.suffix.lower() in TEXT_SUFFIXES or path.name == ".env.example"


def canonical_sample_workshop() -> Path | None:
    sample = os.environ.get("LIVELABS_SAMPLE_WORKSHOP")
    if not sample:
        return None
    return Path(sample).expanduser()


def bundled_canonical_workshop() -> Path:
    return (
        Path(__file__).resolve().parents[1]
        / "assets"
        / "bundled"
        / "livestack-guide-builder"
        / "assets"
        / "templates"
    )


def canonical_workshop_roots() -> list[tuple[Path, bool]]:
    roots: list[tuple[Path, bool]] = []
    sample = canonical_sample_workshop()
    bundled_template = bundled_canonical_workshop()
    if sample and sample.exists():
        roots.append((sample, False))
    if bundled_template.exists():
        roots.append((bundled_template, True))
    return roots


def canonicalize_text(text: str) -> str:
    return text.replace("\r\n", "\n").strip()


def scan(root: Path) -> list[tuple[str, int, str]]:
    findings: list[tuple[str, int, str]] = []
    for relative_path in sorted(REQUIRED_PATHS):
        if not (root / relative_path).exists():
            findings.append((str(root / relative_path), 1, "missing required file"))
    if not list(root.glob("guide/scene-*/*.md")):
        findings.append((str(root / "guide"), 1, "missing required scene lab"))
    for target_relative, sample_relative in CANONICAL_WORKSHOP_INDEX_PATHS.items():
        target_path = root / target_relative
        if not target_path.exists():
            continue
        target_text = canonicalize_text(target_path.read_text(encoding="utf-8", errors="ignore"))
        canonical_texts = []
        for canonical_root, is_bundled_template in canonical_workshop_roots():
            sample_path = canonical_root / ("workshops/index.html" if is_bundled_template else sample_relative)
            if sample_path.exists():
                canonical_texts.append(
                    canonicalize_text(sample_path.read_text(encoding="utf-8", errors="ignore"))
                )
        if canonical_texts and target_text not in canonical_texts:
            findings.append(
                (
                    str(target_path),
                    1,
                    "index.html diverges from canonical LiveLabs shell",
                )
            )
    for file_path in sorted(root.rglob("*")):
        if not file_path.is_file() or not is_text_file(file_path):
            continue
        text = file_path.read_text(encoding="utf-8", errors="ignore")
        relative_path = str(file_path.relative_to(root))
        for heading in REQUIRED_HEADINGS.get(relative_path, []):
            if heading not in text:
                findings.append((str(file_path), 1, f"missing required heading `{heading}`"))
        template = UNMODIFIED_SCAFFOLDS.get(relative_path)
        if template and text.strip() == template.strip():
            findings.append((str(file_path), 1, "unmodified scaffold template"))
        for line_number, line in enumerate(text.splitlines(), start=1):
            for marker in MARKERS:
                if marker == "change-me" and relative_path in ALLOWED_CHANGE_ME_PATHS:
                    continue
                if marker in line:
                    findings.append((str(file_path), line_number, marker))
    return findings


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution_root", help="Path to the generated LiveStacks solution folder.")
    args = parser.parse_args()

    root = Path(args.solution_root).expanduser()
    if not root.exists():
        raise SystemExit(f"Solution root does not exist: {root}")

    findings = scan(root)
    if not findings:
        print("No scaffold markers found.")
        return 0

    for file_path, line_number, marker in findings:
        print(f"{file_path}:{line_number}: {marker}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
