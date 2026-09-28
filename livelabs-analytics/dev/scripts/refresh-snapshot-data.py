#!/usr/bin/env python3
"""Refresh the canonical inventory from a WMS, views, and tag snapshot.

The WMS export is the record source.  Existing inventory records provide the
GitHub and replacement evidence that is not part of the snapshot folder.  A
views workbook is title-based, so duplicate WMS titles are marked as shared
scope and duplicate workbook titles are quarantined as ambiguous instead of
being assigned arbitrarily.
"""

from __future__ import annotations

import argparse
import csv
from collections import Counter, defaultdict
from datetime import datetime, timezone
import json
import re
import subprocess
import unicodedata
from pathlib import Path

from openpyxl import load_workbook


VIEW_FIELDS = (
    ("last week", "Views - Last 7 Days", "recent_views_7d"),
    ("last two weeks", "Views - Last 14 Days", "recent_views_14d"),
    ("last month", "Views - Last 30 Days", "recent_views_30d"),
    ("last 90 days", "Views - Last 90 Days", "recent_views_90d"),
    ("last 180 days", "Views - Last 180 Days", "recent_views_180d"),
    ("last year", "Views - Last 12 Months", "recent_views_12m"),
)
VIEW_BY_BLOCK = {item[0]: item for item in VIEW_FIELDS}
VIEW_LABELS = {item[2]: item[1] for item in VIEW_FIELDS}
VIEW_RANK_LABELS = {item[2]: f"{item[1]} Rank" for item in VIEW_FIELDS}
TAG_LABELS = {"Focus", "Focus Area", "Product", "Role", "Sales Play", "Event", "Workshop Series"}
METRIC_LABELS = set(VIEW_LABELS.values()) | set(VIEW_RANK_LABELS.values())
REPLACED_LABELS = {
    "LiveLabs ID", "WMS ID", "WMS Workshop Title", "Content Type", "Publish Status", "Publish Type",
    "Workshop Status", "Council Area", "WMS Last Update", "Completion Date", "Author Coverage",
    "Contact Coverage Tier", "Workshop Time", "Production URL", "Production GitHub URL", "Owner Email",
    "Owner Group", "Short Description", "Long Description", "YouTube Link", "Dashboard Metric Status",
    "Dashboard Metric Scope", "Dashboard Metric Resolution", "Dashboard Shared Record Count",
}
REPLACED_LABELS |= TAG_LABELS | METRIC_LABELS


def clean(value: object) -> str:
    return "" if value in (None, "") else str(value).strip()


def parse_csv(path: Path) -> list[dict[str, str]]:
    last_error: Exception | None = None
    for encoding in ("utf-8-sig", "cp1252", "utf-8"):
        try:
            with path.open("r", encoding=encoding, newline="") as handle:
                return list(csv.DictReader(handle))
        except UnicodeDecodeError as error:
            last_error = error
    raise RuntimeError(f"Could not decode {path}: {last_error}")


def normalize_title(value: object) -> str:
    text = unicodedata.normalize("NFKC", clean(value)).replace("\u00bf", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(character for character in text if not unicodedata.combining(character))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def parse_date(value: object) -> str:
    text = clean(value)
    if not text:
        return ""
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).date().isoformat()
        except ValueError:
            pass
    return text[:10]


def parse_views(path: Path) -> tuple[dict[str, list[dict[str, int | str]]], dict[str, int]]:
    workbook = load_workbook(path, read_only=True, data_only=True)
    sheet = workbook.active
    rows = list(sheet.iter_rows(values_only=True))
    views: dict[str, list[dict[str, int | str]]] = defaultdict(list)
    row_counts: Counter[str] = Counter()
    active_block = ""
    for row in rows:
        cells = [clean(value) for value in row[:4]]
        marker = cells[1].lower() if len(cells) > 1 else ""
        if marker in VIEW_BY_BLOCK:
            active_block = marker
            continue
        if not active_block or cells[1].lower() == "name":
            continue
        name = cells[1]
        if not name:
            continue
        try:
            value = int(float(row[2]))
            rank = int(float(row[3]))
        except (TypeError, ValueError):
            continue
        views[active_block].append({"title": name, "normalized_title": normalize_title(name), "views": value, "rank": rank})
        row_counts[active_block] += 1
    workbook.close()
    return views, dict(row_counts)


def link_id(value: object) -> str:
    match = re.search(r"(?:[?&]|^)wid=(\d+)", clean(value), flags=re.IGNORECASE)
    return match.group(1) if match else ""


def read_tags(combined: Path, focus: Path, product: Path, roles: Path) -> dict[str, dict[str, set[str]]]:
    result: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))

    for row in parse_csv(combined):
        item_id = link_id(row.get("Livelabs Link"))
        label = clean(row.get("Tag"))
        value = clean(row.get("Subcategory"))
        if item_id and label and value:
            result[item_id][label].add(value)

    for path, label in ((focus, "Focus Area"), (product, "Product"), (roles, "Role")):
        for row in parse_csv(path):
            item_id = link_id(row.get("Livelabs Link"))
            value = clean(row.get("Subcategory"))
            if item_id and value:
                result[item_id][label].add(value)
    return result


def pair_map(pairs: object) -> dict[str, str]:
    result: dict[str, str] = {}
    for pair in pairs if isinstance(pairs, list) else []:
        if isinstance(pair, list) and len(pair) >= 2:
            result[clean(pair[0])] = clean(pair[1])
    return result


def add_pair(target: list[list[str]], label: str, value: object) -> None:
    text = clean(value)
    if text:
        target.append([label, text])


def display_contact(row: dict[str, str]) -> tuple[str, str]:
    if clean(row.get("Workshop Owner Email")):
        return "Individual author", "Individual"
    if clean(row.get("Workshop Owner Group")):
        return "Owner group fallback", "Fallback"
    return "No author, contact, or owner group evidence", "Missing"


def build_view_index(views: dict[str, list[dict[str, int | str]]]) -> dict[str, dict[str, list[dict[str, int | str]]]]:
    index: dict[str, dict[str, list[dict[str, int | str]]]] = defaultdict(lambda: defaultdict(list))
    for block, rows in views.items():
        for row in rows:
            index[normalize_title(row["title"])][block].append(row)
    return index


def metric_resolution(
    title_key: str,
    title_record_count: int,
    view_index: dict[str, dict[str, list[dict[str, int | str]]]],
) -> tuple[dict[str, int], dict[str, int], str, str, str, int | None]:
    by_window = view_index.get(title_key, {})
    if not by_window:
        return {}, {}, "not_in_dashboard_snapshot", "unavailable", "No exact title row exists in the 28 September 2026 dashboard workbook.", None
    metrics: dict[str, int] = {}
    ranks: dict[str, int] = {}
    ambiguous_windows: list[str] = []
    missing_windows: list[str] = []
    for block, label, field in VIEW_FIELDS:
        matches = by_window.get(block, [])
        if len(matches) == 1:
            metrics[field] = int(matches[0]["views"])
            ranks[f"{field}_rank"] = int(matches[0]["rank"])
        elif len(matches) > 1:
            ambiguous_windows.append(label)
        else:
            missing_windows.append(label)
    if not metrics:
        if ambiguous_windows:
            return {}, {}, "dashboard_title_ambiguous_no_usable_metric", "unavailable_ambiguous_title", "The workbook contains duplicate title rows and no window has a uniquely attributable metric.", None
        return {}, {}, "not_in_dashboard_snapshot", "unavailable", "No exact title row exists in any dashboard window.", None
    if title_record_count > 1:
        reason = f"Dashboard metrics are title-level and shared by {title_record_count} current WMS records; they are not LiveLabs-ID-specific."
        scope = "shared_title_across_wms_records"
        status = "available_shared_title_scope"
        shared = title_record_count
    else:
        reason = "Dashboard metrics matched one current WMS title."
        scope = "exact_unique_title"
        status = "available_unique_title_scope"
        shared = 1
    if ambiguous_windows:
        reason += " Ambiguous windows were withheld: " + ", ".join(ambiguous_windows) + "."
    if missing_windows:
        reason += " No row was present for: " + ", ".join(missing_windows) + "."
    return metrics, ranks, status, scope, reason, shared


def make_record(
    row: dict[str, str],
    old: dict | None,
    tags: dict[str, set[str]],
    metrics: dict[str, int],
    ranks: dict[str, int],
    metric_status: str,
    metric_scope: str,
    metric_reason: str,
    shared_count: int | None,
    sprint_by_id: dict[str, str],
    snapshot_date: str,
) -> dict:
    old = old or {}
    livelabs_id = clean(row.get("Livelabsid"))
    wms_id = clean(row.get("Workshop Id"))
    publish_title = clean(row.get("Publish Title")) or clean(row.get("Workshop Title")) or "N/A"
    workshop_title = clean(row.get("Workshop Title"))
    record_type = old.get("type") or ("Sprint" if sprint_by_id.get(livelabs_id) == "Y" else "Workshop")
    owner_email = clean(row.get("Workshop Owner Email"))
    owner_group = clean(row.get("Workshop Owner Group"))
    owner = owner_email or owner_group
    coverage_label, coverage_tier = display_contact(row)
    publish_type = clean(old.get("publishType"))
    key = f"livelabs:{livelabs_id}" if livelabs_id else f"wms:{wms_id}:{normalize_title(publish_title)}"

    previous_details = [pair for pair in old.get("details", []) if isinstance(pair, list) and clean(pair[0]) not in REPLACED_LABELS]
    previous_values = [pair for pair in old.get("values", []) if isinstance(pair, list) and clean(pair[0]) not in REPLACED_LABELS]
    old_detail_map = pair_map(old.get("details"))

    base_values: list[list[str]] = []
    base_details: list[list[str]] = []
    for target in (base_values, base_details):
        add_pair(target, "LiveLabs ID", livelabs_id)
        add_pair(target, "WMS ID", wms_id)
        add_pair(target, "WMS Workshop Title", workshop_title if workshop_title != publish_title else "")
        add_pair(target, "Content Type", record_type)
        add_pair(target, "Publish Status", row.get("Publish Status"))
        add_pair(target, "Publish Type", publish_type)
        add_pair(target, "Workshop Status", row.get("Workshop Status"))
        add_pair(target, "Council Area", row.get("Council Area"))
        add_pair(target, "WMS Last Update", row.get("Last Update Time"))
        add_pair(target, "Completion Date", row.get("Completion Date"))
        add_pair(target, "Author Coverage", coverage_label)
        add_pair(target, "Contact Coverage Tier", coverage_tier)
        add_pair(target, "Workshop Time", row.get("Workshop Time"))
    for target in (base_details,):
        add_pair(target, "Production URL", row.get("Production Url"))
        add_pair(target, "Production GitHub URL", row.get("Prod Github Url"))
        add_pair(target, "Owner Email", owner_email)
        add_pair(target, "Owner Group", owner_group)
        add_pair(target, "Short Description", row.get("Short Desc"))
        add_pair(target, "Long Description", row.get("Long Desc"))
        add_pair(target, "YouTube Link", row.get("Youtube Link"))

    if not old_detail_map.get("Update Evidence"):
        add_pair(base_details, "Update Evidence", "GitHub/update evidence unavailable; WMS record timestamp fallback")
    if not old_detail_map.get("Update Confidence"):
        add_pair(base_details, "Update Confidence", "unknown")
    if not old_detail_map.get("Update Scope"):
        add_pair(base_details, "Update Scope", "WMS metadata fallback")
    if not old_detail_map.get("Latest GitHub Update") and (old.get("sourceFlags") or {}).get("github_update_evidence_available"):
        add_pair(base_details, "Latest GitHub Update", old_detail_map.get("Latest Live Repo Commit Date") or old_detail_map.get("Latest Workshop Commit Date"))

    for field, label in VIEW_LABELS.items():
        if field in metrics:
            add_pair(base_values, label, metrics[field])
            add_pair(base_details, label, metrics[field])
        rank_field = f"{field}_rank"
        if rank_field in ranks:
            add_pair(base_details, VIEW_RANK_LABELS[field], ranks[rank_field])

    add_pair(base_details, "Dashboard Metric Status", metric_status)
    add_pair(base_details, "Dashboard Metric Scope", metric_scope)
    add_pair(base_details, "Dashboard Metric Resolution", metric_reason)
    add_pair(base_details, "Dashboard Shared Record Count", shared_count)
    for label, values in sorted(tags.items()):
        add_pair(base_details, label, ", ".join(sorted(values)))

    review_reason = "Missing LiveLabs ID in current WMS export; review as a draft or unpublished row" if not livelabs_id else ""
    source_flags = dict(old.get("sourceFlags") or {})
    source_flags.update(
        {
            "in_current_canonical": bool(metrics),
            "in_dashboard_windows": bool(metrics),
            "in_top_1000": any(rank <= 1000 for rank in ranks.values()),
            "in_wms_14_august": False,
            "in_wms_2026_09_28": True,
            "dashboard_snapshot_date": snapshot_date,
            "dashboard_metric_status": metric_status,
            "dashboard_metric_scope": metric_scope,
            "dashboard_metric_shared_record_count": shared_count,
        }
    )
    if not publish_type:
        source_flags["publish_type_resolution_status"] = "not_assigned_in_current_wms_workflow"
    if not source_flags.get("repository_mapping_status"):
        source_flags["repository_mapping_status"] = "pending_snapshot_repository_mapping"

    record = dict(old)
    record.update(
        {
            "key": key,
            "title": publish_title,
            "rawTitle": publish_title,
            "titleMissing": publish_title == "N/A",
            "wmsId": wms_id,
            "wmsIdMissing": not bool(wms_id),
            "livelabsId": livelabs_id,
            "livelabsIdMissing": not bool(livelabs_id),
            "category": clean(row.get("Council Area")),
            "categoryMissing": not bool(clean(row.get("Council Area"))),
            "owner": owner,
            "ownerMissing": not bool(owner),
            "type": record_type,
            "publishStatus": clean(row.get("Publish Status")),
            "publishType": publish_type,
            "status": clean(row.get("Workshop Status")),
            "lifecycleState": clean(row.get("Workshop Status")),
            "update": parse_date(row.get("Last Update Time")),
            "source": "28 September 2026 WMS, dashboard views, and WMS tag reports; GitHub repository/update evidence retained from 14-15 August 2026",
            "values": previous_values + base_values,
            "details": previous_details + base_details,
            "titleMissing": not bool(clean(row.get("Publish Title")) or clean(row.get("Workshop Title"))),
            "contentReviewState": "Content to review/remove" if not livelabs_id else "",
            "contentReviewReason": review_reason,
            "sourceFlags": source_flags,
            "contactCoverage": {
                "authorMissing": coverage_tier == "Missing",
                "label": coverage_label,
                "rank": coverage_tier.lower(),
                "tier": coverage_tier,
            },
        }
    )
    searchable_parts = [
        record["title"], record["wmsId"], record["livelabsId"], record["category"], record["owner"],
        record["type"], record["publishStatus"], record["publishType"], record["status"],
        *[clean(pair[1]) for pair in record["values"] + record["details"] if isinstance(pair, list) and len(pair) > 1],
    ]
    record["searchable"] = " ".join(part for part in searchable_parts if part)
    return record


def rebuild_families(records: list[dict]) -> None:
    families: dict[str, list[dict]] = defaultdict(list)
    for record in records:
        families[clean(record.get("wmsId"))].append(record)
    by_key = {record["key"]: record for record in records}
    for record in records:
        members = families.get(clean(record.get("wmsId")), [])
        record["family"] = {
            "wmsId": clean(record.get("wmsId")),
            "total": len(members),
            "siblings": [
                {
                    "key": sibling["key"], "livelabsId": sibling.get("livelabsId", ""), "wmsId": sibling.get("wmsId", ""),
                    "title": sibling.get("title", ""), "publishStatus": sibling.get("publishStatus", ""),
                    "publishType": sibling.get("publishType", ""), "category": sibling.get("category", ""),
                }
                for sibling in members if sibling["key"] != record["key"]
            ],
        }
    assert set(by_key) == {record["key"] for record in records}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--inventory", type=Path, default=Path("inventory/data/portfolio_inventory.json"))
    parser.add_argument("--baseline-git", help="Read the comparison baseline from a Git object such as HEAD:inventory/data/portfolio_inventory.json")
    parser.add_argument("--snapshot-date", default="2026-09-28")
    parser.add_argument("--generated-at")
    args = parser.parse_args()

    if args.baseline_git:
        old_payload = json.loads(subprocess.check_output(["git", "show", args.baseline_git], text=True, encoding="utf-8"))
    else:
        old_payload = json.loads(args.inventory.read_text(encoding="utf-8"))
    old_records = old_payload.get("records", [])
    old_by_id = {clean(record.get("livelabsId")): record for record in old_records if clean(record.get("livelabsId"))}
    old_by_fallback = {(clean(record.get("wmsId")), normalize_title(record.get("rawTitle") or record.get("title"))): record for record in old_records if not clean(record.get("livelabsId"))}

    wms_path = args.snapshot / "All Workshops Report (4).csv"
    wms_rows = parse_csv(wms_path)
    sprint_rows = parse_csv(args.snapshot / "All Workshops Report (2).csv")
    sprint_by_id = {clean(row.get("Livelabs ID")): clean(row.get("Sprint Flg")).upper() for row in sprint_rows if clean(row.get("Livelabs ID"))}
    views, view_counts = parse_views(args.snapshot / "livelabs_dashboard_top_views.xlsx")
    view_index = build_view_index(views)
    tags = read_tags(
        args.snapshot / "Workshop by Tags (Role, Product, Focus).csv",
        args.snapshot / "Workshop by Tags (Role, Product, Focus) (1).csv",
        args.snapshot / "Workshop by Tags (Role, Product, Focus) (2).csv",
        args.snapshot / "Workshop by Tags (Role, Product, Focus) (3).csv",
    )

    title_counts = Counter(normalize_title(row.get("Publish Title") or row.get("Workshop Title")) for row in wms_rows)
    records: list[dict] = []
    statuses: Counter[str] = Counter()
    metric_statuses: Counter[str] = Counter()
    for row in wms_rows:
        livelabs_id = clean(row.get("Livelabsid"))
        title = clean(row.get("Publish Title")) or clean(row.get("Workshop Title"))
        old = old_by_id.get(livelabs_id) if livelabs_id else old_by_fallback.get((clean(row.get("Workshop Id")), normalize_title(title)))
        metrics, ranks, metric_status, metric_scope, metric_reason, shared_count = metric_resolution(
            normalize_title(title), title_counts[normalize_title(title)], view_index
        )
        record = make_record(
            row, old, tags.get(livelabs_id, {}), metrics, ranks, metric_status, metric_scope, metric_reason,
            shared_count, sprint_by_id, args.snapshot_date,
        )
        records.append(record)
        statuses[record["publishStatus"] or "Missing"] += 1
        metric_statuses[metric_status] += 1

    rebuild_families(records)
    old_ids = {clean(record.get("livelabsId")) for record in old_records if clean(record.get("livelabsId"))}
    new_ids = {clean(record.get("livelabsId")) for record in records if clean(record.get("livelabsId"))}
    generated_at = args.generated_at or datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    stable_count = len(new_ids)
    shared_families = sum(1 for members in defaultdict(list).values() if len(members) > 1)
    family_counts = Counter(clean(record.get("wmsId")) for record in records)
    tag_coverage = sum(1 for record in records if tags.get(clean(record.get("livelabsId"))))
    dashboard_available = sum(1 for record in records if record["sourceFlags"].get("in_dashboard_windows"))
    dashboard_unique = sum(1 for record in records if record["sourceFlags"].get("dashboard_metric_status") == "available_unique_title_scope")
    dashboard_shared = sum(1 for record in records if record["sourceFlags"].get("dashboard_metric_status") == "available_shared_title_scope")
    payload = {
        "metadata": {
            "generated_at": generated_at,
            "snapshot_date": args.snapshot_date,
            "source": "28 September 2026 WMS, dashboard views, and WMS tag reports; GitHub repository/update evidence retained from 14-15 August 2026",
            "row_identity": "livelabs_id_or_wms_title_fallback",
            "family_grouping": "wms_id",
            "records": len(records),
            "stable_livelabs_id_records": stable_count,
            "draft_or_unpublished_id_pending_records": len(records) - stable_count,
            "dashboard_metric_records": dashboard_available,
            "dashboard_metric_unique_title_records": dashboard_unique,
            "dashboard_metric_shared_title_records": dashboard_shared,
            "dashboard_metric_unavailable_records": len(records) - dashboard_available,
            "shared_wms_family_count": sum(1 for count in family_counts.values() if count > 1),
            "tagged_livelabs_id_records": tag_coverage,
            "new_livelabs_id_count_vs_prior": len(new_ids - old_ids),
            "removed_livelabs_id_count_vs_prior": len(old_ids - new_ids),
            "internal_contact_data": True,
            "contact_email_domain_policy": "Oracle internal contacts retained",
            "quality_gaps": {
                "missing_title": sum(1 for record in records if record.get("titleMissing")),
                "missing_wms_id": sum(1 for record in records if record.get("wmsIdMissing")),
                "missing_livelabs_id": len(records) - stable_count,
                "content_to_review_or_remove": sum(1 for record in records if record.get("contentReviewState")),
                "delete_requested": statuses.get("Delete Requested", 0),
                "publish_type_unresolved": sum(1 for record in records if not record.get("publishType")),
            },
            "source_files": {
                "wms": wms_path.name,
                "views": "livelabs_dashboard_top_views.xlsx",
                "tags": [
                    "Tags.csv", "Workshop by Tags (Role, Product, Focus).csv",
                    "Workshop by Tags (Role, Product, Focus) (1).csv",
                    "Workshop by Tags (Role, Product, Focus) (2).csv",
                    "Workshop by Tags (Role, Product, Focus) (3).csv",
                ],
            },
            "dashboard_window_row_counts": view_counts,
            "dashboard_metric_status_counts": dict(metric_statuses),
            "data_freshness": {
                "wms_snapshot_date": args.snapshot_date,
                "dashboard_views_snapshot_date": args.snapshot_date,
                "tag_snapshot_date": args.snapshot_date,
                "github_repository_snapshot_date": "2026-08-15",
                "workshop_update_evidence_snapshot_date": "2026-08-14",
                "governance_evidence_refresh_required": True,
            },
            "github_audit": old_payload.get("metadata", {}).get("github_audit", {}),
            "workshop_updates": {
                **old_payload.get("metadata", {}).get("workshop_updates", {}),
                "source_snapshot_date": "2026-08-14",
                "refresh_status": "retained_from_prior_snapshot",
                "matched_records": len(records),
                "unmatched_wms_records": 0,
                "orphan_update_records": 0,
                "meaningful_git_update_records": sum(1 for record in records if record.get("sourceFlags", {}).get("github_update_evidence_available")),
                "workshop_specific_git_update_records": sum(1 for record in records if record.get("sourceFlags", {}).get("github_workshop_path_evidence")),
                "repository_proxy_git_update_records": sum(1 for record in records if record.get("sourceFlags", {}).get("github_repository_proxy_evidence")),
                "wms_metadata_fallback_records": sum(1 for record in records if not record.get("sourceFlags", {}).get("github_update_evidence_available")),
                "source_counts": {
                    **old_payload.get("metadata", {}).get("workshop_updates", {}).get("source_counts", {}),
                    "wms_metadata_fallback": 43,
                },
            },
            "source_snapshot_comparison": {
                "prior_snapshot_date": old_payload.get("metadata", {}).get("snapshot_date"),
                "new_snapshot_date": args.snapshot_date,
                "new_stable_livelabs_ids": sorted(new_ids - old_ids, key=lambda value: int(value)),
                "removed_stable_livelabs_ids": sorted(old_ids - new_ids, key=lambda value: int(value)),
            },
            "source_file": "portfolio_inventory.json",
            "canonical_payload": True,
            "content_review_count": sum(1 for record in records if record.get("contentReviewState")),
            "counts": {
                "type": dict(Counter(record.get("type") for record in records)),
                "publish_status": dict(statuses),
                "publish_type": dict(Counter(record.get("publishType") or "Missing" for record in records)),
                "contact_coverage": dict(Counter(record.get("contactCoverage", {}).get("tier") for record in records)),
            },
            "governance_layer_notice": "Inventory, WMS metadata, tags, and dashboard view metrics are refreshed to 28 September 2026. GitHub/update evidence and replacement similarity remain dated 14-15 August 2026 until their source exports are refreshed.",
        },
        "records": records,
    }
    args.inventory.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    print(json.dumps({
        "inventory": str(args.inventory),
        "records": len(records),
        "stable_livelabs_ids": stable_count,
        "added_stable_livelabs_ids": len(new_ids - old_ids),
        "removed_stable_livelabs_ids": len(old_ids - new_ids),
        "metric_status_counts": dict(metric_statuses),
        "publish_status_counts": dict(statuses),
        "shared_wms_families": sum(1 for count in family_counts.values() if count > 1),
    }, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
