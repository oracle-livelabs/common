import importlib.util
import json
import sys
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / ".github" / "scripts" / "validate_content.py"
RULES = ROOT / ".github" / "content-validation" / "rules.json"
spec = importlib.util.spec_from_file_location("validate_content", SCRIPT)
module = importlib.util.module_from_spec(spec)
sys.modules[spec.name] = module
spec.loader.exec_module(module)


class ContentValidationTests(unittest.TestCase):
    def setUp(self):
        self.rules = json.loads(RULES.read_text(encoding="utf-8"))

    def write_fixture(self, content: str) -> str:
        handle = tempfile.NamedTemporaryFile("w", suffix=".md", encoding="utf-8", delete=False)
        handle.write(content)
        handle.close()
        self.addCleanup(lambda: Path(handle.name).unlink(missing_ok=True))
        return handle.name

    def test_isolated_common_word_passes(self):
        path = self.write_fixture("# Use the framework\n\nUse the framework to support the documented task.\n")
        result = module.analyze(path, self.rules)
        self.assertFalse(result["review_required"])
        self.assertEqual(result["distinct_high"], 0)

    def test_cluster_requires_review(self):
        path = self.write_fixture(
            "# A Transformative Journey\n\n"
            "Delve into a holistic framework that empowers teams. "
            "This is a powerful tool for a seamless experience.\n"
        )
        result = module.analyze(path, self.rules)
        self.assertTrue(result["review_required"])

    def test_h1_title_is_not_scored(self):
        path = self.write_fixture("# A Transformative Journey\n")
        result = module.analyze(path, self.rules)
        self.assertFalse(result["review_required"])
        self.assertEqual(result["distinct_high"], 0)

    def test_code_is_not_scored(self):
        path = self.write_fixture(
            "# Concrete task\n\n"
            "Use the command below.\n\n"
            "```bash\n"
            "echo 'delve into a holistic framework'\n"
            "```\n"
        )
        result = module.analyze(path, self.rules)
        self.assertFalse(result["review_required"])
        self.assertEqual(result["distinct_high"], 0)

    def test_repeated_style_signal_is_reported_without_isolated_term(self):
        path = self.write_fixture(
            "# Direct instructions\n\n"
            "Step one: run the command. Step two: check the result. "
            "Step three: record the value. Step four: close the task. "
            "Step five: report the result.\n"
        )
        result = module.analyze(path, self.rules)
        self.assertFalse(result["review_required"])
        self.assertTrue(any(item.rule_id == "colon-explanation" for item in result["styles"]))

    def test_explicit_blocking_rule_can_fail_validation(self):
        rules = json.loads(json.dumps(self.rules))
        rules["high_signal_terms"][0]["severity"] = "blocking"
        path = self.write_fixture("# Direct content\n\nDelve into the documented task.\n")
        result = module.analyze(path, rules)
        self.assertTrue(result["blocking"])

    def test_report_contains_actionable_content_finding_fields(self):
        path = self.write_fixture("# Direct content\n\nDelve into a holistic journey that empowers teams.\n")
        result = module.analyze(path, self.rules)
        report = module.render_report([result], [path], "example/repository")
        self.assertIn("Repository: `example/repository`", report)
        self.assertIn("field: `workshop content`", report)
        self.assertIn("rule: `delve`", report)
        self.assertIn("severity: `warning`", report)
        self.assertIn("guidance:", report)

    def test_invalid_rule_configuration_returns_actionable_error(self):
        bad_rules = json.loads(json.dumps(self.rules))
        bad_rules["phrases"] = "not a list"
        handle = tempfile.NamedTemporaryFile("w", suffix=".json", encoding="utf-8", delete=False)
        json.dump(bad_rules, handle)
        handle.close()
        self.addCleanup(lambda: Path(handle.name).unlink(missing_ok=True))
        path = self.write_fixture("# Direct content\n\nUse the documented task.\n")
        self.assertEqual(module.main(["--files", path, "--rules", handle.name]), 2)

    def test_correction_is_revalidated_and_analysis_is_read_only(self):
        path = self.write_fixture(
            "# Direct content\n\n"
            "Delve into a holistic framework that empowers teams.\n"
        )
        before = Path(path).read_text(encoding="utf-8")
        first = module.analyze(path, self.rules)
        second = module.analyze(path, self.rules)
        self.assertEqual(first, second)
        self.assertTrue(first["review_required"])
        self.assertEqual(Path(path).read_text(encoding="utf-8"), before)
        Path(path).write_text("# Direct content\n\nUse the documented task.\n", encoding="utf-8")
        corrected = module.analyze(path, self.rules)
        self.assertFalse(corrected["review_required"])


if __name__ == "__main__":
    unittest.main()
