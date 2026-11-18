from pathlib import Path
import subprocess
import sys
import unittest

ROOT = Path(__file__).resolve().parents[2]


class ViewsContactIndexTests(unittest.TestCase):
    def test_contact_index_cli_rejects_public_asset_output_path(self):
        script = ROOT / 'dev/scripts/build-views-wms-contact-index.py'
        result = subprocess.run([
            sys.executable, str(script),
            '--inventory', 'missing.json',
            '--published-report', 'missing.xlsx',
            '--primary-report', 'missing.xlsx',
            '--kitchen-sink-report', 'missing.xlsx',
            '--snapshot-date', '2026-11-12',
            '--output', str(ROOT / 'assets/data/views-wms-contact-index.js'),
        ], capture_output=True, text=True, check=False)

        self.assertEqual(result.returncode, 2)
        self.assertIn('must be under .private', result.stderr)


if __name__ == '__main__':
    unittest.main()
