"""Conservative validity gate for the reported content-hygiene score.

Counts describe the recorded suite, not all possible checks or full content quality.
Failed content assertions are usable evidence; failed/incomplete inspection is not.
"""
import math

BLOCKING_CODES = {'WORKSHOP_NOT_AVAILABLE', 'PAR_SCAN_INCOMPLETE', 'AUTHENTICATION_REQUIRED', 'SOURCE_SCAN_INCOMPLETE'}


def qa_validity(item):
    findings = item.get('findings') or []
    counts = item.get('testCounts') or {}
    numbers = {}
    for key in ('passed', 'failed', 'skipped', 'other', 'total'):
        try:
            value = float(counts.get(key, 0))
            if not math.isfinite(value) or value < 0 or value != int(value):
                raise ValueError()
            numbers[key] = int(value)
        except (TypeError, ValueError, OverflowError):
            return 'invalid-check-counts'
    if any(str(row.get('code', '')).upper() in BLOCKING_CODES for row in findings):
        return 'inspection-unavailable'
    completed = numbers['passed'] + numbers['failed']
    if not completed:
        return 'no-completed-checks'
    if numbers['skipped'] or numbers['other'] or ('total' in counts and numbers['total'] != completed):
        return 'incomplete-checks'
    if str(item.get('itemStatus', '')).lower() in ('interrupted', 'running', 'skipped', 'timedout', 'timed out'):
        return 'incomplete-checks'
    if numbers['failed'] and not any(f.get('priority') in ('P1', 'P2', 'P3') and f.get('group') == 'author-facing' for f in findings):
        return 'unexplained-failure'
    return 'scored'
