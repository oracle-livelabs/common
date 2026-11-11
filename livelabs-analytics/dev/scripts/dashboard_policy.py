"""Shared, exact-record dashboard eligibility and Admin visibility publishing."""
import argparse
from datetime import date, datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import threading
import uuid
from review_rules import DEFAULT_CRITERIA, REVIEW_STATES, evaluate_records, parse_date

ROOT = Path(__file__).resolve().parents[2]
POLICY_PATH = ROOT / 'dev/config/dashboard-policy.json'
POLICY_LOCK = threading.Lock()
CLASSIFICATIONS = ('learner_content', 'test_content', 'internal_training', 'needs_review')
TEST_SIGNAL = re.compile(r'\b(test|testing|dummy|sample|sandbox|qa)\b|do not (use|publish)', re.I)
EMAIL = re.compile(r'[a-z0-9._%+\-]+@[a-z0-9.\-]+\.[a-z]{2,}', re.I)


def record_key(record):
    item_id = str(record.get('livelabsId') or '').strip()
    return 'livelabs:' + item_id if item_id else str(record.get('key') or '').strip()


def read_policy(path=POLICY_PATH):
    policy = json.loads(Path(path).read_text(encoding='utf-8'))
    if policy.get('schemaVersion') != 1 or not isinstance(policy.get('decisions'), dict):
        raise ValueError('Dashboard visibility policy is missing or invalid.')
    for decision in policy['decisions'].values():
        if decision.get('classification') not in CLASSIFICATIONS:
            raise ValueError('Invalid content classification.')
    criteria = policy.get('reviewCriteria', DEFAULT_CRITERIA)
    if not isinstance(criteria.get('graceMonths'), int) or not 1 <= criteria['graceMonths'] <= 24:
        raise ValueError('Invalid new-content grace period.')
    for kind in ('Workshop', 'Sprint'):
        c = criteria['types'][kind]
        if not all(isinstance(c.get(k), (int, float)) and not isinstance(c[k], bool) for k in ('strictViews','broadViews','riskViews')) or not 0 <= c['strictViews'] <= c['broadViews'] <= c['riskViews'] <= 1000000:
            raise ValueError('Invalid demand tiers.')
        if not all(isinstance(c.get(k), int) for k in ('oldMonths','watchMonths')) or not 1 <= c['watchMonths'] <= c['oldMonths'] <= 120:
            raise ValueError('Invalid age tiers.')
    for decision in policy.get('reviewDecisions', {}).values():
        if decision.get('state') not in REVIEW_STATES:
            raise ValueError('Invalid retirement review state.')
    return policy


def published(record):
    return str(record.get('publishType', '')).strip().lower() == 'public' and str(record.get('publishStatus', '')).strip().lower() == 'published'


def eligible(record, policy):
    decision = policy['decisions'].get(record_key(record), {})
    return published(record) and decision.get('classification') not in ('test_content', 'internal_training')


def contact_emails(record):
    fields = [str(record.get('owner') or '')]
    fields += [str(pair[1]) for pair in record.get('details', []) if isinstance(pair, list) and len(pair) >= 2
               and any(word in str(pair[0]).lower() for word in ('author', 'owner', 'manager', 'support', 'contact', 'workshop team', 'acknowledg'))]
    return set(EMAIL.findall(' '.join(fields).lower()))


def admin_inventory(payload):
    policy = read_policy()
    reviews = evaluate_records(payload['records'], date.fromisoformat(payload['metadata']['snapshot_date']), policy, datetime.now(timezone.utc).date())
    # Public records keep the same comparison population as the dashboard.
    reviews.update(evaluate_records([r for r in payload['records'] if eligible(r, policy)], date.fromisoformat(payload['metadata']['snapshot_date']), policy, datetime.now(timezone.utc).date()))
    roster_path = ROOT / '.private/admin/team-roster.json'
    roster = json.loads(roster_path.read_text(encoding='utf-8')) if roster_path.exists() else {'members': [], 'channels': []}
    members = {row['email'].lower(): row for row in roster.get('members', [])}
    result = {**payload, 'records': []}
    for record in payload['records']:
        decision = policy['decisions'].get(record_key(record), {})
        matches = sorted(contact_emails(record) & members.keys())
        signal = bool(TEST_SIGNAL.search(str(record.get('title') or '')))
        review = reviews[str(record['key'])]
        cleanup_queues = []
        if 'delete_requested' in review['reasonCodes']: cleanup_queues.append('Removal requests')
        if review['queue'] == 'evidence': cleanup_queues.append('Evidence needed')
        if not published(record): cleanup_queues.append('Unpublished or non-public')
        if review['reviewState'] == 'confirmed_obsolete': cleanup_queues.append('Obsolete or replacement review')
        if review['reviewState'] == 'approved_retirement' and not review['sourceRetirementConfirmed']: cleanup_queues.append('Approved; awaiting WMS confirmation')
        if review['sourceRetirementConfirmed']: cleanup_queues.append('Source-confirmed retirement')
        if record.get('ownerMissing'): cleanup_queues.append('Contact assignment')
        result['records'].append({**record, 'review': review, 'cleanupQueues': cleanup_queues,
            'retirementDecision': policy.get('reviewDecisions', {}).get(record_key(record), {}), 'dashboardGovernance': {
            'recordKey': record_key(record), 'classification': decision.get('classification', 'unreviewed'),
            'visible': eligible(record, policy), 'reason': decision.get('reason', ''),
            'updatedAt': decision.get('updatedAt'), 'updatedBy': decision.get('updatedBy'),
            'teamEmails': matches, 'testTitleSignal': signal,
            'reviewNeeded': decision.get('classification') == 'needs_review' or (signal and not decision),
        }})
    result['dashboardPolicy'] = policy
    result['teamRoster'] = roster
    return result


def publish_policy(policy):
    """Stage every derived output, then replace; restore prior bytes on failure."""
    source = ROOT / 'inventory/data/portfolio_inventory.json'
    source_hash = hashlib.sha256(source.read_bytes()).hexdigest()
    state = ROOT / '.private/admin'
    state.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='policy-build-', dir=state) as temp:
        stage = Path(temp)
        proposed = stage / 'dashboard-policy.json'
        proposed.write_text(json.dumps(policy, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
        public = stage / 'public_portfolio_inventory.json'
        commands = [
            ['node', str(ROOT/'dev/scripts/build-public-inventory.mjs'), '--source', str(source), '--output', str(public), '--policy', str(proposed)],
            [sys.executable, str(ROOT/'dev/scripts/refresh-top-performers.py'), '--inventory', str(public), '--output', str(stage/'top-performers.html')],
            [sys.executable, str(ROOT/'dev/scripts/build-public-review-fragments.py'), '--inventory', str(public), '--output-dir', str(stage), '--policy', str(proposed)],
            [sys.executable, str(ROOT/'dev/scripts/build-author-reports.py'), '--inventory', str(public), '--output', str(stage/'score-baselines.json')],
        ]
        for command in commands:
            completed = subprocess.run(command, cwd=ROOT, capture_output=True, text=True)
            if completed.returncode:
                raise ValueError('Could not build the reviewed dashboard outputs. No visibility changes were applied.')
        (stage/'portfolio_inventory.file.js').write_text('/* Generated from public_portfolio_inventory.json. Do not edit directly. */\n'
            + 'globalThis.__livelabsPortfolioInventoryPayload = ' + public.read_text(encoding='utf-8').strip() + ';\n', encoding='utf-8')
        if hashlib.sha256(source.read_bytes()).hexdigest() != source_hash:
            raise ValueError('Inventory changed during review; reload before saving.')
        targets = [(stage/name, ROOT/'inventory/data'/name) for name in ('public_portfolio_inventory.json', 'portfolio_inventory.file.js')]
        targets += [(stage/name, ROOT/'assets/fragments'/name) for name in ('top-performers.html', 'at-risk-content.html', 'retire-now-content.html')]
        targets += [(proposed, POLICY_PATH)]
        (ROOT/'assets/data').mkdir(exist_ok=True)
        targets += [(stage/'score-baselines.json', ROOT/'assets/data/score-baselines.json')]
        previous = {target: target.read_bytes() if target.exists() else None for _, target in targets}
        history = state/'content-policy-history'
        history.mkdir(exist_ok=True)
        audit_path = history/(datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + uuid.uuid4().hex + '.json')
        try:
            for staged, target in targets:
                os.replace(staged, target)
            audit_path.write_text(json.dumps({'sourceSha256': source_hash,
                'previous': json.loads(previous[POLICY_PATH]) if previous[POLICY_PATH] else None,
                'current': policy}, indent=2, ensure_ascii=False), encoding='utf-8')
        except Exception:
            for target, content in previous.items():
                if content is not None:
                    target.write_bytes(content)
            raise
    return {'revision': policy['revision'], 'visibleRecords': len(json.loads((ROOT/'inventory/data/public_portfolio_inventory.json').read_text(encoding='utf-8'))['records'])}


def save_decision(payload, source, actor):
    key = str(payload.get('recordKey') or '')
    if key not in {record_key(row) for row in source['records']}:
        raise ValueError('Choose an existing individual record.')
    classification = payload.get('classification')
    reason = str(payload.get('reason') or '').strip()
    if classification not in CLASSIFICATIONS or not 5 <= len(reason) <= 1000:
        raise ValueError('Choose a classification and enter a reason of 5–1000 characters.')
    with POLICY_LOCK:
        policy = read_policy()
        if payload.get('revision') != policy['revision']:
            raise ValueError('Visibility policy changed. Reload the inventory before saving.')
        policy['revision'] += 1
        policy['decisions'][key] = {'classification': classification, 'reason': reason,
            'updatedAt': datetime.now(timezone.utc).isoformat(), 'updatedBy': actor}
        return publish_policy(policy)


def save_review_decision(payload, source, actor):
    key = str(payload.get('recordKey') or '')
    if key not in {record_key(row) for row in source['records']}:
        raise ValueError('Choose an existing individual record.')
    state = payload.get('state')
    reason = str(payload.get('reason') or '').strip()
    evidence = str(payload.get('evidence') or '').strip()
    if state not in REVIEW_STATES or not 5 <= len(reason) <= 1000 or len(evidence) > 2000:
        raise ValueError('Choose a review state and enter a reason of 5–1000 characters.')
    if state in ('confirmed_obsolete', 'approved_retirement') and len(evidence) < 5:
        raise ValueError('Record the supporting evidence for an obsolete-content or retirement decision.')
    snapshot = date.fromisoformat(source['metadata']['snapshot_date'])
    dates = {}
    for field in ('firstPublishedDate','contentUpdatedDate','keepUntil'):
        value = str(payload.get(field) or '').strip()
        parsed = parse_date(value)
        if value and (not parsed or parsed.isoformat() != value):
            raise ValueError('Use valid YYYY-MM-DD dates.')
        if parsed and field != 'keepUntil' and parsed > snapshot:
            raise ValueError('Verified source dates must be on or before this source snapshot; refresh it for newer evidence.')
        dates[field] = value or None
    if (dates['firstPublishedDate'] or dates['contentUpdatedDate']) and len(evidence) < 5:
        raise ValueError('Record the evidence used to verify the content dates.')
    if state == 'keep_active' and (not dates['keepUntil'] or parse_date(dates['keepUntil']) <= datetime.now(timezone.utc).date()):
        raise ValueError('Keep-active exceptions require a future expiry date.')
    with POLICY_LOCK:
        policy = read_policy()
        if payload.get('revision') != policy['revision']:
            raise ValueError('Review policy changed. Reload before saving.')
        policy['revision'] += 1
        policy.setdefault('reviewDecisions', {})[key] = {'state':state, 'reason':reason, 'evidence':evidence,
            **dates, 'updatedAt':datetime.now(timezone.utc).isoformat(), 'updatedBy':actor}
        return publish_policy(policy)


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--source', type=Path, default=ROOT/'inventory/data/portfolio_inventory.json')
    parser.add_argument('--policy', type=Path, default=POLICY_PATH)
    parser.add_argument('--reviews', action='store_true')
    args = parser.parse_args()
    policy = read_policy(args.policy)
    payload = json.loads(args.source.read_text(encoding='utf-8'))
    records = [r for r in payload['records'] if eligible(r, policy)]
    result = {'keys': [str(r['key']) for r in records], 'revision':policy['revision'],
        'retirement':policy.get('retirement', {'maxViews12m':250,'olderThanMonths':12}),
        'reviewCriteria':policy.get('reviewCriteria', DEFAULT_CRITERIA)}
    if args.reviews:
        today = datetime.now(timezone.utc).date()
        result.update(reviewEvaluationDate=today.isoformat(), reviews=evaluate_records(records, date.fromisoformat(payload['metadata']['snapshot_date']), policy, today))
    print(json.dumps(result))
