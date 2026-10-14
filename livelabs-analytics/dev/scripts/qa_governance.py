"""Deterministic Jenkins CSV reconciliation and versioned QA burden scoring.

An error score is not a check-failure percentage. Unknown evidence stays unknown.
This module has no network calls and never changes publication/lifecycle state.
"""
from __future__ import annotations
import csv
import hashlib
import json
import math
import re
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

REQUIRED = {'run_id', 'started_at', 'item_type', 'item_id', 'item_title', 'item_status',
            'issue_count', 'issue_code', 'severity', 'issue_summary', 'test_section'}

def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()

def clean(value):
    return '' if value is None else str(value).strip()

def sanitized(value):
    text = clean(value)
    text = re.sub(r'(/p/)[^/\s?]+', r'\1[REDACTED]', text, flags=re.I)
    return re.sub(r'([?&](?:token|access_token|password|secret|signature|sig|credential|key)=)[^&\s]+', r'\1[REDACTED]', text, flags=re.I)

def csv_safe(value):
    value = clean(value)
    return "'" + value if value.lstrip().startswith(('=', '+', '-', '@')) else value

def write_csv(path, rows, fields=None):
    fields = fields or list(rows[0] if rows else {})
    with Path(path).open('w', encoding='utf-8-sig', newline='') as f:
        w = csv.DictWriter(f, fieldnames=fields, extrasaction='ignore')
        w.writeheader()
        for row in rows:
            w.writerow({k: csv_safe(json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v) for k, v in row.items()})

def read_results(path):
    with Path(path).open(encoding='utf-8-sig', newline='') as f:
        reader = csv.DictReader(f)
        if not REQUIRED <= set(reader.fieldnames or []):
            raise ValueError('Missing Jenkins columns: ' + ', '.join(sorted(REQUIRED - set(reader.fieldnames or []))))
        rows = list(reader)
    if not rows:
        raise ValueError('Jenkins CSV is empty.')
    if len({r['run_id'] for r in rows}) != 1 or not rows[0]['run_id']:
        raise ValueError('One non-empty run_id is required. Never mix runs.')
    if len({r['started_at'] for r in rows}) != 1:
        raise ValueError('Inconsistent run timestamps.')
    for row in rows:
        if None in row or any(row.get(key) is None for key in REQUIRED) or not re.fullmatch(r'\d+', row['issue_count'] or ''):
            raise ValueError('Malformed CSV row or invalid issue_count.')
        if not row['item_id'] or not row['item_type']:
            raise ValueError('Missing Jenkins identity.')
    return rows

def timestamp(value):
    parsed = datetime.fromisoformat(value.replace('Z', '+00:00'))
    return parsed.replace(tzinfo=timezone.utc) if parsed.tzinfo is None else parsed

def occurrence_count(code, message):
    # Only report-supported patterns; counts of scanned pages are not defect counts.
    patterns = {
        'WRITING_GRAMMAR': r'(\d+) source issues? found',
        'POSSIBLE_TYPO': r'(\d+) source issues? found',
        'BROKEN_VISIBLE_IMAGE': r'(\d+) broken visible images?',
        'BROKEN_VISIBLE_LINK': r'(\d+) broken visible links?',
        'STALE_PAR_LINK': r'(\d+) definitively broken PAR link',
        'MARKDOWN_FORMATTING': r'(\d+) Markdown formatting problem',
    }
    match = re.search(patterns.get(code, r'(?!)'), message, flags=re.I)
    return (max(1, int(match[1])), 'explicit_report_count') if match else (1, 'one_reported_finding')

def normalize_findings(rows, policy):
    groups = {}
    for line, row in rows:
        code = clean(row['issue_code']).upper()
        if not code:
            continue
        message = sanitized(row['issue_summary'])
        severity = clean(row['severity']).lower()
        norm = re.sub(r'\s+', ' ', message).strip().casefold()
        identity = code if code in policy['root_cause_codes'] else code + '\x1f' + norm
        finding = groups.setdefault(identity, {'id': hashlib.sha256(identity.encode()).hexdigest()[:16],
            'code': code, 'severity': severity, 'message': message, 'source_rows': [], 'test_sections': [],
            'severity_conflict': False})
        if finding['severity'] != severity:
            finding['severity_conflict'] = True
        finding['source_rows'].append(line)
        if row['test_section'] not in finding['test_sections']:
            finding['test_sections'].append(sanitized(row['test_section']))
    for f in groups.values():
        f['kind'] = 'evidence_gap' if f['code'] in policy['evidence_gap_codes'] else 'content' if f['code'] in policy['content_codes'] else 'unknown'
        f['occurrences'], f['count_basis'] = occurrence_count(f['code'], f['message'])
        f['weight'] = policy['severity_weights'].get(f['severity'])
        f['weighted_burden'] = (f['weight'] or 0) * f['occurrences'] if f['kind'] == 'content' else 0
    return list(groups.values())

def error_score(burden, half_score=20):
    if not math.isfinite(burden) or burden < 0 or half_score <= 0:
        raise ValueError('Invalid score input.')
    return round(100 * burden / (burden + half_score), 2)

def validate_policy(policy):
    for key in ('burden_half_score', 'max_run_age_days', 'max_snapshot_lag_days'):
        if not isinstance(policy.get(key), (int, float)) or not math.isfinite(policy[key]) or policy[key] <= 0:
            raise ValueError('Invalid policy: ' + key)
    if not 0 <= policy.get('retirement_influence', -1) <= 1:
        raise ValueError('Invalid retirement influence')
    if not policy.get('severity_weights') or any(not isinstance(w, (int, float)) or not math.isfinite(w) or w < 0 for w in policy['severity_weights'].values()):
        raise ValueError('Invalid severity weights')
    if set(policy['content_codes']) & set(policy['evidence_gap_codes']):
        raise ValueError('Content and evidence-gap codes must be disjoint')
    return policy

def score_item(rows, policy):
    findings = normalize_findings(rows, policy)
    counts = Counter()
    for f in findings:
        if f['kind'] == 'content':
            counts[f['severity']] += f['occurrences']
    unknown = any(f['kind'] == 'unknown' or f['weight'] is None or f['severity_conflict'] for f in findings)
    statuses = {r['item_status'].lower() for _, r in rows}
    unique_source = {tuple(sorted(r.items())) for _, r in rows}
    declared = {int(r['issue_count']) for _, r in rows}
    source_issues = sum(bool(dict(r)['issue_code']) for r in unique_source)
    inconsistent = len(statuses) != 1 or not statuses <= {'passed','failed','skipped','blocked','timedout','interrupted'} or len(declared) != 1 or declared != {source_issues}
    if statuses == {'passed'} and (findings or declared != {0}):
        inconsistent = True
    gaps = sum(f['kind'] == 'evidence_gap' for f in findings)
    burden = sum(f['weighted_burden'] for f in findings)
    observed = None if unknown or inconsistent else error_score(burden, policy['burden_half_score']) if burden else 0.0 if statuses == {'passed'} else None
    state = ('invalid_evidence' if unknown or inconsistent else 'reported_pass' if statuses == {'passed'} else
             'partial_evidence' if gaps else 'findings' if burden else 'unverified')
    return {'state': state, 'observed_error_score': observed, 'weighted_burden': burden,
            'finding_count': sum(f['kind'] == 'content' for f in findings),
            'occurrence_count': sum(counts.values()), 'severity_counts': dict(counts),
            'evidence_gap_count': gaps, 'unknown_findings': unknown, 'inconsistent_summary': inconsistent,
            'findings': findings, 'source_row_count': len(rows), 'status': ', '.join(sorted(statuses)),
            'completeness': 'unverified_legacy_csv'}

def reconcile(payload, rows, policy, as_of, mode='pilot', run_manifest=None, csv_sha=None):
    validate_policy(policy)
    records = payload['records']
    by_id = {}
    for record in records:
        ident = clean(record.get('livelabsId'))
        if ident:
            if ident in by_id:
                raise ValueError('Duplicate Analytics LiveLabs ID: ' + ident)
            by_id[ident] = record
    groups = defaultdict(list)
    id_types = defaultdict(set)
    for line, row in enumerate(rows, 2):
        typ, ident = row['item_type'].lower(), row['item_id']
        groups[(typ, ident)].append((line, row))
        if typ in {'workshop', 'sprint'}:
            id_types[ident].add(typ)
    run_id, started_at = rows[0]['run_id'], rows[0]['started_at']
    run_time = timestamp(started_at)
    snapshot = timestamp(payload['metadata']['snapshot_date'])
    asof = timestamp(as_of)
    reasons = []
    if snapshot.date() < run_time.date(): reasons.append('Analytics snapshot predates Jenkins run')
    if (snapshot.date() - run_time.date()).days > policy['max_snapshot_lag_days']: reasons.append('Snapshot/run skew exceeds policy')
    if (asof.date() - run_time.date()).days > policy['max_run_age_days']: reasons.append('Jenkins evidence is stale')
    if run_time.date() > asof.date() or snapshot.date() > asof.date(): reasons.append('Future source date')
    manifest_ok = bool(run_manifest and run_manifest.get('run_id') == run_id and run_manifest.get('complete') is True
                       and run_manifest.get('csv_sha256') == csv_sha and run_manifest.get('ended_at'))
    if not manifest_ok: reasons.append('Completed run manifest with matching CSV hash is missing')
    synced_at = payload['metadata'].get('sources_synced_at')
    if not synced_at:
        reasons.append('Precise Analytics source-sync timestamp is missing')
    elif timestamp(synced_at).date() != snapshot.date() or timestamp(synced_at).date() > asof.date():
        reasons.append('Analytics source-sync timestamp does not match the snapshot date')
    if manifest_ok:
        if not all(clean(run_manifest.get(k)) for k in ('source_revision','environment','catalog_snapshot_id')) or not (clean(run_manifest.get('build_url')) or clean(run_manifest.get('build_id'))):
            reasons.append('Run provenance requires build, source revision, environment and catalog snapshot identity')
        if timestamp(run_manifest['ended_at']) < run_time or timestamp(run_manifest['ended_at']).date() > asof.date():
            reasons.append('Invalid run completion time')
        if snapshot.date() < timestamp(run_manifest['ended_at']).date(): reasons.append('Analytics snapshot predates run completion')
        if synced_at and timestamp(synced_at) < timestamp(run_manifest['ended_at']):
            reasons.append('Analytics sources were synchronized before run completion')
    if mode == 'strict' and reasons:
        raise ValueError('Strict promotion gates failed: ' + '; '.join(reasons))
    reconciliation = []
    attached = set()
    for (typ, ident), group in sorted(groups.items()):
        score = score_item(group, policy)
        record = by_id.get(ident) if typ in {'workshop', 'sprint'} else None
        match = ('unsupported_type' if typ not in {'workshop', 'sprint'} else 'ambiguous_jenkins_type' if len(id_types[ident]) > 1
                 else 'unmatched' if record is None else 'type_conflict' if record.get('type', '').lower() != typ else 'matched')
        qa = {**score, 'match_status': match, 'jenkins_type': typ, 'analytics_type': record.get('type') if record else None,
              'item_id': ident, 'item_title': sanitized(group[0][1]['item_title']), 'run_id': run_id, 'started_at': started_at,
              'policy_version': policy['version'], 'mode': mode, 'freshness_warnings': reasons}
        contract = (run_manifest or {}).get('items', {}).get(typ + ':' + ident, {})
        complete = (manifest_ok and all(type(contract.get(k)) is int and contract[k]>=0 for k in ('expected_checks','completed_checks','blocked_checks','skipped_checks')) and contract['expected_checks'] > 0
                    and contract.get('completed_checks') == contract['expected_checks']
                    and contract.get('blocked_checks', 0) == 0 and contract.get('skipped_checks', 0) == 0
                    and score['evidence_gap_count'] == 0)
        if complete: qa['completeness'] = 'verified_manifest'
        qa['ranking_applicable'] = match == 'matched' and qa['state'] not in {'invalid_evidence', 'unverified'} and qa['observed_error_score'] is not None and (mode == 'pilot' or complete)
        qa['ranking_error_score'] = qa['observed_error_score'] if qa['ranking_applicable'] else None
        qa['owner_action'] = ('Verify identity/type and rerun correct route' if match != 'matched' else
                              'Review invalid evidence' if qa['state'] == 'invalid_evidence' else
                              'Repair content findings; retest and complete missing checks' if qa['finding_count'] else
                              'Resolve access/scan gaps and rerun' if qa['evidence_gap_count'] else
                              'Confirm declared check completeness; no findings reported')
        reconciliation.append(qa)
        if record is not None:
            record['qa'] = qa
            attached.add(ident)
    for record in records:
        if clean(record.get('livelabsId')) not in attached:
            record['qa'] = {'state': 'not_observed', 'match_status': 'not_observed', 'observed_error_score': None,
                            'ranking_error_score': None, 'ranking_applicable': False, 'policy_version': policy['version'],
                            'mode': mode, 'findings': [], 'severity_counts': {}, 'completeness': 'not_observed',
                            'owner_action': 'Select this content in a correctly routed QA run'}
        pairs = qa_pairs(record['qa'])
        for field in ['values', 'details']:
            record[field] = [p for p in record.get(field, []) if not p[0].startswith('QA ')] + pairs
    if mode == 'strict':
        selected = {typ + ':' + ident for typ, ident in groups if typ in {'workshop', 'sprint'}}
        declared_items = set((run_manifest or {}).get('items', {}))
        if not selected or selected != declared_items:
            raise ValueError('Strict manifest item population does not match exported Workshop/Sprint population')
        if any(q['jenkins_type'] in {'workshop','sprint'} and not q['ranking_applicable'] for q in reconciliation):
            raise ValueError('Strict item gates failed: identity, evidence validity or declared check completeness')
    return reconciliation, {'run_id': run_id, 'started_at': started_at, 'snapshot_date': payload['metadata']['snapshot_date'],
                            'policy_version': policy['version'], 'mode': mode, 'promotion_ready': not reasons and mode == 'strict',
                            'promotion_gaps': reasons, 'match_counts': dict(Counter(q['match_status'] for q in reconciliation))}

def qa_pairs(qa):
    qa = {'state':'not_observed', 'match_status':'not_observed', 'policy_version':'Not recorded', **qa}
    counts = qa.get('severity_counts', {})
    return [
        ['QA Error Score', qa.get('observed_error_score') if qa.get('observed_error_score') is not None else 'Unknown'],
        ['QA Evidence State', qa.get('match_status') if qa.get('match_status') != 'matched' else qa.get('state')],
        ['QA Score Applies To Ranking', 'Yes — ' + qa.get('mode', '') if qa.get('ranking_applicable') else 'No'],
        ['QA Findings', qa.get('finding_count', 'Unknown')], ['QA Reported Occurrences', qa.get('occurrence_count', 'Unknown')],
        ['QA Severity Counts', ', '.join(f'{s}: {counts.get(s,0)}' for s in ('blocker','critical','major','minor')) if qa.get('state') != 'not_observed' else 'Unknown'],
        ['QA Weighted Burden', qa.get('weighted_burden', 'Unknown')], ['QA Evidence Gaps', qa.get('evidence_gap_count', 'Unknown')],
        ['QA Completeness', qa.get('completeness')], ['QA Run ID', qa.get('run_id', 'Not observed')],
        ['QA Run Started', qa.get('started_at', 'Not observed')], ['QA Policy', qa['policy_version']],
        ['QA Owner Action', qa.get('owner_action')], ['QA Source Type', qa.get('jenkins_type', 'Unknown')],
        ['QA Findings Detail', ' | '.join(f"{f['code']} [{f['severity']}; {f['occurrences']} occurrence(s)]: {f['message']}" for f in qa.get('findings', [])) or ('No QA evidence for this item' if qa.get('state') == 'not_observed' else 'No findings in supplied evidence')],
    ]

def adjusted_score(baseline, qa, kind, policy):
    if baseline is None: return None
    error = qa.get('ranking_error_score') if qa else None
    if error is None: return round(baseline, 2)
    quality = 1 - error / 100
    if kind in {'top', 'replacement'}: return round(baseline * quality, 2)
    influence = policy['retirement_influence'] if kind == 'retire' else 1
    return round(baseline + (100 - baseline) * influence * error / 100, 2)
