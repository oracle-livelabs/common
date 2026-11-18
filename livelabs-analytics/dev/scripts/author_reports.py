"""Exact-identity author evidence and explainable baseline score projections."""
import copy
import hashlib
import importlib.util
import json
import re
from datetime import date
from pathlib import Path
from urllib.parse import urlsplit, parse_qsl

ROOT = Path(__file__).resolve().parents[2]
URL_FIELDS = {'href', 'url', 'pageUrl', 'sourceFileUrl', 'catalogUrl', 'finalUrl', 'actionUrl'}
TEXT_FIELDS = {'text', 'label', 'location', 'labTitle', 'labNumber', 'section', 'sourceLine', 'status', 'marker', 'suggestion', 'message', 'title', 'detail', 'actionLabel', 'sourceText', 'sourceLabel', 'alt',
               'instruction', 'searchText', 'objectName', 'host', 'region', 'namespace', 'bucket', 'httpStatus', 'method', 'attempts', 'checkedAt', 'error'}
DETAIL_ALIASES = {'src': 'url', 'page_url': 'pageUrl', 'source_file_url': 'sourceFileUrl', 'lab_number': 'labNumber',
                  'sourceExcerpt': 'sourceText', 'masked_url': 'maskedUrl', 'object_name': 'objectName',
                  'http_status': 'httpStatus', 'checked_at': 'checkedAt'}
TOKEN_KEY = re.compile(r'token|signature|credential|authorization|secret|password|^sig$|^key$|^code$', re.I)


def safe_url(value):
    if not isinstance(value, str) or len(value) > 2000: return ''
    try:
        url = urlsplit(value.strip())
        if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password: return ''
        if re.search(r'/p/[^/]+/n/', url.path, re.I): return ''
        if any(TOKEN_KEY.search(key) for key, _ in parse_qsl(url.query)): return ''
        if url.fragment and TOKEN_KEY.search(url.fragment): return ''
        return value.strip()
    except ValueError: return ''


def clean_text(value):
    if not isinstance(value, (str, int, float)): return ''
    text = str(value)[:12000]
    return re.sub(r'(?:https?://|javascript:)[^\s<>"\']+', lambda m: safe_url(m[0]) or masked_par_url(m[0]) or '[restricted link]', text, flags=re.I)


def masked_par_url(value):
    """Keep a useful display-only object path without exporting a bearer token."""
    if not isinstance(value, str) or len(value) > 2000: return ''
    try:
        url = urlsplit(value.strip())
        if url.scheme not in ('http', 'https') or not url.hostname or url.username or url.password: return ''
        if not re.search(r'/p/[^/]+/n/', url.path, re.I): return ''
        return url._replace(path=re.sub(r'/p/[^/]+/n/', '/p/***/n/', url.path, flags=re.I), query='', fragment='').geturl()
    except ValueError: return ''


def normalize_target(item, *, nested=False):
    detail = {}
    for raw_key, value in item.items():
        key = DETAIL_ALIASES.get(raw_key, raw_key)
        if key in URL_FIELDS: value = safe_url(value)
        elif key in TEXT_FIELDS: value = clean_text(value)
        elif key == 'maskedUrl': value = masked_par_url(value)
        elif key == 'fingerprint': value = value if isinstance(value, str) and re.fullmatch(r'[a-f0-9]{16,64}', value, re.I) else ''
        else: continue
        if value != '' and key not in detail: detail[key] = value
    for key in ('labNumber', 'sourceLine'):
        if detail.get(key) == '0': detail.pop(key)
    if not nested and isinstance(item.get('sources'), list):
        sources = [normalize_target(source, nested=True) for source in item['sources'] if isinstance(source, dict)]
        detail['sources'] = [source for index, source in enumerate(sources) if source and source not in sources[:index]]
        if not detail['sources']: detail.pop('sources')
    return detail


def normalize_evidence(issue):
    source = issue.get('authorEvidence') or issue
    result = {key: clean_text(source.get(key)) for key in ('problem', 'reproduction', 'action', 'location') if source.get(key)}
    location = source.get('location')
    if isinstance(location, dict):
        result['location'] = ' · '.join(clean_text(location.get(key)) for key in ('label', 'detail') if location.get(key))
        result['locationUrl'] = safe_url(location.get('url'))
        result['locationAction'] = clean_text(location.get('actionLabel'))
    elif source.get('locationUrl'):
        result['locationUrl'] = safe_url(source['locationUrl'])
        result['locationAction'] = clean_text(source.get('locationAction'))
    details = []
    # Reconcile the author projection with raw targets inside this exact check.
    # Keep raw source URLs/lines; merge only when a unique target identity agrees.
    for value in (source.get('affectedItems'), source.get('details')):
        if isinstance(value, dict):
            value = [item for group in value.values() if isinstance(group, list) for item in group]
        if not isinstance(value, list): continue
        for item in value:
            if not isinstance(item, dict): continue
            detail = normalize_target(item)
            def same_target(existing):
                if existing.get('fingerprint') and detail.get('fingerprint'):
                    return existing['fingerprint'] == detail['fingerprint']
                if existing.get('sources') and detail.get('sources') and existing['sources'] != detail['sources']: return False
                for key in ('sourceFileUrl', 'pageUrl', 'sourceLine', 'location', 'section', 'marker', 'suggestion'):
                    if existing.get(key) and detail.get(key) and existing[key] != detail[key]: return False
                left_text = existing.get('sourceText') or existing.get('text') or existing.get('label')
                right_text = detail.get('sourceText') or detail.get('text') or detail.get('label')
                if left_text and left_text == right_text:
                    return existing.get('sourceLine') == detail.get('sourceLine') and existing.get('location') == detail.get('location')
                left_url = existing.get('href') or existing.get('url')
                right_url = detail.get('href') or detail.get('url')
                return bool(left_url and left_url == right_url and (not right_text or left_text == right_text))
            matches = [existing for existing in details if same_target(existing)]
            if detail and len(matches) == 1:
                for key, val in detail.items():
                    if key == 'sources' and key in matches[0]:
                        matches[0][key].extend(source for source in val if source not in matches[0][key])
                    else: matches[0].setdefault(key, val)
            elif detail and detail not in details: details.append(detail)
    if details: result['details'] = details
    return result


def finding_key(item_id, issue):
    return json.dumps([str(item_id), *(str(issue.get(key, '')) for key in ('code', 'section', 'file', 'line'))], separators=(',', ':'))


def build_evidence(raw):
    entries, ambiguous = {}, set()
    for item in raw.get('items', []):
        for issue in item.get('issues', []):
            key = finding_key(item.get('livelabsId'), issue)
            if key in entries: ambiguous.add(key)
            entries[key] = normalize_evidence(issue)
    return {'schemaVersion': 1, 'runId': raw.get('run', {}).get('id'),
            'entries': {key: val for key, val in entries.items() if key not in ambiguous}, 'ambiguousCount': len(ambiguous)}


def enrich_merge(merge, sidecar, eligible_ids):
    result = copy.deepcopy(merge)
    result['overlay'] = {str(key): val for key, val in result.get('overlay', {}).items() if str(key) in eligible_ids}
    for item_id, overlay in result['overlay'].items():
        for issue in overlay.get('findings', []):
            for key in ('message', 'label', 'section', 'file'):
                if key in issue: issue[key] = clean_text(issue[key])
            for key in ('catalogUrl', 'finalUrl'):
                if key in issue: issue[key] = safe_url(issue[key])
            if issue.get('authorEvidence'):
                issue['authorEvidence'] = normalize_evidence(issue)
        if not sidecar.get('runId') or overlay.get('runId') != sidecar['runId']: continue
        for issue in overlay.get('findings', []):
            evidence = sidecar.get('entries', {}).get(finding_key(item_id, issue))
            if evidence: issue['authorEvidence'] = normalize_evidence({'authorEvidence': evidence})
    return result


def load_evidence(path):
    try: return json.loads(path.read_text(encoding='utf-8'))
    except (OSError, ValueError): return {}


def score_baselines(public):
    def module(name, filename):
        spec = importlib.util.spec_from_file_location(name, Path(__file__).with_name(filename))
        result = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(result)
        return result
    top = module('author_top', 'refresh-top-performers.py')
    risk = module('author_risk', 'build-public-review-fragments.py')
    snapshot = date.fromisoformat(public['metadata']['snapshot_date'])
    risk.SNAPSHOT_DATE = snapshot
    records = public['records']
    output = {str(row['livelabsId']): {'performance': None, 'risk': None} for row in records}
    for row in records:
        output[str(row['livelabsId'])]['evidence'] = {key: row.get('review', {}).get(key) for key in ('confidence','metricScope','updateEvidence','readiness','readinessReasons')}
    def explain(values, weights):
        available = sum(weight for value, weight in zip(values, weights.values()) if value is not None)
        return [{'label': label, 'value': value, 'configuredWeight': weight, 'effectiveWeight': round(weight / available, 6) if value is not None and available else 0}
                for (label, weight), value in zip(weights.items(), values)]
    for kind in ('Workshop', 'Sprint'):
        for record, score, components in top.scored_records(records, kind, snapshot):
            output[str(record['livelabsId'])]['performance'] = round(score, 2) if score is not None else None
            output[str(record['livelabsId'])]['performanceComponents'] = explain(list(components.values()), {'Annual demand':.45, '90-day demand':.35, 'Freshness':.20})
        for item in risk.review_metrics(records, kind):
            output[str(item['record']['livelabsId'])]['risk'] = round(item['score'], 2) if item['score'] is not None else None
            output[str(item['record']['livelabsId'])]['riskComponents'] = explain(item['componentValues'], {'Low demand':.50, 'Update age':.35, 'Missing contact':.15})
    return {'schemaVersion': 2, 'records': output}


def source_hash(path): return hashlib.sha256(path.read_bytes()).hexdigest()
