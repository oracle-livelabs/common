"""Private saved-report adapters. No network access or Jenkins execution."""
import base64
import copy
import hashlib
import json
import re
from pathlib import Path

REPORT_ID = re.compile(r'^[a-f0-9]{64}$')
RUN_ID = re.compile(r'^[A-Za-z0-9._:-]{1,180}$')
FILES = frozenset(('summary.html', 'retest-list.html', 'results.csv', 'finding-results.csv',
                   'catalog-results.json', 'summary.md', 'summary.json', 'hub-ui.css'))


def normalize_report(payload, *, for_merge=False):
    if not isinstance(payload, dict):
        raise ValueError('Choose a summary JSON or Complete JSON report.')
    run_id = (payload.get('run') or {}).get('id') if payload.get('schemaVersion') == 2 and isinstance(payload.get('run'), dict) else payload.get('runId')
    if not isinstance(run_id, str) or not RUN_ID.fullmatch(run_id) or run_id in ('.', '..'):
        raise ValueError('Report run ID must contain only letters, numbers, dots, colons, underscores or hyphens.')
    if payload.get('schemaVersion') != 2:
        return payload
    run, items = payload.get('run'), payload.get('items')
    if not isinstance(run, dict) or not isinstance(items, list) or len(items) > 20000:
        raise ValueError('The Complete JSON report needs run metadata and a list of items.')
    result = {key: copy.deepcopy(run[key]) for key in ('status', 'scope', 'completion', 'startedAt', 'endedAt',
              'durationMs', 'configuredTests', 'counts', 'failureCategories') if key in run}
    result.update(runId=str(run.get('id', '')), runType=run.get('type', 'regression'), catalogItems=[], failures=[], sections=[])
    seen, groups = set(), []
    for source in items:
        if not isinstance(source, dict):
            raise ValueError('Report items must be objects.')
        catalog = copy.deepcopy(source.get('catalog') or {})
        item_id = str(source.get('livelabsId') or catalog.get('id') or '').strip()
        kind = str(source.get('type') or catalog.get('type') or 'item')
        key = (kind, item_id)
        if not item_id or key in seen:
            raise ValueError('Report items need unique type and LiveLabs ID pairs.')
        seen.add(key)
        ids = {str(value) for field in ('ids', 'duplicate_ids') for value in catalog.get(field, [])}
        ids.add(item_id)
        if len(ids) > 1:
            groups.append({'id': item_id, 'ids': sorted(ids)})
        catalog.update(id=item_id, livelabsId=item_id, type=kind, title=source.get('title') or catalog.get('title', ''),
                       absolute_url=source.get('catalogUrl') or catalog.get('absolute_url', ''))
        row = {key: copy.deepcopy(source[key]) for key in ('status', 'completionState', 'counts', 'sections',
               'authorNames', 'authorEmails', 'issues') if key in source}
        row.update(key=source.get('key') or f'{kind}:{item_id}', catalogItem=catalog,
                   tests=copy.deepcopy(source.get('checks') or []))
        result['catalogItems'].append(row)
        for evidence in source.get('evidence') or []:
            if not isinstance(evidence, dict):
                raise ValueError('Recorded evidence must contain objects.')
            failure = copy.deepcopy(evidence)
            failure['catalogItem'] = copy.deepcopy(catalog)
            # Preserve errors, steps and diagnostic text; the export does not include binary files.
            failure['attachments'] = []
            result['failures'].append(failure)
    if groups and for_merge:
        raise ValueError('This export groups multiple LiveLabs IDs. Use the per-ID summary or a reconciled JSON/CSV pair in Data merge; grouped evidence cannot be assigned to each ID.')
    result['sourceReport'] = {'format': 'catalog-results-v2', 'groupedIdentities': groups,
                              'attachmentsAvailable': False}
    return result


def report_directory(root, report_id):
    if not REPORT_ID.fullmatch(str(report_id)):
        raise ValueError('Invalid report version.')
    root = Path(root).resolve()
    target = (root / report_id).resolve()
    if target.parent != root or not (target / 'manifest.json').is_file():
        raise ValueError('Saved report version not found.')
    return target


def report_file(root, report_id, filename):
    directory = report_directory(root, report_id)
    if filename not in FILES:
        raise ValueError('Report file not available.')
    target = (directory / filename).resolve()
    if target.parent != directory or not target.is_file():
        raise ValueError('Report file not available.')
    return target


def reports(root):
    result = []
    if not Path(root).is_dir():
        return result
    for directory in Path(root).iterdir():
        try:
            safe = report_directory(root, directory.name)
            item = json.loads((safe / 'manifest.json').read_text(encoding='utf-8'))
            if item.get('id') == directory.name:
                result.append(item)
        except (ValueError, OSError):
            continue
    return sorted(result, key=lambda item: (item.get('startedAt', ''), item.get('builtAt', ''), item['id']), reverse=True)


def report_csp(html):
    scripts = re.findall(r'<script(?:\s[^>]*)?>([\s\S]*?)</script>', html, re.I)
    hashes = ["'sha256-" + base64.b64encode(hashlib.sha256(script.encode()).digest()).decode() + "'" for script in scripts if script]
    return ("default-src 'none'; script-src 'self' " + ' '.join(hashes) +
            "; style-src 'self' 'unsafe-inline'; font-src 'self'; img-src 'self' data:; connect-src 'self'; "
            "frame-ancestors 'self'; base-uri 'none'; form-action 'none'")


def apply_list_operations(current, operations):
    if not isinstance(operations, list) or len(operations) > 500:
        raise ValueError('Select at most 500 review items at a time.')
    updated = dict(current)
    for operation in operations:
        if not isinstance(operation, dict):
            raise ValueError('Invalid review operation.')
        key = operation.get('id')
        if not isinstance(key, str) or not key or len(key) > 250:
            raise ValueError('Invalid review item identity.')
        if operation.get('remove') is True:
            updated.pop(key, None)
            continue
        entry = operation.get('entry')
        if not isinstance(entry, dict) or entry.get('testId') != key or not entry.get('executionId') or not entry.get('itemId'):
            raise ValueError('Review item must identify its source run and LiveLabs ID.')
        if len(json.dumps(entry)) > 100000:
            raise ValueError('Review item is too large.')
        updated[key] = entry
    if len(updated) > 500:
        raise ValueError('The shared Retest List can hold at most 500 items.')
    return updated
