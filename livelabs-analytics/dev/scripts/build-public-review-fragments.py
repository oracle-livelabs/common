#!/usr/bin/env python3
"""Build author-facing risk and retirement tables from public/published records."""

from __future__ import annotations

from datetime import date, datetime
import argparse
import calendar
from html import escape
import json
import math
from pathlib import Path
from review_presentation import focus_cell, row_attributes, controls, review_status
from review_rules import DEFAULT_CRITERIA, evaluate, parse_date, methodology_html, TIER_LABELS, weighted_score


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "inventory" / "data" / "public_portfolio_inventory.json"
FRAGMENTS = ROOT / "assets" / "fragments"
SNAPSHOT_DATE = None
RETIREMENT = {'maxViews12m': 250, 'olderThanMonths': 12}
REVIEW_CRITERIA = DEFAULT_CRITERIA
EVALUATION_DATE = None


def clean(value: object) -> str:
    return "" if value is None else str(value).strip()


def detail_map(record: dict) -> dict[str, str]:
    return {clean(pair[0]): clean(pair[1]) for pair in record.get("details", []) if isinstance(pair, list) and len(pair) >= 2}


def numeric(value: object) -> float | None:
    try:
        number = float(str(value).replace(",", "").strip())
        return number if math.isfinite(number) and number >= 0 else None
    except (TypeError, ValueError):
        return None


def metric_map(record: dict) -> dict[str, float | None]:
    result = {clean(label): numeric(value) for label, value in record.get("values", []) if isinstance(label, str)}
    return result


def last_update(record: dict) -> date | None:
    details = detail_map(record)
    for key in (
        "Last Meaningful Workshop Update", "Latest Workshop Commit Date", "Latest GitHub Update",
        "Latest Repository Update Proxy", "WMS Last Update",
    ):
        text = details.get(key, "")
        for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S"):
            try:
                return datetime.strptime(text[:19], fmt).date()
            except ValueError:
                continue
    try:
        return datetime.strptime(clean(record.get("update"))[:10], "%Y-%m-%d").date()
    except ValueError:
        return None


def percentile(value: float, values: list[float]) -> float | None:
    if not values:
        return None
    ordered = sorted(values)
    lower = sum(item < value for item in ordered)
    equal = sum(item == value for item in ordered)
    return round((lower + equal * 0.5) / len(ordered) * 100, 2)


def review_metrics(records: list[dict], content_type: str) -> list[dict]:
    cohort = [record for record in records if record.get("type") == content_type]
    views = {
        str(record.get("livelabsId") or record.get("key")): metric_map(record).get("Views - Last 12 Months")
        for record in cohort
    }
    population = [value for value in views.values() if value is not None]
    rows = []
    for record in cohort:
        key = str(record.get("livelabsId") or record.get("key"))
        view_count = views[key]
        updated = last_update(record)
        if updated and updated > SNAPSHOT_DATE:
            updated = None
        review = record.get('review') or evaluate(record, SNAPSHOT_DATE, REVIEW_CRITERIA)
        updated = parse_date(review['recordedUpdate'])
        scoring_updated = parse_date(review['scoringUpdate'])
        age_months = (SNAPSHOT_DATE - scoring_updated).days / 30.4375 if scoring_updated else None
        missing_author = record.get("ownerMissing") if isinstance(record.get("ownerMissing"), bool) else None
        components = []
        view_percentile = percentile(view_count, population) if view_count is not None else None
        if view_percentile is not None:
            components.append((0.50, 100 - view_percentile))
        if age_months is not None:
            components.append((0.35, min(100, age_months / 36 * 100)))
        if missing_author is not None:
            components.append((0.15, 100 if missing_author else 0))
        score = weighted_score(components)
        rows.append({
            "record": record,
            "views12m": view_count,
            "updated": updated,
            "ageMonths": age_months,
            "missingAuthor": missing_author,
            "score": score,
            "componentValues": [100 - view_percentile if view_percentile is not None else None,
                min(100, age_months / 36 * 100) if age_months is not None else None,
                (100 if missing_author else 0) if missing_author is not None else None],
            "scoreCoverage": review['confidence'],
            "review": review,
        })
    return rows


def retirement_cutoff(months=None):
    months = RETIREMENT['olderThanMonths'] if months is None else months
    total = SNAPSHOT_DATE.year * 12 + SNAPSHOT_DATE.month - 1 - months
    year, month = divmod(total, 12)
    return date(year, month + 1, min(SNAPSHOT_DATE.day, calendar.monthrange(year, month + 1)[1]))


def retirement_candidate(item, max_views=None, months=None):
    maximum = RETIREMENT['maxViews12m'] if max_views is None else max_views
    return item['views12m'] is not None and item['views12m'] <= maximum and item['updated'] is not None and item['updated'] < retirement_cutoff(months)


def td(value: object, kind: str = "text") -> str:
    text = clean(value)
    normalized = text.lower()
    sort = normalized
    if kind == "number":
        sort = text.replace(",", "")
    elif kind == "date":
        sort = text
    return f'<td data-filter-value="{escape(normalized)}" data-sort-value="{escape(sort)}">{escape(text or "N/A")}</td>'


def table_html(rows: list[dict], content_type: str, table_id: str, retirement: bool = False, label_override=None) -> str:
    columns = [
        ("#", "number"), ("Title", "text"), ("Author", "text"), ("WMS ID", "number"),
        ("LiveLabs ID", "number"), ("Category", "text"), ("Views 12m", "number"),
        ("Last Meaningful Update", "date"), ("Retire Score" if retirement else "Review Score", "number"),
        ("Type", "text"), ("Review status", "text"),
    ]
    header = "".join(
        f'<th data-sort-column-index="{index}" data-sort-type="{kind}" aria-sort="none">'
        f'<button class="sort-button" type="button" data-sort-table="{table_id}" data-column-index="{index}" '
        f'data-default-direction="{"asc" if index < 2 or kind == "text" else "desc"}" title="Sort by {escape(label)}">{escape(label)}</button></th>'
        for index, (label, kind) in enumerate(columns)
    )
    filters = "".join(
        f'<label class="filter-field" for="{table_id}-filter-{index}"><span>{escape(label)}</span>'
        f'<input id="{table_id}-filter-{index}" type="search" placeholder="Filter {escape(label)}" '
        f'data-table-filter="{table_id}" data-column-index="{index}"></label>'
        for index, (label, _) in enumerate(columns)
    )
    body = []
    for index, item in enumerate(rows):
        record = item["record"]
        review = item['review']
        details = detail_map(record)
        title = clean(record.get("title")) or "Untitled item"
        owner = clean(record.get("owner")) or "No author listed"
        updated = item["updated"].isoformat() if item["updated"] else "N/A"
        score = f'{item["score"]:.2f}' if item["score"] is not None else "N/A"
        detail_id = f"{table_id}-detail-{index}"
        base = "".join([
            td(index + 1, "number"), td(title), td(owner), td(record.get("wmsId"), "number"),
            td(record.get("livelabsId"), "number"), td(record.get("category")),
            td(f'{item["views12m"]:,.0f}' if item["views12m"] is not None else "N/A", "number"),
            td(updated, "date"), td(score, "number"), td(record.get('type')), td(review_status(review)),
        ])
        body.append(f'<tr class="expandable-row" data-filter-row="true" {row_attributes(record)} data-review-tier="{review["tier"]}" data-review-order="{review["tierOrder"]}" data-original-index="{index}" data-detail-row-id="{detail_id}" data-expanded="false" tabindex="0" aria-expanded="false">{base}</tr>')
        detail_rows = [
            ("Review band", review["tierLabel"]), ("Confidence", review["confidence"]), ("Why included", " ".join(review["reasons"])), ("Content type", record.get("type")), ("Publish status", record.get("publishStatus")),
            ("Publish type", record.get("publishType")), ("Workflow status", record.get("status")),
            ("Views in the last 12 months", f'{item["views12m"]:,.0f}' if item["views12m"] is not None else "N/A"),
            ("Recorded update", updated), ("Update used for scoring", review['scoringUpdate']),
            ("Update evidence", review['updateEvidence']), ("Recorded Markdown update", review['markdownUpdate']),
            ("Demand mapping", review['metricScope']), ("Within-type demand percentile", review['demandPercentile']),
            ("Review state", review['reviewState']), ("First publication verified", review['firstPublishedDate']),
            ("Keep-active expiry", review['keepUntil']), ("Source snapshot", review['snapshotDate']), ("Author/contact", owner),
            ("Review score inputs", "Public demand, update age, and author/contact coverage"),
        ]
        detail_html = "".join(f'<tr><th>{escape(clean(label))}</th><td>{escape(clean(value) or "N/A")}</td></tr>' for label, value in detail_rows)
        body.append(f'<tr class="detail-row" data-detail-for="{detail_id}" hidden><td colspan="{len(columns)}"><div class="detail-shell"><p class="detail-title">Review details for {escape(title)}.</p><table class="detail-table"><tbody>{detail_html}</tbody></table></div></td></tr>')
    label = 'Retirement review' if retirement else 'At-risk items'
    bands = {item['review']['tier'] for item in rows}
    band_options = ''.join(f'<option value="{key}">{escape(value)} ({sum(item["review"]["tier"] == key for item in rows)})</option>' for key,value in TIER_LABELS.items() if key in bands)
    return (
        f'<section class="panel ranked-table-panel"><div class="panel-head"><h3>{label}</h3><span>{len(rows)} rows</span></div>'
        f'<div class="toggle-body">'
        f'<label class="review-band-filter" for="{table_id}-band">Review band <select id="{table_id}-band" data-table-filter="{table_id}" data-filter-mode="review-tier"><option value="">All review bands</option>{band_options}</select></label>'
        f'<div class="table-tools"><span class="table-count" data-table-count-for="{table_id}">{len(rows)} rows</span>'
        f'<span class="table-hint">Open a row to review its source fields.</span><button class="filter-reset" type="button" data-clear-filters-for="{table_id}">Clear filters</button></div>'
        f'<details class="filter-disclosure"><summary><span>Apply filters</span><span class="filter-chevron" aria-hidden="true"></span></summary>'
        f'{controls(table_id)}<div class="filter-grid">{filters}</div></details><div class="table-wrap" data-filter-table="{table_id}" data-review-priority="true">'
        f'<table class="data-table" id="{table_id}"><thead><tr>{header}</tr></thead><tbody>{"".join(body)}</tbody></table></div></div></section>'
    )


def build_fragment(records: list[dict], retirement: bool) -> str:
    rows = [row for kind in ('Workshop','Sprint') for row in review_metrics(records, kind)]
    if retirement:
        rows = [row for row in rows if row['review']['queue'] in ('lifecycle','retirement','evidence')]
    rows.sort(key=lambda item: (item['review']['tierOrder'], item['score'] is None, -(item['score'] or 0), str(item['record'].get('livelabsId'))))
    table_id = 'retirement-review-table' if retirement else 'at-risk-table'
    content = [table_html(rows, 'All', table_id, retirement)]
    title = "Retirement review" if retirement else "At-risk"
    summary = methodology_html(REVIEW_CRITERIA, SNAPSHOT_DATE, EVALUATION_DATE, section='retirement' if retirement else 'risk')
    intro = (
        "Review removal requests and low-demand content before deciding what to retire."
        if retirement else
        "Review content by demand, age and QA findings."
    )
    return (
        f'<section class="section" id="{"retire-now-content" if retirement else "at-risk-content"}">'
        f'<div class="section-head"><div class="section-head-top"><h2>{title}</h2></div><p>{escape(intro)}</p></div>'
        f'{summary}<div class="panel-stack ranked-table-stack">{"".join(content)}</div></section>'
    )


def main() -> None:
    global SNAPSHOT_DATE, RETIREMENT, REVIEW_CRITERIA, EVALUATION_DATE
    parser = argparse.ArgumentParser()
    parser.add_argument('--inventory', type=Path, default=INPUT)
    parser.add_argument('--output-dir', type=Path, default=FRAGMENTS)
    parser.add_argument('--policy', type=Path)
    args = parser.parse_args()
    payload = json.loads(args.inventory.read_text(encoding="utf-8"))
    RETIREMENT = payload['metadata'].get('retirement_criteria', RETIREMENT)
    REVIEW_CRITERIA = payload['metadata'].get('review_criteria', DEFAULT_CRITERIA)
    EVALUATION_DATE = payload['metadata'].get('review_evaluation_date')
    SNAPSHOT_DATE = date.fromisoformat(payload['metadata']['snapshot_date'])
    records = payload.get("records")
    if not isinstance(records, list) or payload.get("metadata", {}).get("data_scope") != "public_published":
        raise SystemExit("Expected the public/published inventory projection.")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    (args.output_dir / "at-risk-content.html").write_text(build_fragment(records, False), encoding="utf-8")
    (args.output_dir / "retire-now-content.html").write_text(build_fragment(records, True), encoding="utf-8")
    print(json.dumps({
        "publicRecords": len(records),
        "atRiskWorkshopRows": len(review_metrics(records, "Workshop")),
        "atRiskSprintRows": len(review_metrics(records, "Sprint")),
        "retirementWorkshopCandidates": sum(r['review']['queue']=='retirement' for r in review_metrics(records, "Workshop")),
        "retirementSprintCandidates": sum(r['review']['queue']=='retirement' for r in review_metrics(records, "Sprint")),
    }, indent=2))


if __name__ == "__main__":
    main()
