import copy
import json
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from author_reports import build_evidence, enrich_merge, normalize_evidence, safe_url


class AuthorEvidenceTests(unittest.TestCase):
    def setUp(self):
        self.issue = {'code': 'BROKEN_VISIBLE_LINK', 'section': 'Preview', 'file': 'check.spec.ts', 'line': 31,
                      'problem': 'Link failed', 'action': 'Replace the link',
                      'details': {'brokenLinks': [{'text': 'Documentation', 'href': 'https://example.com/doc', 'status': 404}]}}
        self.raw = {'run': {'id': 'run-1'}, 'items': [{'livelabsId': '1036', 'issues': [self.issue]}]}
        self.merge = {'overlay': {'1036': {'runId': 'run-1', 'jenkinsErrorScore': 0, 'findings': [copy.deepcopy(self.issue)]}}}

    def test_enrichment_preserves_snapshot_and_counts(self):
        original = copy.deepcopy(self.merge)
        result = enrich_merge(self.merge, build_evidence(self.raw), {'1036'})
        self.assertEqual(self.merge, original)
        self.assertEqual(result['overlay']['1036']['jenkinsErrorScore'], 0)
        self.assertEqual(result['overlay']['1036']['findings'][0]['authorEvidence']['action'], 'Replace the link')

    def test_no_transfer_between_run_section_or_id(self):
        for field, value in [('runId', 'different'), ('section', 'Tenancy'), ('id', '1037')]:
            merge = copy.deepcopy(self.merge)
            if field == 'runId': merge['overlay']['1036']['runId'] = value
            elif field == 'id': merge['overlay'][value] = merge['overlay'].pop('1036')
            else: merge['overlay']['1036']['findings'][0][field] = value
            result = enrich_merge(merge, build_evidence(self.raw), {'1036', '1037'})
            self.assertNotIn('authorEvidence', next(iter(result['overlay'].values()))['findings'][0])

    def test_ambiguous_match_and_ineligible_id_are_ignored(self):
        self.raw['items'][0]['issues'].append(copy.deepcopy(self.issue))
        result = enrich_merge(self.merge, build_evidence(self.raw), {'1036'})
        self.assertNotIn('authorEvidence', result['overlay']['1036']['findings'][0])
        self.assertEqual(enrich_merge(self.merge, build_evidence(self.raw), set())['overlay'], {})

    def test_urls_and_text_do_not_expose_access_tokens(self):
        for url in ['javascript:alert(1)', 'https://user:password@example.com', 'https://objectstorage.example.com/p/secret/n/ns/b/b/o/a', 'https://example.com?token=secret', 'https://example.com?X-Amz-Signature=secret', 'HTTPS://example.com/?token=secret']:
            self.assertEqual(safe_url(url), '')
            evidence = normalize_evidence({'problem': 'See ' + url, 'details': [{'href': url}]})
            self.assertNotIn('secret', str(evidence))
        self.assertEqual(safe_url('https://livelabs.oracle.com/a?wid=3427'), 'https://livelabs.oracle.com/a?wid=3427')

    def test_unknown_fields_are_not_exported(self):
        evidence = normalize_evidence({'problem': 'Known', 'credentials': 'secret', 'details': [{'text': 'Example', 'authorization': 'secret'}]})
        self.assertNotIn('secret', str(evidence))

    def test_par_metadata_and_every_source_location_survive_normalization(self):
        issue = {'code': 'STALE_PAR_LINK', 'details': [{'label': 'model.onnx',
            'masked_url': 'https://objectstorage.example.com/p/SECRET_TOKEN/n/ns/b/models/o/model.onnx',
            'object_name': 'model.onnx', 'http_status': 401, 'status': 'not-working',
            'region': 'us-phoenix-1', 'namespace': 'ns', 'bucket': 'models', 'fingerprint': '0123456789abcdef',
            'sources': [{'pageUrl': 'https://example.com/workshop?lab=download', 'sourceFileUrl': 'https://example.com/lab.md',
                'label': 'Lab 2: Download model', 'sourceLine': 308, 'section': 'Task 6',
                'sourceExcerpt': 'Download model.onnx', 'instruction': '3. Download the model'},
                {'pageUrl': 'https://example.com/workshop?lab=setup', 'sourceLine': 311, 'label': 'Lab 3: Setup'}]}]}
        evidence = normalize_evidence(issue)
        detail = evidence['details'][0]
        self.assertEqual(detail['httpStatus'], '401')
        self.assertEqual(detail['bucket'], 'models')
        self.assertIn('/p/***/n/', detail['maskedUrl'])
        self.assertNotIn('SECRET_TOKEN', json.dumps(evidence))
        self.assertEqual([s['sourceLine'] for s in detail['sources']], ['308', '311'])
        self.assertEqual(detail['sources'][0]['sourceText'], 'Download model.onnx')
        self.assertEqual(normalize_evidence({'authorEvidence': evidence}), evidence)

    def test_location_aliases_images_and_nested_tokens_are_handled(self):
        evidence = normalize_evidence({'details': [{'src': 'https://example.com/image.png',
            'page_url': 'https://example.com/lab', 'source_file_url': 'https://example.com/file.md',
            'lab_number': 2, 'sources': [{'sourceExcerpt': 'See https://example.com?token=PRIVATE_TOKEN',
              'pageUrl': 'javascript:alert(1)', 'sourceLine': 9}]}]})
        item = evidence['details'][0]
        self.assertEqual(item['url'], 'https://example.com/image.png')
        self.assertEqual(item['sourceFileUrl'], 'https://example.com/file.md')
        self.assertEqual(item['labNumber'], '2')
        self.assertNotIn('PRIVATE_TOKEN', json.dumps(evidence))
        self.assertNotIn('javascript:', json.dumps(evidence))

    def test_same_link_retains_all_locations_and_different_links_stay_separate(self):
        shared = {'label': 'model.onnx', 'fingerprint': '0123456789abcdef'}
        evidence = normalize_evidence({'details': [
            {**shared, 'sources': [{'sourceLine': 10}]},
            {**shared, 'sources': [{'sourceLine': 20}]},
            {**shared, 'fingerprint': 'fedcba9876543210', 'sources': [{'sourceLine': 30}]}
        ]})
        self.assertEqual(len(evidence['details']), 2)
        self.assertEqual([s['sourceLine'] for s in evidence['details'][0]['sources']], ['10', '20'])
        self.assertEqual(normalize_evidence({'authorEvidence': evidence}), evidence)

    def test_imported_evidence_is_sanitized_without_a_matching_sidecar(self):
        merge = copy.deepcopy(self.merge)
        merge['overlay']['1036']['findings'][0]['authorEvidence'] = {
            'details': [{'label': 'model', 'maskedUrl': 'https://example.com/p/PRIVATE_TOKEN/n/ns/b/b/o/model'}]}
        result = enrich_merge(merge, {}, {'1036'})
        self.assertNotIn('PRIVATE_TOKEN', json.dumps(result))
        self.assertIn('/p/***/n/', json.dumps(result))

    def test_distinct_markers_on_same_line_are_preserved(self):
        issue = {'details': [{'text': 'two typos niam njgo', 'sourceLine': 64, 'marker': marker,
                               'sourceFileUrl': 'https://example.com/source.md'} for marker in ('niam', 'njgo')]}
        evidence = normalize_evidence(issue)
        self.assertEqual([item['marker'] for item in evidence['details']], ['niam', 'njgo'])

    def test_author_projection_is_not_duplicated_and_survives_reimport(self):
        issue = {'location': {'label': 'Lab 9', 'detail': 'Step 4', 'url': 'https://example.com/lab9', 'actionLabel': 'Open lab'},
                 'details': [{'text': 'same finding', 'sourceFileUrl': 'https://example.com/source.md'}],
                 'affectedItems': [{'label': 'same finding', 'actionUrl': 'https://example.com/lab9', 'sourceLine': 0, 'labNumber': 0}]}
        evidence = normalize_evidence(issue)
        self.assertEqual(len(evidence['details']), 1)
        self.assertEqual(evidence['location'], 'Lab 9 · Step 4')
        self.assertNotIn('sourceLine', evidence['details'][0])
        self.assertEqual(evidence['details'][0]['sourceFileUrl'], 'https://example.com/source.md')
        self.assertEqual(normalize_evidence({'authorEvidence': evidence}), evidence)


if __name__ == '__main__': unittest.main()
