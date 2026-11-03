#!/usr/bin/env python3
"""Build author-facing risk and retirement tables from public/published records."""

from __future__ import annotations

from datetime import date, datetime
from html import escape
import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
INPUT = ROOT / "inventory" / "data" / "public_portfolio_inventory.json"
FRAGMENTS = ROOT / "assets" / "fragments"
SNAPSHOT_DATE = date(2026, 9, 28)
MAX_ROWS = 100


def clean(value: object) -> str:
    return "" if value is None else str(value).strip()


def detail_map(record: dict) -> dict[str, str]:
    return {clean(pair[0]): clean(pair[1]) for pair in record.get("details", []) if isinstance(pair, list) and len(pair) >= 2}


def numeric(value: object) -> float | None:
    try:
        return float(str(value).replace(",", "").strip())
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
        age_months = round(max(0, (SNAPSHOT_DATE - updated).days) / 30.4375, 1) if updated else None
        missing_author = record.get("ownerMissing") if isinstance(record.get("ownerMissing"), bool) else None
        components = []
        view_percentile = percentile(view_count, population) if view_count is not None else None
        if view_percentile is not None:
            components.append((0.50, 100 - view_percentile))
        if age_months is not None:
            components.append((0.35, min(100, age_months / 36 * 100)))
        if missing_author is not None:
            components.append((0.15, 100 if missing_author else 0))
        score = round(sum(weight * value for weight, value in components) / sum(weight for weight, _ in components), 2) if components else None
        rows.append({
            "record": record,
            "views12m": view_count,
            "updated": updated,
            "ageMonths": age_months,
            "missingAuthor": missing_author,
            "score": score,
            "scoreCoverage": "Complete" if len(components) == 3 else "Partial" if components else "N/A",
        })
    return rows


def td(value: object, kind: str = "text") -> str:
    text = clean(value)
    normalized = text.lower()
    sort = normalized
    if kind == "number":
        sort = text.replace(",", "")
    elif kind == "date":
        sort = text
    return f'<td data-filter-value="{escape(normalized)}" data-sort-value="{escape(sort)}">{escape(text or "N/A")}</td>'


def table_html(rows: list[dict], content_type: str, table_id: str, retirement: bool = False) -> str:
    columns = [
        ("#", "number"), ("Title", "text"), ("Author", "text"), ("WMS ID", "number"),
        ("LiveLabs ID", "number"), ("Category", "text"), ("Views 12m", "number"),
        ("Last Meaningful Update", "date"), ("Retire Score" if retirement else "Review Score", "number"),
        ("Score Evidence", "text"),
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
            td(updated, "date"), td(score, "number"), td(item["scoreCoverage"]),
        ])
        body.append(f'<tr class="expandable-row" data-filter-row="true" data-original-index="{index}" data-detail-row-id="{detail_id}" data-expanded="false" tabindex="0" aria-expanded="false">{base}</tr>')
        detail_rows = [
            ("Content type", record.get("type")), ("Publish status", record.get("publishStatus")),
            ("Publish type", record.get("publishType")), ("Workflow status", record.get("status")),
            ("Views in the last 12 months", f'{item["views12m"]:,.0f}' if item["views12m"] is not None else "N/A"),
            ("Last meaningful update", updated), ("Author/contact", owner),
            ("Review score inputs", "Public demand, update age, and author/contact coverage"),
        ]
        detail_html = "".join(f'<tr><th>{escape(clean(label))}</th><td>{escape(clean(value) or "N/A")}</td></tr>' for label, value in detail_rows)
        body.append(f'<tr class="detail-row" data-detail-for="{detail_id}" hidden><td colspan="{len(columns)}"><div class="detail-shell"><p class="detail-title">Review details for {escape(title)}.</p><table class="detail-table"><tbody>{detail_html}</tbody></table></div></td></tr>')
    label = "Retirement Review" if retirement else "At-Risk Content"
    notes = (
        "Candidates have 12-month views at or below 250 and no meaningful update in the last 12 months. Review the source evidence before deciding; this score does not recommend an automatic retirement."
        if retirement else
        "Ranked from the current public cohort using available demand, update-age, and author/contact signals. Jenkins P2/P3 findings adjust the review score when a matched report is available."
    )
    return (
        f'<section class="panel ranked-table-panel"><div class="panel-head"><h3>{label} {content_type}s</h3><span>{len(rows)} rows</span></div>'
        f'<div class="toggle-body"><p class="note">{escape(notes)}</p>'
        f'<div class="table-tools"><span class="table-count" data-table-count-for="{table_id}">{len(rows)} rows</span>'
        f'<span class="table-hint">Open a row to review its source fields.</span><button class="filter-reset" type="button" data-clear-filters-for="{table_id}">Clear filters</button></div>'
        f'<details class="filter-disclosure"><summary><span>Apply filters</span><span class="filter-chevron" aria-hidden="true"></span></summary>'
        f'<div class="filter-grid">{filters}</div></details><div class="table-wrap" data-filter-table="{table_id}">'
        f'<table class="data-table" id="{table_id}"><thead><tr>{header}</tr></thead><tbody>{"".join(body)}</tbody></table></div></div></section>'
    )


def build_fragment(records: list[dict], retirement: bool) -> str:
    content = []
    for content_type in ("Workshop", "Sprint"):
        rows = review_metrics(records, content_type)
        if retirement:
            rows = [item for item in rows if item["views12m"] is not None and item["ageMonths"] is not None and item["views12m"] <= 250 and item["ageMonths"] > 12]
        rows.sort(key=lambda item: (item["score"] is None, -(item["score"] or 0), clean(item["record"].get("title")).lower()))
        rows = rows[:MAX_ROWS]
        table_id = f'{"retire-now" if retirement else "at-risk"}-top-100-{content_type.lower()}s'
        content.append(table_html(rows, content_type, table_id, retirement))
    title = "Retirement Review" if retirement else "At-Risk Content"
    summary = (
        '<details class="panel toggle-panel"><summary class="panel-head"><h3>How the Retirement Review Score Works</h3><span>Available Analytics signals</span></summary><div class="toggle-body"><p class="note">The base score combines low-demand percentile (50%), update age capped at 36 months (35%), and missing author/contact (15%). Available components are reweighted when a source value is missing. A matched Jenkins Error Score contributes 25% to review priority.</p></div></details>'
        if retirement else
        '<details class="panel toggle-panel"><summary class="panel-head"><h3>How the Review Score Works</h3><span>Available Analytics signals</span></summary><div class="toggle-body"><p class="note">The base score combines low-demand percentile (50%), update age capped at 36 months (35%), and missing author/contact (15%). Available components are reweighted when a source value is missing. Jenkins Error Score contributes 25% to review priority when matched evidence is available.</p></div></details>'
    )
    intro = (
        "Review low-demand public workshops and sprints with older update evidence. A person confirms retirement decisions."
        if retirement else
        "Review published public workshops and sprints using the current Analytics signals and matched Jenkins findings. P1 issues stay in their separate urgent queue."
    )
    return (
        f'<section class="section" id="{"retire-now-content" if retirement else "at-risk-content"}">'
        f'<div class="section-head"><div class="section-head-top"><h2>{title}</h2></div><p>{escape(intro)}</p></div>'
        f'{summary}<div class="panel-stack ranked-table-stack">{"".join(content)}</div></section>'
    )


def main() -> None:
    payload = json.loads(INPUT.read_text(encoding="utf-8"))
    records = payload.get("records")
    if not isinstance(records, list) or payload.get("metadata", {}).get("data_scope") != "public_published":
        raise SystemExit("Expected the public/published inventory projection.")
    FRAGMENTS.mkdir(parents=True, exist_ok=True)
    (FRAGMENTS / "at-risk-content.html").write_text(build_fragment(records, False), encoding="utf-8")
    (FRAGMENTS / "retire-now-content.html").write_text(build_fragment(records, True), encoding="utf-8")
    print(json.dumps({
        "publicRecords": len(records),
        "atRiskWorkshopRows": len(review_metrics(records, "Workshop")[:MAX_ROWS]),
        "atRiskSprintRows": len(review_metrics(records, "Sprint")[:MAX_ROWS]),
        "retirementWorkshopCandidates": len([r for r in review_metrics(records, "Workshop") if r["views12m"] is not None and r["ageMonths"] is not None and r["views12m"] <= 250 and r["ageMonths"] > 12]),
        "retirementSprintCandidates": len([r for r in review_metrics(records, "Sprint") if r["views12m"] is not None and r["ageMonths"] is not None and r["views12m"] <= 250 and r["ageMonths"] > 12]),
    }, indent=2))


if __name__ == "__main__":
    main()
