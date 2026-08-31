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
        self.assertTrue(result["title_matches"])

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


if __name__ == "__main__":
    unittest.main()
