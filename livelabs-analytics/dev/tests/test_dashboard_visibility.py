import importlib.util
import json
from pathlib import Path
import re
import sys
import unittest
from datetime import date
from unittest.mock import patch
from types import SimpleNamespace
from html.parser import HTMLParser

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'dev/scripts'))
import dashboard_policy as policy
from dashboard_audit import load_generator, table_audit


class DashboardVisibilityTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.source = json.loads((ROOT/'inventory/data/portfolio_inventory.json').read_text(encoding='utf-8'))
        cls.public = json.loads((ROOT/'inventory/data/public_portfolio_inventory.json').read_text(encoding='utf-8'))
        cls.policy = policy.read_policy()
        cls.by_id = {r['livelabsId']:r for r in cls.source['records'] if r.get('livelabsId')}

    def test_projection_matches_reviewed_scope_exactly(self):
        self.assertEqual({r['key'] for r in self.public['records']}, {r['key'] for r in self.source['records'] if policy.eligible(r,self.policy)})
        public_ids = {r['livelabsId'] for r in self.public['records']}
        self.assertFalse(public_ids & {'4458','4471','4472','4489','4498'})
        for record in self.public['records']:
            self.assertTrue(all(sibling['livelabsId'] in public_ids for sibling in (record.get('family') or {}).get('siblings',[])))

    def test_real_testing_topics_and_internal_authors_remain_eligible(self):
        self.assertTrue(policy.eligible(self.by_id['858'],self.policy))
        self.assertTrue(policy.eligible(self.by_id['4444'],self.policy))
        team=json.loads((ROOT/'.private/admin/team-roster.json').read_text(encoding='utf-8')) if (ROOT/'.private/admin/team-roster.json').exists() else {'members':[]}
        emails={m['email'] for m in team['members']}
        if emails:self.assertTrue(any(policy.contact_emails(r)&emails for r in self.public['records']))

    def test_restore_is_individual_not_wms_family_or_author(self):
        proposed=json.loads(json.dumps(self.policy))
        proposed['decisions']['livelabs:4472']['classification']='learner_content'
        self.assertTrue(policy.eligible(self.by_id['4472'],proposed))
        self.assertFalse(policy.eligible(self.by_id['4471'],proposed))
        self.assertFalse(policy.eligible(self.by_id['4489'],proposed))

    def test_missing_and_invalid_metrics_are_not_zero(self):
        for name in ('refresh-top-performers','build-public-review-fragments'):
            module=load_generator(name)
            for invalid in ('',None,'N/A','nan','inf',-1):self.assertIsNone(module.numeric(invalid))
            self.assertEqual(module.numeric('0'),0)

    def test_retirement_uses_exact_calendar_boundary(self):
        risk=load_generator('build-public-review-fragments');risk.SNAPSHOT_DATE=date(2026,9,28)
        self.assertFalse(risk.retirement_candidate({'views12m':0,'updated':date(2025,9,28)}))
        self.assertTrue(risk.retirement_candidate({'views12m':0,'updated':date(2025,9,27)}))
        self.assertFalse(risk.retirement_candidate({'views12m':None,'updated':date(2024,1,1)}))
        self.assertFalse(risk.retirement_candidate({'views12m':0,'updated':None}))

    def test_every_eligible_record_reaches_final_scoring(self):
        class TableRows(HTMLParser):
            def __init__(self, target):
                super().__init__(); self.target=target; self.tables=[]; self.count=0
            def handle_starttag(self, tag, attrs):
                attrs=dict(attrs)
                if tag=='table':self.tables.append(attrs.get('id'))
                if tag=='tr' and self.tables and self.tables[-1]==self.target and attrs.get('data-filter-row')=='true':self.count+=1
            def handle_endtag(self, tag):
                if tag=='table':self.tables.pop()
        audit=table_audit(self.source)
        for fragment,table_id,field in [('top-performers','top-performers-table','performance'),('at-risk-content','at-risk-table','risk'),('retire-now-content','retirement-review-table','retirement')]:
            expected=sum(row[field] + (row['lifecycle']+row['evidenceQueue'] if field=='retirement' else 0) for row in audit['counts'])
            markup=(ROOT/f'assets/fragments/{fragment}.html').read_text(encoding='utf-8')
            parser=TableRows(table_id);parser.feed(markup)
            self.assertEqual(parser.count,expected)

    def test_failed_generation_preserves_policy_and_public_data(self):
        paths=[policy.POLICY_PATH,ROOT/'inventory/data/public_portfolio_inventory.json',ROOT/'assets/fragments/retire-now-content.html']
        before={p:p.read_bytes() for p in paths}
        with patch('dashboard_policy.subprocess.run',return_value=SimpleNamespace(returncode=1)):
            with self.assertRaises(ValueError):policy.publish_policy(self.policy)
        self.assertEqual(before,{p:p.read_bytes() for p in paths})

    def test_stale_revision_and_unknown_record_rejected(self):
        with self.assertRaises(ValueError):policy.save_decision({'recordKey':'livelabs:4458','classification':'learner_content','reason':'Test stale decision','revision':-1},self.source,'test')
        with self.assertRaises(ValueError):policy.save_decision({'recordKey':'wms:12106','classification':'test_content','reason':'Cannot hide a family'},self.source,'test')


if __name__=='__main__':unittest.main()
