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
from unittest import mock


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
            if name in {".DS_Store", "__pycache__", ".pytest_cache", ".livestacks-update-state.json"}:
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
            if path.name == ".DS_Store" or path.name.startswith("._") or path.suffix in {".pyc", ".pyo"}:
                continue
            archive.write(path, Path("livestacks-orchestrator") / relative)


def tree_snapshot(root: Path) -> dict[str, bytes]:
    return {
        path.relative_to(root).as_posix(): path.read_bytes()
        for path in sorted(root.rglob("*"))
        if path.is_file()
    }


def transaction_paths(parent: Path) -> list[Path]:
    return sorted(parent.glob(".livestacks-orchestrator.prepared-*")) + sorted(
        parent.glob(".livestacks-orchestrator.rollback-*")
    )


def prepare_valid_update(root: Path) -> tuple[Path, Path, Path]:
    remote_skill = root / "remote" / "livestacks-orchestrator"
    local_skill = root / "local" / "livestacks-orchestrator"
    copy_skill(SKILL_ROOT, remote_skill)

    local_skill.mkdir(parents=True)
    (local_skill / "SKILL.md").write_text(
        "---\nname: livestacks-orchestrator\n---\nlocal installation\n",
        encoding="utf-8",
    )
    (local_skill / "VERSION").write_text("0.0.0\n", encoding="utf-8")
    (local_skill / "local-only.bin").write_bytes(b"old installation\x00\xff")

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
    return local_skill, manifest_path, remote_skill


def auto_update(local_skill: Path, manifest_path: Path) -> dict[str, object]:
    return self_update.update(
        Namespace(
            skill_root=str(local_skill),
            manifest_url=str(manifest_path),
            auto=True,
            check_only=False,
            allow_downgrade=False,
        )
    )


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
            local_skill, manifest_path, remote_skill = prepare_valid_update(root)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))

            result = auto_update(local_skill, manifest_path)

            self.assertEqual(result["status"], "updated")
            self.assertEqual((local_skill / "VERSION").read_text(encoding="utf-8").strip(), manifest["version"])
            self.assertEqual(self_update.content_hash(local_skill), manifest["content_hash"])
            state = json.loads((local_skill / ".livestacks-update-state.json").read_text(encoding="utf-8"))
            self.assertEqual(state["version"], manifest["version"])
            self.assertEqual(transaction_paths(local_skill.parent), [])

    def test_activation_failure_restores_previous_installation_byte_for_byte(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            local_skill, manifest_path, _remote_skill = prepare_valid_update(root)
            active_target = local_skill.resolve()
            before = tree_snapshot(local_skill)
            path_type = type(local_skill)
            real_rename = path_type.rename

            def fail_prepared_activation(source: Path, destination: object) -> Path:
                source_path = Path(source)
                destination_path = Path(destination)
                if source_path.name.startswith(".livestacks-orchestrator.prepared-") and destination_path == active_target:
                    raise OSError("simulated activation failure")
                return real_rename(source, destination)

            with mock.patch.object(path_type, "rename", new=fail_prepared_activation):
                result = auto_update(local_skill, manifest_path)

            self.assertEqual(result["status"], "skipped")
            self.assertFalse(result["updated"])
            self.assertIn("previous installation restored", str(result["reason"]))
            self.assertEqual(tree_snapshot(local_skill), before)
            self.assertEqual(transaction_paths(local_skill.parent), [])

    def test_backup_cleanup_failure_reports_success_with_recovery_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            local_skill, manifest_path, remote_skill = prepare_valid_update(root)
            real_remove = self_update._remove_transaction_path

            def fail_rollback_cleanup(path: Path) -> None:
                if path.name.startswith(".livestacks-orchestrator.rollback-"):
                    raise OSError("simulated backup cleanup failure")
                real_remove(path)

            with mock.patch.object(self_update, "_remove_transaction_path", side_effect=fail_rollback_cleanup):
                result = auto_update(local_skill, manifest_path)

            recovery_backup = Path(str(result["recovery_backup"]))
            self.assertEqual(result["status"], "updated")
            self.assertTrue(result["updated"])
            self.assertIn("rollback-backup cleanup failed", str(result["warning"]))
            self.assertEqual(self_update.content_hash(local_skill), self_update.content_hash(remote_skill))
            self.assertTrue(recovery_backup.exists())
            self.assertEqual(recovery_backup.parent, local_skill.resolve().parent)

    def test_lock_cleanup_failure_reports_success_with_stale_lock_path(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            local_skill, manifest_path, remote_skill = prepare_valid_update(root)
            path_type = type(local_skill)
            real_unlink = path_type.unlink

            def fail_lock_unlink(path: Path, *args: object, **kwargs: object) -> None:
                if path.name == "livestacks-orchestrator-update.lock":
                    raise OSError("simulated lock unlink failure")
                real_unlink(path, *args, **kwargs)

            with mock.patch.object(path_type, "unlink", new=fail_lock_unlink):
                result = auto_update(local_skill, manifest_path)

            recovery_lock = Path(str(result["recovery_lock"]))
            self.assertEqual(result["status"], "updated")
            self.assertTrue(result["updated"])
            self.assertIn("update lock cleanup failed", str(result["warning"]))
            self.assertIn("stale lock", str(result["warning"]))
            self.assertEqual(self_update.content_hash(local_skill), self_update.content_hash(remote_skill))
            self.assertTrue(recovery_lock.exists())
            self.assertEqual(recovery_lock.name, "livestacks-orchestrator-update.lock")

    def test_state_write_failure_leaves_active_installation_unchanged(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            local_skill, manifest_path, _remote_skill = prepare_valid_update(root)
            before = tree_snapshot(local_skill)

            with mock.patch.object(self_update, "write_state", side_effect=OSError("simulated state write failure")):
                result = auto_update(local_skill, manifest_path)

            self.assertEqual(result["status"], "skipped")
            self.assertFalse(result["updated"])
            self.assertIn("installation preparation failed", str(result["reason"]))
            self.assertIn("left unchanged", str(result["reason"]))
            self.assertEqual(tree_snapshot(local_skill), before)
            self.assertEqual(transaction_paths(local_skill.parent), [])

    def test_rollback_failure_is_reported_and_preserves_backup(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            local_skill, manifest_path, _remote_skill = prepare_valid_update(root)
            active_target = local_skill.resolve()
            before = tree_snapshot(local_skill)
            path_type = type(local_skill)
            real_rename = path_type.rename

            def fail_activation_and_rollback(
                source: Path,
                destination: object,
            ) -> Path:
                source_path = Path(source)
                destination_path = Path(destination)
                if destination_path == active_target and source_path.name.startswith(
                    (".livestacks-orchestrator.prepared-", ".livestacks-orchestrator.rollback-")
                ):
                    raise OSError(f"simulated rename failure for {source_path.name}")
                return real_rename(source, destination)

            with mock.patch.object(path_type, "rename", new=fail_activation_and_rollback):
                result = auto_update(local_skill, manifest_path)

            rollback_paths = sorted(local_skill.parent.glob(".livestacks-orchestrator.rollback-*"))
            self.assertEqual(result["status"], "skipped")
            self.assertFalse(result["updated"])
            self.assertIn("rollback failed", str(result["reason"]))
            self.assertIn("previous installation remains at", str(result["reason"]))
            self.assertFalse(local_skill.exists())
            self.assertEqual(len(rollback_paths), 1)
            self.assertEqual(tree_snapshot(rollback_paths[0]), before)

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

    def test_archive_version_must_match_manifest_version_before_activation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            local_skill, manifest_path, remote_skill = prepare_valid_update(root)
            (local_skill / "VERSION").write_text("0.1.0-preview.22\n", encoding="utf-8")
            (remote_skill / "VERSION").write_text("0.1.0-preview.21\n", encoding="utf-8")

            archive_path = root / "livestacks-orchestrator.zip"
            zip_skill(remote_skill, archive_path)
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest["version"] = "9.9.9"
            manifest["archive_sha256"] = self_update.sha256_file(archive_path)
            manifest["content_hash"] = self_update.content_hash(remote_skill)
            manifest_path.write_text(json.dumps(manifest), encoding="utf-8")
            before = tree_snapshot(local_skill)

            result = auto_update(local_skill, manifest_path)

            self.assertEqual(result["status"], "validation_failed")
            self.assertFalse(result["updated"])
            self.assertEqual(result["archive_version"], "0.1.0-preview.21")
            self.assertIn("did not match manifest version '9.9.9'", str(result["reason"]))
            self.assertEqual(tree_snapshot(local_skill), before)
            self.assertEqual(transaction_paths(local_skill.parent), [])

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
