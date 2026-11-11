"""Source-backed administration views; no edits to canonical records or scores."""
import hashlib
import json
import math
from collections import Counter
from datetime import datetime, timezone

WINDOWS = [('7 Days', 'views7d'), ('14 Days', 'views14d'), ('30 Days', 'views30d'),
           ('90 Days', 'views90d'), ('180 Days', 'views180d'), ('12 Months', 'views12m')]


def pairs(record):
    return dict(record.get('values', []) + record.get('details', []))


def identity(record):
    # LiveLabs identifies a record. WMS identifies a family, never a single sibling.
    return 'livelabs:' + str(record['livelabsId']) if record.get('livelabsId') else str(record.get('key', ''))


def validate_snapshot(payload):
    if not isinstance(payload, dict) or not isinstance(payload.get('records'), list):
        raise ValueError('Upload a canonical portfolio JSON or a captured snapshot bundle with records.')
    records = payload['records']
    if not records or len(records) > 20000:
        raise ValueError('A snapshot must contain 1–20,000 records.')
    ids = set()
    for record in records:
        if not isinstance(record, dict) or not identity(record) or not isinstance(record.get('title'), str):
            raise ValueError('Every record needs a stable key and a title.')
        key = identity(record)
        if key in ids:
            raise ValueError('Duplicate record identity: ' + key)
        ids.add(key)
        if not isinstance(record.get('sourceFlags', {}), dict):
            raise ValueError('Invalid source flags in ' + key)
        for field in ('values', 'details'):
            if not isinstance(record.get(field, []), list) or any(not isinstance(p, list) or len(p) != 2 or not isinstance(p[0], str) for p in record.get(field, [])):
                raise ValueError('Invalid field pairs in ' + key)
            if any(isinstance(p[1], (dict, list)) or isinstance(p[1], float) and not math.isfinite(p[1]) for p in record.get(field, [])):
                raise ValueError('Field values must be finite scalar values in ' + key)
    rankings = payload.get('rankings', {})
    if not isinstance(rankings, dict):
        raise ValueError('Invalid rankings object.')
    for queue in rankings.values():
        if not isinstance(queue, dict) or not isinstance(queue.get('algorithmVersion'), str) or not isinstance(queue.get('rows'), list):
            raise ValueError('Ranking bundles require an algorithm version and rows.')
        seen = set()
        for row in queue['rows']:
            if not isinstance(row, dict) or row.get('key') not in ids or row['key'] in seen:
                raise ValueError('Ranking rows must refer to unique existing record identities.')
            seen.add(row['key'])
            if not isinstance(row.get('rank'), int) or row['rank'] < 1 or not isinstance(row.get('score'), (int, float)) or not math.isfinite(row['score']):
                raise ValueError('Ranking rows require positive ranks and finite scores.')
    metadata = payload.get('metadata', {})
    if not isinstance(metadata, dict) or not metadata.get('snapshot_date'):
        raise ValueError('metadata.snapshot_date is required.')
    try:
        datetime.strptime(metadata['snapshot_date'], '%Y-%m-%d')
    except (ValueError, TypeError):
        raise ValueError('Snapshot date must be YYYY-MM-DD.')
    return payload


def provenance(payload):
    canonical = json.dumps(payload, sort_keys=True, separators=(',', ':'), ensure_ascii=False).encode()
    records = payload['records']
    return {
        'snapshotId': hashlib.sha256(canonical).hexdigest(),
        'snapshotDate': payload.get('metadata', {}).get('snapshot_date'),
        'generatedAt': payload.get('metadata', {}).get('generated_at'),
        'recordCount': len(records),
        'stableLiveLabsIds': sum(bool(r.get('livelabsId')) for r in records),
        'types': dict(Counter(r.get('type', 'N/A') for r in records)),
        'sources': payload.get('metadata', {}).get('data_freshness', {}),
        'governanceRefreshRequired': payload.get('metadata', {}).get('data_freshness', {}).get('governance_evidence_refresh_required', True),
    }


def metric(record, label, property_name):
    value = pairs(record).get('Views - Last ' + label, record.get(property_name))
    if value is None or str(value).strip() in ('', 'N/A'):
        return None
    try:
        return float(str(value).replace(',', ''))
    except (TypeError, ValueError):
        return None


def quality_queue(payload):
    issues = []
    def add(record, category, reason):
        issues.append({'key': identity(record), 'title': record['title'], 'livelabsId': record.get('livelabsId'),
                       'wmsId': record.get('wmsId'), 'category': category, 'reason': reason,
                       'snapshotDate': payload['metadata']['snapshot_date']})
    for record in payload['records']:
        fields = pairs(record)
        if not record.get('publishType') or record.get('publishType') in ('Missing', 'N/A'):
            add(record, 'Unresolved publish type', 'Current authoritative publish type is unavailable; Published does not imply Public.')
        scope = str(fields.get('Dashboard Metric Scope', ''))
        resolution = str(fields.get('Dashboard Metric Status', ''))
        if 'ambiguous' in scope + resolution or 'shared' in scope + resolution:
            add(record, 'Ambiguous / shared traffic', fields.get('Dashboard Metric Resolution') or 'Traffic is not attributable to a unique content ID.')
        evidence = fields.get('Update Evidence', '')
        flags = record.get('sourceFlags', {})
        if not flags.get('github_update_evidence_available'):
            add(record, 'Missing repository update evidence', evidence or 'No current workshop-specific or repository update evidence.')
        values = [(label, metric(record, label, field)) for label, field in WINDOWS]
        present = [(label, value) for label, value in values if value is not None]
        violations = [f'{a[0]} ({a[1]:g}) > {b[0]} ({b[1]:g})' for a, b in zip(present, present[1:]) if a[1] > b[1]]
        if violations:
            add(record, 'Inconsistent periods — verify definitions', '; '.join(violations) + '. This is an anomaly only if windows are cumulative and share an end date; source definitions require confirmation.')
    return issues


def compare_snapshots(before, after):
    if before['metadata']['snapshot_date'] > after['metadata']['snapshot_date']:
        raise ValueError('Earlier snapshot must not have a later reporting date.')
    left = {identity(r): r for r in before['records']}
    right = {identity(r): r for r in after['records']}
    changes = []
    def add(key, field, old, new, explanation):
        record = right.get(key, left.get(key))
        changes.append({'key': key, 'title': record['title'], 'field': field,
                        'before': old if old is not None and old != '' else 'N/A',
                        'after': new if new is not None and new != '' else 'N/A', 'explanation': explanation})
    for key in sorted(left.keys() | right.keys()):
        if key not in left:
            add(key, 'Record added', None, right[key]['title'], 'Record identity appears in the newer snapshot.'); continue
        if key not in right:
            add(key, 'Record removed', left[key]['title'], None, 'Absent from newer snapshot; absence alone does not establish retirement.'); continue
        a, b = left[key], right[key]
        for field in ('title', 'owner', 'publishStatus', 'publishType', 'type'):
            if a.get(field) != b.get(field):
                add(key, field, a.get(field), b.get(field), 'Source field changed; review its authoritative source before acting.')
        for field in ('Dashboard Metric Scope', 'Dashboard Metric Status'):
            old, new = pairs(a).get(field), pairs(b).get(field)
            if old != new:
                add(key, field, old, new, 'Metric attribution or availability changed; compare coverage before interpreting demand.')
        for label, prop in WINDOWS:
            old, new = metric(a, label, prop), metric(b, label, prop)
            if (old is None) != (new is None):
                add(key, 'Metric coverage: ' + label, 'Unavailable' if old is None else 'Available', 'Unavailable' if new is None else 'Available', 'Missing data is not zero traffic.')
    # Only compare computed ranks when both captured bundles contain the same policy.
    ranks_a, ranks_b = before.get('rankings', {}), after.get('rankings', {})
    for queue in sorted(ranks_a.keys() | ranks_b.keys()):
        old_queue, new_queue = ranks_a.get(queue, {}), ranks_b.get(queue, {})
        if not old_queue or not new_queue or old_queue.get('algorithmVersion') != new_queue.get('algorithmVersion'):
            continue
        old_rows = {row['key']: row for row in old_queue.get('rows', [])}
        new_rows = {row['key']: row for row in new_queue.get('rows', [])}
        for key in sorted((old_rows.keys() | new_rows.keys()) & (left.keys() | right.keys())):
            old, new = old_rows.get(key, {}), new_rows.get(key, {})
            if old.get('rank') != new.get('rank') or old.get('score') != new.get('score'):
                add(key, queue + ' rank / score', f"{old.get('rank', 'Unranked')} / {old.get('score', 'N/A')}", f"{new.get('rank', 'Unranked')} / {new.get('score', 'N/A')}",
                    'Demand inputs, update evidence, eligibility, or cohort composition changed. Inspect score contributions; rank movement alone does not prove improved quality.')
                for field in ('views12m', 'views90d', 'percentile12m', 'percentile90d', 'freshness', 'eligibleCount', 'updateSource'):
                    if old.get(field) != new.get(field):
                        add(key, queue + ': ' + field, old.get(field), new.get(field), 'Changed ranking input or cohort context.')
    return {'before': provenance(before), 'after': provenance(after), 'changes': changes,
            'summary': dict(Counter(change['field'] for change in changes)),
            'rankNotice': 'Rank movement requires captured bundles with matching algorithm versions. Plain inventory JSON does not establish historical calculated rankings.'}
