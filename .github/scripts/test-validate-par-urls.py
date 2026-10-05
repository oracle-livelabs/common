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


class ValidateParUrlsTests(unittest.TestCase):
    def test_allows_approved_namespaces(self):
        for namespace in ("c4u04", "c4uo2"):
            line = f"https://objectstorage.us-phoenix-1.oraclecloud.com/p/example/n/{namespace}/b/demo/o/file"
            self.assertEqual([], MODULE.findings_for_line("lab.md", 3, line))

    def test_rejects_unapproved_namespace_without_exposing_token(self):
        token = "secret-example-token"
        line = f"https://objectstorage.us-phoenix-1.oraclecloud.com/p/{token}/n/otherns/b/demo/o/file"
        findings = MODULE.findings_for_line("lab.md", 9, line)
        self.assertEqual("otherns", findings[0].namespace)
        self.assertNotIn(token, repr(findings[0]))

    def test_rejects_par_without_namespace(self):
        line = "https://objectstorage.us-phoenix-1.oraclecloud.com/p/example/b/demo/o/file"
        findings = MODULE.findings_for_line("lab.md", 12, line)
        self.assertIsNone(findings[0].namespace)

    def test_ignores_non_par_and_explicit_template(self):
        lines = (
            "https://objectstorage.us-phoenix-1.oraclecloud.com/n/otherns/b/demo/o/file",
            "https://objectstorage.us-phoenix-1.oraclecloud.com/p/<par-token>/n/<namespace>/b/demo/o/file",
        )
        for line in lines:
            self.assertEqual([], MODULE.findings_for_line("lab.md", 1, line))

    def test_scans_only_added_diff_lines(self):
        diff = """diff --git a/lab.md b/lab.md
--- a/lab.md
+++ b/lab.md
@@ -4 +4,2 @@
-https://objectstorage.us-phoenix-1.oraclecloud.com/p/old/n/foreign/b/demo/o/file
+https://objectstorage.us-phoenix-1.oraclecloud.com/p/new/n/c4u04/b/demo/o/file
+https://objectstorage.us-phoenix-1.oraclecloud.com/p/new/n/foreign/b/demo/o/file
"""
        findings = MODULE.findings_from_diff(diff)
        self.assertEqual([MODULE.Finding("lab.md", 5, "foreign")], findings)


if __name__ == "__main__":
    unittest.main()
