#!/usr/bin/env python3
"""Scaffold a LiveStack guide runbook with desktop, sandbox, and tenancy variants."""

from __future__ import annotations

import argparse
import json
import re
import shutil
from datetime import date
from pathlib import Path


HELP_EMAIL = "livelabs-help-database_us@oracle.com"


def slugify(value: str) -> str:
    value = value.lower()
    value = re.sub(r"^scene\s+\d+\s*:?\s*", "", value)
    value = re.sub(r"[^a-z0-9]+", "-", value).strip("-")
    return value or "replace-me"


def scene_number(label: str, index: int) -> int:
    match = re.match(r"^\s*scene\s+(\d+)", label, re.IGNORECASE)
    if match:
        return int(match.group(1))
    return index


def scene_title(label: str, index: int) -> str:
    clean = re.sub(r"^\s*scene\s+\d+\s*:?\s*", "", label, flags=re.IGNORECASE).strip()
    return clean or f"Replace Me {index}"


def copy_file(source: Path, destination: Path) -> None:
    destination.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, destination)


def write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def write_text_if_missing(path: Path, text: str) -> None:
    if path.exists():
        return
    write_text(path, text)


def copy_block(command: str, lang: str = "bash") -> str:
    return f"""```{lang}
<copy>
{command}
<copy>
```"""


def tutorial(title: str, filename: str) -> dict[str, str]:
    return {"title": title, "filename": filename}


def manifest_payload(variant: str, workshop_title: str, scenes: list[tuple[str, str]]) -> dict:
    scene_tutorials = [tutorial(title, f"../../{path}") for title, path in scenes]
    if variant == "desktop":
        tutorials = [
            tutorial("Introduction", "../../introduction/introduction.md"),
            tutorial("Download and Run the LiveStack", "../../download-livestack/download-livestack.md"),
            *scene_tutorials,
            tutorial("Conclusion: Business Outcomes", "../../conclusion/conclusion.md"),
            tutorial("Need Help?", "https://oracle-livelabs.github.io/common/labs/need-help/need-help-freetier.md"),
        ]
    elif variant == "sandbox":
        tutorials = [
            tutorial("Get Started", "https://oracle-livelabs.github.io/common/labs/cloud-login/cloud-login-livelabs2.md"),
            tutorial("Introduction", "../../introduction/introduction.md"),
            *scene_tutorials,
            tutorial("Conclusion: Business Outcomes", "../../conclusion/conclusion.md"),
            tutorial("Take it home", "../../download-livestack/download-livestack.md"),
            tutorial("Need Help?", "https://oracle-livelabs.github.io/common/labs/need-help/need-help-livelabs.md"),
        ]
    else:
        tutorials = [
            tutorial("Introduction", "../../introduction/introduction.md"),
            tutorial("Get Started", "https://oracle-livelabs.github.io/common/labs/cloud-login/cloud-login.md"),
            *scene_tutorials,
            tutorial("Conclusion: Business Outcomes", "../../conclusion/conclusion.md"),
            tutorial("Download the LiveStack", "../../download-livestack/download-livestack.md"),
            tutorial("Need Help?", "https://oracle-livelabs.github.io/common/labs/need-help/need-help-freetier.md"),
        ]
    return {
        "workshoptitle": workshop_title,
        "help": HELP_EMAIL,
        "tutorials": tutorials,
    }


def introduction_template(workshop_title: str, scene_lines: list[str], author: str, updated: str) -> str:
    flow = "\n".join(f"- {line}" for line in scene_lines)
    return f"""# {workshop_title}

## Introduction

This workshop is the runbook for the LiveStack demo. Each lab follows one scene in the application, focusing on what is happening, what to interact with, what changes on screen, and what business outcome to notice.

Estimated Demo Time: 1 hour

### Objectives

In this workshop, you will:
- Run each application scene using the visible scene navigation or primary action buttons.
- Observe the expected result after every interaction.
- Connect each scene to the business signal and Oracle-backed workflow behind it.
- Use the download lab to run the portable LiveStack with Podman Compose.

### Prerequisites

This workshop assumes you have:
- Access to the running LiveStack application.
- A browser session open to the application.
- Basic familiarity with the business workflow demonstrated by this LiveStack.

## Workshop Flow

{flow}
- Conclusion and business outcomes.
- Download the LiveStack and run the portable stack with Podman Compose.

## Learn More

- Add the most relevant Oracle product documentation links for this LiveStack.

## Credits & Build Notes
- **Author** - {author}
- **Last Updated By/Date** - {author}, {updated}
"""


def scene_template(number: int, title: str, author: str, updated: str) -> str:
    return f"""# Scene {number} {title}

## Introduction

This scene demonstrates a key step in the LiveStack demo runbook. Replace this paragraph with what is happening in the scene and why the user is here.

Estimated Time: 10 minutes

### Objectives

In this lab, you will:
- Open Scene {number} in the running LiveStack.
- Interact with the primary control for this scene.
- Observe the expected state change and business signal.

## Task 1: Open the Scene

1. Open **Scene {number}: {title}** in the application.
2. Review the visible panels and identify the main operator decision or business signal.
3. Confirm the scene title and state match this lab.

Expected result:
- The scene opens and presents the workflow step described in this lab.
- The user can identify what decision, exception, or outcome this scene is meant to demonstrate.

## Task 2: Run the Main Interaction

1. Click the primary button or control for this scene.
2. Review what changes on screen.
3. Compare the resulting data, recommendation, status, or evidence against the expected business outcome.

Expected result:
- The application shows a visible state change after the interaction.
- The result is specific to the LiveStack story and can be explained in business terms.
- Any Oracle-backed evidence panel or route summary aligns with the visible scene.

## Task 3: Why this matters?

Replace this paragraph with the business reason this scene matters. Explain the outcome signal the user should remember and how Oracle AI Database or ORDS-backed application behavior supports it.

## Credits & Build Notes
- **Author** - {author}
- **Last Updated By/Date** - {author}, {updated}
"""


def download_template(archive_name: str, extracted_dir: str, app_url: str, health_url: str, author: str, updated: str) -> str:
    return f"""# Download the LiveStack
## Introduction

This lab shows how to run the LiveStack in your own environment using the portable stack package and Podman Compose.

Estimated Time: 30 minutes

### Objectives

In this lab, you will:
- Download the portable LiveStack package.
- Extract and prepare the local environment file.
- Start the full application stack with Podman Compose.
- Validate the app and stop the stack cleanly.

## Task 1: Download the portable package

1. Download the package named `{archive_name}` from the provided LiveStack distribution location.
2. Save the file to your machine.

Expected result:
- You have `{archive_name}` available on your machine.

## Task 2: Move the package and prepare environment settings

> **Note:** Do not extract or run the stack from your `Downloads` folder. Create a new working directory and move `{archive_name}` there first.

### For macOS or Linux

1. Open a terminal.

2. Create a new working directory outside of `Downloads`:
    {copy_block("mkdir -p ~/livestack-demo")}

3. Move into the new working directory:
    {copy_block("cd ~/livestack-demo")}

4. Move the downloaded package from `Downloads` into this directory:
    {copy_block(f"mv ~/Downloads/{archive_name} .")}

5. Extract the package:
    {copy_block(f"unzip {archive_name}")}

6. Move into the extracted folder:
    {copy_block(f"cd {extracted_dir}")}

7. Create your runtime environment file:
    {copy_block("cp .env.example .env")}

Expected result:
- You are inside the `{extracted_dir}` directory.
- The folder contains `compose.yml` or `compose.yaml`, `.env`, and the required app files.

## Task 3: Start the demo with Podman Compose

1. Start all services:
    {copy_block("podman compose up -d --build")}

2. Check service status:
    {copy_block("podman compose ps")}

3. Verify application health:
    {copy_block(f"curl {health_url}")}

4. Open the demo in a browser:
    `{app_url}`

Expected result:
- Database, ORDS, Ollama, and app services start successfully.
- The health check returns a healthy response.
- The LiveStack UI loads locally.

## Task 4: Stop the stack when finished

1. Stop and remove running containers:
    {copy_block("podman compose down")}

Expected result:
- The local LiveStack is stopped cleanly.

## Task 5: Why this matters?

A portable runbook is what turns a LiveStack demo into a repeatable field asset. Podman Compose startup, health checks, and clear folder layout instructions reduce setup drift and let users replay the same story in their own environment.

## Credits & Build Notes
- **Author** - {author}
- **Last Updated By/Date** - {author}, {updated}
"""


def conclusion_template(author: str, updated: str) -> str:
    return f"""# Conclusion and Business Outcomes

## Introduction

This closing lab consolidates the full LiveStack story and summarizes the operational outcomes demonstrated across the scenes.

Estimated Time: 10 minutes

### Objectives

In this lab, you will:
- Open or review the final outcome scene.
- Connect the scene sequence to business outcomes.
- Capture a concise value narrative for stakeholder discussion.

## Task 1: Review the Final Outcome

1. Open the conclusion or final summary scene in the application.
2. Review the before-and-after panels, outcome cards, or final recommendation.
3. Identify which scenes created the evidence for this final outcome.

Expected result:
- The user can summarize what changed during the demo.
- The closing message connects application behavior to business value.

## Task 2: Review the Outcome Signals

1. Focus on the operational indicators displayed in the final view.
2. Compare the starting problem with the resolved state.
3. Identify where Oracle-backed data, APIs, or controls reduced manual effort or risk.

Expected result:
- You can describe concrete indicators of operational improvement.
- You can explain how the LiveStack supports a repeatable customer walkthrough.

## Task 3: Why this matters?

The conclusion should leave the user with a clear value narrative: what business pressure existed, what the LiveStack changed, and why the Oracle-backed architecture makes the workflow repeatable.

## Credits & Build Notes
- **Author** - {author}
- **Last Updated By/Date** - {author}, {updated}
"""


def screenshot_inventory_payload(app_url: str, scenes: list[tuple[str, str]], captured_at: str) -> dict:
    failures = [
        f"Capture pending: {title} screenshot has not been captured from the running app."
        for title, _path in scenes
    ]
    return {
        "baseUrl": app_url,
        "capturedAt": captured_at,
        "inventory": [],
        "failures": failures,
    }


def screenshot_inventory_markdown(payload: dict) -> str:
    failures = payload.get("failures", [])
    failure_lines = "\n".join(f"- {failure}" for failure in failures) or "- No pending screenshot captures recorded."
    return f"""# Guide Screenshot Inventory

Base URL: {payload.get("baseUrl", "")}
Captured At: {payload.get("capturedAt", "")}

## Captures

No screenshots have been captured yet.

## Pending Captures

{failure_lines}
"""


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("solution_root", help="Path to the LiveStack solution root.")
    parser.add_argument("--guide-slug", default="guide", help="Guide folder name. Defaults to `guide`.")
    parser.add_argument("--workshop-title", default="LiveStack Demo Workshop")
    parser.add_argument("--scene", action="append", help="Scene label, for example `Scene 1: Command Center`. Repeat for each scene.")
    parser.add_argument("--archive-name", default="livestack-demo.zip")
    parser.add_argument("--extracted-dir", default="livestack-demo")
    parser.add_argument("--app-url", default="http://localhost:8505")
    parser.add_argument("--health-url", default="http://localhost:8505/healthz")
    parser.add_argument("--author", default="LiveLabs Team")
    parser.add_argument("--updated", help="Updated date label for Credits & Build Notes. Defaults to today.")
    parser.add_argument("--force", action="store_true")
    args = parser.parse_args()

    updated = args.updated or date.today().isoformat()

    solution_root = Path(args.solution_root).expanduser().resolve()
    solution_root.mkdir(parents=True, exist_ok=True)
    guide_root = solution_root / args.guide_slug
    if guide_root.exists():
        if not args.force:
            raise SystemExit(f"Destination exists: {guide_root}. Use --force to replace it.")
        shutil.rmtree(guide_root)

    scenes_input = args.scene or ["Scene 1: Replace Me"]
    scenes: list[tuple[str, str]] = []
    scene_flow: list[str] = []
    for index, label in enumerate(scenes_input, start=1):
        number = scene_number(label, index)
        title = scene_title(label, index)
        folder = f"scene-{number}-{slugify(title)}"
        path = f"{folder}/{folder}.md"
        scenes.append((f"Scene {number}: {title}", path))
        scene_flow.append(f"Scene {number}: {title}.")
        write_text(guide_root / path, scene_template(number, title, args.author, updated))

    write_text(guide_root / "introduction" / "introduction.md", introduction_template(args.workshop_title, scene_flow, args.author, updated))
    write_text(guide_root / "download-livestack" / "download-livestack.md", download_template(args.archive_name, args.extracted_dir, args.app_url, args.health_url, args.author, updated))
    write_text(guide_root / "conclusion" / "conclusion.md", conclusion_template(args.author, updated))

    index_template = Path(__file__).resolve().parents[1] / "assets" / "templates" / "workshops" / "index.html"
    if not index_template.exists():
        raise SystemExit(f"Missing canonical workshop index template: {index_template}")

    for variant in ("desktop", "sandbox", "tenancy"):
        copy_file(index_template, guide_root / "workshops" / variant / "index.html")
        payload = manifest_payload(variant, args.workshop_title, scenes)
        write_text(
            guide_root / "workshops" / variant / "manifest.json",
            json.dumps(payload, indent=2) + "\n",
        )

    screenshot_payload = screenshot_inventory_payload(args.app_url, scenes, date.today().isoformat())
    screenshot_root = solution_root / "output" / "guide-screenshots"
    write_text_if_missing(
        screenshot_root / "inventory.json",
        json.dumps(screenshot_payload, indent=2) + "\n",
    )
    write_text_if_missing(
        screenshot_root / "inventory.md",
        screenshot_inventory_markdown(screenshot_payload),
    )

    print(guide_root)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
