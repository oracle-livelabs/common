"""Behavioral evidence: identities, incomplete runs, duplicates, score direction."""
import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import unittest

ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'dev/scripts'))
from qa_governance import adjusted_score, csv_safe, error_score, read_results, reconcile, sanitized, score_item, validate_policy
from qa_tables import parse, update_tables, top_fragments
POLICY=json.loads((ROOT/'dev/config/qa-governance-policy.json').read_text())

def row(**kwargs):
    return {'run_id':'run1','started_at':'2026-10-05T10:00:00Z','item_type':'workshop','item_id':'1','item_title':'A',
            'item_status':'failed','issue_count':'1','issue_code':'BROKEN_VISIBLE_IMAGE','severity':'major',
            'issue_summary':'Shows 2 broken visible images.','test_section':'images',**kwargs}
def record(ident='1',typ='Workshop',wms='9'):
    return {'key':'livelabs:'+ident,'livelabsId':ident,'wmsId':wms,'title':'Item '+ident,'type':typ,'values':[],'details':[]}
def payload(records=None):
    return {'metadata':{'snapshot_date':'2026-10-05','sources_synced_at':'2026-10-05T12:00:00Z'},'records':records or [record()]}
def manifest(**kwargs):
    return {'run_id':'run1','complete':True,'csv_sha256':'hash','ended_at':'2026-10-05T11:00:00Z',
            'build_id':'build1','source_revision':'revision1','environment':'test','catalog_snapshot_id':'catalog1',
            'items':{'workshop:1':{'expected_checks':3,'completed_checks':3,'blocked_checks':0,'skipped_checks':0}},**kwargs}

class GovernanceTests(unittest.TestCase):
    def test_severity_and_explicit_occurrences_drive_burden(self):
        q=score_item([(2,row())],POLICY)
        self.assertEqual((q['finding_count'],q['occurrence_count'],q['weighted_burden']),(1,2,6))
        self.assertEqual(q['observed_error_score'],23.08)
        critical=score_item([(2,row(severity='critical'))],POLICY)
        self.assertGreater(critical['observed_error_score'],q['observed_error_score'])

    def test_exact_duplicates_and_repeated_section_root_cause(self):
        r=row(issue_code='WORKSHOP_NOT_AVAILABLE',severity='blocker',issue_count='2')
        q=score_item([(2,r),(3,{**r,'test_section':'links'}),(4,r)],POLICY)
        self.assertEqual(q['finding_count'],1)
        self.assertEqual(q['weighted_burden'],10)
        self.assertFalse(q['inconsistent_summary'])
        self.assertEqual(q['findings'][0]['source_rows'],[2,3,4])

    def test_authentication_does_not_penalize_content(self):
        q=score_item([(2,row(issue_code='AUTHENTICATION_REQUIRED'))],POLICY)
        self.assertIsNone(q['observed_error_score'])
        self.assertEqual(q['evidence_gap_count'],1)

    def test_unverified_par_is_an_evidence_gap_without_inventing_a_defect(self):
        unverified=row(issue_code='PAR_LINK_UNVERIFIED',issue_summary='Contains 1 PAR link(s) unverified after retries.')
        q=score_item([(2,unverified)],POLICY)
        self.assertEqual(q['state'],'partial_evidence')
        self.assertIsNone(q['observed_error_score'])
        self.assertEqual((q['weighted_burden'],q['finding_count'],q['evidence_gap_count']),(0,0,1))
        mixed=score_item([(2,row(issue_count='2')),(3,{**unverified,'issue_count':'2'})],POLICY)
        self.assertEqual(mixed['observed_error_score'],23.08)
        self.assertEqual(mixed['finding_count'],1)
        self.assertEqual(mixed['evidence_gap_count'],1)
        self.assertFalse(mixed['unknown_findings'])

    def test_unknown_code_severity_or_conflicting_severity_not_scored(self):
        for changes in ({'issue_code':'UNRECOGNIZED'},{'severity':'unknown'},{'issue_count':'2'}):
            self.assertIsNone(score_item([(2,row(**changes))],POLICY)['observed_error_score'])
        rows=[(2,row(issue_count='2')),(3,row(severity='blocker',issue_count='2'))]
        self.assertIsNone(score_item(rows,POLICY)['observed_error_score'])

    def test_zero_reported_findings_is_distinct_from_unobserved(self):
        p=payload([record('1'),record('2')])
        qs,_=reconcile(p,[row(item_status='passed',issue_code='',severity='',issue_count='0')],POLICY,'2026-10-06')
        self.assertEqual(qs[0]['observed_error_score'],0)
        self.assertIsNone(p['records'][1]['qa']['observed_error_score'])
        self.assertEqual(qs[0]['completeness'],'unverified_legacy_csv')

    def test_type_conflict_and_wms_siblings_never_inherit_score(self):
        p=payload([record('1','Sprint'),record('2','Workshop')])
        qs,_=reconcile(p,[row()],POLICY,'2026-10-06')
        self.assertEqual(qs[0]['match_status'],'type_conflict')
        self.assertFalse(qs[0]['ranking_applicable'])
        self.assertIsNone(p['records'][1]['qa']['ranking_error_score'])

    def test_numeric_livestack_collision_and_ambiguous_types(self):
        p=payload()
        qs,_=reconcile(p,[row(item_type='livestack')],POLICY,'2026-10-06')
        self.assertEqual(qs[0]['match_status'],'unsupported_type')
        self.assertIsNone(p['records'][0]['qa']['observed_error_score'])
        qs,_=reconcile(payload(),[row(),row(item_type='sprint')],POLICY,'2026-10-06')
        self.assertTrue(all(q['match_status']=='ambiguous_jenkins_type' and not q['ranking_applicable'] for q in qs))

    def test_duplicate_analytics_ids_fail(self):
        with self.assertRaisesRegex(ValueError,'Duplicate Analytics'):
            reconcile(payload([record(),record()]),[row()],POLICY,'2026-10-06')

    def test_strict_requires_full_run_and_item_contracts(self):
        for m in (None,manifest(csv_sha256='wrong'),manifest(items={}),manifest(items={'workshop:1':{'expected_checks':3,'completed_checks':2}})):
            with self.assertRaises(ValueError):
                reconcile(payload(),[row()],POLICY,'2026-10-06','strict',m,'hash')
        qs,meta=reconcile(payload(),[row()],POLICY,'2026-10-06','strict',manifest(),'hash')
        self.assertTrue(meta['promotion_ready'])
        self.assertEqual(qs[0]['completeness'],'verified_manifest')
        for day in ('2026-10-04','2026-11-05'):
            with self.assertRaises(ValueError):reconcile(payload(),[row()],POLICY,day,'strict',manifest(),'hash')

    def test_stale_snapshot_keeps_pilot_visible_and_strict_blocks(self):
        p=payload();p['metadata']['snapshot_date']='2026-09-28'
        _,meta=reconcile(copy.deepcopy(p),[row()],POLICY,'2026-10-06')
        self.assertIn('Analytics snapshot predates Jenkins run',meta['promotion_gaps'])
        with self.assertRaises(ValueError):reconcile(p,[row()],POLICY,'2026-10-06','strict',manifest(),'hash')

    def test_strict_rejects_same_day_sync_before_run_end(self):
        p=payload();p['metadata']['sources_synced_at']='2026-10-05T09:00:00Z'
        with self.assertRaisesRegex(ValueError,'synchronized before run completion'):
            reconcile(p,[row()],POLICY,'2026-10-06','strict',manifest(),'hash')

    def test_score_bounds_and_policy_direction(self):
        self.assertEqual(error_score(0),0)
        self.assertLess(error_score(100000),100)
        for kind in ('top','replacement','risk','retire'):
            values=[adjusted_score(60,{'ranking_error_score':n},kind,POLICY) for n in (0,25,50,100)]
            self.assertEqual(values,sorted(values,reverse=kind in ('top','replacement')))
            self.assertEqual(adjusted_score(60,{},kind,POLICY),60)
        self.assertEqual(adjusted_score(60,{'ranking_error_score':100},'retire',POLICY),70)

    def test_csv_safety_and_redaction(self):
        self.assertTrue(csv_safe('=HYPERLINK("x")').startswith("'"))
        self.assertEqual(csv_safe(0),'0')
        self.assertNotIn('sensitive',sanitized('https://x/p/sensitive/o/a?token=sensitive'))
        temp_root=ROOT/'.private/test-tmp';temp_root.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temp_root) as d:
            self.assertTrue(Path(d).resolve().is_relative_to(temp_root.resolve()))
            p=Path(d)/'bad.csv';p.write_text('run_id,item_id\na,1\n')
            with self.assertRaisesRegex(ValueError,'Missing Jenkins'):read_results(p)
        bad=copy.deepcopy(POLICY);bad['severity_weights']['major']=-1
        with self.assertRaises(ValueError):validate_policy(bad)

    def test_all_top_candidates_scored_before_cutoff(self):
        p=payload([record(str(i)) for i in range(1,103)])
        for i,r in enumerate(p['records']):
            r.update(publishStatus='Published',publishType='Public',update='2026-10-01',
                     values=[['Views - Last 12 Months',str(102-i)],['Views - Last 90 Days',str(102-i)]],
                     qa={'ranking_error_score':99,'ranking_applicable':True,'policy_version':POLICY['version']} if i==0 else {})
        document,_=top_fragments(p,ROOT);comparisons=[]
        update_tables(document,{r['livelabsId']:r for r in p['records']},'top',POLICY,comparisons)
        self.assertEqual(len(comparisons),102)
        self.assertEqual(sum(r['displayed'] for r in comparisons),100)
        self.assertTrue(next(r for r in comparisons if r['livelabs_id']=='101')['displayed'])
        self.assertFalse(next(r for r in comparisons if r['livelabs_id']=='1')['displayed'])

    def test_replacement_adjusts_target_not_source(self):
        headers=['#','Current LiveLabs ID','Replacement LiveLabs ID','Match Score']
        markup='<section><table id="replacement-recommendations"><thead><tr>'+''.join('<th><button>'+h+'</button></th>' for h in headers)+'</tr></thead><tbody><tr class="expandable-row" data-detail-row-id="d">'+''.join('<td>'+v+'</td>' for v in ['1','1','2','80'])+'</tr><tr class="detail-row" data-detail-for="d"><td colspan="4"><div class="detail-shell"></div></td></tr></tbody></table></section>'
        source={'policy_version':POLICY['version'],'ranking_error_score':90,'ranking_applicable':True}
        target={'policy_version':POLICY['version'],'ranking_error_score':25,'ranking_applicable':True}
        comps=[];update_tables(parse(markup),{'1':{'qa':source},'2':{'qa':target}},'replacement',POLICY,comps)
        self.assertEqual(comps[0]['adjusted_score'],60)
        comps=[];update_tables(parse(markup),{'1':{'qa':source},'2':{'qa':{}}},'replacement',POLICY,comps)
        self.assertEqual(comps[0]['adjusted_score'],80)

    def test_invalid_csv_rejects_mixed_runs(self):
        import csv
        temp_root=ROOT/'.private/test-tmp';temp_root.mkdir(parents=True,exist_ok=True)
        with tempfile.TemporaryDirectory(dir=temp_root) as d:
            self.assertTrue(Path(d).resolve().is_relative_to(temp_root.resolve()))
            p=Path(d)/'mixed.csv'
            with p.open('w',newline='') as f:
                writer=csv.DictWriter(f,fieldnames=list(row()));writer.writeheader();writer.writerows([row(),row(run_id='other')])
            with self.assertRaisesRegex(ValueError,'Never mix runs'):read_results(p)

if __name__=='__main__':unittest.main()
