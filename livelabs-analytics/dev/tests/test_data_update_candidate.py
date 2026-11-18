import copy
import importlib.util
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

from openpyxl import Workbook

ROOT = Path(__file__).resolve().parents[2]
SPEC = importlib.util.spec_from_file_location(
    'data_update_candidate', ROOT / 'dev/scripts/build-data-update-candidate.py'
)
candidate = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(candidate)


class DataUpdateCandidateTests(unittest.TestCase):
    def test_wms_xlsx_reader_uses_headers_and_preserves_identifier_strings(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'wms.xlsx'
            workbook = Workbook()
            sheet = workbook.active
            sheet.append(['Workshop Id', 'Livelabsid', 'Publish Title', 'Publish Status'])
            sheet.append([42, 7, 'Example item', 'Published'])
            workbook.save(path)
            workbook.close()

            rows = candidate.read_wms_xlsx(path)

        self.assertEqual(rows, [{
            'Workshop Id': '42', 'Livelabsid': '7',
            'Publish Title': 'Example item', 'Publish Status': 'Published',
        }])

    def test_views_csv_retains_period_and_joins_by_livelabs_id(self):
        with tempfile.TemporaryDirectory() as folder:
            path = Path(folder) / 'views.csv'
            path.write_text(
                'period,name,views,rank,id,link,captured_at\n'
                'Last 90 Days,Same title,40,1,7,https://example.test/view?wid=7,2026-11-11T12:00:00Z\n'
                'Last 90 Days,Same title,9,2,8,https://example.test/view?wid=8,2026-11-11T12:00:00Z\n',
                encoding='utf-8-sig',
            )
            rows = candidate.read_views_csv(path)

        self.assertEqual([row['id'] for row in rows], ['7', '8'])
        self.assertEqual(rows[0]['period'], 'Last 90 Days')
        self.assertEqual(rows[0]['views'], 40)

    def test_candidate_keeps_unknown_type_unknown_and_joins_views_and_github_by_id(self):
        baseline = {
            'metadata': {
                'snapshot_date': '2026-09-28', 'canonical_payload': True,
                'counts': {'type': {'Workshop': 1893}, 'publish_status': {'Published': 1705}},
                'data_freshness': {'wms_snapshot_date': '2026-09-28'},
                'dashboard_window_row_counts': {'last week': 1132},
                'new_livelabs_id_count_vs_prior': 42,
            },
            'records': [{
                'key': 'livelabs:7', 'livelabsId': '7', 'wmsId': '70',
                'title': 'Same title', 'rawTitle': 'Same title', 'type': 'Sprint',
                'publishType': 'Event', 'values': [['Old value', 'kept']],
                'details': [['Product', 'Database']],
                'sourceFlags': {'github_update_evidence_available': True, 'wms_snapshot_date': '2026-09-28'},
                'fileUpdates': [{'path': 'stale/old.md', 'date': '2026-08-14'}],
            }],
        }
        original = copy.deepcopy(baseline)
        wms_rows = [
            {'Workshop Id': '70', 'Livelabsid': '7', 'Workshop Title': 'Same title',
             'Publish Title': 'Same title', 'Publish Status': 'Published',
             'Support Level 1': 'support@example.test', 'Paid Flg': 'Y',
             'Last Update Person': 'editor@example.test',
             'Support Contact Email': 'help@example.test'},
            {'Workshop Id': '80', 'Livelabsid': '8', 'Workshop Title': 'Same title',
             'Publish Title': 'Same title', 'Publish Status': 'Published'},
        ]
        views = [
            {'period': 'Last 90 Days', 'name': 'Same title', 'views': 40, 'rank': 1,
             'id': '7', 'link': 'https://example.test/view?wid=7', 'captured_at': '2026-11-11T12:00:00Z'},
            {'period': 'Last 90 Days', 'name': 'Same title', 'views': 9, 'rank': 2,
             'id': '8', 'link': 'https://example.test/view?wid=8', 'captured_at': '2026-11-11T12:00:00Z'},
            {'period': 'Last 90 Days', 'name': 'Not in WMS', 'views': 2, 'rank': 3,
             'id': '9', 'link': 'https://example.test/view?wid=9', 'captured_at': '2026-11-11T12:00:00Z'},
        ]
        github = [
            {'livelabs_id': '7', 'github_status': 'COMPLETE_GIT_HISTORY',
             'repository': 'example', 'resolved_workshop_path': 'one/item',
             'commit_history': [{'commit_sha': 'abc', 'subject': 'Update item',
                                 'changed_files': [{'path': 'one/item/readme.md'}]}]},
        ]

        unresolved_event = {'livelabs_id': '7', 'commit_sha': 'def', 'changed_file': ''}
        result, review = candidate.build_candidate(
            wms_rows, baseline, views, github,
            source_info={'wms_snapshot_date': '2026-11-12', 'views_collection_date': '2026-11-11'},
            github_event_rows=[unresolved_event],
        )
        records = {row['livelabsId']: row for row in result['records']}

        self.assertEqual(len(result['records']), 2)
        self.assertEqual(records['7']['type'], 'Sprint')
        self.assertEqual(records['7']['publishType'], 'Event')
        self.assertIn(['Old value', 'kept'], records['7']['values'])
        self.assertIn(['Support Level 1', 'support@example.test'], records['7']['details'])
        self.assertIn(['Paid Flg', 'Y'], records['7']['details'])
        self.assertIn(['Last Update Person', 'editor@example.test'], records['7']['details'])
        self.assertEqual(dict((x[0], x[1]) for x in records['7']['values'])['Views - Last 90 Days'], '40')
        self.assertEqual(dict((x[0], x[1]) for x in records['8']['values'])['Views - Last 90 Days'], '9')
        self.assertEqual(records['8']['type'], 'Unknown')
        self.assertEqual(records['7']['githubHistory']['commit_history'][0]['commit_sha'], 'abc')
        self.assertEqual(records['7']['githubHistory']['unresolved_event_rows'], [unresolved_event])
        self.assertEqual(records['8']['githubHistory']['github_status'], 'NOT_IN_GITHUB_SOURCE')
        self.assertFalse(records['7']['sourceFlags']['github_update_evidence_available'])
        self.assertEqual(records['7']['fileUpdates'], [])
        self.assertEqual(result['metadata']['counts']['type'], {'Sprint': 1, 'Unknown': 1})
        self.assertEqual(result['metadata']['counts']['publish_status'], {'Published': 2})
        self.assertEqual(result['metadata']['dashboard_window_row_counts']['last 90 days'], 2)
        self.assertEqual(result['metadata']['dashboard_window_row_counts']['last week'], 0)
        self.assertEqual(result['metadata']['new_livelabs_id_count_vs_prior'], 1)
        self.assertEqual(result['metadata']['removed_livelabs_id_count_vs_prior'], 0)
        self.assertEqual(result['metadata']['counts']['contact_sources']['support_contact_email'], 1)
        self.assertEqual(result['metadata']['counts']['contact_sources']['any_contact_field'], 1)
        self.assertEqual(result['metadata']['data_freshness']['wms_snapshot_date'], '2026-11-12')
        self.assertEqual(result['metadata']['data_freshness']['tag_snapshot_date'], '2026-09-28')
        self.assertFalse(result['metadata']['canonical_payload'])
        self.assertEqual(result['metadata']['candidate_status'], 'PRIVATE_CANDIDATE_NOT_PROMOTED')
        self.assertEqual(baseline, original)
        self.assertEqual(review['record_count'], 2)
        self.assertEqual(review['content_type_resolution']['unknown'], 1)
        self.assertEqual(review['views']['distinct_ids_not_in_wms'], 1)

    def test_no_id_fallback_requires_a_unique_baseline_match(self):
        row = {'Workshop Id': '12', 'Livelabsid': '', 'Workshop Title': 'Legacy item',
               'Publish Title': 'Legacy item', 'Publish Status': 'Published'}
        old = {'metadata': {'snapshot_date': '2026-09-28'}, 'records': [
            {'key': 'wms:12:one', 'livelabsId': '', 'wmsId': '12', 'title': 'Legacy item', 'type': 'Workshop'},
            {'key': 'wms:12:two', 'livelabsId': '', 'wmsId': '12', 'title': 'Legacy item', 'type': 'Sprint'},
        ]}
        result, review = candidate.build_candidate([row], old, [], [])

        self.assertEqual(result['records'][0]['type'], 'Unknown')
        self.assertEqual(review['identity_resolution']['ambiguous_fallback'], 1)

    def test_no_id_row_without_wms_id_does_not_reuse_prior_classification(self):
        baseline = {'metadata': {'snapshot_date': '2026-09-28'}, 'records': [{
            'key': 'wms:legacy-item', 'livelabsId': '', 'wmsId': '',
            'title': 'Legacy item', 'rawTitle': 'Legacy item', 'type': 'Sprint',
            'publishType': 'Event', 'details': [['Product', 'Database']],
        }]}
        row = {
            'Workshop Id': '', 'Livelabsid': '', 'Workshop Title': 'Legacy item',
            'Publish Title': 'Legacy item', 'Publish Status': 'Published',
        }

        result, review = candidate.build_candidate([row], baseline, [], [])

        self.assertEqual(result['records'][0]['type'], 'Unknown')
        self.assertEqual(result['records'][0]['publishType'], '')
        self.assertNotIn(['Product', 'Database'], result['records'][0]['details'])
        self.assertEqual(review['identity_resolution']['unique_wms_id_title_fallback'], 0)
        self.assertEqual(review['identity_resolution']['unmatched_to_prior_inventory'], 1)

    def test_candidate_cli_requires_explicit_source_dates_and_retrieval_note(self):
        script = ROOT / 'dev/scripts/build-data-update-candidate.py'
        required_paths = [
            '--wms-kitchen', 'missing.xlsx', '--wms-primary', 'missing.xlsx',
            '--wms-published', 'missing.xlsx', '--views-csv', 'missing.csv',
            '--github-jsonl', 'missing.jsonl', '--github-summary', 'missing.csv',
            '--github-files', 'missing.csv', '--github-events', 'missing.csv',
            '--github-search-candidates', 'missing.csv', '--jenkins-report', 'missing.json',
            '--output', 'candidate', '--github-collection-manifest', 'missing.json',
        ]

        result = subprocess.run(
            [sys.executable, str(script), *required_paths],
            capture_output=True, text=True, check=False,
        )

        self.assertEqual(result.returncode, 2)
        for option in ('--wms-retrieval-note', '--views-capture-date', '--wms-snapshot-date'):
            self.assertIn(option, result.stderr)

    def test_candidate_cli_rejects_invalid_source_dates(self):
        script = ROOT / 'dev/scripts/build-data-update-candidate.py'
        required_paths = [
            '--wms-kitchen', 'missing.xlsx', '--wms-primary', 'missing.xlsx',
            '--wms-published', 'missing.xlsx', '--views-csv', 'missing.csv',
            '--github-jsonl', 'missing.jsonl', '--github-summary', 'missing.csv',
            '--github-files', 'missing.csv', '--github-events', 'missing.csv',
            '--github-search-candidates', 'missing.csv', '--jenkins-report', 'missing.json',
            '--output', 'candidate', '--github-collection-manifest', 'missing.json',
            '--wms-retrieval-note', 'Captured with the source export on 2026-11-16.',
            '--views-capture-date', 'not-a-date', '--wms-snapshot-date', '2026-11-16',
        ]

        result = subprocess.run(
            [sys.executable, str(script), *required_paths],
            capture_output=True, text=True, check=False,
        )

        self.assertEqual(result.returncode, 2)
        self.assertIn('expected YYYY-MM-DD', result.stderr)

    def test_github_manifest_verification_uses_repository_manifest_and_head(self):
        summary = [{
            'livelabs_id': '7', 'repository': 'example', 'repository_head_sha': 'head-1',
            'resolved_workshop_path': 'labs/one', 'resolved_manifest_path': 'labs/one/manifest.json',
            'github_status': 'COMPLETE_GIT_HISTORY',
        }]
        files = [
            {'repository': 'example', 'head_sha': 'head-1', 'path': 'labs/one/manifest.json'},
            {'repository': 'example', 'head_sha': 'head-1', 'path': 'labs/one/index.md'},
        ]

        result = candidate._github_verification(summary, files)

        self.assertEqual(result['resolved_manifest_paths_present_at_recorded_head'], 1)
        self.assertEqual(result['resolved_workshop_folders_with_indexed_files'], 1)
        self.assertTrue(result['item_verification']['7']['manifest_path_verified_at_recorded_head'])

    def test_jenkins_grouped_identity_count_matches_merge_blocking_rule(self):
        report = {'items': [
            {'livelabsId': '7', 'catalog': {'ids': ['7']}},
            {'livelabsId': '8', 'catalog': {'ids': ['8', '9']}},
        ]}

        self.assertEqual(candidate.count_grouped_jenkins_id_items(report), 1)

    def test_github_event_reconciliation_keeps_blank_path_rows_unresolved(self):
        history = [{
            'livelabs_id': '7', 'commit_history': [{
                'commit_sha': 'abc', 'changed_files': [{'status': 'M', 'path': 'item/readme.md'}],
            }],
        }]
        events = [
            {'livelabs_id': '7', 'commit_sha': 'abc', 'file_status': 'M', 'changed_file': 'item/readme.md', 'previous_path': ''},
            {'livelabs_id': '7', 'commit_sha': 'def', 'file_status': '', 'changed_file': '', 'previous_path': ''},
        ]

        result = candidate.reconcile_github_events(history, events)

        self.assertEqual(result['matching_file_change_events'], 1)
        self.assertEqual(result['unresolved_csv_rows_without_changed_file'], 1)
        with self.assertRaisesRegex(ValueError, 'file events absent'):
            candidate.reconcile_github_events(history, events[1:])


if __name__ == '__main__':
    unittest.main()
