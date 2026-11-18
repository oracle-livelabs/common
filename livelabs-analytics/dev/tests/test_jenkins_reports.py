import copy
import gzip
import gc
import http.client
import importlib.util
import json
import sys
import tempfile
import threading
import unittest
from unittest.mock import patch
from pathlib import Path

SCRIPTS = Path(__file__).resolve().parents[1] / 'scripts'
sys.path.insert(0, str(SCRIPTS))
from jenkins_reports import normalize_report, report_file, reports, apply_list_operations


class ReportTests(unittest.TestCase):
    def setUp(self):
        self.export = {'schemaVersion': 2, 'run': {'id': 'run-1', 'counts': {'total': 1}}, 'items': [
            {'livelabsId': '123', 'type': 'workshop', 'catalog': {'ids': ['123']},
             'checks': [{'title': 'Preview', 'file': 'check.spec.ts'}],
             'issues': [{'code': 'BROKEN_VISIBLE_LINK', 'priority': 'P1', 'details': [{'href': 'https://example.com/doc'}]}]}]}

    def test_preserves_checks_and_evidence_without_mutating_source(self):
        original = copy.deepcopy(self.export)
        result = normalize_report(self.export, for_merge=True)
        self.assertEqual(result['catalogItems'][0]['tests'], self.export['items'][0]['checks'])
        self.assertEqual(result['catalogItems'][0]['issues'], self.export['items'][0]['issues'])
        self.assertEqual(self.export, original)

    def test_grouped_ids_can_be_displayed_but_not_merged(self):
        self.export['items'][0]['catalog']['ids'].append('456')
        self.assertEqual(len(normalize_report(self.export)['sourceReport']['groupedIdentities']), 1)
        with self.assertRaisesRegex(ValueError, 'groups multiple'):
            normalize_report(self.export, for_merge=True)

    def test_recorded_diagnostics_preserved_without_dead_attachment_links(self):
        self.export['items'][0]['evidence'] = [{'errors':['HTTP 404'], 'failedStep':{'title':'Open link'},
            'steps':[{'title':'Click documentation'}], 'bugSummary':'Broken documentation URL',
            'attachments':[{'name':'screenshot','path':'missing.png'}]}]
        result = normalize_report(self.export)
        failure = result['failures'][0]
        self.assertEqual(failure['catalogItem']['id'], '123')
        for field in ('errors','failedStep','steps','bugSummary'):
            self.assertEqual(failure[field], self.export['items'][0]['evidence'][0][field])
        self.assertEqual(failure['attachments'], [])

    def test_same_title_is_not_identity(self):
        second = copy.deepcopy(self.export['items'][0]); second.update(livelabsId='456', catalog={'ids':['456']})
        self.export['items'].append(second)
        for item in self.export['items']: item['title'] = 'Same title'
        self.assertEqual(len(normalize_report(self.export, for_merge=True)['catalogItems']), 2)

    def test_duplicate_id_rejected(self):
        self.export['items'].append(copy.deepcopy(self.export['items'][0]))
        with self.assertRaisesRegex(ValueError, 'unique'):
            normalize_report(self.export)

    def test_inline_script_injection_in_run_id_rejected_in_both_formats(self):
        for run_id in ['probe</script><script>alert(1)</script>', '..', '', None]:
            self.export['run']['id'] = run_id
            for payload in (self.export, {'runId':run_id, 'catalogItems':[]}):
                with self.assertRaisesRegex(ValueError, 'run ID'):
                    normalize_report(payload)

    def test_review_list_identity_and_removal(self):
        entry = {'testId':'run-1:workshop:123','executionId':'run-1','itemId':'123'}
        saved = apply_list_operations({}, [{'id':entry['testId'],'entry':entry}])
        self.assertEqual(len(saved), 1)
        self.assertEqual(apply_list_operations(saved, [{'id':entry['testId'],'remove':True}]), {})
        with self.assertRaises(ValueError): apply_list_operations({}, [{'id':'wrong','entry':entry}])


class ProtectedReportHTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        spec = importlib.util.spec_from_file_location('jenkins_admin_under_test', SCRIPTS / 'admin-server.py')
        cls.app = importlib.util.module_from_spec(spec); spec.loader.exec_module(cls.app)
        cls.temp = tempfile.TemporaryDirectory()
        cls.app.STATE = Path(cls.temp.name)
        cls.app.DATABASE = cls.app.STATE / 'test.sqlite3'
        cls.app.JENKINS_ARCHIVE = cls.app.STATE / 'reports'
        cls.report_id = 'a' * 64
        directory = cls.app.JENKINS_ARCHIVE / cls.report_id; directory.mkdir(parents=True)
        html = b'<html><head></head><body><script>const ok = true;</script>Saved report</body></html>'
        (directory / 'manifest.json').write_text(json.dumps({'id':cls.report_id, 'startedAt':'2026-10-15'}))
        (directory / 'summary.html').write_bytes(html)
        (directory / 'summary.html.gz').write_bytes(gzip.compress(html))
        cls.app.initialize(); cls.app.configure('fixture-reviewer', 'fixture-password-not-a-real-account')
        cls.server = cls.app.ThreadingHTTPServer(('127.0.0.1', 0), cls.app.Handler)
        cls.port = cls.server.server_address[1]
        cls.server.public_origin = None
        cls.server.allowed_hosts = {f'127.0.0.1:{cls.port}'}
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True);cls.thread.start()
        status, headers, _ = cls.request('POST', '/api/admin/login', {'username':'fixture-reviewer','password':'fixture-password-not-a-real-account'})
        assert status == 200
        cls.cookie = headers['Set-Cookie'].split(';')[0]
        _, _, body = cls.request('GET', '/api/admin/session', cookie=cls.cookie)
        cls.csrf = json.loads(body)['csrf']

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown();cls.server.server_close();cls.thread.join();gc.collect();cls.temp.cleanup()

    @classmethod
    def request(cls, method, path, payload=None, cookie='', csrf='', extra=None):
        conn = http.client.HTTPConnection('127.0.0.1', cls.port)
        headers = {'Origin':f'http://127.0.0.1:{cls.port}', 'Content-Type':'application/json'}
        if cookie: headers['Cookie'] = cookie
        if csrf: headers['X-CSRF-Token'] = csrf
        headers.update(extra or {})
        conn.request(method, path, body=json.dumps(payload) if payload is not None else None, headers=headers)
        response = conn.getresponse(); result = response.status, dict(response.getheaders()), response.read();conn.close();return result

    def test_private_routes_require_sign_in(self):
        for path in ['/api/admin/jenkins/reports','/api/admin/jenkins/list', f'/admin/jenkins/report/{self.report_id}/summary.html','/admin-assets/jenkins-report-bridge.js']:
            self.assertEqual(self.request('GET', path)[0], 401, path)

    def test_authenticated_gzip_and_script_hash_policy(self):
        status, headers, body = self.request('GET', f'/admin/jenkins/report/{self.report_id}/summary.html', cookie=self.cookie, extra={'Accept-Encoding':'gzip'})
        self.assertEqual(status, 200);self.assertIn(b'Saved report', gzip.decompress(body))
        self.assertIn("'sha256-", headers['Content-Security-Policy'])
        self.assertNotIn("script-src 'self' 'unsafe-inline'", headers['Content-Security-Policy'])
        rendered = gzip.decompress(body)
        self.assertIn(b'analytics-shell-layout', rendered)
        self.assertEqual(rendered.count(b'Back to dashboard'), 1)
        self.assertIn(b'href="/admin/jenkins" aria-current="page"', rendered)
        original = (self.app.JENKINS_ARCHIVE / self.report_id / 'summary.html').read_bytes()
        self.assertNotIn(b'analytics-shell-layout', original)
        self.assertEqual(gzip.decompress((self.app.JENKINS_ARCHIVE / self.report_id / 'summary.html.gz').read_bytes()), original)

    def test_all_admin_pages_share_navigation_and_settings_is_retired(self):
        for route in ('dashboard-management', 'governance', 'data-merge', 'jenkins/history', 'inventory'):
            status, _, body = self.request('GET', '/admin/' + route, cookie=self.cookie)
            self.assertEqual(status, 200)
            self.assertEqual(body.count(b'Back to dashboard'), 1, route)
            self.assertNotIn(b'/admin/user-settings', body, route)
            self.assertIn(b'/admin-assets/admin-shell.js', body, route)
        status, headers, _ = self.request('GET', '/admin/user-settings', cookie=self.cookie)
        self.assertEqual(status, 302)
        self.assertEqual(headers['Location'], '/admin/dashboard-management')
        self.assertEqual(self.request('GET', '/admin-assets/user-settings.js', cookie=self.cookie)[0], 404)

    def test_admin_entry_opens_full_report_and_history_remains_available(self):
        status, headers, _ = self.request('GET', '/admin/jenkins', cookie=self.cookie)
        self.assertEqual(status, 302)
        self.assertEqual(headers['Location'], f'/admin/jenkins/report/{self.report_id}/summary.html')
        self.assertEqual(self.request('GET', '/admin/jenkins/history', cookie=self.cookie)[0], 200)

    def test_path_traversal_and_private_source_files_denied(self):
        for suffix in ['../summary.html', 'source-normalized.json', 'manifest.json', '%2e%2e%2fadmin.sqlite3']:
            self.assertEqual(self.request('GET', f'/admin/jenkins/report/{self.report_id}/{suffix}', cookie=self.cookie)[0],404)

    def test_list_requires_csrf_and_persists(self):
        key = 'run-1:workshop:123'
        payload = {'operations':[{'id':key,'entry':{'testId':key,'executionId':'run-1','itemId':'123'}}]}
        self.assertEqual(self.request('POST','/api/admin/jenkins/list',payload,cookie=self.cookie)[0],403)
        self.assertEqual(self.request('POST','/api/admin/jenkins/list',payload,cookie=self.cookie,csrf=self.csrf)[0],200)
        self.assertIn(key,json.loads(self.request('GET','/api/admin/jenkins/list',cookie=self.cookie)[2])['retest'])

    def test_no_fake_live_retest(self):
        self.assertEqual(self.request('POST','/api/admin/jenkins/retest',{},cookie=self.cookie,csrf=self.csrf)[0],503)

    def test_merge_apply_preserves_preview_invalidity(self):
        inventory = {'records':[{'key':'livelabs:1','livelabsId':'1'}]}
        for counts, tests in [({'passed':1,'total':0}, []), ({'passed':1,'other':1}, []),
                              ({'passed':-1,'failed':2}, []), ({}, [{'title':'Scan','status':'interrupted'}])]:
            report = {'runId':'fixture','sourceReport':{},'catalogItems':[{'catalogItem':{'livelabsId':'1'},
                'status':'failed','counts':counts,'tests':tests,'issues':[{'code':'POSSIBLE_TYPO','count':2}]}]}
            with patch.object(self.app, 'snapshot_by_id', return_value=inventory), patch.object(self.app, 'qa_snapshot_by_id', return_value=report):
                preview = self.app.merge_sources('fixture-inventory', 'fixture-qa')
                self.assertIsNone(preview['rows'][0]['qaJenkinsErrorScore'])
                status, _, body = self.request('POST','/api/admin/merges',{'action':'apply','analyticsId':'fixture-inventory','qaId':'fixture-qa'},cookie=self.cookie,csrf=self.csrf)
                self.assertEqual(status, 201, body)
            item = self.app.dashboard_qa_merge()['overlay']['1']
            self.assertIsNone(item['jenkinsErrorScore'], (counts, tests))
            self.assertEqual(item['scoreState'], preview['rows'][0]['qaJenkinsScoreState'])


if __name__ == '__main__': unittest.main()

