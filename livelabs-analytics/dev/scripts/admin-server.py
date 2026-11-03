"""Loopback admin service. Private pages and APIs require a server-issued session.

Run --configure once to choose credentials, then run normally. No default password.
Runtime state is local SQLite, excluded from static releases. Production requires
an approved HTTPS gateway and identity-provider integration.
"""
import argparse
import base64
import csv
import getpass
import hashlib
import hmac
import io
import json
import math
import mimetypes
import os
import re
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from admin_data import compare_snapshots, identity, provenance, quality_queue, validate_snapshot
from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / 'dev/admin'
STATE = ROOT / '.private/admin'
DATABASE = STATE / 'admin.sqlite3'
QA_REPORTS_ROOT = Path(os.environ.get('LIVELABS_ADMIN_QA_REPORTS_DIR', ROOT.parent / 'qa-automation' / 'reports')).resolve()
ITERATIONS = 600000
MAX_USERNAME_LENGTH = 200
MIN_PASSWORD_LENGTH = 14
SESSION_SECONDS = 2 * 60 * 60
REMEMBER_SESSION_SECONDS = 7 * 24 * 60 * 60
REMEMBER_IDLE_SECONDS = 8 * 60 * 60
MAX_BODY = 32 * 1024 * 1024
LOCK = threading.Lock()
ATTEMPTS = {}
SAFE_RUN_ID = re.compile(r'^[A-Za-z0-9._:-]{1,180}$')
TAG_COLORS = frozenset(('teal', 'blue', 'purple', 'green', 'amber', 'red', 'slate'))
ISSUE_TAXONOMY = {
    'STALE_PAR_LINK': ('P1', 'P1 · learner blocker', 'author-facing', False),
    'BROKEN_VISIBLE_LINK': ('P1', 'P1 · learner blocker', 'author-facing', False),
    'BROKEN_VISIBLE_IMAGE': ('P1', 'P1 · learner blocker', 'author-facing', False),
    'SOURCE_SCAN_INCOMPLETE': ('P1', 'P1 candidate · verify first', 'verification-required', True),
    'INSTRUCTIONS_FLOW': ('P1', 'P1 · learner blocker', 'author-facing', False),
    'CONTENT_TEXT_DEFECT': ('P2', 'P2 · content review', 'author-facing', False),
    'MARKDOWN_FORMATTING': ('P2', 'P2 · content review', 'author-facing', False),
    'WRITING_GRAMMAR': ('P2', 'P2 · content review', 'author-facing', False),
    'POSSIBLE_TYPO': ('P2', 'P2 · content review', 'author-facing', False),
    'WORKSHOP_NOT_AVAILABLE': ('', 'Internal QA only', 'internal-qa', True),
    'PAR_SCAN_INCOMPLETE': ('', 'Internal QA only', 'internal-qa', True),
    'AUTHENTICATION_REQUIRED': ('', 'Internal QA only', 'internal-qa', True),
}
JENKINS_SCORE_POLICY = {
    'version': 'jenkins-priority-v1',
    'weights': {'P2': 2, 'P3': 1},
    'referenceBurden': 20,
    'tableShare': 0.25,
}
def db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize():
    STATE.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, digest TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires REAL NOT NULL, remembered INTEGER NOT NULL DEFAULT 0, last_seen REAL NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, label TEXT NOT NULL, date TEXT NOT NULL, created TEXT NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS qa_snapshots (id TEXT PRIMARY KEY, label TEXT NOT NULL, run_id TEXT NOT NULL, created TEXT NOT NULL, parent_id TEXT, source TEXT NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS applied_merges (id TEXT PRIMARY KEY, analytics_id TEXT NOT NULL, qa_id TEXT NOT NULL, mapping TEXT NOT NULL, summary TEXT NOT NULL, overlay TEXT NOT NULL, created TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 0);
            CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, record_key TEXT NOT NULL, snapshot_id TEXT NOT NULL, candidate_key TEXT, decision TEXT NOT NULL, reason TEXT NOT NULL, reviewer TEXT NOT NULL, created TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS dashboard_admin_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL, updated TEXT NOT NULL);
        ''')
        columns = {row['name'] for row in conn.execute('PRAGMA table_info(sessions)')}
        if 'remembered' not in columns:
            conn.execute('ALTER TABLE sessions ADD COLUMN remembered INTEGER NOT NULL DEFAULT 0')
        if 'last_seen' not in columns:
            conn.execute('ALTER TABLE sessions ADD COLUMN last_seen REAL NOT NULL DEFAULT 0')
        snapshot_columns = {row['name'] for row in conn.execute('PRAGMA table_info(snapshots)')}
        if 'parent_id' not in snapshot_columns:
            conn.execute('ALTER TABLE snapshots ADD COLUMN parent_id TEXT')
        if 'source' not in snapshot_columns:
            conn.execute("ALTER TABLE snapshots ADD COLUMN source TEXT NOT NULL DEFAULT 'capture'")


def configure(username=None, password=None):
    username = (username or input('Admin username: ')).strip()
    password = password or getpass.getpass('Admin password (at least 14 characters): ')
    if not username or len(username) > MAX_USERNAME_LENGTH or len(password) < MIN_PASSWORD_LENGTH:
        raise ValueError(f'A username of 1–{MAX_USERNAME_LENGTH} characters and a password of at least {MIN_PASSWORD_LENGTH} characters are required.')
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), ITERATIONS).hex()
    with db() as conn:
        conn.execute('INSERT OR REPLACE INTO account VALUES(1,?,?,?)', (username, salt, digest))
        conn.execute('DELETE FROM sessions')
    (STATE / 'initial-credentials.txt').unlink(missing_ok=True)


def now():
    return datetime.now(timezone.utc).isoformat()


def valid_timestamp(value):
    if not isinstance(value, str) or len(value) > 40:
        return ''
    try:
        parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    except ValueError:
        return ''
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat()


def current_snapshot():
    spec = spec_from_file_location('capture_snapshot', ROOT / 'dev/scripts/capture-snapshot.py')
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.capture()


def store_snapshot(payload, label, parent_id=None, source='capture'):
    validate_snapshot(payload)
    info = provenance(payload)
    with db() as conn:
        conn.execute('INSERT OR IGNORE INTO snapshots(id,label,date,created,payload,parent_id,source) VALUES(?,?,?,?,?,?,?)',
                     (info['snapshotId'], label[:100], info['snapshotDate'], now(), json.dumps(payload, ensure_ascii=False), parent_id, source))
    return info


def snapshot_by_id(snapshot_id):
    with db() as conn:
        row = conn.execute('SELECT payload FROM snapshots WHERE id=?', (snapshot_id,)).fetchone()
    if not row:
        raise ValueError('Snapshot not found.')
    return json.loads(row['payload'])


def classify_qa_issue(issue):
    if not isinstance(issue, dict):
        return {}
    code = str(issue.get('code', '')).strip().upper()[:120]
    priority, priority_label, group, verification_required = ISSUE_TAXONOMY.get(
        code, ('', 'Unmapped · review required', 'unmapped', True))
    reported_priority = str(issue.get('priority', issue.get('taxonomyPriority', ''))).strip().upper()
    if reported_priority in {'P1', 'P2', 'P3'}:
        priority = reported_priority
        verification_required = issue.get('verificationRequired') is True
        group = 'verification-required' if verification_required else 'author-facing'
        priority_label = str(issue.get('priorityLabel') or f'{reported_priority} · reported by Jenkins')
    raw_count = issue.get('count', issue.get('findingCount', 1))
    try:
        issue_count = max(0, int(raw_count))
    except (TypeError, ValueError, OverflowError):
        issue_count = 1
    return {
        'code': code,
        'label': str(issue.get('label', code or 'Unclassified'))[:300],
        'severity': str(issue.get('severity', ''))[:80],
        'priority': priority,
        'priorityLabel': priority_label,
        'group': group,
        'verificationRequired': verification_required,
        'evidenceStatus': (
            'Verify before treating as a confirmed author issue' if group == 'verification-required'
            else 'QA evidence only; not an author priority' if group == 'internal-qa'
            else 'Reported by QA; manual review required' if group == 'author-facing'
            else 'Unmapped; review before classification'
        ),
        'count': issue_count,
        'message': str(issue.get('message', issue.get('summary', issue.get('problem', ''))))[:2000],
        'section': str(issue.get('section', ''))[:200],
        'file': str(issue.get('file', ''))[:500],
        'line': str(issue.get('line', ''))[:80],
        'sourceItemPriority': str(issue.get('sourceItemPriority', issue.get('itemPriority', '')))[:20],
        'catalogUrl': str(issue.get('catalogUrl', ''))[:2000],
        'finalUrl': str(issue.get('finalUrl', ''))[:2000],
    }


def summarize_qa_issues(issues):
    counts = {'p1': 0, 'p1Verify': 0, 'p2': 0, 'p3': 0, 'internal': 0, 'unmapped': 0}
    occurrences = 0
    normalized = []
    codes = []
    previews = []
    for issue in issues if isinstance(issues, list) else []:
        item = classify_qa_issue(issue)
        if not item:
            continue
        normalized.append(item)
        occurrences += item['count']
        if item['group'] == 'verification-required' and item['priority'] == 'P1':
            counts['p1Verify'] += 1
        elif item['priority'] == 'P1':
            counts['p1'] += 1
        elif item['priority'] == 'P2':
            counts['p2'] += 1
        elif item['priority'] == 'P3':
            counts['p3'] += 1
        elif item['group'] == 'internal-qa':
            counts['internal'] += 1
        else:
            counts['unmapped'] += 1
        if item['code'] and item['code'] not in codes:
            codes.append(item['code'])
        if len(previews) < 3:
            preview = f"{item['priorityLabel']} · {item['label']}"
            if item['message']:
                preview += f": {item['message']}"
            previews.append(preview)
    labels = []
    if counts['p1']:
        labels.append(f"P1 {counts['p1']}")
    if counts['p1Verify']:
        labels.append(f"P1 verify {counts['p1Verify']}")
    if counts['p2']:
        labels.append(f"P2 {counts['p2']}")
    if counts['p3']:
        labels.append(f"P3 {counts['p3']}")
    if counts['internal']:
        labels.append(f"Internal QA {counts['internal']}")
    if counts['unmapped']:
        labels.append(f"Unmapped {counts['unmapped']}")
    return {
        'details': normalized,
        'rows': len(normalized),
        'occurrences': occurrences,
        'counts': counts,
        'codes': codes,
        'prioritySummary': ' · '.join(labels) if labels else 'No categorized findings',
        'preview': ' | '.join(previews),
    }


def validate_qa_summary(summary):
    if not isinstance(summary, dict):
        raise ValueError('Upload a Jenkins QA summary JSON object.')
    run_id = str(summary.get('runId', '')).strip()
    if not SAFE_RUN_ID.fullmatch(run_id) or run_id in ('.', '..'):
        raise ValueError('QA summary must include a valid runId.')
    counts = summary.get('counts', {})
    if counts and not isinstance(counts, dict):
        raise ValueError('QA summary counts must be an object.')
    if isinstance(counts, dict):
        for key, value in counts.items():
            if not isinstance(key, str) or not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0:
                raise ValueError('QA summary counts must contain non-negative numbers.')
    for field in ('catalogItems', 'failures', 'tests'):
        rows = summary.get(field)
        if rows is not None and (not isinstance(rows, list) or len(rows) > 20000):
            raise ValueError(f'QA summary {field} must be a list of no more than 20,000 rows.')
    catalog_items = summary.get('catalogItems', [])
    if isinstance(catalog_items, list):
        for item in catalog_items:
            if not isinstance(item, dict):
                raise ValueError('Each catalog item in the QA summary must be an object.')
            if item.get('tests') is not None and (not isinstance(item.get('tests'), list) or len(item['tests']) > 20000 or any(not isinstance(test, dict) for test in item['tests'])):
                raise ValueError('Catalog item tests must be objects in a list of no more than 20,000 rows.')
            if item.get('counts') is not None and not isinstance(item.get('counts'), dict):
                raise ValueError('Catalog item counts must be an object.')
            if isinstance(item.get('counts'), dict):
                for key, value in item['counts'].items():
                    if not isinstance(key, str) or not isinstance(value, (int, float)) or isinstance(value, bool) or not math.isfinite(value) or value < 0:
                        raise ValueError('Catalog item counts must contain non-negative numbers.')
            if item.get('issues') is not None and (not isinstance(item.get('issues'), list) or len(item['issues']) > 500 or any(not isinstance(issue, dict) for issue in item['issues'])):
                raise ValueError('Catalog item issues must be objects in a list of no more than 500 rows.')
    for field in ('failures', 'tests'):
        rows = summary.get(field)
        if isinstance(rows, list) and any(not isinstance(row, dict) for row in rows):
            raise ValueError(f'QA summary {field} entries must be objects.')
    return summary


def qa_snapshot_id(summary):
    canonical = json.dumps(summary, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode('utf-8')
    return hashlib.sha256(canonical).hexdigest()


def store_qa_snapshot(summary, label, parent_id=None, source='upload'):
    validate_qa_summary(summary)
    run_id = str(summary['runId'])
    snapshot_id = qa_snapshot_id(summary)
    with db() as conn:
        conn.execute('INSERT OR IGNORE INTO qa_snapshots(id,label,run_id,created,parent_id,source,payload) VALUES(?,?,?,?,?,?,?)',
                     (snapshot_id, str(label or 'Imported Jenkins report')[:160], run_id, now(), parent_id, source, json.dumps(summary, ensure_ascii=False)))
    return {'id': snapshot_id, 'label': str(label or 'Imported Jenkins report')[:160], 'runId': run_id, 'source': source}


def qa_snapshot_by_id(snapshot_id):
    with db() as conn:
        row = conn.execute('SELECT payload FROM qa_snapshots WHERE id=?', (snapshot_id,)).fetchone()
    if not row:
        raise ValueError('QA snapshot not found.')
    return json.loads(row['payload'])


MERGE_FIELDS = {'livelabsId', 'wmsId', 'title'}


def match_value(value):
    return ' '.join(str(value or '').split()).casefold()


def qa_merge_rows(summary):
    run = {key: summary.get(key) for key in ('runId', 'runType', 'status', 'startedAt', 'endedAt')}
    rows = []
    items = summary.get('catalogItems') if isinstance(summary.get('catalogItems'), list) else []
    for item in items:
        if not isinstance(item, dict):
            continue
        catalog = item.get('catalogItem') if isinstance(item.get('catalogItem'), dict) else {}
        tests = item.get('tests') if isinstance(item.get('tests'), list) else []
        issues = item.get('issues') if isinstance(item.get('issues'), list) else []
        issue_summary = summarize_qa_issues(issues)
        common = {
            **run, 'itemKey': item.get('key', ''), 'itemTitle': catalog.get('title', ''),
            'livelabsId': catalog.get('livelabsId', ''), 'wmsId': catalog.get('wmsId', ''),
            'itemStatus': item.get('status', ''), 'itemIssues': issue_summary['details'],
            'issueDetails': issue_summary['details'], 'issueCodes': issue_summary['codes'],
            'issueCount': issue_summary['rows'], 'issueOccurrences': issue_summary['occurrences'],
            'prioritySummary': issue_summary['prioritySummary'], 'issueSummary': issue_summary['preview'],
            'testCounts': item.get('counts', {}) if isinstance(summary.get('sourceReport'), dict) else {},
            'reportPairing': str(item.get('reportPairingStatus', ''))[:200],
        }
        if not tests:
            rows.append({**common, 'recordType': 'catalog-item', 'testTitle': '', 'section': '',
                         'testStatus': '', 'expectedStatus': '', 'classification': issue_summary['prioritySummary']})
            continue
        for test in tests:
            if not isinstance(test, dict):
                continue
            related = [issue for issue in issues if isinstance(issue, dict) and issue.get('testTitle') == test.get('title')]
            related_summary = summarize_qa_issues(related)
            rows.append({**common, 'recordType': 'test', 'testTitle': test.get('title', ''),
                         'section': test.get('section', ''), 'testStatus': test.get('status', ''),
                         'expectedStatus': test.get('expectedStatus', ''), 'classification': test.get('classification', ''),
                         'issueDetails': related_summary['details'], 'issueCodes': related_summary['codes'],
                         'issueCount': related_summary['rows'], 'issueOccurrences': related_summary['occurrences'],
                         'prioritySummary': related_summary['prioritySummary'], 'issueSummary': related_summary['preview']})
    if not rows and isinstance(summary.get('failures'), list):
        for failure in summary['failures']:
            if not isinstance(failure, dict):
                continue
            catalog = failure.get('catalogItem') if isinstance(failure.get('catalogItem'), dict) else {}
            rows.append({**run, 'recordType': 'failure', 'itemKey': '', 'itemTitle': catalog.get('title', ''),
                         'livelabsId': catalog.get('livelabsId', ''), 'wmsId': catalog.get('wmsId', ''),
                         'itemStatus': '', 'itemIssues': [], 'testTitle': failure.get('title', ''),
                         'section': failure.get('section', ''), 'testStatus': failure.get('status', ''),
                         'expectedStatus': failure.get('expectedStatus', ''), 'classification': failure.get('classification', ''),
                         'issueCodes': [], 'issueDetails': [], 'issueCount': 0, 'issueOccurrences': 0,
                         'prioritySummary': 'No categorized findings', 'issueSummary': '', 'testCounts': {}, 'reportPairing': ''})
    if not rows and isinstance(summary.get('tests'), list):
        for test in summary['tests']:
            if not isinstance(test, dict):
                continue
            catalog = test.get('catalogItem') if isinstance(test.get('catalogItem'), dict) else {}
            rows.append({**run, 'recordType': 'test', 'itemKey': test.get('itemKey', ''),
                         'itemTitle': catalog.get('title', test.get('itemTitle', '')),
                         'livelabsId': catalog.get('livelabsId', test.get('livelabsId', '')),
                         'wmsId': catalog.get('wmsId', test.get('wmsId', '')), 'itemStatus': '',
                         'itemIssues': [], 'testTitle': test.get('title', ''), 'section': test.get('section', ''),
                         'testStatus': test.get('status', ''), 'expectedStatus': test.get('expectedStatus', ''),
                         'classification': test.get('classification', ''), 'issueCodes': [], 'issueDetails': [],
                         'issueCount': 0, 'issueOccurrences': 0, 'prioritySummary': 'No categorized findings',
                         'issueSummary': '', 'testCounts': {}, 'reportPairing': ''})
    if not rows:
        counts = summary.get('counts') if isinstance(summary.get('counts'), dict) else {}
        rows.append({**run, 'recordType': 'run-summary', 'itemKey': '', 'itemTitle': '', 'livelabsId': '',
                     'wmsId': '', 'itemStatus': summary.get('status', ''), 'itemIssues': [],
                     'testTitle': f"{counts.get('total', 0)} total; {counts.get('passed', 0)} passed; {counts.get('unexpected', counts.get('failed', 0))} failed; {counts.get('skipped', 0)} skipped",
                     'section': '', 'testStatus': '', 'expectedStatus': '', 'classification': '', 'issueCodes': [],
                     'issueDetails': [], 'issueCount': 0, 'issueOccurrences': 0, 'prioritySummary': 'No categorized findings',
                     'issueSummary': '', 'testCounts': {}, 'reportPairing': ''})
    return rows


def merge_sources(analytics_id, qa_id, analytics_field='livelabsId', qa_field='livelabsId'):
    if analytics_field not in MERGE_FIELDS or qa_field not in MERGE_FIELDS:
        raise ValueError('Choose LiveLabs ID, WMS ID, or title as the match field for each source.')
    analytics = snapshot_by_id(analytics_id)
    summary = qa_snapshot_by_id(qa_id)
    report_summary = dict(summary.get('sourceReport', {})) if isinstance(summary.get('sourceReport'), dict) else {}
    report_warnings = list(report_summary.get('warnings', [])) if isinstance(report_summary.get('warnings'), list) else []
    metadata = analytics.get('metadata', {}) if isinstance(analytics.get('metadata'), dict) else {}
    analytics_date = str(metadata.get('snapshot_date') or metadata.get('snapshotDate') or '')
    qa_started_at = str(summary.get('startedAt') or '')
    if analytics_date and qa_started_at and analytics_date[:10] < qa_started_at[:10]:
        report_warnings.append(f"Analytics source snapshot is dated {analytics_date[:10]}, before the Jenkins run started on {qa_started_at[:10]}.")
    if report_summary:
        report_summary['warnings'] = report_warnings
        report_summary['analyticsSnapshotDate'] = analytics_date
    inventory = analytics['records']
    qa_rows = qa_merge_rows(summary)
    index = {}
    for position, record in enumerate(inventory):
        value = match_value(record.get(analytics_field))
        if value:
            index.setdefault(value, []).append(position)
    matched_inventory = set()
    output = []
    matched_rows = unmatched_qa = ambiguous_qa = 0
    for qa_row in qa_rows:
        key = match_value(qa_row.get(qa_field) if qa_field != 'title' else qa_row.get('itemTitle'))
        candidates = index.get(key, []) if key else []
        status = 'matched' if len(candidates) == 1 else 'unmatched' if not candidates else 'ambiguous'
        record = inventory[candidates[0]] if len(candidates) == 1 else None
        if record:
            matched_inventory.add(candidates[0])
            matched_rows += 1
        elif status == 'ambiguous':
            ambiguous_qa += 1
        else:
            unmatched_qa += 1
        output.append({
            'matchStatus': status,
            'analyticsRecordKey': record.get('key', '') if record else '',
            'livelabsId': record.get('livelabsId', '') if record else qa_row.get('livelabsId', ''),
            'wmsId': record.get('wmsId', '') if record else qa_row.get('wmsId', ''),
            'analyticsTitle': record.get('title', '') if record else '',
            'analyticsPublishStatus': record.get('publishStatus', '') if record else '',
            'qaRunId': qa_row.get('runId', ''), 'qaRunStatus': qa_row.get('status', ''),
            'qaStartedAt': qa_row.get('startedAt', ''), 'qaItemTitle': qa_row.get('itemTitle', ''),
            'qaItemStatus': qa_row.get('itemStatus', ''), 'qaTestTitle': qa_row.get('testTitle', ''),
            'qaTestStatus': qa_row.get('testStatus', ''), 'qaExpectedStatus': qa_row.get('expectedStatus', ''),
            'qaSection': qa_row.get('section', ''), 'qaClassification': qa_row.get('classification', ''),
            'qaIssueCodes': '; '.join(qa_row.get('issueCodes', [])) if isinstance(qa_row.get('issueCodes'), list) else str(qa_row.get('issueCodes', '')),
            'qaPrioritySummary': qa_row.get('prioritySummary', ''), 'qaIssueCount': qa_row.get('issueCount', 0),
            'qaIssueOccurrences': qa_row.get('issueOccurrences', 0), 'qaIssueSummary': qa_row.get('issueSummary', ''),
            'qaIssueDetails': qa_row.get('issueDetails', []), 'qaTestCounts': qa_row.get('testCounts', {}),
            'qaReportPairing': qa_row.get('reportPairing', ''), 'candidateCount': len(candidates),
        })
    for position, record in enumerate(inventory):
        if position in matched_inventory:
            continue
        output.append({
            'matchStatus': 'analytics-only', 'analyticsRecordKey': record.get('key', ''),
            'livelabsId': record.get('livelabsId', ''), 'wmsId': record.get('wmsId', ''),
            'analyticsTitle': record.get('title', ''), 'analyticsPublishStatus': record.get('publishStatus', ''),
            'qaRunId': '', 'qaRunStatus': '', 'qaStartedAt': '', 'qaItemTitle': '', 'qaItemStatus': '',
            'qaTestTitle': '', 'qaTestStatus': '', 'qaExpectedStatus': '', 'qaSection': '',
            'qaClassification': '', 'qaIssueCodes': '', 'qaPrioritySummary': '', 'qaIssueCount': 0,
            'qaIssueOccurrences': 0, 'qaIssueSummary': '', 'qaIssueDetails': [], 'qaTestCounts': {},
            'qaReportPairing': '', 'candidateCount': 0,
        })
    score_rollups = {}
    for row in output:
        if row['matchStatus'] != 'matched' or not row['analyticsRecordKey']:
            continue
        rollup = score_rollups.setdefault(row['analyticsRecordKey'], {
            'p1': 0, 'p1Verification': 0, 'p2': 0, 'p3': 0,
            'p2Occurrences': 0, 'p3Occurrences': 0, 'unmapped': 0,
        })
        for issue in row.get('qaIssueDetails', []) if isinstance(row.get('qaIssueDetails'), list) else []:
            normalized = classify_qa_issue(issue)
            priority = normalized.get('priority')
            group = normalized.get('group')
            count = max(0, int(normalized.get('count', 0) or 0))
            if group == 'author-facing' and priority == 'P1':
                rollup['p1'] += 1
            elif group == 'verification-required' and priority == 'P1':
                rollup['p1Verification'] += 1
            elif group == 'author-facing' and priority == 'P2':
                rollup['p2'] += 1
                rollup['p2Occurrences'] += count
            elif group == 'author-facing' and priority == 'P3':
                rollup['p3'] += 1
                rollup['p3Occurrences'] += count
            elif group != 'internal-qa':
                rollup['unmapped'] += 1
    score_by_record = {}
    for record_key, rollup in score_rollups.items():
        burden = JENKINS_SCORE_POLICY['weights']['P2'] * rollup['p2Occurrences'] + JENKINS_SCORE_POLICY['weights']['P3'] * rollup['p3Occurrences']
        score_by_record[record_key] = round(100 * burden / (burden + JENKINS_SCORE_POLICY['referenceBurden']), 2) if not rollup['unmapped'] else None
    for row in output:
        rollup = score_rollups.get(row.get('analyticsRecordKey'))
        if row['matchStatus'] == 'matched' and rollup:
            row['qaPriorityCounts'] = dict(rollup)
            row['qaPriorityP1'] = rollup['p1'] + rollup['p1Verification']
            row['qaPriorityP2Occurrences'] = rollup['p2Occurrences']
            row['qaPriorityP3Occurrences'] = rollup['p3Occurrences']
            row['qaJenkinsErrorScore'] = score_by_record.get(row['analyticsRecordKey'])
            row['qaJenkinsScoreState'] = 'scored' if row['qaJenkinsErrorScore'] is not None else 'unmapped-priority'
        else:
            row['qaPriorityCounts'] = {'p1': 0, 'p1Verification': 0, 'p2': 0, 'p3': 0, 'p2Occurrences': 0, 'p3Occurrences': 0, 'unmapped': 0}
            row['qaPriorityP1'] = 0
            row['qaPriorityP2Occurrences'] = 0
            row['qaPriorityP3Occurrences'] = 0
            row['qaJenkinsErrorScore'] = None
            row['qaJenkinsScoreState'] = 'no-report'
    scores = [score for score in score_by_record.values() if score is not None]
    counts = {'analyticsRecords': len(inventory), 'qaRows': len(qa_rows), 'matchedRows': matched_rows,
              'matchedAnalyticsRecords': len(matched_inventory), 'unmatchedAnalyticsRecords': len(inventory) - len(matched_inventory),
              'unmatchedQaRows': unmatched_qa, 'ambiguousQaRows': ambiguous_qa, 'totalRows': len(output),
              'scoreableAnalyticsRecords': len(scores), 'averageJenkinsErrorScore': round(sum(scores) / len(scores), 2) if scores else None,
              'p1Findings': sum(value['p1'] + value['p1Verification'] for value in score_rollups.values())}
    return {
        'analyticsId': analytics_id, 'qaId': qa_id,
        'mapping': {'analyticsField': analytics_field, 'qaField': qa_field, 'comparison': 'trimmed, case-insensitive exact match'},
        'reportSummary': report_summary,
        'runCounts': summary.get('counts', {}) if isinstance(summary.get('counts'), dict) else {},
        'counts': counts,
        'rows': output,
        'applyable': bool(matched_inventory),
    }


def dashboard_qa_merge():
    with db() as conn:
        row = conn.execute('SELECT id,analytics_id,qa_id,mapping,summary,overlay,created FROM applied_merges WHERE active=1 ORDER BY created DESC LIMIT 1').fetchone()
    if not row:
        return None
    return {'id': row['id'], 'analyticsId': row['analytics_id'], 'qaId': row['qa_id'],
            'mapping': json.loads(row['mapping']), 'summary': json.loads(row['summary']),
            'overlay': json.loads(row['overlay']), 'appliedAt': row['created']}


def dashboard_admin_state():
    with db() as conn:
        row = conn.execute('SELECT payload,updated FROM dashboard_admin_state WHERE id=1').fetchone()
    if not row:
        return None
    return {'state': json.loads(row['payload']), 'updated': row['updated']}


def canonical_inventory_payload():
    payload = json.loads((ROOT / 'inventory/data/portfolio_inventory.json').read_text(encoding='utf-8'))
    if not isinstance(payload.get('records'), list):
        raise ValueError('The canonical inventory does not contain a records list.')
    return payload


def public_inventory_scope():
    payload = canonical_inventory_payload()
    records = [record for record in payload['records']
               if str(record.get('publishType', '')).strip().casefold() == 'public'
               and str(record.get('publishStatus', '')).strip().casefold() == 'published']
    ids = {str(record.get('livelabsId', '')).strip() for record in records if str(record.get('livelabsId', '')).strip()}
    wms_ids = {str(record.get('wmsId', '')).strip() for record in records if str(record.get('wmsId', '')).strip()}
    titles = {' '.join(str(record.get('title', '')).split()).casefold() for record in records if str(record.get('title', '')).strip()}
    return payload, records, ids, wms_ids, titles


def enrich_dashboard_qa_overlay(item, policy=None):
    """Derive public Jenkins scores from the normalized finding rows at read time."""
    findings = item.get('findings') if isinstance(item.get('findings'), list) else []
    counts = {'p1': 0, 'p1Verification': 0, 'p2': 0, 'p3': 0,
              'p2Occurrences': 0, 'p3Occurrences': 0, 'internalQa': 0, 'unmapped': 0}
    for finding in findings:
        normalized = classify_qa_issue(finding)
        priority = normalized.get('priority')
        group = normalized.get('group')
        occurrence_count = max(0, int(normalized.get('count', 0) or 0))
        if group == 'author-facing' and priority == 'P1':
            counts['p1'] += 1
        elif group == 'verification-required' and priority == 'P1':
            counts['p1Verification'] += 1
        elif group == 'author-facing' and priority == 'P2':
            counts['p2'] += 1
            counts['p2Occurrences'] += occurrence_count
        elif group == 'author-facing' and priority == 'P3':
            counts['p3'] += 1
            counts['p3Occurrences'] += occurrence_count
        elif group == 'internal-qa':
            counts['internalQa'] += 1
        else:
            counts['unmapped'] += 1

    score_policy = policy if isinstance(policy, dict) else JENKINS_SCORE_POLICY
    weights = score_policy.get('weights') if isinstance(score_policy.get('weights'), dict) else JENKINS_SCORE_POLICY['weights']
    reference_burden = max(0.0, float(score_policy.get('referenceBurden', JENKINS_SCORE_POLICY['referenceBurden'])))
    burden = (float(weights.get('P2', 2)) * counts['p2Occurrences']
              + float(weights.get('P3', 1)) * counts['p3Occurrences'])
    score = round(100 * burden / (burden + reference_burden), 2) if counts['unmapped'] == 0 else None
    item['priorityCounts'] = counts
    item['p2Occurrences'] = counts['p2Occurrences']
    item['p3Occurrences'] = counts['p3Occurrences']
    item['jenkinsErrorScore'] = score
    item['scorePolicy'] = score_policy
    item['scoreState'] = 'scored' if score is not None else 'unmapped-priority'
    return item


def qa_report_runs():
    runs_root = QA_REPORTS_ROOT / 'runs'
    runs = []
    if runs_root.is_dir():
        for directory in runs_root.iterdir():
            if not directory.is_dir() or not SAFE_RUN_ID.fullmatch(directory.name):
                continue
            try:
                summary = json.loads((directory / 'summary.json').read_text(encoding='utf-8'))
            except (OSError, ValueError):
                continue
            if summary.get('runId') != directory.name:
                continue
            counts = summary.get('counts') if isinstance(summary.get('counts'), dict) else {}
            runs.append({
                'runId': directory.name,
                'runType': summary.get('runType', 'regression'),
                'status': summary.get('status', 'unknown'),
                'startedAt': summary.get('startedAt', ''),
                'endedAt': summary.get('endedAt', ''),
                'durationMs': summary.get('durationMs', 0),
                'total': counts.get('total', 0),
                'passed': counts.get('passed', 0),
                'failed': counts.get('unexpected', counts.get('failed', 0)),
                'skipped': counts.get('skipped', 0),
                'href': f'runs/{directory.name}/summary.html' if (directory / 'summary.html').is_file() else '',
                'source': 'local-archive'
            })
    if not runs:
        try:
            summary = json.loads((QA_REPORTS_ROOT / 'latest' / 'summary.json').read_text(encoding='utf-8'))
            run_id = str(summary.get('runId', ''))
            if SAFE_RUN_ID.fullmatch(run_id):
                counts = summary.get('counts') if isinstance(summary.get('counts'), dict) else {}
                runs.append({
                    'runId': run_id, 'runType': summary.get('runType', 'regression'),
                    'status': summary.get('status', 'unknown'), 'startedAt': summary.get('startedAt', ''),
                    'endedAt': summary.get('endedAt', ''), 'durationMs': summary.get('durationMs', 0),
                    'total': counts.get('total', 0), 'passed': counts.get('passed', 0),
                    'failed': counts.get('unexpected', counts.get('failed', 0)), 'skipped': counts.get('skipped', 0),
                    'href': f'runs/{run_id}/summary.html', 'source': 'local-archive'
                })
        except (OSError, ValueError):
            pass
    runs.sort(key=lambda run: (str(run.get('startedAt', '')), run['runId']), reverse=True)
    return runs


def parse_uploaded_xlsx(filename, encoded):
    name = str(filename or '').strip()
    if Path(name).suffix.lower() not in {'.xlsx', '.xlsm'}:
        raise ValueError('Choose an Excel workbook in .xlsx format.')
    if not isinstance(encoded, str) or not encoded:
        raise ValueError('The workbook upload is empty.')
    try:
        content = base64.b64decode(encoded, validate=True)
    except (ValueError, base64.binascii.Error):
        raise ValueError('The workbook upload could not be decoded.')
    if not content or len(content) > 20 * 1024 * 1024:
        raise ValueError('Excel workbooks must be 20 MB or smaller.')
    try:
        from openpyxl import load_workbook
        workbook = load_workbook(io.BytesIO(content), read_only=True, data_only=True)
        worksheet = next((sheet for sheet in workbook.worksheets if sheet.max_row and sheet.max_column), None)
        if worksheet is None:
            raise ValueError('The workbook has no populated worksheet.')
        header_row = None
        data_rows = []
        for values in worksheet.iter_rows(max_row=50002, max_col=202, values_only=True):
            if header_row is None:
                if any(value is not None and str(value).strip() for value in values):
                    header_row = values
                continue
            if not any(value is not None and str(value).strip() for value in values):
                continue
            data_rows.append(values)
            if len(data_rows) > 50000:
                raise ValueError('A worksheet can contain at most 50,000 data rows.')
        if header_row is None:
            raise ValueError('The workbook has no column headings.')
        headers = []
        seen = {}
        for index, value in enumerate(header_row):
            label = str(value).strip() if value is not None else ''
            label = label or f'Column {index + 1}'
            seen[label] = seen.get(label, 0) + 1
            headers.append(label if seen[label] == 1 else f'{label} ({seen[label]})')
        if len(headers) > 200:
            raise ValueError('A worksheet can contain at most 200 columns.')
        rows = []
        for values in data_rows:
            row = {}
            for index, header in enumerate(headers):
                value = values[index] if index < len(values) else None
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                elif value is not None and not isinstance(value, (str, int, float, bool)):
                    value = str(value)
                row[header] = value
            rows.append(row)
        workbook.close()
        if not rows:
            raise ValueError('The workbook has column headings but no data rows.')
        return {'sheet': worksheet.title, 'headers': headers, 'rows': rows, 'rowCount': len(rows)}
    except ValueError:
        raise
    except Exception as error:
        raise ValueError('The Excel workbook could not be read. Save it as .xlsx and try again.') from error


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Login requests and tokens are never logged.
        pass

    def send(self, status, body=b'', content_type='application/json', cookie=None, csp=None, disposition=None):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Content-Security-Policy', csp or "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
        session_expiry = getattr(self, 'session_idle_expires', None)
        if session_expiry is not None:
            self.send_header('X-Session-Expires', str(session_expiry))
        if cookie:
            self.send_header('Set-Cookie', cookie)
        if disposition:
            self.send_header('Content-Disposition', disposition)
        self.end_headers()
        self.wfile.write(body)

    def redirect(self):
        self.send_response(303)
        self.send_header('Location', '/admin')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def session(self):
        try:
            cookies = SimpleCookie(self.headers.get('Cookie', ''))
            raw = cookies.get('ll_admin')
            token = hashlib.sha256(raw.value.encode()).hexdigest() if raw else ''
        except Exception:
            return None
        now_ts = time.time()
        with db() as conn:
            conn.execute('DELETE FROM sessions WHERE expires <= ? OR (remembered=1 AND last_seen>0 AND last_seen<=?)',
                          (now_ts, now_ts - REMEMBER_IDLE_SECONDS))
            row = conn.execute('SELECT * FROM sessions WHERE token=? AND expires>?', (token, now_ts)).fetchone()
            if not row:
                return None
            session = dict(row)
            remembered = bool(session['remembered'])
            idle_seconds = REMEMBER_IDLE_SECONDS if remembered else SESSION_SECONDS
            last_seen = session['last_seen'] or now_ts
            if now_ts - last_seen >= idle_seconds:
                conn.execute('DELETE FROM sessions WHERE token=?', (token,))
                return None
            conn.execute('UPDATE sessions SET last_seen=? WHERE token=?', (now_ts, token))
        session['remembered'] = remembered
        session['idle_expires'] = min(session['expires'], now_ts + idle_seconds)
        self.session_idle_expires = session['idle_expires']
        return session

    def file(self, path):
        if not path.is_file():
            return self.send(404, {'error': 'Not found.'})
        mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        self.send(200, path.read_bytes(), mime + (';charset=utf-8' if mime.startswith('text/') else ''))

    def do_GET(self):
        if self.headers.get('Host') not in self.server.allowed_hosts:
            return self.send(403, {'error': 'Local host required.'})
        url = urlsplit(self.path)
        path = url.path
        entry_paths = ('/', '/index.html', '/dashboard', '/dashboard/', '/dashboard/index.html',
                       '/search', '/search/', '/search/index.html', '/inventory', '/inventory/', '/inventory/index.html')
        if path in entry_paths:
            query = parse_qs(url.query)
            has_value = lambda key: bool(query.get(key, [''])[0].strip())
            inventory_list = path in ('/inventory', '/inventory/', '/inventory/index.html') or query.get('view') == ['inventory']
            if inventory_list:
                self.send_response(302)
                self.send_header('Location', '/admin/inventory' + ('?' + url.query if url.query else ''))
                self.send_header('Cache-Control', 'no-store')
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            record_requested = has_value('livelabs_id') or has_value('content_key') or (has_value('wms_id') and not inventory_list)
            destination = '/search/' if record_requested else '/dashboard/'
            if path != destination:
                self.send_response(302)
                self.send_header('Location', destination + ('?' + url.query if url.query else ''))
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            entry = destination.strip('/') + '/index.html'
            return self.file(ROOT / entry)
        if path == '/api/dashboard-admin-state':
            saved = dashboard_admin_state()
            applied = dashboard_qa_merge()
            if not saved and not applied:
                return self.send(200, {'configured': False})
            _, public_records, public_ids, public_wms_ids, public_titles = public_inventory_scope()
            state = saved['state'] if saved else {'tagDefinitions': [], 'rowOverrides': []}
            raw_definitions = state.get('tagDefinitions') if isinstance(state, dict) else []
            definitions = [
                {'key': str(tag.get('key', ''))[:80], 'label': str(tag.get('label', ''))[:100],
                 'className': str(tag.get('className', ''))[:100],
                 'description': str(tag.get('description') or tag.get('note') or '')[:1000],
                 'color': str(tag.get('color', 'teal')) if str(tag.get('color', 'teal')) in TAG_COLORS else 'teal'}
                for tag in raw_definitions if isinstance(tag, dict)
            ] if isinstance(raw_definitions, list) else []
            allowed = {str(tag.get('key', '')) for tag in definitions if isinstance(tag, dict)}
            assignments = []
            overrides = state.get('rowOverrides', []) if isinstance(state, dict) else []
            for override in (overrides if isinstance(overrides, list) else []):
                if not isinstance(override, dict) or override.get('target') not in ('title', 'wms_id', 'livelabs_id'):
                    continue
                value = str(override.get('value', '')).strip()
                target = override.get('target')
                normalized_value = ' '.join(value.split()).casefold()
                if not ((target == 'livelabs_id' and value in public_ids)
                        or (target == 'wms_id' and value in public_wms_ids)
                        or (target == 'title' and normalized_value in public_titles)):
                    continue
                raw_tags = override.get('tags', [])
                tags = [str(tag) for tag in raw_tags if str(tag) in allowed] if isinstance(raw_tags, list) else []
                if value and tags:
                    assignment = {'enabled': override.get('enabled') is not False, 'id': str(override.get('id', '')),
                                  'status': 'pending', 'tagsOnly': True, 'target': override['target'],
                                  'value': value, 'tags': tags}
                    created_at = valid_timestamp(override.get('createdAt'))
                    if created_at:
                        assignment['createdAt'] = created_at
                    for field, limit in (('recordTitle', 500), ('livelabsId', 120), ('wmsId', 120)):
                        if override.get(field):
                            assignment[field] = str(override[field])[:limit]
                    assignments.append(assignment)
            public_merge = None
            if applied:
                source_summary = applied.get('summary') if isinstance(applied.get('summary'), dict) else {}
                score_policy = source_summary.get('scorePolicy') or JENKINS_SCORE_POLICY
                public_overlay = {}
                for item_id, raw_item in applied.get('overlay', {}).items():
                    public_id = str(item_id).strip()
                    if public_id not in public_ids or not isinstance(raw_item, dict):
                        continue
                    public_overlay[public_id] = enrich_dashboard_qa_overlay(dict(raw_item), score_policy)
                public_merge = {
                    'id': applied['id'], 'appliedAt': applied['appliedAt'],
                    'analyticsId': applied['analyticsId'], 'qaId': applied['qaId'],
                    'mapping': applied['mapping'],
                    'summary': {
                        'scorePolicy': source_summary.get('scorePolicy') or JENKINS_SCORE_POLICY,
                        'publicScope': {
                            'eligibleItems': len(public_records),
                            'matchedItems': len(public_overlay),
                            'unmatchedItems': max(0, len(public_records) - len(public_overlay)),
                            'coveragePercent': round(100 * len(public_overlay) / len(public_records), 1) if public_records else 0,
                        },
                    },
                    'overlay': public_overlay,
                }
            return self.send(200, {'configured': True, 'state': {'tagDefinitions': definitions, 'rowOverrides': assignments},
                                   'qaReportMerge': public_merge})
        if path == '/admin':
            if not self.session():
                return self.file(PRIVATE / 'login.html')
            self.send_response(302)
            self.send_header('Location', '/admin/dashboard-management')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        if path == '/admin/':
            self.send_response(302)
            self.send_header('Location', '/admin')
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        admin_pages = {
            '/admin/dashboard-management': 'dashboard-management.html',
            '/admin/data-merge': 'data-merge.html',
            '/admin/governance': 'panel.html',
            '/admin/inventory': 'inventory.html',
            '/admin/user-settings': 'user-settings.html'
        }
        page_path = path.rstrip('/') if path.startswith('/admin/') else path
        if page_path in admin_pages:
            if not self.session():
                return self.file(PRIVATE / 'login.html')
            return self.file(PRIVATE / admin_pages[page_path])
        if path in ('/admin-panel-login', '/admin-panel-login/', '/admin-panel', '/login.html', '/admin.html'):
            return self.redirect()
        if path.startswith('/api/admin/'):
            session = self.session()
            if not session:
                return self.send(401, {'error': 'Sign in required.'})
            try:
                if path == '/api/admin/session':
                    with db() as conn:
                        account = conn.execute('SELECT username FROM account WHERE id=1').fetchone()
                    return self.send(200, {'username': account['username'], 'csrf': session['csrf'],
                                           'expires': session['expires'], 'idleExpires': session['idle_expires'],
                                           'remembered': session['remembered']})
                if path == '/api/admin/inventory':
                    return self.send(200, canonical_inventory_payload())
                if path == '/api/admin/dashboard-state':
                    saved = dashboard_admin_state()
                    return self.send(200, saved or {'state': None, 'updated': None})
                if path == '/api/admin/jenkins/runs':
                    return self.send(200, {'source': 'local-archive', 'runs': qa_report_runs()})
                if path == '/api/admin/jenkins/run':
                    run_id = parse_qs(url.query).get('run_id', [''])[0]
                    if run_id == 'latest':
                        runs = qa_report_runs()
                        run_id = runs[0]['runId'] if runs else ''
                    if not SAFE_RUN_ID.fullmatch(run_id) or run_id in ('.', '..'):
                        return self.send(400, {'error': 'Choose a valid saved report run.'})
                    run_dir = (QA_REPORTS_ROOT / 'runs' / run_id).resolve()
                    target = (run_dir / 'summary.json').resolve()
                    if not target.is_relative_to(run_dir) or not target.is_file():
                        latest = (QA_REPORTS_ROOT / 'latest' / 'summary.json').resolve()
                        if not latest.is_relative_to((QA_REPORTS_ROOT / 'latest').resolve()) or not latest.is_file():
                            return self.send(404, {'error': 'Saved report run not found.'})
                        target = latest
                    summary = json.loads(target.read_text(encoding='utf-8'))
                    if summary.get('runId') != run_id:
                        return self.send(404, {'error': 'Saved report run not found.'})
                    return self.send(200, summary)
                if path == '/api/admin/snapshots':
                    with db() as conn:
                        rows = conn.execute('SELECT id,label,date,created,parent_id,source FROM snapshots ORDER BY created DESC').fetchall()
                    return self.send(200, [dict(row) for row in rows])
                if path == '/api/admin/qa-snapshots':
                    with db() as conn:
                        rows = conn.execute('SELECT id,label,run_id AS runId,created,parent_id AS parentId,source FROM qa_snapshots ORDER BY created DESC').fetchall()
                    return self.send(200, [dict(row) for row in rows])
                if path == '/api/admin/qa-snapshot':
                    return self.send(200, qa_snapshot_by_id(parse_qs(url.query).get('snapshot', [''])[0]))
                if path == '/api/admin/merges':
                    with db() as conn:
                        rows = conn.execute('SELECT id,analytics_id AS analyticsId,qa_id AS qaId,mapping,summary,created,active FROM applied_merges ORDER BY created DESC').fetchall()
                    return self.send(200, [{**dict(row), 'mapping': json.loads(row['mapping']), 'summary': json.loads(row['summary'])} for row in rows])
                if path == '/api/admin/reviews':
                    with db() as conn:
                        rows = conn.execute('SELECT * FROM reviews ORDER BY created DESC').fetchall()
                    return self.send(200, [dict(row) for row in rows])
                query = parse_qs(url.query)
                if path in ('/api/admin/merge-preview', '/api/admin/merge.csv'):
                    merged = merge_sources(query.get('analytics_id', [''])[0], query.get('qa_id', [''])[0],
                                           query.get('analytics_field', ['livelabsId'])[0],
                                           query.get('qa_field', ['livelabsId'])[0])
                    if path == '/api/admin/merge-preview':
                        result = {key: value for key, value in merged.items() if key != 'rows'}
                        result['rows'] = merged['rows'][:8]
                        return self.send(200, result)
                    columns = ['matchStatus', 'analyticsRecordKey', 'livelabsId', 'wmsId', 'analyticsTitle',
                               'analyticsPublishStatus', 'qaRunId', 'qaRunStatus', 'qaStartedAt', 'qaItemTitle',
                               'qaItemStatus', 'qaTestTitle', 'qaTestStatus', 'qaExpectedStatus', 'qaSection',
                               'qaClassification', 'qaIssueCodes', 'qaPrioritySummary', 'qaIssueCount',
                               'qaIssueOccurrences', 'qaIssueSummary', 'qaJenkinsErrorScore', 'qaJenkinsScoreState',
                               'qaPriorityCounts', 'qaPriorityP1', 'qaPriorityP2Occurrences', 'qaPriorityP3Occurrences',
                               'qaIssueDetails', 'qaTestCounts',
                               'qaReportPairing', 'candidateCount']
                    output = io.StringIO(newline='')
                    writer = csv.writer(output)
                    writer.writerow(columns)
                    for row in merged['rows']:
                        cells = []
                        for key in columns:
                            value = row.get(key, '')
                            if isinstance(value, (dict, list)):
                                value = json.dumps(value, ensure_ascii=False, separators=(',', ':'))
                            value = str(value)
                            cells.append("'" + value if value.startswith(('=', '+', '-', '@')) else value)
                        writer.writerow(cells)
                    return self.send(200, output.getvalue().encode('utf-8-sig'), 'text/csv;charset=utf-8',
                                     disposition='attachment; filename="livelabs-qa-merged.csv"')
                if path == '/api/admin/compare':
                    return self.send(200, compare_snapshots(snapshot_by_id(query.get('before', [''])[0]), snapshot_by_id(query.get('after', [''])[0])))
                payload = snapshot_by_id(query.get('snapshot', [''])[0])
                if path == '/api/admin/quality':
                    return self.send(200, {'provenance': provenance(payload), 'issues': quality_queue(payload)})
                if path == '/api/admin/snapshot':
                    return self.send(200, payload)
                return self.send(404, {'error': 'Unknown endpoint.'})
            except (ValueError, KeyError) as error:
                return self.send(400, {'error': str(error)})
        if path.startswith('/admin-assets/'):
            if not self.session():
                return self.send(401, {'error': 'Sign in required.'})
            name = path.removeprefix('/admin-assets/')
            if name not in ('panel.js', 'admin.css', 'dashboard-management.js', 'data-merge.js', 'inventory.js', 'inventory.css', 'user-settings.js'):
                return self.send(404, {'error': 'Not found.'})
            return self.file(PRIVATE / name)
        if path in ('/assets/admin-login.js', '/assets/admin-login.css'):
            return self.file(PRIVATE / ('login.js' if path.endswith('.js') else 'admin.css'))
        # Explicit public roots: never serve dev, git, runtime state or secrets.
        relative = 'index.html' if path == '/' else path.lstrip('/')
        target = (ROOT / relative).resolve()
        allowed = relative == 'index.html' or relative.startswith('assets/') or relative in ('inventory/data/public_portfolio_inventory.json', 'inventory/data/portfolio_inventory.file.js')
        if not allowed or not target.is_relative_to(ROOT) or any(part.startswith('.') for part in Path(relative).parts):
            return self.send(404, {'error': 'Not found.'})
        return self.file(target)

    def do_POST(self):
        if self.headers.get('Host') not in self.server.allowed_hosts:
            return self.send(403, {'error': 'Local host required.'})
        path = urlsplit(self.path).path
        expected_origin = self.server.public_origin or 'http://' + self.headers.get('Host', '')
        if self.headers.get('Origin') != expected_origin:
            return self.send(403, {'error': 'Same-origin request required.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            limit = 4096 if path == '/api/admin/login' else MAX_BODY
            if not 0 < length <= limit:
                return self.send(413, {'error': 'Request size exceeds limit.'})
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Expected a JSON object.')
        except (ValueError, UnicodeError):
            return self.send(400, {'error': 'Invalid JSON request.'})
        if path == '/api/admin/login':
            peer = self.client_address[0]
            with LOCK:
                attempts = [t for t in ATTEMPTS.get(peer, []) if t > time.time() - 300]
                if len(attempts) >= 5:
                    return self.send(429, {'error': 'Too many attempts. Try again in five minutes.'})
                ATTEMPTS[peer] = attempts + [time.time()]
            with db() as conn:
                account = conn.execute('SELECT * FROM account WHERE id=1').fetchone()
            if not account:
                return self.send(503, {'error': 'Admin credentials have not been configured. Run admin-server.py --configure.'})
            password = payload.get('password', '')
            username = payload.get('username')
            if not isinstance(username, str) or not isinstance(password, str):
                return self.send(400, {'error': 'Enter a username and password.'})
            username = username.strip()
            if not username or len(username) > MAX_USERNAME_LENGTH:
                return self.send(400, {'error': f'Username must contain 1–{MAX_USERNAME_LENGTH} characters.'})
            if len(password) < MIN_PASSWORD_LENGTH:
                return self.send(400, {'error': f'Password must contain at least {MIN_PASSWORD_LENGTH} characters.'})
            digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(account['salt']), ITERATIONS).hex()
            valid_user = hmac.compare_digest(username.encode(), account['username'].encode())
            if not valid_user or not hmac.compare_digest(digest, account['digest']):
                return self.send(401, {'error': 'Invalid username or password.'})
            token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            remembered = payload.get('remember') is True
            session_seconds = REMEMBER_SESSION_SECONDS if remembered else SESSION_SECONDS
            created = time.time()
            with db() as conn:
                conn.execute('INSERT INTO sessions(token,csrf,expires,remembered,last_seen) VALUES(?,?,?,?,?)',
                             (hashlib.sha256(token.encode()).hexdigest(), csrf, created + session_seconds, int(remembered), created))
            with LOCK:
                ATTEMPTS.pop(peer, None)
            secure = '; Secure' if self.server.public_origin else ''
            persistence = f'; Max-Age={session_seconds}' if remembered else ''
            return self.send(200, {'ok': True}, cookie=f'll_admin={token}; Path=/; HttpOnly; SameSite=Strict{persistence}{secure}')
        session = self.session()
        if not session:
            return self.send(401, {'error': 'Sign in required.'})
        if not hmac.compare_digest(self.headers.get('X-CSRF-Token', ''), session['csrf']):
            return self.send(403, {'error': 'Session request token required.'})
        try:
            if path == '/api/admin/parse-xlsx':
                return self.send(200, parse_uploaded_xlsx(payload.get('filename'), payload.get('contentBase64')))
            if path == '/api/admin/logout':
                with db() as conn:
                    conn.execute('DELETE FROM sessions WHERE token=?', (session['token'],))
                return self.send(200, {'ok': True}, cookie='ll_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
            if path == '/api/admin/password':
                if not isinstance(payload.get('password'), str) or len(payload['password']) < 14:
                    raise ValueError('Password must contain at least 14 characters.')
                with db() as conn:
                    username = conn.execute('SELECT username FROM account WHERE id=1').fetchone()['username']
                configure(username, payload['password'])
                return self.send(200, {'ok': True}, cookie='ll_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
            if path == '/api/admin/snapshots':
                action = payload.get('action', 'capture' if payload.get('captureCurrent') else 'upload')
                snapshot_id = str(payload.get('snapshotId', '')).strip()
                if action == 'delete':
                    with db() as conn:
                        exists = conn.execute('SELECT 1 FROM snapshots WHERE id=?', (snapshot_id,)).fetchone()
                        if not exists:
                            raise ValueError('Snapshot not found.')
                        referenced = conn.execute('SELECT 1 FROM reviews WHERE snapshot_id=? UNION ALL SELECT 1 FROM applied_merges WHERE analytics_id=? LIMIT 1', (snapshot_id, snapshot_id)).fetchone()
                        child = conn.execute('SELECT 1 FROM snapshots WHERE parent_id=? LIMIT 1', (snapshot_id,)).fetchone()
                        if referenced or child:
                            raise ValueError('This version is referenced by governance or merge history. Delete dependent history first.')
                        conn.execute('DELETE FROM snapshots WHERE id=?', (snapshot_id,))
                    return self.send(200, {'ok': True, 'deleted': snapshot_id})
                parent_id = None
                if action == 'capture' or payload.get('captureCurrent'):
                    snapshot = current_snapshot()
                    label = 'Current inventory capture'
                else:
                    snapshot = payload.get('snapshot')
                    label = str(payload.get('label', 'Imported snapshot'))
                    if action == 'version':
                        parent_id = str(payload.get('parentId', '')).strip()
                        with db() as conn:
                            if not conn.execute('SELECT 1 FROM snapshots WHERE id=?', (parent_id,)).fetchone():
                                raise ValueError('Choose an existing snapshot to create a version from.')
                if action not in ('capture', 'upload', 'version'):
                    raise ValueError('Unsupported Analytics snapshot action.')
                return self.send(201, store_snapshot(snapshot, label, parent_id, 'capture' if action == 'capture' else action))
            if path == '/api/admin/qa-snapshots':
                action = payload.get('action', 'upload')
                snapshot_id = str(payload.get('snapshotId', '')).strip()
                if action == 'delete':
                    with db() as conn:
                        exists = conn.execute('SELECT 1 FROM qa_snapshots WHERE id=?', (snapshot_id,)).fetchone()
                        if not exists:
                            raise ValueError('QA snapshot not found.')
                        referenced = conn.execute('SELECT 1 FROM applied_merges WHERE qa_id=? LIMIT 1', (snapshot_id,)).fetchone()
                        child = conn.execute('SELECT 1 FROM qa_snapshots WHERE parent_id=? LIMIT 1', (snapshot_id,)).fetchone()
                        if referenced or child:
                            raise ValueError('This version is referenced by merge history. Delete dependent history first.')
                        conn.execute('DELETE FROM qa_snapshots WHERE id=?', (snapshot_id,))
                    return self.send(200, {'ok': True, 'deleted': snapshot_id})
                summary = payload.get('summary')
                parent_id = None
                if action == 'version':
                    parent_id = str(payload.get('parentId', '')).strip()
                    with db() as conn:
                        if not conn.execute('SELECT 1 FROM qa_snapshots WHERE id=?', (parent_id,)).fetchone():
                            raise ValueError('Choose an existing QA snapshot to create a version from.')
                if action not in ('upload', 'version', 'archive-copy'):
                    raise ValueError('Unsupported QA report action.')
                source = 'local-archive' if action == 'archive-copy' else action
                return self.send(201, store_qa_snapshot(summary, str(payload.get('label', 'Imported Jenkins report')), parent_id, source))
            if path == '/api/admin/merges':
                action = payload.get('action', 'apply')
                if action == 'delete':
                    merge_id = str(payload.get('id', '')).strip()
                    with db() as conn:
                        row = conn.execute('SELECT id FROM applied_merges WHERE id=?', (merge_id,)).fetchone()
                        if not row:
                            raise ValueError('Applied merge history entry not found.')
                        conn.execute('DELETE FROM applied_merges WHERE id=?', (merge_id,))
                    return self.send(200, {'ok': True, 'deleted': merge_id})
                if action != 'apply':
                    raise ValueError('Unsupported merge history action.')
                merged = merge_sources(str(payload.get('analyticsId', '')), str(payload.get('qaId', '')),
                                       str(payload.get('analyticsField', 'livelabsId')),
                                       str(payload.get('qaField', 'livelabsId')))
                if not merged['applyable']:
                    raise ValueError('No unique QA-to-Analytics matches were found. Review the mapping and preview first.')
                overlay = {}
                for row in merged['rows']:
                    if row['matchStatus'] != 'matched' or not row['analyticsRecordKey'] or not row['livelabsId']:
                        continue
                    key = str(row['livelabsId'])
                    item = overlay.setdefault(key, {
                        'runId': row['qaRunId'], 'runStatus': row['qaRunStatus'], 'startedAt': row['qaStartedAt'],
                        'itemTitle': row['qaItemTitle'], 'itemStatus': row['qaItemStatus'], 'tests': [],
                        'testCounts': {'passed': 0, 'failed': 0, 'skipped': 0, 'other': 0},
                        'priorityCounts': {'p1': 0, 'p1Verification': 0, 'p2': 0, 'p3': 0, 'p2Occurrences': 0, 'p3Occurrences': 0, 'internalQa': 0, 'unmapped': 0},
                        'findingRows': 0, 'findingOccurrences': 0, 'findings': [],
                        'reportPairing': row['qaReportPairing'],
                    })
                    source_test_counts = row.get('qaTestCounts')
                    if isinstance(source_test_counts, dict) and source_test_counts:
                        passed = int(source_test_counts.get('passed', 0) or 0)
                        failed = int(source_test_counts.get('failed', 0) or 0)
                        skipped = int(source_test_counts.get('skipped', 0) or 0)
                        total = int(source_test_counts.get('total', passed + failed + skipped) or 0)
                        item['testCounts'] = {
                            'passed': max(0, passed), 'failed': max(0, failed), 'skipped': max(0, skipped),
                            'other': max(0, total - passed - failed - skipped),
                        }
                    issue_details = row.get('qaIssueDetails') if isinstance(row.get('qaIssueDetails'), list) else []
                    for issue in issue_details:
                        normalized = classify_qa_issue(issue)
                        bucket = normalized.get('group')
                        if bucket == 'author-facing' and normalized.get('priority') == 'P1':
                            item['priorityCounts']['p1'] += 1
                        elif bucket == 'verification-required' and normalized.get('priority') == 'P1':
                            item['priorityCounts']['p1Verification'] += 1
                        elif bucket == 'author-facing' and normalized.get('priority') == 'P2':
                            item['priorityCounts']['p2'] += 1
                            item['priorityCounts']['p2Occurrences'] += normalized.get('count', 0)
                        elif bucket == 'author-facing' and normalized.get('priority') == 'P3':
                            item['priorityCounts']['p3'] += 1
                            item['priorityCounts']['p3Occurrences'] += normalized.get('count', 0)
                        elif bucket == 'internal-qa':
                            item['priorityCounts']['internalQa'] += 1
                        else:
                            item['priorityCounts']['unmapped'] += 1
                        item['findingRows'] += 1
                        item['findingOccurrences'] += normalized.get('count', 0)
                        if len(item['findings']) < 5000:
                            item['findings'].append(normalized)
                    status = str(row['qaTestStatus'] or '').casefold()
                    if row['qaTestTitle'] or status:
                        if status in ('passed', 'pass'):
                            item['testCounts']['passed'] += 1
                        elif status in ('failed', 'fail', 'timedout', 'timed out', 'interrupted', 'unexpected'):
                            item['testCounts']['failed'] += 1
                        elif status == 'skipped':
                            item['testCounts']['skipped'] += 1
                        else:
                            item['testCounts']['other'] += 1
                        if len(item['tests']) < 50:
                            item['tests'].append({'title': str(row['qaTestTitle'])[:500], 'section': str(row['qaSection'])[:200],
                                                  'status': str(row['qaTestStatus'])[:80], 'expectedStatus': str(row['qaExpectedStatus'])[:80],
                                                  'classification': str(row['qaClassification'])[:160], 'issueCodes': str(row['qaIssueCodes'])[:1000]})
                if not overlay:
                    raise ValueError('The selected reports contain no matched LiveLabs IDs to apply to the dashboard.')
                for item in overlay.values():
                    counts = item['priorityCounts']
                    burden = (JENKINS_SCORE_POLICY['weights']['P2'] * counts['p2Occurrences']
                              + JENKINS_SCORE_POLICY['weights']['P3'] * counts['p3Occurrences'])
                    item['scorePolicy'] = JENKINS_SCORE_POLICY
                    item['jenkinsErrorScore'] = (
                        round(100 * burden / (burden + JENKINS_SCORE_POLICY['referenceBurden']), 2)
                        if counts['unmapped'] == 0 else None
                    )
                    item['scoreState'] = 'scored' if counts['unmapped'] == 0 else 'unmapped-priority'
                merge_id = secrets.token_hex(16)
                mapping = merged['mapping']
                summary = {**merged['counts'], 'matchedDashboardItems': len(overlay), 'scorePolicy': JENKINS_SCORE_POLICY}
                if merged['reportSummary']:
                    summary['report'] = {**merged['reportSummary'], 'runCounts': merged['runCounts']}
                created = now()
                with db() as conn:
                    conn.execute('UPDATE applied_merges SET active=0')
                    conn.execute('INSERT INTO applied_merges(id,analytics_id,qa_id,mapping,summary,overlay,created,active) VALUES(?,?,?,?,?,?,?,1)',
                                 (merge_id, merged['analyticsId'], merged['qaId'], json.dumps(mapping), json.dumps(summary), json.dumps(overlay, ensure_ascii=False), created))
                return self.send(201, {'ok': True, 'id': merge_id, 'summary': summary, 'appliedAt': created})
            if path == '/api/admin/dashboard-state':
                definitions = payload.get('tagDefinitions')
                overrides = payload.get('rowOverrides')
                if not isinstance(definitions, list) or len(definitions) > 200 or not isinstance(overrides, list) or len(overrides) > 10000:
                    raise ValueError('Provide at most 200 tag definitions and 10,000 tag assignments.')
                saved = dashboard_admin_state()
                previous_state = saved.get('state', {}) if saved else {}
                previous_definitions = previous_state.get('tagDefinitions', []) if isinstance(previous_state, dict) else []
                previous_by_key = {str(item.get('key', '')): item for item in previous_definitions if isinstance(item, dict)} if isinstance(previous_definitions, list) else {}
                previous_overrides = previous_state.get('rowOverrides', []) if isinstance(previous_state, dict) else []
                previous_assignments = {(str(item.get('target', '')), str(item.get('value', '')).strip().casefold()): item
                                        for item in previous_overrides if isinstance(item, dict)} if isinstance(previous_overrides, list) else {}
                clean_definitions = []
                seen = set()
                for definition in definitions:
                    if not isinstance(definition, dict):
                        continue
                    key = re.sub(r'[^a-z0-9-]', '-', str(definition.get('key', '')).strip().lower()).strip('-')[:80]
                    label = str(definition.get('label', '')).strip()[:100]
                    if not key:
                        raise ValueError('Each tag needs a title and description.')
                    description = str(definition.get('description') or definition.get('note') or '').strip()[:1000]
                    previous = previous_by_key.get(key)
                    previous_label = str(previous.get('label', '')).strip()[:100] if previous else ''
                    previous_description = str(previous.get('description') or previous.get('note') or '').strip()[:1000] if previous else ''
                    unchanged_legacy = previous is not None and label == previous_label and description == previous_description
                    if (not label or not description) and not unchanged_legacy:
                        raise ValueError('Each tag needs a title and description.')
                    if key in seen:
                        continue
                    seen.add(key)
                    color = str(definition.get('color', '')).strip().lower()
                    if color not in TAG_COLORS:
                        previous_color = str(previous.get('color', '')).strip().lower() if previous else ''
                        color = previous_color if previous_color in TAG_COLORS else 'teal'
                    clean_definitions.append({'key': key, 'label': label, 'description': description,
                                              'className': str(definition.get('className', ''))[:100], 'color': color})
                valid_keys = {definition['key'] for definition in clean_definitions}
                clean_overrides = []
                for override in overrides:
                    if not isinstance(override, dict) or override.get('target') not in ('title', 'wms_id', 'livelabs_id'):
                        continue
                    value = str(override.get('value', '')).strip()[:500]
                    raw_tags = override.get('tags')
                    tags = list(dict.fromkeys(str(tag) for tag in raw_tags if str(tag) in valid_keys)) if isinstance(raw_tags, list) else []
                    if not value or not tags:
                        continue
                    target = override['target']
                    previous = previous_assignments.get((target, value.casefold()))
                    created_at = valid_timestamp(previous.get('createdAt')) if previous else now()
                    clean_assignment = {'enabled': override.get('enabled') is not False,
                                        'id': str(override.get('id', secrets.token_hex(8)))[:120],
                                        'tags': tags, 'target': target, 'value': value}
                    if created_at:
                        clean_assignment['createdAt'] = created_at
                    for field, limit in (('recordTitle', 500), ('livelabsId', 120), ('wmsId', 120)):
                        field_value = str(override.get(field, '')).strip()[:limit]
                        if field_value:
                            clean_assignment[field] = field_value
                        elif previous and previous.get(field):
                            clean_assignment[field] = str(previous[field])[:limit]
                    clean_overrides.append(clean_assignment)
                state = {'tagDefinitions': clean_definitions, 'rowOverrides': clean_overrides}
                with db() as conn:
                    conn.execute('INSERT OR REPLACE INTO dashboard_admin_state(id,payload,updated) VALUES(1,?,?)',
                                 (json.dumps(state, ensure_ascii=False), now()))
                return self.send(200, {'ok': True, 'tagDefinitions': len(clean_definitions), 'assignments': len(clean_overrides)})
            if path == '/api/admin/reviews':
                decision = payload.get('decision')
                reason = str(payload.get('reason', '')).strip()
                key = str(payload.get('recordKey', ''))
                snapshot_id = str(payload.get('snapshotId', ''))
                snapshot = snapshot_by_id(snapshot_id)
                valid_keys = {identity(record) for record in snapshot['records']}
                candidate = str(payload.get('candidateKey', ''))
                if key not in valid_keys or candidate and (candidate not in valid_keys or candidate == key):
                    raise ValueError('Choose distinct existing record identities from the selected snapshot.')
                if decision not in ('Keep active', 'Refresh content', 'Investigate data', 'Replacement approved', 'Replacement rejected', 'Retirement proposed') or not reason or len(reason) > 4000:
                    raise ValueError('Choose a decision and provide a reason of 1–4,000 characters.')
                if decision in ('Replacement approved', 'Replacement rejected') and not candidate:
                    raise ValueError('Replacement decisions require a candidate identity.')
                with db() as conn:
                    reviewer = conn.execute('SELECT username FROM account WHERE id=1').fetchone()['username']
                    conn.execute('INSERT INTO reviews VALUES(?,?,?,?,?,?,?,?)', (secrets.token_hex(16), key, snapshot_id, candidate, decision, reason, reviewer, now()))
                return self.send(201, {'ok': True})
            return self.send(404, {'error': 'Unknown endpoint.'})
        except (ValueError, TypeError, KeyError) as error:
            return self.send(400, {'error': str(error)})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4176)
    parser.add_argument('--host', default='127.0.0.1', help='Bind address; remote binding requires --public-origin behind an HTTPS gateway')
    parser.add_argument('--public-origin', default=os.environ.get('LIVELABS_ADMIN_PUBLIC_ORIGIN'), help='Exact HTTPS origin presented by the trusted gateway, e.g. https://analytics.example.com')
    parser.add_argument('--configure', action='store_true')
    parser.add_argument('--initialize-local-account', action='store_true', help='Create a random initial password only when no account exists.')
    args = parser.parse_args()
    if args.public_origin:
        origin = urlsplit(args.public_origin)
        if origin.scheme != 'https' or not origin.netloc or origin.path or origin.query or origin.fragment or origin.username:
            raise ValueError('--public-origin must be an HTTPS origin without a path, query or credentials.')
    if args.host not in ('127.0.0.1', 'localhost') and not args.public_origin:
        raise ValueError('Remote binding requires an HTTPS public origin and a trusted gateway.')
    initialize()
    if args.initialize_local_account:
        with db() as conn:
            exists = conn.execute('SELECT 1 FROM account').fetchone()
        if exists:
            raise ValueError('An account already exists. Use --configure to change it.')
        password = secrets.token_urlsafe(24)
        configure('admin', password)
        credentials = STATE / 'initial-credentials.txt'
        credentials.write_text('Local LiveLabs Analytics admin\nUsername: admin\nPassword: ' + password + '\n\nChange this password in Account after signing in.\n', encoding='utf-8')
        print('Local account created. Initial credentials file: ' + str(credentials))
        return
    if args.configure:
        configure()
        print('Credentials configured; existing sessions revoked.')
        return
    with db() as conn:
        has_snapshots = conn.execute('SELECT 1 FROM snapshots LIMIT 1').fetchone() is not None
    if not has_snapshots:
        store_snapshot(current_snapshot(), 'Initial / current inventory capture')
    print(f'Local dashboard: http://127.0.0.1:{args.port}/', flush=True)
    print(f'Admin entry: http://127.0.0.1:{args.port}/admin', flush=True)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.public_origin = args.public_origin
    server.allowed_hosts = {f'127.0.0.1:{args.port}', f'localhost:{args.port}'}
    if args.public_origin:
        server.allowed_hosts.add(urlsplit(args.public_origin).netloc)
    server.serve_forever()


if __name__ == '__main__':
    main()
