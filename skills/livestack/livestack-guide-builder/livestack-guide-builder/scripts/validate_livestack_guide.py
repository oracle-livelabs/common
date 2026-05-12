#!/usr/bin/env python3
"""Validate a LiveStack guide as a scene-by-scene demo runbook."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path


REQUIRED_VARIANTS = ("desktop", "sandbox", "tenancy")
REQUIRED_LOCAL_REFS = {
    "guide/introduction/introduction.md",
    "guide/download-livestack/download-livestack.md",
    "guide/conclusion/conclusion.md",
}
PLACEHOLDERS = (
    "Replace this",
    "Replace Me",
    "replace this",
    "replace me",
)
ACTION_HINTS = (
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
FENCED_BLOCK_RE = re.compile(r"```[^\n]*\n(?P<body>.*?)(?:\n```|$)", re.DOTALL)
COPY_MARKER_RE = re.compile(r"</?copy>")


@dataclass
class Finding:
    path: str
    line: int
    message: str


class Validator:
    def __init__(self, root: Path) -> None:
        self.input_root = root
        self.guide_root = self.resolve_guide_root(root)
        self.solution_root = self.guide_root.parent
        self.input_is_solution_root = (root / "guide").exists() and self.guide_root == root / "guide"
        self.findings: list[Finding] = []
        self.canonical_index = Path(__file__).resolve().parents[1] / "assets" / "templates" / "workshops" / "index.html"

    @staticmethod
    def resolve_guide_root(root: Path) -> Path:
        if (root / "introduction" / "introduction.md").exists() and (root / "workshops").exists():
            return root
        if (root / "guide").exists():
            return root / "guide"
        return root

    def rel(self, path: Path) -> str:
        try:
            return str(path.relative_to(self.solution_root)).replace("\\", "/")
        except ValueError:
            return str(path)

    def add(self, path: Path | str, message: str, line: int = 1) -> None:
        if isinstance(path, Path):
            path_text = self.rel(path)
        else:
            path_text = path
        self.findings.append(Finding(path_text, line, message))

    def validate(self) -> list[Finding]:
        if not self.guide_root.exists():
            self.add(self.guide_root, "guide folder does not exist")
            return self.findings

        self.validate_required_shape()
        self.validate_labs()
        self.validate_manifests()
        self.validate_screenshot_inventory()
        return self.findings

    def validate_required_shape(self) -> None:
        required = [
            self.guide_root / "introduction" / "introduction.md",
            self.guide_root / "download-livestack" / "download-livestack.md",
            self.guide_root / "conclusion" / "conclusion.md",
        ]
        for variant in REQUIRED_VARIANTS:
            required.extend(
                [
                    self.guide_root / "workshops" / variant / "index.html",
                    self.guide_root / "workshops" / variant / "manifest.json",
                ]
            )
        for path in required:
            if not path.exists():
                self.add(path, "missing required LiveStack guide file")

        scene_labs = self.scene_labs()
        if not scene_labs:
            self.add(self.guide_root, "guide must include at least one scene lab under `scene-*/*.md`")

        for variant in REQUIRED_VARIANTS:
            index_path = self.guide_root / "workshops" / variant / "index.html"
            if index_path.exists():
                self.validate_index(index_path)

    def scene_labs(self) -> list[Path]:
        return sorted(self.guide_root.glob("scene-*/*.md"))

    def validate_index(self, path: Path) -> None:
        text = path.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n").strip()
        if self.canonical_index.exists():
            canonical = self.canonical_index.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n").strip()
            if text != canonical:
                self.add(path, "workshop index.html differs from the canonical LiveLabs shell")
            return

        desktop = self.guide_root / "workshops" / "desktop" / "index.html"
        if desktop.exists() and path != desktop:
            desktop_text = desktop.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n").strip()
            if text != desktop_text:
                self.add(path, "workshop index.html differs from the desktop shell")

    def validate_labs(self) -> None:
        for path in [
            self.guide_root / "introduction" / "introduction.md",
            self.guide_root / "download-livestack" / "download-livestack.md",
            *self.scene_labs(),
            self.guide_root / "conclusion" / "conclusion.md",
        ]:
            if not path.exists():
                continue
            self.validate_lab(path)

    def validate_lab(self, path: Path) -> None:
        text = path.read_text(encoding="utf-8", errors="ignore")
        lower = text.lower()
        lines = text.splitlines()
        first_nonempty = next((line.strip() for line in lines if line.strip()), "")

        if not first_nonempty.startswith("# "):
            self.add(path, "first non-empty line must be a single H1")
        if "## Introduction" not in text:
            self.add(path, "lab is missing `## Introduction`")
        if "Estimated Time:" not in text and "Estimated Demo Time:" not in text and "Estimated Workshop Time:" not in text:
            self.add(path, "lab is missing an estimated time field")
        if "### Objectives" not in text:
            self.add(path, "lab is missing `### Objectives`")
        if "## Credits & Build Notes" not in text:
            self.add(path, "lab is missing `## Credits & Build Notes`")
        if "## Acknowledgements" in text:
            self.add(path, "LiveStack guides must use `## Credits & Build Notes`, not `## Acknowledgements`")
        for placeholder in PLACEHOLDERS:
            if placeholder in text:
                self.add(path, f"lab still contains placeholder text `{placeholder}`", self.line_number(text, placeholder))

        self.validate_copy_markers(path, text)
        self.validate_images(path, text)

        is_scene = "/scene-" in self.rel(path)
        is_download = self.rel(path).endswith("download-livestack/download-livestack.md")
        if is_scene or is_download:
            if "Expected result:" not in text:
                self.add(path, "runbook lab must include `Expected result:`")
            if "Why this matters" not in text:
                self.add(path, "runbook lab must include a `Why this matters` task")
            if not any(hint in lower for hint in ACTION_HINTS):
                self.add(path, "runbook lab must tell the user what to interact with")
        if is_scene:
            if "![" not in text:
                self.add(path, "scene lab should include a real screenshot or GIF from the app")
            if "what is happening" in lower and any(p in text for p in PLACEHOLDERS):
                self.add(path, "scene lab still describes the template instead of the real scene")
        if is_download:
            if "podman compose" not in lower:
                self.add(path, "download lab must document `podman compose` startup")
            if "http://localhost" not in text:
                self.add(path, "download lab must reference the local application URL")

    def validate_copy_markers(self, path: Path, text: str) -> None:
        matches = list(FENCED_BLOCK_RE.finditer(text))
        if not matches:
            if not self.copy_block_is_valid(text):
                self.add(path, "copy markers must use paired `<copy>` markers or wrapped `<copy>...</copy>` markers inside a single block")
            return

        uncovered_parts: list[str] = []
        cursor = 0
        for match in matches:
            uncovered_parts.append(text[cursor : match.start()])
            cursor = match.end()
            block = match.group("body")
            if not self.copy_block_is_valid(block):
                line = text[: match.start()].count("\n") + 1
                self.add(path, "copy markers must use either paired `<copy>` markers or wrapped `<copy>...</copy>` markers within each fenced code block", line)
        uncovered_parts.append(text[cursor:])

        outside_fences = "\n".join(uncovered_parts)
        if not self.copy_block_is_valid(outside_fences):
            self.add(path, "copy markers outside fenced code blocks are malformed")

    def copy_block_is_valid(self, text: str) -> bool:
        tokens = COPY_MARKER_RE.findall(text)
        if not tokens:
            return True

        open_count = tokens.count("<copy>")
        close_count = tokens.count("</copy>")
        paired_ok = close_count == 0 and open_count % 2 == 0
        if paired_ok:
            return True

        if open_count != close_count:
            return False

        expect_open = True
        for token in tokens:
            if expect_open and token != "<copy>":
                return False
            if not expect_open and token != "</copy>":
                return False
            expect_open = not expect_open
        return expect_open

    def validate_images(self, path: Path, text: str) -> None:
        for match in re.finditer(r"!\[([^\]]*)\]\(([^)]+)\)", text):
            alt = match.group(1).strip()
            target = match.group(2).strip()
            if not alt:
                self.add(path, "image is missing meaningful alt text", self.line_number(text, match.group(0)))
            if target.startswith(("http://", "https://")):
                continue
            image_path = (path.parent / target).resolve()
            if not image_path.exists():
                self.add(path, f"image target does not exist: `{target}`", self.line_number(text, match.group(0)))

    def validate_screenshot_inventory(self) -> None:
        screenshot_root = self.solution_root / "output" / "guide-screenshots"
        json_path = screenshot_root / "inventory.json"
        md_path = screenshot_root / "inventory.md"

        if not json_path.exists():
            if self.input_is_solution_root or md_path.exists():
                self.add(json_path, "missing guide screenshot inventory JSON")
            return

        if not md_path.exists():
            self.add(md_path, "missing guide screenshot inventory markdown")

        text = json_path.read_text(encoding="utf-8", errors="ignore")
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

        screenshot_root_resolved = screenshot_root.resolve()
        for entry in inventory:
            if not isinstance(entry, dict):
                self.add(json_path, "inventory entry must be an object")
                continue

            for key in ("file", "view", "caption", "alt", "note"):
                value = str(entry.get(key, "")).strip()
                if not value:
                    self.add(json_path, f"inventory entry is missing `{key}`")

            file_value = str(entry.get("file", "")).strip()
            if not file_value:
                continue
            relative_file = Path(file_value)
            if relative_file.is_absolute():
                self.add(json_path, f"inventory screenshot path must be relative: `{file_value}`")
                continue
            file_path = (screenshot_root / relative_file).resolve()
            try:
                file_path.relative_to(screenshot_root_resolved)
            except ValueError:
                self.add(json_path, f"inventory screenshot path points outside `output/guide-screenshots`: `{file_value}`")
                continue
            if not file_path.exists():
                self.add(json_path, f"inventory screenshot file does not exist: `{file_value}`")

        guide_image_files = [path for path in self.guide_root.glob("**/images/*") if path.is_file()]
        if inventory and not guide_image_files:
            self.add(self.guide_root, "guide is missing integrated screenshots under `guide/**/images`")

        if md_path.exists():
            md_text = md_path.read_text(encoding="utf-8", errors="ignore")
            if "Replace this placeholder" in md_text:
                self.add(md_path, "inventory markdown still contains placeholder text")
            failure_strings = [str(failure).strip() for failure in failures if str(failure).strip()]
            if failure_strings and not any(failure in md_text for failure in failure_strings):
                self.add(md_path, "inventory markdown does not explain the recorded screenshot failures")

    def validate_manifests(self) -> None:
        scene_refs = {
            str(path.relative_to(self.guide_root)).replace("\\", "/")
            for path in self.scene_labs()
        }
        for variant in REQUIRED_VARIANTS:
            path = self.guide_root / "workshops" / variant / "manifest.json"
            if not path.exists():
                continue
            refs = self.validate_manifest(path)
            if refs is not None and refs != scene_refs:
                self.add(path, f"{variant} manifest scene refs do not match scene labs on disk")

    def validate_manifest(self, path: Path) -> set[str] | None:
        text = path.read_text(encoding="utf-8", errors="ignore")
        try:
            payload = json.loads(text)
        except json.JSONDecodeError as exc:
            self.add(path, f"invalid JSON: {exc.msg}", exc.lineno)
            return None

        title = str(payload.get("workshoptitle", "")).strip()
        if not title or "replace" in title.lower():
            self.add(path, "manifest has placeholder or empty `workshoptitle`")
        if not str(payload.get("help", "")).strip():
            self.add(path, "manifest is missing `help`")

        tutorials = payload.get("tutorials")
        if not isinstance(tutorials, list) or not tutorials:
            self.add(path, "manifest is missing tutorials")
            return set()

        local_refs: set[str] = set()
        scene_refs: set[str] = set()
        for tutorial in tutorials:
            if not isinstance(tutorial, dict):
                self.add(path, "manifest tutorial entry must be an object")
                continue
            filename = tutorial.get("filename")
            title_value = tutorial.get("title")
            if not isinstance(title_value, str) or not title_value.strip():
                self.add(path, "manifest tutorial entry is missing `title`")
            if not isinstance(filename, str) or not filename.strip():
                self.add(path, "manifest tutorial entry is missing `filename`")
                continue
            if filename.startswith(("http://", "https://")):
                continue
            resolved = (path.parent / filename).resolve()
            try:
                relative_ref = str(resolved.relative_to(self.solution_root)).replace("\\", "/")
            except ValueError:
                self.add(path, f"manifest tutorial points outside the bundle: `{filename}`")
                continue
            local_refs.add(relative_ref)
            if not resolved.exists():
                self.add(path, f"manifest tutorial target does not exist: `{filename}`")
            if "/scene-" in relative_ref:
                scene_refs.add(relative_ref.removeprefix("guide/"))

        for required in sorted(REQUIRED_LOCAL_REFS):
            if required not in local_refs:
                self.add(path, f"manifest is missing required guide ref `{required}`")
        return scene_refs

    def line_number(self, text: str, needle: str) -> int:
        index = text.find(needle)
        if index < 0:
            return 1
        return text[:index].count("\n") + 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("guide_or_solution_root", help="Path to a guide folder or solution root containing guide/.")
    parser.add_argument("--format", choices=("text", "json"), default="text")
    args = parser.parse_args()

    root = Path(args.guide_or_solution_root).expanduser().resolve()
    validator = Validator(root)
    findings = validator.validate()
    if args.format == "json":
        print(json.dumps([finding.__dict__ for finding in findings], indent=2))
    elif findings:
        for finding in findings:
            print(f"{finding.path}:{finding.line}: {finding.message}")
    else:
        print("No LiveStack guide issues found.")
    return 0 if not findings else 1


if __name__ == "__main__":
    raise SystemExit(main())
