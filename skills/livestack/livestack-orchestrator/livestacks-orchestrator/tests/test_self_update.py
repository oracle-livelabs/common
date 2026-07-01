from __future__ import annotations

import importlib.util
import json
import shutil
import sys
import tempfile
import unittest
import zipfile
from argparse import Namespace
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


self_update = load_module("self_update", SCRIPTS_DIR / "self_update.py")


def copy_skill(source: Path, target: Path) -> None:
    def ignore(_directory: str, names: list[str]) -> set[str]:
        ignored: set[str] = set()
        for name in names:
            if name in {"__pycache__", ".pytest_cache", ".livestacks-update-state.json"}:
                ignored.add(name)
            elif name.endswith((".pyc", ".pyo")) or name.startswith("._"):
                ignored.add(name)
        return ignored

    shutil.copytree(source, target, ignore=ignore)


def zip_skill(skill_root: Path, archive_path: Path) -> None:
    with zipfile.ZipFile(archive_path, "w", compression=zipfile.ZIP_DEFLATED) as archive:
        for path in sorted(skill_root.rglob("*")):
            if path.is_dir():
                continue
            relative = path.relative_to(skill_root)
            if any(part in {"__pycache__", ".pytest_cache"} for part in relative.parts):
                continue
            if path.name.startswith("._") or path.suffix in {".pyc", ".pyo"}:
                continue
            archive.write(path, Path("livestacks-orchestrator") / relative)


class SelfUpdateTests(unittest.TestCase):
    def test_current_manifest_does_not_download_archive(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "livestacks-orchestrator"
            skill_root.mkdir()
            (skill_root / "SKILL.md").write_text("---\nname: livestacks-orchestrator\n---\n", encoding="utf-8")
            (skill_root / "VERSION").write_text("1.0.0\n", encoding="utf-8")

            manifest = {
                "name": "livestacks-orchestrator",
                "version": "1.0.0",
                "archive_url": "missing.zip",
                "archive_sha256": "0" * 64,
                "content_hash": self_update.content_hash(skill_root),
                "min_updater_version": "2",
            }
            manifest_path = root / "manifest.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = self_update.update(
                Namespace(
                    skill_root=str(skill_root),
                    manifest_url=str(manifest_path),
                    auto=True,
                    check_only=False,
                    allow_downgrade=False,
                )
            )

            self.assertEqual(result["status"], "current")
            self.assertFalse(result["updated"])

    def test_auto_update_installs_valid_zip_when_content_hash_differs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            remote_skill = root / "remote" / "livestacks-orchestrator"
            local_skill = root / "local" / "livestacks-orchestrator"
            copy_skill(SKILL_ROOT, remote_skill)
            copy_skill(SKILL_ROOT, local_skill)
            (local_skill / "VERSION").write_text("0.0.0-test\n", encoding="utf-8")

            archive_path = root / "livestacks-orchestrator.zip"
            zip_skill(remote_skill, archive_path)
            manifest = {
                "name": "livestacks-orchestrator",
                "version": (remote_skill / "VERSION").read_text(encoding="utf-8").strip(),
                "archive_url": archive_path.name,
                "archive_sha256": self_update.sha256_file(archive_path),
                "content_hash": self_update.content_hash(remote_skill),
                "min_updater_version": "2",
            }
            manifest_path = root / "livestacks-orchestrator.update.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = self_update.update(
                Namespace(
                    skill_root=str(local_skill),
                    manifest_url=str(manifest_path),
                    auto=True,
                    check_only=False,
                    allow_downgrade=False,
                )
            )

            self.assertEqual(result["status"], "updated")
            self.assertEqual((local_skill / "VERSION").read_text(encoding="utf-8").strip(), manifest["version"])
            self.assertEqual(self_update.content_hash(local_skill), manifest["content_hash"])

    def test_auto_update_refuses_older_manifest_version_by_default(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "livestacks-orchestrator"
            skill_root.mkdir()
            (skill_root / "SKILL.md").write_text("---\nname: livestacks-orchestrator\n---\n", encoding="utf-8")
            (skill_root / "VERSION").write_text("0.1.0-preview.17\n", encoding="utf-8")

            manifest = {
                "name": "livestacks-orchestrator",
                "version": "0.1.0-preview.16",
                "archive_url": "missing.zip",
                "archive_sha256": "0" * 64,
                "content_hash": "f" * 64,
                "min_updater_version": "2",
            }
            manifest_path = root / "livestacks-orchestrator.update.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = self_update.update(
                Namespace(
                    skill_root=str(skill_root),
                    manifest_url=str(manifest_path),
                    auto=True,
                    check_only=False,
                    allow_downgrade=False,
                )
            )

            self.assertEqual(result["status"], "skipped")
            self.assertFalse(result["updated"])
            self.assertFalse(result["update_available"])
            self.assertIn("older than installed version", result["reason"])
            self.assertEqual((skill_root / "VERSION").read_text(encoding="utf-8").strip(), "0.1.0-preview.17")

    def test_allow_downgrade_keeps_existing_archive_validation_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "livestacks-orchestrator"
            skill_root.mkdir()
            (skill_root / "SKILL.md").write_text("---\nname: livestacks-orchestrator\n---\n", encoding="utf-8")
            (skill_root / "VERSION").write_text("0.1.0-preview.17\n", encoding="utf-8")

            manifest = {
                "name": "livestacks-orchestrator",
                "version": "0.1.0-preview.16",
                "archive_url": "missing.zip",
                "archive_sha256": "0" * 64,
                "content_hash": "f" * 64,
                "min_updater_version": "2",
            }
            manifest_path = root / "livestacks-orchestrator.update.json"
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")

            result = self_update.update(
                Namespace(
                    skill_root=str(skill_root),
                    manifest_url=str(manifest_path),
                    auto=True,
                    check_only=False,
                    allow_downgrade=True,
                )
            )

            self.assertEqual(result["status"], "skipped")
            self.assertTrue(result["update_available"])
            self.assertIn("could not download archive", result["reason"])


if __name__ == "__main__":
    unittest.main()
