from __future__ import annotations

import importlib.util
import json
import shutil
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCAFFOLD = SKILL_ROOT / "scripts" / "scaffold_livestack_guide.py"
VALIDATOR = SKILL_ROOT / "scripts" / "validate_livestack_guide.py"
INDEX_TEMPLATE = SKILL_ROOT / "assets" / "templates" / "workshops" / "index.html"
PNG_BYTES = (
    b"\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01"
    b"\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\xf8\x0f"
    b"\x00\x01\x01\x01\x00\x18\xdd\x8d\xb0\x00\x00\x00\x00IEND\xaeB`\x82"
)


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


def write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content, encoding="utf-8")


def write_image(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(PNG_BYTES)


def copy_index(path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(INDEX_TEMPLATE, path)


def manifest(scene_paths: list[str], include_download: bool = False) -> str:
    tutorials = [
        {"title": "Get Started", "filename": "https://oracle-livelabs.github.io/common/labs/cloud-login/cloud-login-livelabs2.md"},
        {"title": "Introduction", "filename": "../../introduction/introduction.md"},
    ]
    tutorials.extend({"title": Path(path).parent.name.replace("-", " ").title(), "filename": f"../../{path}"} for path in scene_paths)
    if include_download:
        tutorials.append({"title": "Take it home", "filename": "../../download-livestack/download-livestack.md"})
    tutorials.append({"title": "Need Help?", "filename": "https://oracle-livelabs.github.io/common/labs/need-help/need-help-livelabs.md"})
    return json.dumps({"workshoptitle": "Golden Fixture LiveStack", "help": "livelabs-help-database_us@oracle.com", "tutorials": tutorials}, indent=2)


def introduction() -> str:
    return """# Golden Fixture LiveStack Guide

## Introduction

This runbook supports the Golden Fixture LiveStack Demo. The demo shows how an operator uses Oracle-backed application scenes to move from fragmented work to a clear business decision.

Estimated Demo Time: 60 minutes

![Fixture LiveStack welcome page](images/welcome.png)

### Objectives

In this LiveStack Demo, you will:
- Explore the application scenes.
- Connect visible app behavior to Oracle-backed evidence.
- Understand the business outcome of each workflow.

### Prerequisites

This LiveStack Demo assumes you have:
- Access to the running fixture LiveStack.
- A modern browser open to the application URL.

## Demo Flow

- Scene 1: Command Center.
- Scene 2: Use Your Own Data.

## Learn More

- [Oracle LiveLabs catalog](https://livelabs.oracle.com/)

## Credits & Build Notes
- **Author** - Oracle LiveLabs Team
- **Last Updated By/Date** - Oracle LiveLabs Team, 2026-05-26
"""


def scene(title: str, image: str = "scene.png") -> str:
    return f"""# {title}

## Introduction

This scene shows an operator workflow with Oracle evidence, visible state changes, and a business signal the presenter should emphasize.

Estimated Time: 10 minutes

![Command Center workspace with primary action highlighted](images/{image})

### Objectives

In this scene, you will:
- Review the command center workspace.
- Click the primary action.
- Inspect the Oracle Internals evidence and business outcome.

## Task 1: Review the command center

1. Open the scene from the left navigation.
2. Review the KPI cards, action queue, and Oracle evidence panel.
3. Click **Run scenario**.

The visible outcome is a refreshed operator decision signal with Oracle evidence in the right panel.

## Task 2: Explain the business signal

1. Compare the before and after values.
2. Review the Oracle Internals route and SQL evidence.

This is the business value of the scene: the user can explain the decision with governed Oracle evidence.

## Credits & Build Notes
- **Author** - Oracle LiveLabs Team
- **Last Updated By/Date** - Oracle LiveLabs Team, 2026-05-26
"""


def byod_scene() -> str:
    return """# Scene 2 Use Your Own Data

## Introduction

This operator workflow shows how a demo user can replace or restore the dataset through the application dataset tool.

Estimated Time: 10 minutes

![Use Your Own Data modal with template ZIP, completed ZIP, validation, upload, and restore controls highlighted](images/byod.png)

### Objectives

In this scene, you will:
- Open the dataset tool from the application top bar.
- Review the active dataset state.
- Download the canonical dataset template ZIP.
- Select a completed ZIP.
- Validate before upload or replace.
- Restore the seeded demo dataset.
- Explain synthetic or de-identified data expectations.

## Task 1: Open the dataset tool

1. Click **Use Your Own Data** in the top bar.
2. Review the modal title and active dataset label.
3. Confirm the workflow shows template ZIP, completed ZIP, validate, upload, restore, and job status controls.

The dataset manager opens and shows the active dataset before the operator changes anything.

## Task 2: Review template, validation, upload, and restore

1. Download the template ZIP.
2. Select a completed ZIP.
3. Validate the package before import.
4. Upload or replace data only after validation passes.
5. Restore the seeded demo dataset when the demo needs a known-good baseline.

This workflow supports safe customer-data onboarding with synthetic or de-identified data.

## Credits & Build Notes
- **Author** - Oracle LiveLabs Team
- **Last Updated By/Date** - Oracle LiveLabs Team, 2026-05-26
"""


def download_lab(include_shutdown: bool = True) -> str:
    shutdown = "    ```bash\n    <copy>\n    podman compose down\n    </copy>\n    ```" if include_shutdown else "    Stop the stack from your container tool."
    return f"""# Download the LiveStack

## Introduction

This lab shows how to run the LiveStack in your own environment using the portable stack package and Podman Compose.

Estimated Time: 30 minutes

### Objectives

In this lab, you will:
- Download `livestack-fixture.zip`.
- Prepare the working directory.
- Start the full application stack.
- Validate health and stop the stack cleanly.

## Task 1: Download the portable package

1. Download `livestack-fixture.zip`.

## Task 2: Prepare the working directory

1. Extract the archive and confirm that `compose.yml`, `.env`, and app files exist.

## Task 3: Start the demo with Podman Compose

1. Start all services:
    ```bash
    <copy>
    podman compose up -d --build
    </copy>
    ```
2. Verify health:
    ```bash
    <copy>
    curl http://localhost:8505/api/health
    </copy>
    ```
3. Open `http://localhost:8505`.

## Task 4: Stop the stack when finished

{shutdown}

## Credits & Build Notes
- **Author** - Oracle LiveLabs Team
- **Last Updated By/Date** - Oracle LiveLabs Team, 2026-05-26
"""


def create_sandbox_guide(root: Path, include_byod: bool = True, include_download: bool = False) -> Path:
    guide = root / "guide"
    scene_paths = ["scene-1-command-center/scene-1-command-center.md"]
    write(guide / "introduction" / "introduction.md", introduction())
    write_image(guide / "introduction" / "images" / "welcome.png")
    write(guide / scene_paths[0], scene("Scene 1 Command Center"))
    write_image(guide / "scene-1-command-center" / "images" / "scene.png")
    if include_byod:
        scene_paths.append("scene-2-use-your-own-data/scene-2-use-your-own-data.md")
        write(guide / scene_paths[-1], byod_scene())
        write_image(guide / "scene-2-use-your-own-data" / "images" / "byod.png")
    if include_download:
        write(guide / "download-livestack" / "download-livestack.md", download_lab())
    copy_index(guide / "workshops" / "sandbox" / "index.html")
    write(guide / "workshops" / "sandbox" / "manifest.json", manifest(scene_paths, include_download=include_download))
    return guide


def validator_messages(root: Path) -> list[str]:
    module = load_module(VALIDATOR, f"livestack_guide_validator_{id(root)}")
    validator = module.Validator(root)
    return [finding.message for finding in validator.validate()]


class GuideBuilderTests(unittest.TestCase):
    def scaffold(self, root: Path) -> Path:
        subprocess.run(
            [
                sys.executable,
                str(SCAFFOLD),
                str(root),
                "--workshop-title",
                "Fixture LiveStack",
                "--scene",
                "Scene 1: Command Center",
                "--scene",
                "Scene 2: Outcome Review",
            ],
            check=True,
            stdout=subprocess.DEVNULL,
        )
        return root / "guide"

    def test_desktop_manifest_prioritizes_local_run_flow(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            guide = self.scaffold(Path(temp_dir))
            payload = json.loads((guide / "workshops" / "desktop" / "manifest.json").read_text())
            titles = [item["title"] for item in payload["tutorials"]]

        self.assertEqual(titles[0], "Introduction")
        self.assertEqual(titles[1], "Download and Run the LiveStack")
        self.assertNotIn("Get Started", titles[:2])

    def test_scaffold_appends_use_your_own_data_scene(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            guide = self.scaffold(Path(temp_dir))
            payload = json.loads((guide / "workshops" / "sandbox" / "manifest.json").read_text())
            titles = [item["title"] for item in payload["tutorials"]]
            byod_exists = (guide / "scene-3-use-your-own-data" / "scene-3-use-your-own-data.md").exists()

        self.assertIn("Scene 3: Use Your Own Data", titles)
        self.assertTrue(byod_exists)

    def test_scaffold_uses_current_date_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            guide = self.scaffold(Path(temp_dir))
            text = (guide / "introduction" / "introduction.md").read_text()

        self.assertIn(date.today().isoformat(), text)

    def test_scaffold_creates_screenshot_inventory_placeholders(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.scaffold(root)
            payload = json.loads((root / "output" / "guide-screenshots" / "inventory.json").read_text())
            markdown = (root / "output" / "guide-screenshots" / "inventory.md").read_text()

        self.assertEqual(payload["baseUrl"], "http://localhost:8505")
        self.assertEqual(payload["capturedAt"], date.today().isoformat())
        self.assertEqual(payload["inventory"], [])
        self.assertEqual(len(payload["failures"]), 3)
        for failure in payload["failures"]:
            self.assertIn(failure, markdown)

    def test_screenshot_inventory_validator_accepts_scaffold_inventory(self) -> None:
        module = load_module(VALIDATOR, "livestack_guide_validator_inventory_accepts")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            self.scaffold(root)
            validator = module.Validator(root)

            validator.validate_screenshot_inventory()

        self.assertEqual(validator.findings, [])

    def test_screenshot_inventory_validator_rejects_missing_file_and_unreported_failure(self) -> None:
        module = load_module(VALIDATOR, "livestack_guide_validator_inventory_rejects")
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            screenshot_root = root / "output" / "guide-screenshots"
            screenshot_root.mkdir(parents=True)
            (root / "guide" / "scene-1-command-center").mkdir(parents=True)
            (screenshot_root / "inventory.json").write_text(
                json.dumps(
                    {
                        "baseUrl": "http://localhost:8505",
                        "capturedAt": "2026-05-11",
                        "inventory": [
                            {
                                "file": "missing.png",
                                "view": "Scene 1",
                                "caption": "Command center",
                                "alt": "Command center screenshot",
                                "note": "Expected capture",
                            }
                        ],
                        "failures": ["Capture pending: Scene 2 screenshot failed."],
                    },
                    indent=2,
                ),
                encoding="utf-8",
            )
            (screenshot_root / "inventory.md").write_text("# Guide Screenshot Inventory\n\nNo failures here.\n", encoding="utf-8")
            validator = module.Validator(root)

            validator.validate_screenshot_inventory()

        messages = [finding.message for finding in validator.findings]
        self.assertIn("inventory screenshot file does not exist: `missing.png`", messages)
        self.assertIn("inventory markdown does not explain the recorded screenshot failures", messages)

    def test_validator_accepts_sandbox_only_golden_style_guide(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            create_sandbox_guide(root)

            messages = validator_messages(root)

        self.assertEqual(messages, [])

    def test_validator_rejects_missing_required_files(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            (root / "guide").mkdir()

            messages = validator_messages(root)

        self.assertIn("missing required LiveStack guide file", messages)
        self.assertIn("guide must include at least one scene lab under `scene-*/*.md`", messages)

    def test_validator_rejects_broken_internal_links(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            guide = create_sandbox_guide(root)
            scene_path = guide / "scene-1-command-center" / "scene-1-command-center.md"
            scene_path.write_text(scene_path.read_text() + "\n[Missing local file](../missing.md)\n", encoding="utf-8")

            messages = validator_messages(root)

        self.assertIn("internal link target does not exist: `../missing.md`", messages)

    def test_validator_rejects_missing_scene_image(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            guide = create_sandbox_guide(root)
            (guide / "scene-1-command-center" / "images" / "scene.png").unlink()

            messages = validator_messages(root)

        self.assertIn("image target does not exist: `images/scene.png`", messages)

    def test_validator_rejects_inconsistent_scene_numbering(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            guide = create_sandbox_guide(root, include_byod=False)
            source = guide / "scene-1-command-center"
            target = guide / "scene-3-command-center"
            source.rename(target)
            (target / "scene-1-command-center.md").rename(target / "scene-3-command-center.md")
            write(guide / "workshops" / "sandbox" / "manifest.json", manifest(["scene-3-command-center/scene-3-command-center.md"]))

            messages = validator_messages(root)

        self.assertIn("scene folders must be numbered continuously from 1; found [3]", messages)

    def test_validator_requires_byod_for_solution_roots_with_stack(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            create_sandbox_guide(root, include_byod=False)
            (root / "stack").mkdir()

            messages = validator_messages(root)

        self.assertIn("generated LiveStack guide must include a full Use Your Own Data or dataset workflow scene", messages)

    def test_validator_rejects_download_lab_without_teardown(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            guide = create_sandbox_guide(root, include_download=True)
            write(guide / "download-livestack" / "download-livestack.md", download_lab(include_shutdown=False))

            messages = validator_messages(root)

        self.assertIn("download lab must document clean shutdown", messages)

    def test_copy_marker_validator_accepts_supported_styles(self) -> None:
        module = load_module(VALIDATOR, "livestack_guide_validator_supported")
        validator = module.Validator(Path("/tmp"))

        for text in (
            "```bash\n<copy>\npodman compose ps\n<copy>\n```",
            "```bash\n<copy>\npodman compose ps\n</copy>\n```",
        ):
            validator.findings = []
            validator.validate_copy_markers(Path("/tmp/lab.md"), text)
            self.assertEqual(validator.findings, [])

    def test_copy_marker_validator_rejects_malformed_mixed_block(self) -> None:
        module = load_module(VALIDATOR, "livestack_guide_validator_rejects")
        validator = module.Validator(Path("/tmp"))
        text = "```bash\n<copy>\nfirst\n<copy>\n<copy>\nsecond\n</copy>\n```"

        validator.validate_copy_markers(Path("/tmp/lab.md"), text)

        self.assertTrue(validator.findings)


if __name__ == "__main__":
    unittest.main()
