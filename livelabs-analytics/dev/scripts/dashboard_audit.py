"""Explain table membership from the same functions used by the generators."""
from portfolio_diagnostics import diagnostics
from datetime import date
import importlib.util
from pathlib import Path
from dashboard_policy import eligible, published, read_policy
from review_rules import evaluate_records, DEFAULT_CRITERIA, TIER_LABELS, annual_views, percentile, cutoff, methodology_html
from datetime import datetime, timezone


def load_generator(name):
    spec = importlib.util.spec_from_file_location(name.replace('-', '_'), Path(__file__).with_name(name + '.py'))
    result = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(result)
    return result


def table_audit(payload, max_views=None, months=None):
    policy = read_policy()
    risk = load_generator('build-public-review-fragments')
    performance = load_generator('refresh-top-performers')
    risk.SNAPSHOT_DATE = date.fromisoformat(payload['metadata']['snapshot_date'])
    risk.RETIREMENT = policy['retirement']
    risk.REVIEW_CRITERIA = policy.get('reviewCriteria', DEFAULT_CRITERIA)
    maximum = policy['retirement']['maxViews12m'] if max_views is None else max_views
    age = policy['retirement']['olderThanMonths'] if months is None else months
    if not 0 <= maximum <= 1000000 or not 1 <= age <= 120:
        raise ValueError('Choose 0–1,000,000 views and 1–120 months.')
    records = [r for r in payload['records'] if eligible(r, policy)]
    reviews = evaluate_records(records, risk.SNAPSHOT_DATE, policy, datetime.now(timezone.utc).date())
    records = [{**r, 'review':reviews[str(r['key'])]} for r in records]
    counts = []
    for kind in ('Workshop', 'Sprint'):
        cohort = [r for r in records if r.get('type') == kind]
        rows = risk.review_metrics(records, kind)
        counts.append({'type': kind, 'published': sum(published(r) and r.get('type') == kind for r in payload['records']),
            'dashboard': len(cohort), 'performance': sum(len(performance.view_map(r)) == 2 for r in cohort),
            'risk': len(rows), 'retirement': sum(r['review']['queue']=='retirement' for r in rows),
            'lifecycle': sum(r['review']['queue']=='lifecycle' for r in rows),
            'evidenceQueue': sum(r['review']['queue']=='evidence' for r in rows),
            'strictGate': sum(risk.retirement_candidate(r) for r in rows),
            'strictGateIds': [r['record']['livelabsId'] for r in rows if risk.retirement_candidate(r)],
            'bands': {label:sum(r['review']['tier']==key for r in rows) for key,label in TIER_LABELS.items()},
            'retirementIds': [r['record']['livelabsId'] for r in rows if r['review']['queue']=='retirement'],
            'lifecycleIds': [r['record']['livelabsId'] for r in rows if r['review']['queue']=='lifecycle'],
            'previewRetirement': sum(risk.retirement_candidate(r, maximum, age) for r in rows),
            'missing12mViews': sum(r['views12m'] is None for r in rows),
            'lowViews': sum(r['views12m'] is not None and r['views12m'] <= policy['retirement']['maxViews12m'] for r in rows),
            'olderUpdates': sum(r['updated'] is not None and r['updated'] < risk.retirement_cutoff() for r in rows),
            'proxyUpdates': sum(r['review']['updateKind'] == 'proxy' for r in rows),
            'previewIds': [r['record']['livelabsId'] for r in rows if risk.retirement_candidate(r, maximum, age)],
            'bottom20Old': sum(r['review']['demandPercentile'] is not None and r['review']['demandPercentile']<=20 and r['updated'] is not None and r['updated']<cutoff(risk.SNAPSHOT_DATE,12) for r in rows)})
    return {'snapshotDate': str(risk.SNAPSHOT_DATE), 'policyRevision': policy['revision'],
        'criteria': policy['retirement'], 'preview': {'maxViews12m': maximum, 'olderThanMonths': age},
        'counts': counts, 'rankingLimit': None,
        'calibration': diagnostics({'metadata': {**payload['metadata'], 'review_criteria': risk.REVIEW_CRITERIA}, 'records': records}),
        'methodologyHtml':methodology_html(risk.REVIEW_CRITERIA, risk.SNAPSHOT_DATE, datetime.now(timezone.utc).date()),
        'reviewCriteria':risk.REVIEW_CRITERIA,
        'note': 'Preview is a raw demand/date gate, not the complete retirement queue; it does not change policy. Lifecycle, evidence and Admin decisions apply separately. Missing views are unknown, not zero.'}
