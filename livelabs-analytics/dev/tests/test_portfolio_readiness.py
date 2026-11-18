from datetime import date
import hashlib
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / 'dev/scripts'))
from snapshot_readiness import validate_inputs, REQUIRED_ROLES
from portfolio_diagnostics import diagnostics
from dashboard_policy import admin_inventory


class ReadinessTests(unittest.TestCase):
    def test_new_wms_record_has_publish_type_provenance(self):
        spec = importlib.util.spec_from_file_location('readiness_refresh', ROOT / 'dev/scripts/refresh-snapshot-data.py')
        refresh = importlib.util.module_from_spec(spec); spec.loader.exec_module(refresh)
        row = {'Livelabsid':'new-id', 'Workshop Id':'1','Publish Title':'New lesson','Publish Type':'Public','Publish Status':'Published'}
        def make(current, old=None):
            return refresh.make_record(current, old, {}, {}, {}, 'unavailable', 'unavailable', '', None, {}, '2026-11-08')
        self.assertEqual(make(row)['sourceFlags'].get('publish_type_resolution_status'), 'current_wms_export')
        inherited = dict(row); inherited.pop('Publish Type')
        self.assertEqual(make(inherited, {'publishType':'Public'})['sourceFlags'].get('publish_type_resolution_status'), 'retained_prior_inventory')
        self.assertEqual(make(inherited)['sourceFlags'].get('publish_type_resolution_status'), 'not_assigned_in_current_wms_workflow')

    def test_refresh_checks_dates_inputs_and_hashes_before_staging(self):
        with tempfile.TemporaryDirectory() as folder:
            for role in REQUIRED_ROLES: (Path(folder) / role).write_text('fixture', encoding='utf-8')
            manifest = {'snapshot_date':'2026-11-08','files':{r:r for r in REQUIRED_ROLES}}
            self.assertEqual(len(validate_inputs(folder, manifest, '2026-09-28', date(2026,11,8))), 7)
            with self.assertRaises(ValueError): validate_inputs(folder, manifest, '2026-11-08')
            with self.assertRaises(ValueError): validate_inputs(folder, manifest, '2026-09-28', date(2026,11,7))
            manifest['sha256'] = {'wms':'wrong'}
            with self.assertRaisesRegex(ValueError, 'hash mismatch'): validate_inputs(folder, manifest, '2026-09-28')

    def test_diagnostics_keep_types_separate_and_unknown_out_of_denominator(self):
        rows = [{'type':k, 'values':[['Views - Last 12 Months', v]]} for k,v in [('Workshop','N/A'),('Workshop','1000'),('Sprint','100')]]
        result = diagnostics({'metadata':{'snapshot_date':'2026-09-28'}, 'records':rows}, date(2026,11,8))
        workshop, sprint = result['types']
        self.assertEqual(workshop['annualDemandUnknown'], 1)
        self.assertEqual(next(r['percentOfKnownDemand'] for r in workshop['sensitivity'] if r['annualViewsAtMost']==500), 0)
        self.assertEqual(next(r['percentOfKnownDemand'] for r in sprint['sensitivity'] if r['annualViewsAtMost']==500), 100)
        self.assertFalse(result['trendsEnabled'])

    def test_admin_covers_all_source_requests_without_altering_public_scope(self):
        source = json.loads((ROOT / 'inventory/data/portfolio_inventory.json').read_text(encoding='utf-8'))
        result = admin_inventory(source)
        self.assertEqual(len(result['records']), len(source['records']))
        expected = {r['key'] for r in source['records'] if any(str(r.get(f)).lower()=='delete requested' for f in ('status','publishStatus'))}
        actual = {r['key'] for r in result['records'] if 'Removal requests' in r['cleanupQueues']}
        self.assertEqual(expected, actual)
        self.assertTrue(all(r['review'] for r in result['records']))
        self.assertTrue(any(not r['dashboardGovernance']['visible'] for r in result['records'] if r['key'] in expected))
        public = json.loads((ROOT / 'inventory/data/public_portfolio_inventory.json').read_text(encoding='utf-8'))
        reviews = {r['key']:r['review'] for r in result['records']}
        for row in public['records']: self.assertEqual(row['review'], reviews[row['key']])


if __name__ == '__main__': unittest.main()
