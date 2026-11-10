#!/usr/bin/env python3
"""Regenerate the Top Performers fragment from the refreshed inventory.

This is deliberately limited to the score whose inputs are present in the
28 September snapshot.  At-risk, retire-now, and replacement queues also need
fresh GitHub/update and replacement evidence and are not regenerated here.
"""

from __future__ import annotations

import argparse
from datetime import date, datetime
from html import escape
import json
import math
from pathlib import Path
from review_rules import DEFAULT_CRITERIA, methodology_html, update_evidence, weighted_score
from review_presentation import focus_cell, row_attributes, controls


VIEW_LABELS = {
    "recent_views_12m": "Views - Last 12 Months",
    "recent_views_90d": "Views - Last 90 Days",
}
FORMULA = "Weighted mean: 45% annual demand percentile, 35% 90-day demand percentile, 20% trusted freshness; omit unknown freshness and reweight available inputs."
FILTER_COLUMNS = [
    ("Rank", "#"), ("Title", "Title"), ("Author Email", "Author Email"),
    ("WMS ID", "WMS ID"), ("LiveLabs ID", "LiveLabs ID"), ("Category", "Category"),
    ("Views 12m", "Views 12m"), ("Views 90d", "Views 90d"),
    ("Last Meaningful Update", "Last Meaningful Update"), ("Score", "Score"),
    ("Type", "Type"),
]


def clean(value: object) -> str:
    return "" if value in (None, "") else str(value).strip()


def pairs(record: dict) -> dict[str, str]:
    result: dict[str, str] = {}
    for pair in record.get("details", []):
        if isinstance(pair, list) and len(pair) >= 2:
            result[clean(pair[0])] = clean(pair[1])
    return result


def numeric(value: object) -> float | None:
    try:
        number = float(str(value).replace(",", "").strip())
        return number if math.isfinite(number) and number >= 0 else None
    except (TypeError, ValueError):
        return None


def view_map(record: dict) -> dict[str, float]:
    values = {clean(pair[0]): numeric(pair[1]) for pair in record.get("values", []) if isinstance(pair, list) and len(pair) >= 2}
    return {
        field: values[label]
        for field, label in VIEW_LABELS.items()
        if values.get(label) is not None
    }


def parse_date(value: object) -> date | None:
    text = clean(value)
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%Y-%m-%d %H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).date()
        except ValueError:
            continue
    return None


def latest_update(record: dict) -> date | None:
    if record.get('review'):
        return parse_date(record['review'].get('scoringUpdate'))
    detail = pairs(record)
    for key in (
        "Last Meaningful Workshop Update", "Latest Workshop Commit Date", "Latest GitHub Update",
        "Latest Repository Update Proxy", "WMS Last Update",
    ):
        parsed = parse_date(detail.get(key))
        if parsed:
            return parsed
    return parse_date(record.get("update"))


def percentile(value: float, values: list[float]) -> float:
    ordered = sorted(values)
    lower = sum(1 for item in ordered if item < value)
    equal = sum(1 for item in ordered if item == value)
    return round((lower + (equal * 0.5)) / len(ordered) * 100, 2)


def freshness_score(record: dict, snapshot_date: date) -> float | None:
    updated = latest_update(record) if record.get('review') else update_evidence(record, snapshot_date)['scoring']
    if not updated:
        return None
    age_days = max(0, (snapshot_date - updated).days)
    if age_days <= 365:
        return 100.0
    return round(max(0.0, 100.0 - ((age_days - 365) / 365.0 * 100.0)), 2)


def baseline_score(percentile12m, percentile90d, freshness):
    weighted = [(0.45, percentile12m), (0.35, percentile90d)]
    if freshness is not None:
        weighted.append((0.20, freshness))
    return weighted_score(weighted)


def sort_value(value: object, kind: str) -> str:
    if kind == "number":
        return str(value if value is not None else "")
    return clean(value).lower()


def td(value: object, sort_kind: str = "text") -> str:
    text = clean(value)
    return f'<td data-filter-value="{escape(text.lower())}" data-sort-value="{escape(sort_value(text, sort_kind))}">{escape(text)}</td>'


def filter_grid(table_id: str) -> str:
    fields = []
    for index, (label, placeholder) in enumerate(FILTER_COLUMNS):
        field_id = f"{table_id}-filter-rank" if index == 0 else f"{table_id}-filter-{index}"
        fields.append(
            f'<label class="filter-field" for="{field_id}"><span>{escape(label)}</span>'
            f'<input id="{field_id}" type="search" placeholder="Filter {escape(placeholder)}" '
            f'data-table-filter="{table_id}" data-column-index="{index}"></label>'
        )
    return "".join(fields)


def detail_table(record: dict, components: dict[str, float]) -> str:
    rows: list[str] = []
    for pair in record.get("details", []):
        if not isinstance(pair, list) or len(pair) < 2:
            continue
        label, value = clean(pair[0]), clean(pair[1])
        if label not in {"Last Meaningful Workshop Update", "Latest Workshop Commit Date", "WMS Last Update"}:
            continue
        rows.append(f"<tr><th>{escape(label)}</th><td>{escape(value)}</td></tr>")
    rows.extend(
        f"<tr><th>{escape(label)}</th><td>{value:.2f}</td></tr>" if value is not None else f"<tr><th>{escape(label)}</th><td>Unknown; weight omitted</td></tr>"
        for label, value in components.items()
    )
    rows.append(f"<tr><th>Score Formula</th><td>{escape(FORMULA)}</td></tr>")
    evidence = clean(record.get('review', {}).get('updateEvidence')) or 'Unverified update source'
    rows.append(f'<tr><th>Update evidence source</th><td>{escape(evidence)}</td></tr>')
    link = f'/search/?livelabs_id={escape(clean(record.get("livelabsId")))}'
    return '<table class="detail-table"><tbody>' + "".join(rows) + f'</tbody></table><p><a href="{link}">Open full record and source evidence</a></p>'


def scored_records(records: list[dict], content_type: str, snapshot_date: date):
    eligible = [record for record in records if record.get("type") == content_type and record.get("publishStatus") == "Published" and record.get("publishType") == "Public" and set(view_map(record)) >= {"recent_views_12m", "recent_views_90d"}]
    twelve = [view_map(record)["recent_views_12m"] for record in eligible]
    ninety = [view_map(record)["recent_views_90d"] for record in eligible]
    scored: list[tuple[dict, float, dict[str, float]]] = []
    for record in eligible:
        views = view_map(record)
        components = {
            "recent_views_12m_content_percentile": percentile(views["recent_views_12m"], twelve),
            "recent_views_90d_content_percentile": percentile(views["recent_views_90d"], ninety),
            "top_performer_freshness_score": freshness_score(record, snapshot_date),
        }
        score = baseline_score(components['recent_views_12m_content_percentile'], components['recent_views_90d_content_percentile'], components['top_performer_freshness_score'])
        scored.append((record, score, components))
    return scored


def table(records: list[dict], content_type: str, snapshot_date: date) -> str:
    scored = [item for kind in ('Workshop','Sprint') for item in scored_records(records, kind, snapshot_date)] if content_type == 'All' else scored_records(records, content_type, snapshot_date)
    scored.sort(key=lambda item: (-item[1], clean(item[0].get('livelabsId'))))
    table_id = 'top-performers-table' if content_type == 'All' else f'top-performer-top-100-{content_type.lower()}s'
    header = "".join(
        f'<th data-sort-column-index="{index}" data-sort-type="{kind}" aria-sort="none"><button class="sort-button" type="button" data-sort-table="{table_id}" data-column-index="{index}" data-default-direction="{direction}" title="Sort by {title}">{title}</button></th>'
        for index, (title, kind, direction) in enumerate([
            ("#", "number", "asc"), ("Title", "text", "asc"), ("Author Email", "text", "asc"),
            ("WMS ID", "number", "desc"), ("LiveLabs ID", "number", "desc"), ("Category", "text", "asc"),
            ("Views 12m", "number", "desc"), ("Views 90d", "number", "desc"), ("Last Meaningful Update", "date", "desc"), ("Score", "number", "desc"), ("Type", "text", "asc"),
        ])
    )
    body: list[str] = []
    for index, (record, score, components) in enumerate(scored):
        detail = pairs(record)
        author = detail.get("Owner Email") or record.get("owner")
        updated = latest_update(record).isoformat() if latest_update(record) else "N/A"
        views = view_map(record)
        detail_id = f"{table_id}-detail-{index}"
        body.append(
            f'<tr class="expandable-row" data-filter-row="true" {row_attributes(record)} data-original-index="{index}" data-detail-row-id="{detail_id}" data-expanded="false" tabindex="0" aria-expanded="false">'
            + td(index + 1, "number") + td(record.get("title")) + td(author) + td(record.get("wmsId"), "number") + td(record.get("livelabsId"), "number")
            + td(record.get("category")) + td(int(views["recent_views_12m"]), "number") + td(int(views["recent_views_90d"]), "number") + td(updated, "date") + td(f"{score:.2f}", "number")
            + td(record.get('type')) + "</tr>"
        )
        body.append(f'<tr class="detail-row" data-detail-for="{detail_id}" hidden><td colspan="11"><div class="detail-shell"><p class="detail-title">Details for {escape(clean(record.get("title")))}.</p>{detail_table(record, components)}</div></td></tr>')
    plural = "Workshops" if content_type == "Workshop" else "Sprints"
    return (
        f'<section class="panel ranked-table-panel"><div class="panel-head"><h3>Top Performers</h3><span>{len(scored)} rows</span></div>'
        f'<div class="toggle-body">'
        f'<div class="table-tools"><span class="table-count" data-table-count-for="{table_id}">{len(scored)} rows</span>'
        f'<span class="table-hint">Click a row for more details.</span><button class="filter-reset" type="button" data-clear-filters-for="{table_id}">Clear filters</button></div>'
        f'<details class="filter-disclosure"><summary><svg class="filter-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M8 12h8"></path><path d="M11 17h2"></path></svg><span>Apply filters</span><span class="filter-chevron" aria-hidden="true"></span></summary>'
        f'{controls(table_id)}<div class="filter-grid">{filter_grid(table_id)}</div></details><div class="table-wrap" data-filter-table="{table_id}">'
        f'<table class="data-table" id="{table_id}"><thead><tr>{header}</tr></thead><tbody>{"".join(body)}</tbody></table></div></div></section>'
    )


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, default=Path("inventory/data/portfolio_inventory.json"))
    parser.add_argument("--output", type=Path, default=Path("assets/fragments/top-performers.html"))
    parser.add_argument("--snapshot-date", help="Defaults to the inventory's source snapshot date.")
    args = parser.parse_args()
    payload = json.loads(args.inventory.read_text(encoding="utf-8"))
    records = payload["records"]
    snapshot_date = datetime.strptime(args.snapshot_date or payload['metadata']['snapshot_date'], "%Y-%m-%d").date()
    output = "".join([
        '<section class="section" id="top-performers"><div class="section-head"><div class="section-head-top"><h2>Top Performers</h2></div>',
        '<p>Explore content ranked by demand, freshness and QA results.</p></div>',
        methodology_html(payload['metadata'].get('review_criteria', DEFAULT_CRITERIA), snapshot_date, payload['metadata'].get('review_evaluation_date'), section='performance'),
        '<div class="panel-stack ranked-table-stack">', table(records, "All", snapshot_date),
        '</div></section>'
    ])
    output = "\n".join(line.rstrip() for line in output.splitlines())
    args.output.write_text(output, encoding="utf-8")
    print(json.dumps({"output": str(args.output), "workshops": sum(1 for r in records if r.get("type") == "Workshop"), "sprints": sum(1 for r in records if r.get("type") == "Sprint")}, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
