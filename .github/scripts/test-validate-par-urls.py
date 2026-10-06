#!/usr/bin/env python3

from importlib.util import module_from_spec, spec_from_file_location
from pathlib import Path
import sys
import unittest


SCRIPT = Path(__file__).with_name("validate-par-urls.py")
SPEC = spec_from_file_location("validate_par_urls", SCRIPT)
MODULE = module_from_spec(SPEC)
sys.modules[SPEC.name] = MODULE
SPEC.loader.exec_module(MODULE)

OBJECT_STORAGE_ROOT = "https://objectstorage.us-phoenix-1.oraclecloud.com"


def object_storage_url(path: str) -> str:
    """Build test URLs without embedding PAR candidates in this source file."""
    return f"{OBJECT_STORAGE_ROOT}/{path}"


class ValidateParUrlsTests(unittest.TestCase):
    def test_allows_approved_namespaces(self):
        for namespace in ("c4u04", "c4uo2"):
            line = object_storage_url(f"p/example/n/{namespace}/b/demo/o/file")
            self.assertEqual([], MODULE.findings_for_line("lab.md", 3, line))

    def test_rejects_unapproved_namespace_without_exposing_token(self):
        token = "secret-example-token"
        line = object_storage_url(f"p/{token}/n/otherns/b/demo/o/file")
        findings = MODULE.findings_for_line("lab.md", 9, line)
        self.assertEqual("otherns", findings[0].namespace)
        self.assertNotIn(token, repr(findings[0]))

    def test_rejects_par_without_namespace(self):
        line = object_storage_url("p/example/b/demo/o/file")
        findings = MODULE.findings_for_line("lab.md", 12, line)
        self.assertIsNone(findings[0].namespace)

    def test_ignores_non_par_and_explicit_template(self):
        lines = (
            object_storage_url("n/otherns/b/demo/o/file"),
            object_storage_url("p/<par-token>/n/<namespace>/b/demo/o/file"),
        )
        for line in lines:
            self.assertEqual([], MODULE.findings_for_line("lab.md", 1, line))

    def test_scans_only_added_diff_lines(self):
        removed = object_storage_url("p/old/n/foreign/b/demo/o/file")
        approved = object_storage_url("p/new/n/c4u04/b/demo/o/file")
        unapproved = object_storage_url("p/new/n/foreign/b/demo/o/file")
        diff = f"""diff --git a/lab.md b/lab.md
--- a/lab.md
+++ b/lab.md
@@ -4 +4,2 @@
-{removed}
+{approved}
+{unapproved}
"""
        findings = MODULE.findings_from_diff(diff)
        self.assertEqual([MODULE.Finding("lab.md", 5, "foreign")], findings)

    def test_test_source_contains_no_literal_par_candidates(self):
        source = Path(__file__).read_text(encoding="utf-8")
        for line_number, line in enumerate(source.splitlines(), start=1):
            self.assertEqual(
                [],
                MODULE.findings_for_line(str(Path(__file__).name), line_number, line),
            )


if __name__ == "__main__":
    unittest.main()
