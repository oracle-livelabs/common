from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path
import zipfile


SKILL_ROOT = Path(__file__).resolve().parents[1]
PACKAGE_SCRIPT = SKILL_ROOT / "scripts" / "package_livestack_bundle.py"
ENSURE_SCRIPT = SKILL_ROOT / "scripts" / "ensure_clean_zip.py"


def run_script(script: Path, *args: str) -> subprocess.CompletedProcess[str]:
    env = os.environ.copy()
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    return subprocess.run(
        [sys.executable, str(script), *args],
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        env=env,
        check=False,
    )


class CleanPackagingTests(unittest.TestCase):
    def create_source(self, root: Path) -> Path:
        source = root / "sample-livestack"
        (source / "stack").mkdir(parents=True)
        (source / "stack" / "compose.yml").write_text("services: {}\n", encoding="utf-8")
        (source / "stack" / ".env.example").write_text("ADMIN_TOKEN=change-me\n", encoding="utf-8")
        (source / "stack" / ".env").write_text("ADMIN_TOKEN=secret\n", encoding="utf-8")
        (source / ".DS_Store").write_bytes(b"metadata")
        (source / "stack" / "node_modules" / "pkg").mkdir(parents=True)
        (source / "stack" / "node_modules" / "pkg" / "index.js").write_text("ignored\n", encoding="utf-8")
        (source / "stack" / "backend").mkdir()
        (source / "stack" / "backend" / "server.js").write_text("console.log('ok');\n", encoding="utf-8")
        return source

    def test_packages_one_clean_root_and_excludes_local_state(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = self.create_source(root)
            output = source / "sample-livestack.zip"

            result = run_script(PACKAGE_SCRIPT, str(source), str(output))

            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertIn("Clean LiveStack archive verified", result.stdout)
            self.assertIn("SHA-256:", result.stdout)
            with zipfile.ZipFile(output) as archive:
                self.assertIsNone(archive.testzip())
                names = archive.namelist()
            self.assertIn("sample-livestack/stack/compose.yml", names)
            self.assertIn("sample-livestack/stack/.env.example", names)
            self.assertNotIn("sample-livestack/stack/.env", names)
            self.assertFalse(any("node_modules" in name for name in names))
            self.assertFalse(any(name.endswith(".DS_Store") for name in names))
            self.assertNotIn("sample-livestack/sample-livestack.zip", names)

    def test_rejects_source_without_compose(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "not-a-livestack"
            source.mkdir()
            output = Path(temp_dir) / "bad.zip"

            result = run_script(PACKAGE_SCRIPT, str(source), str(output))

            self.assertEqual(result.returncode, 2)
            self.assertIn("must contain stack/compose.yml or compose.yml", result.stderr)

    def test_rejects_symlinks_instead_of_silently_skipping_them(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            root = Path(temp_dir)
            source = self.create_source(root)
            link = source / "stack" / "linked-compose.yml"
            try:
                link.symlink_to(source / "stack" / "compose.yml")
            except OSError as exc:
                self.skipTest(f"symlinks unavailable: {exc}")

            result = run_script(PACKAGE_SCRIPT, str(source), str(root / "bad.zip"))

            self.assertEqual(result.returncode, 2)
            self.assertIn("contains symlinks", result.stderr)

    def test_installs_bundled_clean_zip_snapshot(self) -> None:
        with tempfile.TemporaryDirectory() as temp_dir:
            destination = Path(temp_dir) / "skills"

            result = run_script(ENSURE_SCRIPT, "--dest-root", str(destination))

            self.assertEqual(result.returncode, 0, result.stderr)
            installed = destination / "clean-zip"
            self.assertTrue((installed / "SKILL.md").is_file())
            self.assertTrue((installed / "scripts" / "create_clean_zip.py").is_file())
            self.assertFalse((installed / "BUNDLED_SKILL.md").exists())


if __name__ == "__main__":
    unittest.main()
