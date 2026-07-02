from __future__ import annotations

import json
import os
import shutil
import stat
import subprocess
import sys
import tempfile
import unittest
import zipfile
from pathlib import Path
from unittest import mock

sys.dont_write_bytecode = True


SKILL_ROOT = Path(__file__).resolve().parents[1]
SCRIPTS_DIR = SKILL_ROOT / "scripts"
BUILD_SCRIPT = SCRIPTS_DIR / "build_release.py"
sys.path.insert(0, str(SCRIPTS_DIR))

import build_release  # noqa: E402
import check_skill_package  # noqa: E402
import self_update  # noqa: E402


SOURCE_DATE_EPOCH = "1700000000"
PUBLISHED_AT = "2023-11-14T22:13:20Z"


def create_skill_fixture(root: Path) -> None:
    for relative in check_skill_package.REQUIRED_PATHS:
        path = root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_text("\n", encoding="utf-8")

    (root / "SKILL.md").write_text(
        "---\n"
        "name: livestacks-orchestrator\n"
        "description: Build Oracle LiveStacks applications from a PRD.\n"
        "---\n",
        encoding="utf-8",
    )
    (root / "VERSION").write_text("1.2.3-preview.4\n", encoding="utf-8")
    (root / "agents" / "openai.yaml").write_text(
        "display_name: Test\nshort_description: Test\ndefault_prompt: Test\n",
        encoding="utf-8",
    )
    for name in ("README.md", "CHANGELOG.md", "NOTICE"):
        (root / name).write_text("Release 1.2.3-preview.4\n", encoding="utf-8")
    (root / "update.json").write_text("{}\n", encoding="utf-8")
    executable = root / "scripts" / "self_update.py"
    executable.write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    executable.chmod(0o755)


def initial_manifest(path: Path) -> None:
    path.write_text(
        json.dumps(
            {
                "archive_sha256": "0" * 64,
                "archive_url": "livestacks-orchestrator.zip",
                "content_hash": "0" * 64,
                "custom_field": "preserve-me",
                "min_updater_version": "2",
                "name": "livestacks-orchestrator",
                "published_at": "2000-01-01T00:00:00Z",
                "version": "0.0.0",
            },
            indent=2,
            sort_keys=True,
        )
        + "\n",
        encoding="utf-8",
    )


def run_cli(skill_root: Path, archive: Path, manifest: Path, mode: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    env["SOURCE_DATE_EPOCH"] = SOURCE_DATE_EPOCH
    return subprocess.run(
        [
            sys.executable,
            str(BUILD_SCRIPT),
            "--skill-root",
            str(skill_root),
            "--archive",
            str(archive),
            "--manifest",
            str(manifest),
            mode,
        ],
        env=env,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )


def transaction_artifacts(*parents: Path) -> list[Path]:
    artifacts: list[Path] = []
    for parent in parents:
        artifacts.extend(parent.glob(".*.prepared-*"))
        artifacts.extend(parent.glob(".*.rollback-*"))
    return sorted(set(artifacts))


class ReleasePackageTests(unittest.TestCase):
    def test_two_builds_are_byte_identical(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            archive_one = root / "one.zip"
            archive_two = root / "two.zip"
            manifest_one = root / "one.json"
            manifest_two = root / "two.json"
            initial_manifest(manifest_one)
            initial_manifest(manifest_two)

            first = run_cli(skill_root, archive_one, manifest_one, "--publish")
            second = run_cli(skill_root, archive_two, manifest_two, "--publish")

            self.assertEqual(first.returncode, 0, first.stderr)
            self.assertEqual(second.returncode, 0, second.stderr)
            self.assertEqual(archive_one.read_bytes(), archive_two.read_bytes())
            self.assertEqual(json.loads(manifest_one.read_text())["published_at"], PUBLISHED_AT)
            self.assertEqual(json.loads(manifest_two.read_text())["published_at"], PUBLISHED_AT)

    def test_archive_has_clean_single_root_and_canonical_bytes_and_modes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            (skill_root / ".DS_Store").write_text("metadata", encoding="utf-8")
            (skill_root / ".livestacks-update-state.json").write_text("{}", encoding="utf-8")
            cache = skill_root / "scripts" / "__pycache__"
            cache.mkdir()
            (cache / "cached.pyc").write_bytes(b"cache")
            archive_path = root / "release.zip"

            build_release.write_deterministic_archive(skill_root, archive_path)

            extracted = root / "extracted"
            extracted.mkdir()
            with zipfile.ZipFile(archive_path) as archive:
                infos = archive.infolist()
                names = [info.filename for info in infos]
                self.assertEqual(names, sorted(names))
                self.assertTrue(all(name.startswith("livestacks-orchestrator/") for name in names))
                self.assertFalse(any(".DS_Store" in name for name in names))
                self.assertFalse(any("__pycache__" in name for name in names))
                self.assertFalse(any(".livestacks-update-state.json" in name for name in names))
                self.assertTrue(all(info.date_time == build_release.ZIP_TIMESTAMP for info in infos))

                for info in infos:
                    archive.extract(info, extracted)
                    mode = (info.external_attr >> 16) & 0xFFFF
                    target = extracted / info.filename
                    target.chmod(stat.S_IMODE(mode))

                info_by_name = {info.filename: info for info in infos}
                for source in build_release.included_paths(skill_root):
                    relative = source.relative_to(skill_root)
                    archive_name = f"livestacks-orchestrator/{relative.as_posix()}"
                    if source.is_dir():
                        archive_name += "/"
                    info = info_by_name[archive_name]
                    archived_mode = stat.S_IMODE((info.external_attr >> 16) & 0xFFFF)
                    expected_mode = 0o755 if source.is_dir() or source.stat().st_mode & 0o111 else 0o644
                    self.assertEqual(archived_mode, expected_mode)
                    if source.is_file():
                        target = extracted / archive_name
                        self.assertEqual(target.read_bytes(), source.read_bytes())
                        if os.name != "nt":
                            self.assertEqual(stat.S_IMODE(target.stat().st_mode), expected_mode)

    def test_irrelevant_filesystem_modes_do_not_change_archive_bytes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            archive_one = root / "one.zip"
            archive_two = root / "two.zip"
            executable = skill_root / "scripts" / "self_update.py"
            regular = skill_root / "README.md"
            scripts_dir = skill_root / "scripts"

            executable.chmod(0o700)
            regular.chmod(0o600)
            scripts_dir.chmod(0o700)
            build_release.write_deterministic_archive(skill_root, archive_one)

            executable.chmod(0o775)
            regular.chmod(0o664)
            scripts_dir.chmod(0o775)
            build_release.write_deterministic_archive(skill_root, archive_two)

            self.assertEqual(archive_one.read_bytes(), archive_two.read_bytes())

    def test_publish_sets_manifest_hashes_and_check_passes(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            archive = root / "release.zip"
            manifest = root / "manifest.json"
            initial_manifest(manifest)

            publish = run_cli(skill_root, archive, manifest, "--publish")
            check = run_cli(skill_root, archive, manifest, "--check")
            value = json.loads(manifest.read_text(encoding="utf-8"))

            self.assertEqual(publish.returncode, 0, publish.stderr)
            self.assertEqual(check.returncode, 0, check.stderr)
            self.assertEqual(value["version"], "1.2.3-preview.4")
            self.assertEqual(value["published_at"], PUBLISHED_AT)
            self.assertEqual(value["archive_sha256"], self_update.sha256_file(archive))
            self.assertEqual(value["content_hash"], self_update.content_hash(skill_root))
            self.assertEqual(value["custom_field"], "preserve-me")

    def test_publish_supports_same_basename_outputs_in_different_directories(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            archive = root / "archive" / "release-output"
            manifest = root / "manifest" / "release-output"
            archive.parent.mkdir()
            manifest.parent.mkdir()
            initial_manifest(manifest)

            publish = run_cli(skill_root, archive, manifest, "--publish")
            check = run_cli(skill_root, archive, manifest, "--check")

            self.assertEqual(publish.returncode, 0, publish.stderr)
            self.assertEqual(check.returncode, 0, check.stderr)
            with zipfile.ZipFile(archive) as release_zip:
                self.assertIn("livestacks-orchestrator/VERSION", release_zip.namelist())
            self.assertEqual(json.loads(manifest.read_text())["version"], "1.2.3-preview.4")
            self.assertEqual(transaction_artifacts(archive.parent, manifest.parent), [])

    def test_second_activation_failure_restores_both_prior_outputs(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            archive = root / "release.zip"
            manifest = root / "manifest.json"
            archive.write_bytes(b"previous release archive")
            initial_manifest(manifest)
            previous_archive = archive.read_bytes()
            previous_manifest = manifest.read_bytes()
            real_replace = build_release.os.replace

            def fail_manifest_activation(source: object, destination: object) -> None:
                source_path = Path(source)
                destination_path = Path(destination)
                if source_path.name.startswith(f".{manifest.name}.prepared-manifest-") and destination_path == manifest:
                    raise OSError("simulated manifest activation failure")
                real_replace(source, destination)

            with mock.patch.object(build_release.os, "replace", side_effect=fail_manifest_activation):
                with self.assertRaisesRegex(build_release.ReleaseError, "previous release outputs restored"):
                    build_release.publish_release(skill_root, archive, manifest)

            self.assertEqual(archive.read_bytes(), previous_archive)
            self.assertEqual(manifest.read_bytes(), previous_manifest)
            self.assertEqual(transaction_artifacts(root), [])

    def test_second_activation_failure_removes_outputs_that_did_not_exist_before(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            archive = root / "release.zip"
            manifest = root / "manifest.json"
            prepared_archive = root / ".release.zip.prepared-archive-test"
            prepared_manifest = root / ".manifest.json.prepared-manifest-test"
            prepared_archive.write_bytes(b"new archive")
            prepared_manifest.write_bytes(b"new manifest")
            real_replace = build_release.os.replace

            def fail_manifest_activation(source: object, destination: object) -> None:
                if Path(source) == prepared_manifest and Path(destination) == manifest:
                    raise OSError("simulated manifest activation failure")
                real_replace(source, destination)

            with mock.patch.object(build_release.os, "replace", side_effect=fail_manifest_activation):
                with self.assertRaisesRegex(build_release.ReleaseError, "previous release outputs restored"):
                    build_release.activate_release_pair(
                        prepared_archive,
                        archive,
                        prepared_manifest,
                        manifest,
                    )

            self.assertFalse(archive.exists())
            self.assertFalse(manifest.exists())
            self.assertEqual(transaction_artifacts(root), [])

    def test_check_detects_stale_archive_and_manifest_without_mutation(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            skill_root = root / "source"
            skill_root.mkdir()
            create_skill_fixture(skill_root)
            archive = root / "release.zip"
            manifest = root / "manifest.json"
            initial_manifest(manifest)
            publish = run_cli(skill_root, archive, manifest, "--publish")
            self.assertEqual(publish.returncode, 0, publish.stderr)

            original_archive = archive.read_bytes()
            archive.write_bytes(original_archive + b"non-deterministic-trailer")
            stale_archive = archive.read_bytes()
            manifest_before = manifest.read_bytes()
            archive_check = run_cli(skill_root, archive, manifest, "--check")
            self.assertNotEqual(archive_check.returncode, 0)
            self.assertEqual(archive.read_bytes(), stale_archive)
            self.assertEqual(manifest.read_bytes(), manifest_before)

            archive.write_bytes(original_archive)
            value = json.loads(manifest.read_text(encoding="utf-8"))
            value["content_hash"] = "f" * 64
            manifest.write_text(json.dumps(value, indent=2, sort_keys=True) + "\n", encoding="utf-8")
            archive_before = archive.read_bytes()
            stale_manifest = manifest.read_bytes()
            manifest_check = run_cli(skill_root, archive, manifest, "--check")
            self.assertNotEqual(manifest_check.returncode, 0)
            self.assertEqual(archive.read_bytes(), archive_before)
            self.assertEqual(manifest.read_bytes(), stale_manifest)


if __name__ == "__main__":
    unittest.main()
