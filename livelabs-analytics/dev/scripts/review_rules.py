"""Shared review membership, evidence confidence and policy explanations.

No I/O or source mutation: callers supply the snapshot, policy and evaluation day.
"""
from datetime import date, datetime
from decimal import Decimal, ROUND_HALF_UP
import calendar
import math
import re

DEFAULT_CRITERIA = {
    'graceMonths': 6,
    'types': {kind: {'strictViews': 250, 'broadViews': 500, 'riskViews': 1000,
                    'oldMonths': 12, 'watchMonths': 6} for kind in ('Workshop', 'Sprint')},
}
TIER_LABELS = {
    'approved': 'Approved for retirement', 'lifecycle': 'Immediate lifecycle review',
    'strict': 'Strict retirement review', 'broad': 'Broader retirement review',
    'evidence': 'Evidence review', 'risk': 'At-risk priority', 'watch': 'Watchlist',
    'new': 'New-content grace', 'keep': 'Keep active until review', 'standard': 'General review',
}
TIER_ORDER = {key: i for i, key in enumerate(TIER_LABELS)}
REVIEW_STATES = ('unreviewed', 'owner_requested', 'confirmed_obsolete', 'approved_retirement', 'keep_active', 'needs_evidence')
MECHANICAL = re.compile(r'copyright|\bcdn\b|github\.?io refs|\b(formatting|whitespace|typos?)\b', re.I)


def numeric(value):
    try:
        number = float(str(value).replace(',', '').strip())
        return number if math.isfinite(number) and number >= 0 else None
    except (TypeError, ValueError):
        return None


def weighted_score(components):
    available = [(Decimal(str(w)), Decimal(str(v))) for w,v in components if v is not None]
    if not available:
        return None
    total = sum(w*v for w,v in available) / sum(w for w,_ in available)
    return float(total.quantize(Decimal('.01'), rounding=ROUND_HALF_UP))


def parse_date(value):
    text = str(value or '').strip()
    for fmt in ('%Y-%m-%d', '%m/%d/%Y', '%Y-%m-%d %H:%M:%S'):
        try:
            return datetime.strptime(text[:10] if fmt != '%Y-%m-%d %H:%M:%S' else text[:19], fmt).date()
        except ValueError:
            pass
    return None


def cutoff(snapshot, months):
    year, month = divmod(snapshot.year * 12 + snapshot.month - 1 - months, 12)
    return date(year, month + 1, min(snapshot.day, calendar.monthrange(year, month + 1)[1]))


def key_for(record):
    return 'livelabs:' + str(record['livelabsId']) if record.get('livelabsId') else str(record.get('key') or '')


def fields(record):
    return {str(p[0]): p[1] for p in record.get('details', []) if isinstance(p, list) and len(p) >= 2}


def annual_views(record):
    return numeric(dict(record.get('values', [])).get('Views - Last 12 Months'))


def percentile(value, population):
    if value is None or not population:
        return None
    return round(100 * (sum(v < value for v in population) + .5 * sum(v == value for v in population)) / len(population), 2)


def update_evidence(record, snapshot, decision=None):
    decision = decision or {}
    detail = fields(record)
    source = str(record.get('sourceFlags', {}).get('github_update_evidence_source') or '')
    recorded = next((parsed for label in ('Last Meaningful Workshop Update', 'Latest Workshop Commit Date',
        'Latest GitHub Update', 'Latest Repository Update Proxy', 'WMS Last Update')
        if (parsed := parse_date(detail.get(label)))), parse_date(record.get('update')))
    if recorded and recorded > snapshot:
        recorded = None
    markdown = parse_date(detail.get('Latest Workshop Markdown Commit Date'))
    if markdown and markdown > snapshot:
        markdown = None
    verified = parse_date(decision.get('contentUpdatedDate'))
    if verified and verified <= snapshot:
        return {'recorded': recorded, 'scoring': verified, 'markdown': markdown,
                'kind': 'verified', 'label': 'Admin-verified content update', 'conflict': False}
    mechanical = bool(MECHANICAL.search(str(detail.get('Latest Meaningful Commit') or '')))
    conflict = bool(recorded and markdown and markdown < recorded and mechanical)
    if mechanical:
        return {'recorded': recorded, 'scoring': None, 'markdown': markdown, 'kind': 'mechanical',
                'label': 'Maintenance change; content freshness unverified', 'conflict': conflict}
    if 'workshop_path' in source and recorded:
        return {'recorded': recorded, 'scoring': recorded, 'markdown': markdown, 'kind': 'workshop',
                'label': 'Recorded workshop-path activity; substantive change not verified', 'conflict': False}
    return {'recorded': recorded, 'scoring': None, 'markdown': markdown, 'kind': 'proxy' if recorded else 'missing',
            'label': 'Repository/WMS proxy; content freshness unknown' if recorded else 'Update evidence unavailable', 'conflict': False}


def evaluate(record, snapshot, criteria=None, decision=None, evaluated_on=None, population=None):
    criteria = criteria or DEFAULT_CRITERIA
    decision = decision or {}
    evaluated_on = evaluated_on or snapshot
    config = criteria['types'].get(record.get('type'), criteria['types']['Workshop'])
    views = annual_views(record)
    detail = fields(record)
    evidence = update_evidence(record, snapshot, decision)
    scope = record.get('sourceFlags', {}).get('dashboard_metric_scope', 'unavailable')
    reasons, codes = [], []
    def add(code, message):
        codes.append(code); reasons.append(message)
    state = decision.get('state', 'unreviewed')
    workflow_request = any(str(record.get(field, '')).strip().lower() == 'delete requested' for field in ('status', 'publishStatus'))
    first_published = parse_date(decision.get('firstPublishedDate'))
    grace = bool(first_published and cutoff(snapshot, criteria['graceMonths']) < first_published <= snapshot)
    completion = parse_date(detail.get('Completion Date'))
    possible_new = bool(not first_published and completion and cutoff(snapshot, criteria['graceMonths']) < completion <= snapshot)
    keep_until = parse_date(decision.get('keepUntil'))
    keep = state == 'keep_active' and keep_until is not None and evaluated_on <= keep_until
    comparison_date = evidence['scoring'] or evidence['recorded']
    gate = None
    if views is not None and comparison_date:
        if comparison_date < cutoff(snapshot, config['oldMonths']):
            if views <= config['strictViews']: gate = 'strict'
            elif views <= config['broadViews']: gate = 'broad'
            elif views <= config['riskViews']: gate = 'risk'
        elif comparison_date < cutoff(snapshot, config['watchMonths']) and views <= config['riskViews']:
            gate = 'watch'
    if gate:
        add('demand_' + gate, f'{views:g} annual views; recorded update {comparison_date.isoformat()} meets the {TIER_LABELS[gate].lower()} gate.')
    if workflow_request:
        add('delete_requested', 'Source workflow is Delete Requested; review the request independently of traffic.')
    if state in ('owner_requested', 'confirmed_obsolete', 'approved_retirement'):
        add(state, {'owner_requested':'Admin recorded an owner retirement request.', 'confirmed_obsolete':'Admin recorded obsolete or replaced content.',
                    'approved_retirement':'Admin recorded an approved retirement decision; publication is unchanged.'}[state])
    if evidence['conflict']:
        add('update_conflict', 'A maintenance change is newer than the recorded lab-content update; verify the substantive history.')
    if evidence['kind'] in ('proxy', 'mechanical', 'missing'):
        add('update_' + evidence['kind'], evidence['label'] + '.')
    if views is None:
        add('unknown_demand', 'Annual demand is unknown, not zero.')
    elif scope not in ('exact_unique_title', 'exact_stable_id'):
        add('ambiguous_demand', 'Demand is not uniquely attributable to this record; verify the source mapping.')
    if grace:
        add('verified_new', f'Verified first publication {first_published.isoformat()}; {criteria["graceMonths"]}-month demand-review grace.')
    elif possible_new:
        add('possible_new', 'Recent completion suggests new content; first publication is unverified. Confirm before retirement.')
    if keep:
        add('keep_exception', f'Admin keep-active exception through {keep_until.isoformat()}. Lifecycle requests remain visible.')
    elif state == 'keep_active':
        add('exception_expired', 'Keep-active exception expired; automatic review gates apply again.')
    if state == 'needs_evidence':
        add('admin_evidence', 'Admin requested more evidence before a retirement decision.')
    readiness_reasons = []
    if evidence['kind'] != 'verified': readiness_reasons.append('Verify the substantive content update date.')
    if not first_published or first_published > snapshot: readiness_reasons.append('Verify first publication and the new-content grace period.')
    if views is None or scope not in ('exact_unique_title', 'exact_stable_id'): readiness_reasons.append('Verify demand attributable to this record.')
    if possible_new or grace: readiness_reasons.append('Resolve the new-content grace period before retirement.')
    if state == 'needs_evidence': readiness_reasons.append('Resolve the Admin evidence request.')
    if keep: readiness_reasons.append('The keep-active exception is still in force.')
    ready = not readiness_reasons
    confidence_issues = any(c in codes for c in ('unknown_demand','ambiguous_demand','update_conflict','update_proxy','update_mechanical','update_missing','possible_new','admin_evidence'))
    confidence = 'Needs evidence' if confidence_issues else 'Verified content date' if evidence['kind']=='verified' else 'Recorded activity only'
    # Source lifecycle requests cannot be silenced by high demand, grace or a keep exception.
    lifecycle = workflow_request or state in ('owner_requested','confirmed_obsolete','approved_retirement')
    demand_candidate = gate in ('strict', 'broad')
    evidence_candidate = (views is None or state == 'needs_evidence' or
        (views <= config['broadViews'] and (demand_candidate or bool(readiness_reasons))))
    retirement = not lifecycle and not keep and not grace and demand_candidate and ready
    evidence_queue = not lifecycle and not keep and not grace and not retirement and evidence_candidate
    if state == 'approved_retirement': tier = 'approved'
    elif lifecycle: tier = 'lifecycle'
    elif keep: tier = 'keep'
    elif grace: tier = 'new'
    elif evidence_queue: tier = 'evidence'
    elif retirement: tier = gate
    elif gate: tier = gate
    elif confidence_issues: tier = 'evidence'
    else: tier = 'standard'
    # Only an explicit source terminal state confirms retirement. Unpublished,
    # disabled, cancelled and absent rows are not proof of a completed retirement.
    source_retired = any(str(record.get(f, '')).strip().lower() in ('retired', 'deleted') for f in ('status','publishStatus'))
    readiness = 'source-confirmed-retired' if source_retired else 'approved' if state == 'approved_retirement' else 'evidence-checked' if ready else 'provisional'
    if not reasons:
        add('general_review', 'No lifecycle request or demand-and-age gate matched; retained in the full review inventory.')
    focus = []
    if lifecycle: focus.append('Lifecycle')
    if views is not None and views <= config['broadViews']: focus.append('Low demand')
    if gate: focus.append('Older updates')
    if confidence_issues: focus.append('Needs evidence')
    if record.get('ownerMissing'): focus.append('Missing contact')
    if keep: focus.append('Keep active')
    if grace: focus.append('New content')
    return {'tier': tier, 'tierLabel': TIER_LABELS[tier], 'tierOrder': TIER_ORDER[tier], 'demandTier':gate, 'focusTags':focus,
        'queue':'lifecycle' if lifecycle else 'retirement' if retirement else 'evidence' if evidence_queue else 'at-risk',
        'readiness':readiness, 'readinessReasons':readiness_reasons, 'sourceRetirementConfirmed':source_retired,
        'confidence':confidence,'reasonCodes':codes,'reasons':reasons,'reviewState':state,
        'recordedUpdate':evidence['recorded'].isoformat() if evidence['recorded'] else None,
        'scoringUpdate':evidence['scoring'].isoformat() if evidence['scoring'] else None,
        'markdownUpdate':evidence['markdown'].isoformat() if evidence['markdown'] else None,
        'updateKind':evidence['kind'],'updateEvidence':evidence['label'],'metricScope':scope,
        'firstPublishedDate':first_published.isoformat() if first_published else None,
        'keepUntil':keep_until.isoformat() if keep_until else None,
        'demandPercentile':percentile(views, population or []),'snapshotDate':snapshot.isoformat()}


def evaluate_records(records, snapshot, policy, evaluated_on=None):
    populations = {kind:[v for record in records if record.get('type')==kind and (v:=annual_views(record)) is not None]
                   for kind in ('Workshop','Sprint')}
    return {str(record['key']):evaluate(record, snapshot, policy.get('reviewCriteria', DEFAULT_CRITERIA),
        policy.get('reviewDecisions',{}).get(key_for(record)), evaluated_on, populations.get(record.get('type'),[])) for record in records}


def methodology_html(criteria, snapshot=None, evaluation_date=None, section='admin'):
    """Short, section-specific help; operational provenance stays in Admin/docs."""
    if section in ('performance', 'risk', 'retirement'):
        groups = list(criteria['types'].items())
        same = all(config == groups[0][1] for _, config in groups)
        limits = ''
        for kind, c in (groups[:1] if same else groups):
            prefix = '' if same else f'{kind}: '
            limits += f'<p><strong>{prefix}Retirement bands:</strong> ≤{c["strictViews"]} or ≤{c["broadViews"]} annual views and an update older than {c["oldMonths"]} months.'
            if section == 'risk':
                limits += f' Priority: ≤{c["riskViews"]} views and &gt;{c["oldMonths"]} months. Watchlist: ≤{c["riskViews"]} views and &gt;{c["watchMonths"]} months.'
            limits += '</p>'
        limits += '<p>Demand thresholds are provisional and configured separately for Workshops and Sprints. Compare their impact in Admin before changing policy.</p>'
        base = '<p><strong>Base:</strong> low demand 50%, update age 35%, missing contact 15%.</p>'
        final = '<p><strong>With usable QA:</strong> <span data-score-share="analytics">75%</span> base + <span data-score-share="jenkins">25%</span> P2/P3 content-hygiene error score. P1 stays in urgent action.</p>'
        if section == 'performance':
            body = ('<p>Public, published items with both view periods; reviewed tests stay in Admin.</p>'
                '<p><strong>Base:</strong> annual views 45%, 90-day views 35%, freshness 20%. Views are compared within each content type.</p>'
                '<p><strong>With usable QA:</strong> <span data-score-share="analytics">75%</span> base + <span data-score-share="jenkins">25%</span> content hygiene (100 minus the P2/P3 error score); P1 stays in urgent action.</p>')
        elif section == 'risk':
            body = '<p>All eligible items remain available. Stronger review bands come first.</p>' + base + limits + final
        else:
            body = ('<p>Includes removal requests, demand candidates and low-demand items needing evidence.</p>' + limits + base + final
                + '<p>Demand candidates need verified update and publication dates and attributable demand. Otherwise they stay in evidence review. Grace and keep-active exceptions apply. Admin approval does not confirm removal in WMS.</p>')
        body += '<p>Unknown inputs are omitted and weights rebalance. Without usable completed QA, the base score stands. QA measures reported content hygiene; it does not establish relevance, obsolescence or complete quality. Open a row for evidence.</p>'
        return ('<details class="panel toggle-panel"><summary class="panel-head"><h3>What drives the score</h3></summary>'
                '<div class="toggle-body review-methodology">' + body + '</div></details>')
    shared = '<p>Only public, published content appears here. Reviewed tests and internal training stay in Admin. Workshops and Sprints share one table. Type filters the format; focus tags filter the reasons. Select several tags to match any of them.</p>'
    qa_risk = '<p><strong>Final score:</strong> <span data-score-share="analytics">75%</span> base score + <span data-score-share="jenkins">25%</span> P2/P3 content-hygiene error score when QA checks are usable. P2/P3 findings raise review priority; P1 findings stay in urgent action. Unavailable or incomplete QA leaves the base score unchanged.</p>'
    performance = (
        '<p><strong>Base score:</strong> annual demand (45%), recent 90-day demand (35%) and freshness (20%). Demand is compared within each content type; higher scores mean stronger performance.</p>'
        '<p>Both view periods are required. Unknown freshness is left out and the other weights increase proportionally.</p>'
        '<p><strong>Final score:</strong> <span data-score-share="analytics">75%</span> base score + <span data-score-share="jenkins">25%</span> content hygiene when QA checks are usable. Content hygiene is 100 minus Jenkins Error Score. P2/P3 findings lower it; P1 stays in urgent action. Unavailable or incomplete QA leaves the base score unchanged.</p>'
    )
    base_risk = '<p><strong>Base score:</strong> low annual demand (50%), update age up to 36 months (35%) and missing author/contact (15%). Demand is compared within each content type. Unknown inputs are left out and the other weights increase proportionally.</p>'
    groups = list(criteria['types'].items())
    same = all(config == groups[0][1] for _, config in groups)
    gates = ''
    retirement_gates = ''
    for kind, c in (groups[:1] if same else groups):
        prefix = '' if same else f'{kind}: '
        retirement_gates += f'<p><strong>{prefix}Demand limits:</strong> strict: ≤{c["strictViews"]} annual views; broader: ≤{c["broadViews"]}. Both require an update older than {c["oldMonths"]} months.</p>'
        gates += f'<p><strong>{prefix}Review bands:</strong> strict: ≤{c["strictViews"]} annual views; broader: ≤{c["broadViews"]}. Both require an update older than {c["oldMonths"]} months. At-risk priority: ≤{c["riskViews"]} views and &gt;{c["oldMonths"]} months; watchlist: ≤{c["riskViews"]} and &gt;{c["watchMonths"]} months. Each item takes its strongest matching band.</p>'
    risk = ('<p>All eligible items remain available. Review bands show what needs attention; stronger bands appear first, then higher scores.</p>'
            + base_risk + gates + qa_risk)
    retirement = (
        '<p><strong>Lifecycle:</strong> removal requests or confirmed obsolete content need review regardless of traffic. '
        '<strong>Low demand:</strong> strict and broader candidates meet both the view and age limits below. '
        '<strong>Needs evidence:</strong> low-demand items with uncertain updates need checking before a decision.</p>'
        + retirement_gates + base_risk + qa_risk
        + '<p>New-content grace and expiring keep-active exceptions apply. Lifecycle requests remain visible. Demand candidates require verified content and publication dates and attributable demand. Missing demand also needs evidence review. Admin approval is separate from WMS-confirmed retirement.</p>'
    )
    confidence = '<p>Thresholds are provisional and configured separately by type. QA covers reported P2/P3 content hygiene; unknown, unavailable or incomplete inspections leave the baseline unchanged. Missing contact is an assignment signal, not proof that content should retire.</p><p><strong>Confidence:</strong> missing data is unknown, not zero. Repository activity and maintenance changes do not establish content freshness. Check the row details when evidence is incomplete.</p>'
    body = {'performance': performance, 'risk': risk, 'retirement': retirement}.get(section)
    if body is None:
        body = ('<h4>Top Performers</h4>' + performance + '<h4>At-risk</h4>' + risk
                + '<h4>Retirement review</h4>' + retirement
                + '<p>Jenkins Error Score = 100 × burden / (burden + 20), where burden = 2 × P2 occurrences + P3 occurrences. Filtering does not recalculate scores.</p>')
    return ('<details class="panel toggle-panel"><summary class="panel-head"><h3>What drives the score</h3></summary>'
            '<div class="toggle-body review-methodology">' + shared + body + confidence + '</div></details>')
