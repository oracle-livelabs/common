import importlib.util
import sys
import unittest
from unittest.mock import patch
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
spec = importlib.util.spec_from_file_location('qa_scoring_server', SCRIPTS / 'admin-server.py')
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)


class QaValidityTests(unittest.TestCase):
    def score(self, counts=None, codes=(), **extra):
        return app.enrich_dashboard_qa_overlay({'testCounts': counts or {},
            'findings': [{'code': code, 'count': 1} for code in codes], **extra})

    def test_unavailable_is_not_clean(self):
        result = self.score({'failed': 5}, ['WORKSHOP_NOT_AVAILABLE', 'PAR_SCAN_INCOMPLETE'])
        self.assertIsNone(result['jenkinsErrorScore'])
        self.assertEqual(result['scoreState'], 'inspection-unavailable')

    def test_no_checks_is_unknown_even_when_item_says_passed(self):
        self.assertIsNone(self.score(itemStatus='passed')['jenkinsErrorScore'])

    def test_partial_unknown_or_unexplained_failure_has_no_bonus(self):
        for counts in ({'passed': 1, 'skipped': 1}, {'passed': 1, 'other': 1}, {'failed': 2},
                       {'passed': 1, 'total': 3}, {'passed': -1}, {'passed': 'NaN'}):
            self.assertIsNone(self.score(counts)['jenkinsErrorScore'], counts)

    def test_different_complete_suites_and_p1_findings_are_scoreable(self):
        for total in (2, 5, 10):
            self.assertEqual(self.score({'passed': total})['jenkinsErrorScore'], 0)
        self.assertEqual(self.score({'passed': 1, 'failed': 1}, ['BROKEN_VISIBLE_LINK'])['jenkinsErrorScore'], 0)

    def test_known_content_failure_is_scored_but_incomplete_scan_is_not(self):
        self.assertGreater(self.score({'failed': 2}, ['POSSIBLE_TYPO'])['jenkinsErrorScore'], 0)
        self.assertIsNone(self.score({'passed': 1, 'failed': 1}, ['SOURCE_SCAN_INCOMPLETE'])['jenkinsErrorScore'])

    def test_preview_preserves_item_findings_without_a_test_title(self):
        inventory = {'records':[{'key':'livelabs:1', 'livelabsId':'1'}]}
        report = {'runId':'fixture', 'sourceReport':{}, 'catalogItems':[{
            'catalogItem':{'livelabsId':'1'}, 'counts':{'total':2,'passed':1,'failed':1},
            'tests':[{'title':'Content','status':'failed'}, {'title':'Links','status':'passed'}],
            'issues':[{'code':'POSSIBLE_TYPO','count':2}], 'status':'failed'}]}
        with patch.object(app, 'snapshot_by_id', return_value=inventory), patch.object(app, 'qa_snapshot_by_id', return_value=report):
            result = app.merge_sources('inventory', 'qa')
        matched = [r for r in result['rows'] if r['matchStatus'] == 'matched']
        self.assertTrue(all(r['qaJenkinsErrorScore'] == 16.67 for r in matched))
        self.assertTrue(all(r['qaPriorityP2Occurrences'] == 2 for r in matched))


if __name__ == '__main__':
    unittest.main()
