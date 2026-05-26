#!/usr/bin/env python3
"""Validate a LiveStack guide as a scene-by-scene demo runbook."""

from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from pathlib import Path


OPTIONAL_VARIANTS = ("desktop", "tenancy")
ALL_VARIANTS = ("desktop", "sandbox", "tenancy")
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
    "confirm ",
    "scroll ",
    "toggle ",
    "download ",
    "upload ",
)
OUTCOME_HINTS = (
    "business",
    "signal",
    "outcome",
    "decision",
    "governance",
    "evidence",
    "oracle",
    "value",
    "useful",
    "story",
)
BYOD_PATTERN = re.compile(
    r"\b(use|bring)\s+your\s+own\s+data\b|\bdataset\s+(tool|manager)\b|\btemplate\s+zip\b|\bcompleted\s+zip\b",
    re.IGNORECASE,
)
BYOD_REQUIRED_TERMS = (
    ("dataset tool", "use your own data", "bring your own"),
    ("active dataset", "dataset label", "active dataset state"),
    ("template",),
    ("zip",),
    ("validate", "validation", "preview"),
    ("upload", "replace", "import"),
    ("restore", "seeded"),
    ("synthetic", "de-identified", "anonymized", "anonymised"),
)
FENCED_BLOCK_RE = re.compile(r"```[^\n]*\n(?P<body>.*?)(?:\n```|$)", re.DOTALL)
COPY_MARKER_RE = re.compile(r"</?copy>")
IMAGE_RE = re.compile(r"!\[([^\]]*)\]\(([^)]+)\)")
LINK_RE = re.compile(r"(?<!!)\[([^\]]+)\]\(([^)]+)\)")
TASK_RE = re.compile(r"^## Task\s+(\d+)\s*:", re.MULTILINE)
SCENE_RE = re.compile(r"^scene-(\d+)-(.+)$")


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
        path_text = self.rel(path) if isinstance(path, Path) else path
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
            self.guide_root / "workshops" / "sandbox" / "index.html",
            self.guide_root / "workshops" / "sandbox" / "manifest.json",
        ]
        for path in required:
            if not path.exists():
                self.add(path, "missing required LiveStack guide file")

        scene_labs = self.scene_labs()
        if not scene_labs:
            self.add(self.guide_root, "guide must include at least one scene lab under `scene-*/*.md`")
        else:
            self.validate_scene_paths(scene_labs)

        for variant in ALL_VARIANTS:
            variant_root = self.guide_root / "workshops" / variant
            index_path = variant_root / "index.html"
            manifest_path = variant_root / "manifest.json"
            if variant == "sandbox" or index_path.exists() or manifest_path.exists():
                if not index_path.exists():
                    self.add(index_path, f"{variant} workshop variant is missing index.html")
                if not manifest_path.exists():
                    self.add(manifest_path, f"{variant} workshop variant is missing manifest.json")
                if index_path.exists():
                    self.validate_index(index_path)

    def scene_labs(self) -> list[Path]:
        return sorted(self.guide_root.glob("scene-*/*.md"), key=self.scene_sort_key)

    def scene_sort_key(self, path: Path) -> tuple[int, str]:
        number = self.scene_number(path)
        return (number if number is not None else 10_000, str(path))

    def scene_number(self, path: Path) -> int | None:
        match = SCENE_RE.match(path.parent.name)
        if not match:
            return None
        return int(match.group(1))

    def validate_scene_paths(self, scene_labs: list[Path]) -> None:
        numbers: list[int] = []
        for path in scene_labs:
            folder = path.parent.name
            match = SCENE_RE.match(folder)
            if not match:
                self.add(path, "scene lab folder must be named `scene-N-slug`")
                continue
            number = int(match.group(1))
            numbers.append(number)
            if path.stem != folder:
                self.add(path, "scene markdown filename must match its `scene-N-slug` folder name")

        if numbers:
            expected = list(range(1, len(numbers) + 1))
            if sorted(numbers) != expected:
                self.add(self.guide_root, f"scene folders must be numbered continuously from 1; found {sorted(numbers)}")

    def validate_index(self, path: Path) -> None:
        text = path.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n").strip()
        if self.canonical_index.exists():
            canonical = self.canonical_index.read_text(encoding="utf-8", errors="ignore").replace("\r\n", "\n").strip()
            if text == canonical:
                return

        shell_markers = ("Oracle LiveLabs", "common/redwood-hol", "<div id=\"root\"")
        if not any(marker in text for marker in shell_markers[:1]) or not any(marker in text for marker in shell_markers[1:]):
            self.add(path, "workshop index.html does not look like the LiveLabs shell")

    def validate_labs(self) -> None:
        lab_paths = [
            self.guide_root / "introduction" / "introduction.md",
            *self.scene_labs(),
        ]
        for optional in (
            self.guide_root / "download-livestack" / "download-livestack.md",
            self.guide_root / "conclusion" / "conclusion.md",
        ):
            if optional.exists():
                lab_paths.append(optional)

        for path in lab_paths:
            if path.exists():
                self.validate_lab(path)

        self.validate_use_your_own_data()

    def validate_lab(self, path: Path) -> None:
        text = path.read_text(encoding="utf-8", errors="ignore")
        lines = text.splitlines()
        first_nonempty = next((line.strip() for line in lines if line.strip()), "")

        if first_nonempty == "---":
            self.validate_frontmatter(path, text)
        elif not first_nonempty.startswith("# "):
            self.add(path, "first non-empty line must be a single H1")

        if "## Introduction" not in text:
            self.add(path, "lab is missing `## Introduction`")
        if "## Credits & Build Notes" not in text:
            self.add(path, "lab is missing `## Credits & Build Notes`")
        if "## Acknowledgements" in text:
            self.add(path, "LiveStack guides must use `## Credits & Build Notes`, not `## Acknowledgements`")

        for placeholder in PLACEHOLDERS:
            if placeholder in text:
                self.add(path, f"lab still contains placeholder text `{placeholder}`", self.line_number(text, placeholder))

        self.validate_copy_markers(path, text)
        self.validate_images(path, text)
        self.validate_internal_links(path, text)

        relative = self.rel(path)
        if relative.endswith("introduction/introduction.md"):
            self.validate_introduction(path, text)
        elif "/scene-" in relative:
            self.validate_scene_lab(path, text)
        elif relative.endswith("download-livestack/download-livestack.md"):
            self.validate_download_lab(path, text)

    def validate_frontmatter(self, path: Path, text: str) -> None:
        parts = text.split("---", 2)
        if len(parts) < 3:
            self.add(path, "frontmatter starts with `---` but does not close")
            return
        if not parts[2].lstrip().startswith("# "):
            self.add(path, "first content after frontmatter must be a single H1")

    def validate_introduction(self, path: Path, text: str) -> None:
        for required in ("### Objectives", "### Prerequisites", "## Learn More"):
            if required not in text:
                self.add(path, f"introduction is missing `{required}`")
        if "## Demo Flow" not in text and "## Workshop Flow" not in text:
            self.add(path, "introduction is missing `## Demo Flow` or `## Workshop Flow`")
        if "Estimated Demo Time:" not in text and "Estimated Workshop Time:" not in text:
            self.add(path, "introduction is missing an estimated demo time field")
        if "![" not in text:
            self.add(path, "introduction should include a real screenshot from the app")

    def validate_scene_lab(self, path: Path, text: str) -> None:
        lower = text.lower()
        if "### Objectives" not in text:
            self.add(path, "scene lab is missing `### Objectives`")
        self.validate_task_numbering(path, text)
        if "![" not in text:
            self.add(path, "scene lab must include at least one real screenshot or GIF from the app")
        if not any(hint in lower for hint in ACTION_HINTS):
            self.add(path, "scene lab must tell the user what to click, inspect, run, compare, or validate")
        if not any(token in lower for token in OUTCOME_HINTS):
            self.add(path, "scene lab must state the expected business outcome, signal, decision, or Oracle evidence")

    def validate_download_lab(self, path: Path, text: str) -> None:
        lower = text.lower()
        self.validate_task_numbering(path, text)
        for needle, message in (
            ("podman compose", "download lab must document `podman compose` startup"),
            ("http://localhost", "download lab must reference the local application URL"),
            ("compose.yml", "download lab must tell users to confirm the compose file exists"),
            ("podman compose down", "download lab must document clean shutdown"),
            (".zip", "download lab must name the distributed archive"),
        ):
            if needle not in lower:
                self.add(path, message)

    def validate_task_numbering(self, path: Path, text: str) -> None:
        numbers = [int(match.group(1)) for match in TASK_RE.finditer(text)]
        if not numbers:
            self.add(path, "runbook lab must include numbered `## Task N:` sections")
            return
        expected = list(range(1, len(numbers) + 1))
        if numbers != expected:
            self.add(path, f"task sections must be numbered continuously from 1; found {numbers}")

    def validate_use_your_own_data(self) -> None:
        scene_texts: list[tuple[Path, str]] = [
            (path, path.read_text(encoding="utf-8", errors="ignore")) for path in self.scene_labs()
        ]
        byod_candidates = [(path, text) for path, text in scene_texts if BYOD_PATTERN.search(path.as_posix()) or BYOD_PATTERN.search(text)]
        guide_declares_byod = any("use your own data" in text.lower() or "bring your own" in text.lower() for _path, text in scene_texts)
        solution_expects_byod = self.input_is_solution_root and (self.input_root / "stack").exists()

        if not byod_candidates:
            if solution_expects_byod:
                self.add(self.guide_root, "generated LiveStack guide must include a full Use Your Own Data or dataset workflow scene")
            return

        combined = "\n".join(text.lower() for _path, text in byod_candidates)
        for alternatives in BYOD_REQUIRED_TERMS:
            if not any(term in combined for term in alternatives):
                self.add(
                    byod_candidates[0][0],
                    "Use Your Own Data scene must cover dataset tool, active dataset, template ZIP, validation, upload/replace, restore-demo, and data-safety expectations",
                )
                break

        if guide_declares_byod and not any("scene-" in str(path) for path, _text in byod_candidates):
            self.add(self.guide_root, "Use Your Own Data must be documented as a scene or operator workflow, not only mentioned in passing")

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
        for match in IMAGE_RE.finditer(text):
            alt = match.group(1).strip()
            target = self.clean_markdown_target(match.group(2))
            if not alt or len(alt) < 8:
                self.add(path, "image is missing meaningful alt text", self.line_number(text, match.group(0)))
            if target.startswith(("http://", "https://")):
                continue
            image_path = (path.parent / target).resolve()
            if not image_path.exists():
                self.add(path, f"image target does not exist: `{target}`", self.line_number(text, match.group(0)))

    def validate_internal_links(self, path: Path, text: str) -> None:
        for match in LINK_RE.finditer(text):
            target = self.clean_markdown_target(match.group(2))
            if not target or target.startswith(("#", "http://", "https://", "mailto:")):
                continue
            link_path = Path(target.split("#", 1)[0])
            if not link_path.as_posix():
                continue
            resolved = (path.parent / link_path).resolve()
            try:
                resolved.relative_to(self.solution_root.resolve())
            except ValueError:
                self.add(path, f"internal link points outside the guide bundle: `{target}`", self.line_number(text, match.group(0)))
                continue
            if not resolved.exists():
                self.add(path, f"internal link target does not exist: `{target}`", self.line_number(text, match.group(0)))

    def clean_markdown_target(self, raw_target: str) -> str:
        target = raw_target.strip().split(None, 1)[0].strip("<>")
        return target

    def validate_screenshot_inventory(self) -> None:
        screenshot_root = self.solution_root / "output" / "guide-screenshots"
        json_path = screenshot_root / "inventory.json"
        md_path = screenshot_root / "inventory.md"

        if not json_path.exists():
            if (self.input_is_solution_root and (self.input_root / "stack").exists()) or md_path.exists():
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
        for variant in ALL_VARIANTS:
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
                relative_to_solution = str(resolved.relative_to(self.solution_root.resolve())).replace("\\", "/")
            except ValueError:
                self.add(path, f"manifest tutorial points outside the bundle: `{filename}`")
                continue
            try:
                relative_to_guide = str(resolved.relative_to(self.guide_root.resolve())).replace("\\", "/")
            except ValueError:
                self.add(path, f"manifest tutorial points outside the guide: `{filename}`")
                continue

            local_refs.add(relative_to_guide)
            if not resolved.exists():
                self.add(path, f"manifest tutorial target does not exist: `{filename}`")
            if relative_to_guide.startswith("scene-"):
                scene_refs.add(relative_to_guide)

            if relative_to_solution.count("../"):
                self.add(path, f"manifest tutorial has unexpected traversal: `{filename}`")

        required_refs = {"introduction/introduction.md", *scene_refs}
        for optional in ("download-livestack/download-livestack.md", "conclusion/conclusion.md"):
            if (self.guide_root / optional).exists():
                required_refs.add(optional)
        for required in sorted(required_refs - local_refs):
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
