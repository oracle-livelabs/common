from __future__ import annotations

import importlib.util
import json
import subprocess
import sys
import tempfile
import unittest
from datetime import date
from pathlib import Path


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCAFFOLD = SKILL_ROOT / "scripts" / "scaffold_livestack_guide.py"
VALIDATOR = SKILL_ROOT / "scripts" / "validate_livestack_guide.py"


def load_module(path: Path, name: str):
    spec = importlib.util.spec_from_file_location(name, path)
    if spec is None or spec.loader is None:
        raise RuntimeError(f"Could not load module from {path}")
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module


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
        self.assertEqual(len(payload["failures"]), 2)
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

    def test_copy_marker_validator_accepts_supported_styles(self) -> None:
        module = load_module(VALIDATOR, "livestack_guide_validator_supported")
        validator = module.Validator(Path("guide-root"))

        for text in (
            "```bash\n<copy>\npodman compose ps\n<copy>\n```",
            "```bash\n<copy>\npodman compose ps\n</copy>\n```",
        ):
            validator.findings = []
            validator.validate_copy_markers(Path("lab.md"), text)
            self.assertEqual(validator.findings, [])

    def test_copy_marker_validator_rejects_malformed_mixed_block(self) -> None:
        module = load_module(VALIDATOR, "livestack_guide_validator_rejects")
        validator = module.Validator(Path("guide-root"))
        text = "```bash\n<copy>\nfirst\n<copy>\n<copy>\nsecond\n</copy>\n```"

        validator.validate_copy_markers(Path("lab.md"), text)

        self.assertTrue(validator.findings)


if __name__ == "__main__":
    unittest.main()
