#!/usr/bin/env python3
"""Audit refreshed inventory integrity and independently recompute displayed formulas."""

from __future__ import annotations

import argparse
from collections import Counter
import json
from pathlib import Path

from lxml import html


def number(value: object) -> float:
    return float(str(value).replace(",", "").strip())


def detail_map(row) -> dict[str, str]:
    detail_id = row.get("data-detail-row-id")
    detail = row.getparent().xpath(f"./tr[@data-detail-for='{detail_id}']")[0]
    return {
        th.text_content().strip(): td.text_content().strip()
        for th, td in zip(
            detail.xpath(".//table[@class='detail-table']//th"),
            detail.xpath(".//table[@class='detail-table']//td"),
        )
    }


def audit_top(path: Path) -> tuple[int, int, list[str]]:
    root = html.fromstring(path.read_text(encoding="utf-8"))
    checked = 0
    failures = []
    for table in root.xpath("//table[@class='data-table']"):
        for row in table.xpath(".//tbody/tr[@data-filter-row='true']"):
            values = detail_map(row)
            try:
                expected = round(
                    0.45 * number(values["recent_views_12m_content_percentile"])
                    + 0.35 * number(values["recent_views_90d_content_percentile"])
                    + 0.20 * number(values["top_performer_freshness_score"]),
                    2,
                )
                actual = number(row.xpath("./td[10]")[0].text_content())
                checked += 1
                if expected != actual:
                    failures.append(row.xpath("./td[2]")[0].text_content().strip())
            except (KeyError, ValueError, IndexError):
                failures.append(row.xpath("./td[2]")[0].text_content().strip())
    return checked, len(failures), failures[:5]


def audit_replacement(path: Path) -> tuple[int, int, list[str]]:
    root = html.fromstring(path.read_text(encoding="utf-8"))
    rows = root.xpath("//table[@id='replacement-recommendations']//tbody/tr[@data-filter-row='true']")
    checked = 0
    failures = []
    for row in rows:
        values = detail_map(row)
        try:
            expected = round(
                0.55 * number(values["Content Similarity"])
                + 0.15 * number(values["Category Similarity"])
                + 0.15 * number(values["Recency Similarity"])
                + 0.10 * number(values["Level Similarity"])
                + 0.05 * number(values["Title Similarity"]),
                2,
            )
            actual = number(row.xpath("./td[10]")[0].text_content())
            checked += 1
            if expected != actual:
                failures.append(row.xpath("./td[2]")[0].text_content().strip())
        except (KeyError, ValueError, IndexError):
            failures.append(row.xpath("./td[2]")[0].text_content().strip())
    return checked, len(failures), failures[:5]


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", type=Path, default=Path("."))
    args = parser.parse_args()
    inventory = json.loads((args.root / "inventory/data/portfolio_inventory.json").read_text(encoding="utf-8"))
    records = inventory["records"]
    ids = [record.get("livelabsId") for record in records if record.get("livelabsId")]
    keys = [record.get("key") for record in records]
    metric_records = [record for record in records if record.get("sourceFlags", {}).get("in_dashboard_windows")]
    metric_values = []
    for record in records:
        for pair in record.get("values", []):
            if isinstance(pair, list) and len(pair) >= 2 and str(pair[0]).startswith("Views -"):
                try:
                    metric_values.append(number(pair[1]))
                except ValueError:
                    pass
    top_checked, top_failures, top_examples = audit_top(args.root / "assets/fragments/top-performers.html")
    replacement_checked, replacement_failures, replacement_examples = audit_replacement(args.root / "assets/fragments/replacement-suggestions.html")
    output = {
        "inventory_records": len(records),
        "unique_keys": len(set(keys)),
        "unique_stable_livelabs_ids": len(set(ids)),
        "dashboard_metric_records": len(metric_records),
        "metric_value_count": len(metric_values),
        "metric_values_nonnegative": min(metric_values, default=0) >= 0,
        "publish_status_counts": dict(Counter(record.get("publishStatus") or "Missing" for record in records)),
        "wms_family_count": len({record.get("wmsId") for record in records}),
        "top_rows_checked": top_checked,
        "top_formula_failures": top_failures,
        "top_failure_examples": top_examples,
        "replacement_rows_checked": replacement_checked,
        "replacement_formula_failures": replacement_failures,
        "replacement_failure_examples": replacement_examples,
        "at_risk_rows": len(html.fromstring((args.root / "assets/fragments/at-risk-content.html").read_text(encoding="utf-8")).xpath("//tr[@data-filter-row='true']")),
        "retire_now_rows": len(html.fromstring((args.root / "assets/fragments/retire-now-content.html").read_text(encoding="utf-8")).xpath("//tr[@data-filter-row='true']")),
        "governance_evidence_refresh_required": inventory["metadata"].get("data_freshness", {}).get("governance_evidence_refresh_required"),
    }
    print(json.dumps(output, indent=2))
    return 1 if top_failures or replacement_failures or len(set(keys)) != len(keys) or len(set(ids)) != len(ids) else 0


if __name__ == "__main__":
    raise SystemExit(main())
