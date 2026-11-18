"""Policy behavior tests using independent synthetic records and source regressions."""
from datetime import date
import copy
import json
from pathlib import Path
import sys
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT/'dev/scripts'))
from review_rules import evaluate, DEFAULT_CRITERIA, update_evidence, cutoff, weighted_score
from dashboard_policy import save_review_decision, read_policy
from dashboard_audit import load_generator

SNAPSHOT = date(2026, 9, 28)
TODAY = date(2026, 11, 5)


def record(views=200, updated='2024-09-01', kind='Workshop'):
    return {'key':'livelabs:1','livelabsId':'1','type':kind,'title':'Real lesson','status':'Completed',
        'ownerMissing':False,'values':[['Views - Last 12 Months',str(views)],['Views - Last 90 Days','50']],
        'details':[['Last Meaningful Workshop Update',updated],['Latest Meaningful Commit','Add lab instructions']],
        'sourceFlags':{'github_update_evidence_source':'local_repo_workshop_path','dashboard_metric_scope':'exact_unique_title'}}


class ReviewRulesTests(unittest.TestCase):
    def test_retirement_requires_verified_age_publication_and_attributable_demand(self):
        row = record()
        result = self.evaluate(row)
        self.assertEqual(result['queue'], 'evidence')
        self.assertEqual(result['readiness'], 'provisional')
        verified = {'contentUpdatedDate':'2024-09-01', 'firstPublishedDate':'2023-01-01'}
        result = self.evaluate(row, verified)
        self.assertEqual(result['queue'], 'retirement')
        self.assertEqual(result['readiness'], 'evidence-checked')
        row['sourceFlags']['dashboard_metric_scope'] = 'shared_title_across_wms_records'
        self.assertEqual(self.evaluate(row, verified)['queue'], 'evidence')

    def test_publish_removal_request_and_missing_demand_have_queues(self):
        row = record(10000)
        row['publishStatus'] = 'Delete Requested'
        self.assertEqual(self.evaluate(row)['queue'], 'lifecycle')
        self.assertEqual(self.evaluate(record('N/A'))['queue'], 'evidence')

    def test_approval_is_distinct_from_source_confirmed_retirement(self):
        result = self.evaluate(record(), {'state':'approved_retirement'})
        self.assertEqual(result['readiness'], 'approved')
        self.assertFalse(result['sourceRetirementConfirmed'])

    def evaluate(self, row, decision=None):
        return evaluate(row, SNAPSHOT, decision=decision, evaluated_on=TODAY)

    def test_disjoint_tiers_and_inclusive_demand_edges(self):
        for views,tier,queue in [(250,'strict','retirement'),(251,'broad','retirement'),(500,'broad','retirement'),
                (501,'risk','at-risk'),(1000,'risk','at-risk'),(1001,'standard','at-risk')]:
            actual=self.evaluate(record(views), {'contentUpdatedDate':'2024-09-01','firstPublishedDate':'2023-01-01'})
            self.assertEqual((actual['tier'],actual['queue']),(tier,queue))
        self.assertEqual(self.evaluate(record(900,'2026-01-01'))['tier'],'watch')

    def test_exact_calendar_age_boundary(self):
        self.assertEqual(self.evaluate(record(updated='2025-09-28'))['demandTier'],'watch')
        self.assertEqual(self.evaluate(record(updated='2025-09-27'))['demandTier'],'strict')
        self.assertEqual(cutoff(date(2024,3,31),1),date(2024,2,29))

    def test_lifecycle_cannot_be_hidden_by_traffic_grace_or_exception(self):
        row=record(50000,'2026-09-01');row['status']='Delete Requested'
        for decision in (None,{'state':'keep_active','keepUntil':'2027-01-01'}, {'state':'unreviewed','firstPublishedDate':'2026-09-01'}):
            self.assertEqual(self.evaluate(row,decision)['queue'],'lifecycle')
        self.assertEqual(self.evaluate(record(),{'state':'approved_retirement'})['tier'],'approved')
        self.assertNotEqual(self.evaluate(row)['tier'],'approved')

    def test_mechanical_update_is_not_freshness_and_conflict_is_visible(self):
        row=record(1,'2026-04-07');row['details'] += [['Latest Meaningful Commit','change githubio refs to cdn'],['Latest Workshop Markdown Commit Date','2024-09-26']]
        result=self.evaluate(row)
        self.assertIsNone(result['scoringUpdate'])
        self.assertIn('update_conflict',result['reasonCodes'])
        self.assertEqual(result['queue'],'evidence')
        self.assertEqual(result['confidence'],'Needs evidence')

    def test_proxy_cannot_establish_freshness_or_high_confidence(self):
        row=record(updated='2026-08-01');row['sourceFlags']['github_update_evidence_source']='local_repo_level_proxy'
        result=self.evaluate(row)
        self.assertIsNone(result['scoringUpdate'])
        self.assertEqual((result['tier'],result['queue']),('evidence','evidence'))
        row['details'] += [['Completion Date','8/1/2026']]
        self.assertEqual(self.evaluate(row)['queue'],'evidence')

    def test_only_verified_first_publication_grants_grace(self):
        row=record();row['details'] += [['Completion Date','8/1/2026']]
        self.assertEqual(self.evaluate(row)['queue'],'evidence')
        self.assertIn('possible_new',self.evaluate(row)['reasonCodes'])
        decision={'state':'unreviewed','firstPublishedDate':'2026-08-01'}
        self.assertEqual(self.evaluate(row,decision)['tier'],'new')
        self.assertEqual(self.evaluate(row,decision)['queue'],'at-risk')

    def test_exception_expires_and_does_not_mutate_source(self):
        row=record();before=copy.deepcopy(row)
        self.assertEqual(self.evaluate(row,{'state':'keep_active','keepUntil':'2026-12-01'})['tier'],'keep')
        self.assertEqual(self.evaluate(row,{'state':'keep_active','keepUntil':'2026-11-04'})['queue'],'evidence')
        self.assertEqual(row,before)

    def test_unknown_demand_does_not_become_zero(self):
        row=record('N/A')
        self.assertEqual(self.evaluate(row)['queue'],'evidence')
        self.assertIn('unknown_demand',self.evaluate(row)['reasonCodes'])
        self.assertEqual(self.evaluate(record(0))['demandTier'],'strict')

    def test_focus_tags_keep_overlapping_reasons_on_one_item(self):
        row=record(200,'2024-09-01');row['status']='Delete Requested'
        result=self.evaluate(row)
        self.assertEqual(result['queue'],'lifecycle')
        self.assertTrue({'Lifecycle','Low demand','Older updates'} <= set(result['focusTags']))
        self.assertEqual(len(result['focusTags']),len(set(result['focusTags'])))
        self.assertNotIn('Low demand',self.evaluate(record('N/A'))['focusTags'])

    def test_combined_review_tables_preserve_identity_and_queue_membership(self):
        from lxml import html
        records=json.loads((ROOT/'inventory/data/public_portfolio_inventory.json').read_text(encoding='utf-8'))['records']
        for fragment,table_id,queues in [('at-risk-content','at-risk-table',None),('retire-now-content','retirement-review-table',{'lifecycle','retirement','evidence'})]:
            document=html.fromstring((ROOT/f'assets/fragments/{fragment}.html').read_text(encoding='utf-8'))
            tables=document.xpath('//table[@id]')
            self.assertEqual([t.get('id') for t in tables],[table_id])
            rows=tables[0].xpath('./tbody/tr[@data-filter-row="true"]')
            expected={r['livelabsId']:r for r in records if queues is None or r['review']['queue'] in queues}
            ids=[r.get('data-livelabs-id') for r in rows]
            self.assertEqual(len(ids),len(set(ids)))
            self.assertEqual(set(ids),set(expected))
            for row in rows:
                source=expected[row.get('data-livelabs-id')]
                self.assertEqual(row.get('data-content-type'),source['type'])
                self.assertEqual(json.loads(row.get('data-review-focus')),source['review']['focusTags'])

    def test_verified_content_date_can_resolve_maintenance_conflict(self):
        row=record();row['details'] += [['Latest Meaningful Commit','Update copyright']]
        result=self.evaluate(row,{'state':'unreviewed','contentUpdatedDate':'2026-08-01'})
        self.assertEqual(result['scoringUpdate'],'2026-08-01')
        self.assertEqual(result['confidence'],'Verified content date')
        self.assertEqual(result['queue'],'evidence')

    def test_scoring_omits_unknown_age_and_freshness(self):
        row=record(200,'2026-08-01');row['sourceFlags']['github_update_evidence_source']='unmapped_repo'
        row['review']=self.evaluate(row)
        performance=load_generator('refresh-top-performers')
        self.assertIsNone(performance.freshness_score(row,SNAPSHOT))
        risk=load_generator('build-public-review-fragments');risk.SNAPSHOT_DATE=SNAPSHOT
        scored=risk.review_metrics([row],'Workshop')[0]
        # A lone demand value has midrank 50; contact is present, and age is unknown.
        self.assertEqual(scored['score'],38.46)  # (0.50 * 50 + 0.15 * 0) / 0.65

    def test_review_writes_require_evidence_expiry_and_current_revision(self):
        source={'metadata':{'snapshot_date':str(SNAPSHOT)},'records':[record()]}
        base={'recordKey':'livelabs:1','state':'approved_retirement','reason':'Confirmed with owner','revision':read_policy()['revision']}
        for extra in ({}, {'state':'keep_active'}, {'evidence':'Owner reference','contentUpdatedDate':'2026-10-01'}, {'evidence':'Owner reference','revision':-1}):
            with self.assertRaises(ValueError):save_review_decision({**base,**extra},source,'test')
        with patch('dashboard_policy.publish_policy',return_value={'ok':True}) as publish:
            save_review_decision({**base,'evidence':'Owner approval reference'},source,'test-reviewer')
            self.assertEqual(publish.call_args.args[0]['reviewDecisions']['livelabs:1']['updatedBy'],'test-reviewer')

    def test_real_source_regressions_and_private_notes_boundary(self):
        public=json.loads((ROOT/'inventory/data/public_portfolio_inventory.json').read_text(encoding='utf-8'))
        records={r['livelabsId']:r for r in public['records']}
        self.assertEqual({r['livelabsId'] for r in records.values() if r['review']['queue']=='lifecycle'}, {'877','902','3416','3607','3971'})
        self.assertEqual(records['4005']['review']['queue'],'evidence')
        for row in records.values():
            self.assertNotIn('updatedBy',row['review'])
            self.assertNotIn('evidence',row['review'])
        self.assertNotIn('4458',records)

    def test_score_rounding_is_reproducible_at_half_cent(self):
        self.assertEqual(weighted_score([(.45,57.85),(.35,34.03),(.20,10.96)]),40.14)

    def test_admin_capture_matches_every_generated_performance_score(self):
        from lxml import html
        capture=load_generator('capture-snapshot').capture()
        document=html.fromstring((ROOT/'assets/fragments/top-performers.html').read_text(encoding='utf-8'))
        for kind in ('Workshop','Sprint'):
            rows=document.xpath(f'//table[@id="top-performers-table"]/tbody/tr[@data-filter-row="true"][@data-content-type="{kind}"]')
            displayed={row.xpath('./td[5]')[0].text_content():float(row.xpath('./td[10]')[0].text_content()) for row in rows}
            captured={row['key'].split(':',1)[1]:row['score'] for row in capture['rankings']['Top Performers '+kind]['rows']}
            self.assertEqual(displayed,captured)


if __name__=='__main__':unittest.main()
