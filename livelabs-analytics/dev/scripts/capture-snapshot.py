"""Capture canonical inputs and independently computed current demand rankings."""
import importlib.util
import hashlib
import json
import sys
from datetime import date
from pathlib import Path
from admin_data import provenance, validate_snapshot
from dashboard_policy import read_policy, eligible as dashboard_eligible
from review_rules import evaluate_records
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[2]


def capture(path=None):
    payload = validate_snapshot(json.loads((path or ROOT / 'inventory/data/portfolio_inventory.json').read_text(encoding='utf-8')))
    module_spec = importlib.util.spec_from_file_location('rank_policy', ROOT / 'dev/scripts/refresh-top-performers.py')
    policy = importlib.util.module_from_spec(module_spec)
    module_spec.loader.exec_module(policy)
    expected_formula = 'Weighted mean: 45% annual demand percentile, 35% 90-day demand percentile, 20% trusted freshness; omit unknown freshness and reweight available inputs.'
    if policy.FORMULA != expected_formula:
        raise ValueError('Ranking policy changed; update the capture calculation before producing comparable ranking bundles.')
    version = 'top-performers-v2-' + hashlib.sha256((ROOT / 'dev/scripts/refresh-top-performers.py').read_bytes() + (ROOT/'dev/scripts/review_rules.py').read_bytes()).hexdigest()[:12]
    snapshot_date = date.fromisoformat(payload['metadata']['snapshot_date'])
    visibility = read_policy()
    current = [r for r in payload['records'] if dashboard_eligible(r, visibility)]
    reviewed = evaluate_records(current, snapshot_date, visibility, datetime.now(timezone.utc).date())
    current = [{**r, 'review':reviewed[str(r['key'])]} for r in current]
    rankings = {}
    for content_type in ('Workshop', 'Sprint'):
        eligible = [r for r in current if r.get('type') == content_type and all(field in policy.view_map(r) for field in ('recent_views_12m', 'recent_views_90d'))]
        twelve = [policy.view_map(r)['recent_views_12m'] for r in eligible]
        ninety = [policy.view_map(r)['recent_views_90d'] for r in eligible]
        rows = []
        for record in eligible:
            v12 = policy.view_map(record)['recent_views_12m']
            v90 = policy.view_map(record)['recent_views_90d']
            fresh = policy.freshness_score(record, snapshot_date)
            p12, p90 = policy.percentile(v12, twelve), policy.percentile(v90, ninety)
            score = policy.baseline_score(p12, p90, fresh)
            denominator = 1 if fresh is not None else .8
            fields = dict(record.get('values', []) + record.get('details', []))
            update_source = next((key for key in ('Last Meaningful Workshop Update', 'Latest Workshop Commit Date', 'Latest GitHub Update', 'Latest Repository Update Proxy', 'WMS Last Update') if policy.parse_date(fields.get(key))), 'record update')
            rows.append({'key': 'livelabs:' + str(record['livelabsId']), 'title': record['title'], 'score': score,
                         'views12m': v12, 'views90d': v90, 'percentile12m': p12, 'percentile90d': p90,
                         'weighted12m': round(.45*p12/denominator,4), 'weighted90d': round(.35*p90/denominator,4), 'weightedFreshness': round(.20*fresh,4) if fresh is not None else None,
                         'freshness': fresh, 'updateSource': record['review']['updateEvidence'], 'eligibleCount': len(eligible)})
        rows.sort(key=lambda r: (-r['score'], r['title'].lower(), r['key'].split(':', 1)[1]))
        for rank, row in enumerate(rows, 1):
            row['rank'] = rank
        rankings['Top Performers ' + content_type] = {'algorithmVersion': version, 'formula': expected_formula, 'rows': rows}
    payload['rankings'] = rankings
    payload['capture'] = {'input': provenance({k:v for k,v in payload.items() if k != 'rankings'}), 'visibilityPolicyRevision':visibility['revision'], 'rankingScope':'Governed public/published dashboard cohort; full source records retained separately', 'historicalQueues': 'Use the shared review evaluator to regenerate tiered review fragments; this capture contains demand rankings only.'}
    return payload


if __name__ == '__main__':
    output = Path(sys.argv[1]) if len(sys.argv) > 1 else ROOT / 'dev/snapshots/current.json'
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(capture(), ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    print('Captured snapshot bundle: ' + str(output))
