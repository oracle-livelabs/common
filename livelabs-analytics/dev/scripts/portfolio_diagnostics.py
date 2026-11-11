"""Read-only calibration and evidence diagnostics; never changes policy."""
import argparse
from collections import Counter
from datetime import date
import json
from pathlib import Path
from review_rules import DEFAULT_CRITERIA, annual_views, fields, numeric, parse_date


def diagnostics(payload, as_of=None):
    records = payload['records']
    metadata = payload['metadata']
    as_of = as_of or date.today()
    snapshot = parse_date(metadata.get('snapshot_date'))
    types = []
    criteria = metadata.get('review_criteria', DEFAULT_CRITERIA)
    for kind in ('Workshop', 'Sprint'):
        cohort = [r for r in records if r.get('type') == kind]
        demand = [v for r in cohort if (v := annual_views(r)) is not None]
        configured = criteria['types'][kind]
        thresholds = sorted({100, 250, 500, 1000, configured['strictViews'], configured['broadViews'], configured['riskViews']})
        types.append({'type': kind, 'records': len(cohort), 'annualDemandKnown': len(demand),
            'annualDemandUnknown': len(cohort) - len(demand), 'configuredThresholds': configured,
            'reviewedDecisions': sum(r.get('review', {}).get('reviewState', 'unreviewed') != 'unreviewed' for r in cohort),
            'sensitivity': [{'annualViewsAtMost': limit, 'count': sum(v <= limit for v in demand),
                'percentOfKnownDemand': round(100 * sum(v <= limit for v in demand) / len(demand), 2) if demand else None} for limit in thresholds]})
    # Report semantic conflicts; do not infer growth until source period definitions are confirmed.
    windows = [('Views - Last 7 Days', 'Views - Last 14 Days'), ('Views - Last 14 Days', 'Views - Last 30 Days'),
               ('Views - Last 30 Days', 'Views - Last 90 Days'), ('Views - Last 90 Days', 'Views - Last 12 Months')]
    comparisons = []
    for short, long in windows:
        checked, conflicts = 0, 0
        for row in records:
            values = dict(row.get('values', []))
            left, right = numeric(values.get(short)), numeric(values.get(long))
            if left is not None and right is not None:
                checked += 1
                conflicts += left > right
        comparisons.append({'shorter': short, 'longer': long, 'comparableRecords': checked, 'nonNestedRecords': conflicts})
    return {'schemaVersion': 1, 'snapshotDate': str(snapshot) if snapshot else None, 'evaluatedOn': str(as_of),
        'snapshotAgeDays': (as_of - snapshot).days if snapshot else None,
        'sourceDates': metadata.get('data_freshness', {}), 'policyStatus': 'provisional; calibration requires reviewed outcomes',
        'types': types, 'windowChecks': comparisons, 'trendsEnabled': False,
        'windowInterpretation': 'Non-nested periods need source definitions before trend calculations; this alone does not prove corrupt counts.',
        'metricAttribution': dict(Counter(r.get('sourceFlags', {}).get('dashboard_metric_scope', 'unavailable') for r in records)),
        'readiness': dict(Counter(r.get('review', {}).get('readiness', 'not-evaluated') for r in records)),
        'queues': dict(Counter(r.get('review', {}).get('queue', 'not-evaluated') for r in records))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    result = diagnostics(json.loads(args.inventory.read_text(encoding='utf-8')))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'snapshotDate': result['snapshotDate'], 'readiness': result['readiness'], 'output': str(args.output)}))


if __name__ == '__main__':
    main()
