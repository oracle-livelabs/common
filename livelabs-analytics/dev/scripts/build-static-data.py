#!/usr/bin/env python3
"""Build static search and inventory JSON from current WMS, dashboard, tags, and GitHub evidence."""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
import csv
from datetime import datetime, timezone
import json
from pathlib import Path
import re


VIEW_FIELDS = (
    "recent_views_7d",
    "recent_views_14d",
    "recent_views_30d",
    "recent_views_90d",
    "recent_views_180d",
    "recent_views_12m",
)
VIEW_LABELS = {
    "recent_views_7d": "Views - Last 7 Days",
    "recent_views_14d": "Views - Last 14 Days",
    "recent_views_30d": "Views - Last 30 Days",
    "recent_views_90d": "Views - Last 90 Days",
    "recent_views_180d": "Views - Last 180 Days",
    "recent_views_12m": "Views - Last 12 Months",
}
UPDATE_SOURCE_LABELS = {
    "live_github_http_workshop_path": "Live GitHub workshop path",
    "local_repo_workshop_path": "Local Git mirror workshop path",
    "live_github_http_repo_level_proxy": "Live GitHub repository-level proxy",
    "local_repo_level_proxy": "Local Git mirror repository-level proxy",
    "missing_local_repo": "GitHub workshop path unresolved",
    "unmapped_repo": "GitHub repository not mapped",
    "live_repository_unavailable": "Live GitHub repository unavailable",
}


def clean(value: object) -> str:
    return "" if value in (None, "") else str(value).strip()


def display(value: object) -> str:
    return clean(value).replace("_", " ").title()


def normalize_na(value: object) -> str:
    return re.sub(r"\bnot available\b", "N/A", clean(value), flags=re.IGNORECASE)


def clean_contact_list(value: object) -> str:
    return re.sub(r"(?:,\s*){2,}", ", ", clean(value)).strip(" ,")


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def read_csv(path: Path) -> list[dict[str, str]]:
    for encoding in ("utf-8-sig", "utf-8", "cp1252"):
        try:
            with path.open("r", encoding=encoding, newline="") as handle:
                return list(csv.DictReader(handle))
        except UnicodeDecodeError:
            continue
    raise UnicodeDecodeError("utf-8", b"", 0, 1, f"Could not decode CSV: {path}")


def livelabs_id_from_link(value: object) -> str | None:
    match = re.search(r"(?:[?&]|^)wid=(\d+)", clean(value), re.IGNORECASE)
    return match.group(1) if match else None


def add_tags(target: dict[str, dict[str, set[str]]], path: Path, tag_name: str | None) -> None:
    for row in read_csv(path):
        livelabs_id = livelabs_id_from_link(row.get("Livelabs Link"))
        subcategory = clean(row.get("Subcategory"))
        category = clean(row.get("Tag")) or clean(tag_name)
        if livelabs_id and category and subcategory:
            target[livelabs_id][category].add(subcategory)


def dashboard_metrics(tables: dict) -> dict[str, dict]:
    metrics: dict[str, dict] = {}
    for value in tables.values():
        if not isinstance(value, list):
            continue
        for row in value:
            if not isinstance(row, dict) or not row.get("workshop_key"):
                continue
            current = metrics.setdefault(row["workshop_key"], {})
            for key, item in row.items():
                if item not in (None, "", [], {}):
                    current[key] = item
    return metrics


def add_pair(target: list[list[str]], label: str, value: object) -> None:
    text = clean(value)
    if text:
        target.append([label, text])


def contact_coverage(row: dict) -> tuple[str, str]:
    if clean(row.get("workshop_owner_email")):
        return "Individual author", "Individual"
    if clean(row.get("workshop_owner_group")):
        return "Owner group fallback", "Fallback"
    return "No author, contact, or owner group evidence", "Missing"


def update_scope(source: str) -> str:
    if source.endswith("workshop_path"):
        return "Workshop-specific Git evidence"
    if source.endswith("repo_level_proxy"):
        return "Repository-level Git proxy"
    return "WMS metadata fallback"


def update_evidence(update_row: dict, wms_last_update: object) -> str:
    source = clean(update_row.get("last_updated_source"))
    confidence = clean(update_row.get("last_updated_confidence")) or "unknown"
    source_label = UPDATE_SOURCE_LABELS.get(source, display(source) or "GitHub evidence unavailable")
    if clean(update_row.get("last_meaningful_workshop_update_date")):
        return f"{source_label} ({confidence} confidence)"
    if clean(wms_last_update):
        return f"{source_label}; WMS record timestamp fallback ({confidence} confidence)"
    return f"{source_label} ({confidence} confidence)"


def safe_metadata(metadata: dict, excluded: set[str]) -> dict:
    return {key: value for key, value in metadata.items() if key not in excluded}


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wms-json", required=True)
    parser.add_argument("--dashboard-tables", required=True)
    parser.add_argument("--dashboard-views")
    parser.add_argument("--tag-primary", required=True)
    parser.add_argument("--tag-focus", required=True)
    parser.add_argument("--tag-product", required=True)
    parser.add_argument("--tag-roles", required=True)
    parser.add_argument("--taxonomy-csv", required=True)
    parser.add_argument("--github-audit")
    parser.add_argument("--workshop-updates")
    parser.add_argument("--search-output", help="Optional legacy duplicate payload; omit for the canonical single-payload build")
    parser.add_argument("--inventory-output", required=True)
    args = parser.parse_args()

    wms_payload = read_json(Path(args.wms_json))
    dashboard_payload = read_json(Path(args.dashboard_tables))
    rows = wms_payload.get("canonical_rows", [])
    tables = dashboard_payload.get("tables", {})
    metrics_by_key = dashboard_metrics(tables)
    metrics_by_title: dict[str, dict] = {}
    if args.dashboard_views and Path(args.dashboard_views).exists():
        dashboard_views_payload = read_json(Path(args.dashboard_views))
        metrics_by_title = {
            clean(row.get("normalized_title")): row
            for row in dashboard_views_payload.get("workshops", [])
            if clean(row.get("normalized_title"))
        }
    top_1000_keys = {row.get("workshop_key") for row in tables.get("top_1000", [])}

    tags: dict[str, dict[str, set[str]]] = defaultdict(lambda: defaultdict(set))
    add_tags(tags, Path(args.tag_primary), None)
    add_tags(tags, Path(args.tag_focus), "Focus Area")
    add_tags(tags, Path(args.tag_product), "Product")
    add_tags(tags, Path(args.tag_roles), "Role")
    taxonomy_rows = len(read_csv(Path(args.taxonomy_csv)))

    github_live: dict[str, bool] = {}
    github_metadata: dict = {}
    if args.github_audit and Path(args.github_audit).exists():
        github_payload = read_json(Path(args.github_audit))
        github_metadata = safe_metadata(
            github_payload.get("metadata", {}),
            {"repo_root", "wms_json"},
        )
        github_live = {
            clean(row.get("repo_slug")): row.get("live_head_probe_status") == "available"
            for row in github_payload.get("repositories", [])
        }

    workshop_updates_metadata: dict = {}
    workshop_updates_by_key: dict[str, dict] = {}
    if args.workshop_updates and Path(args.workshop_updates).exists():
        workshop_updates_payload = read_json(Path(args.workshop_updates))
        workshop_updates_metadata = safe_metadata(
            workshop_updates_payload.get("metadata", {}),
            {
                "repo_root",
                "live_cache_root",
                "live_fetch_status_counts",
                "live_fetch_block_reason",
            },
        )
        workshop_update_rows = workshop_updates_payload.get("rows", [])
        update_keys = [clean(row.get("workshop_key")) for row in workshop_update_rows]
        duplicate_update_keys = sorted(
            key for key, count in Counter(update_keys).items() if key and count > 1
        )
        if duplicate_update_keys:
            raise ValueError(
                "Duplicate workshop update keys: " + ", ".join(duplicate_update_keys[:10])
            )
        workshop_updates_by_key = {
            clean(row.get("workshop_key")): row
            for row in workshop_update_rows
            if clean(row.get("workshop_key"))
        }

    family_rows: dict[str, list[dict]] = defaultdict(list)
    for row in rows:
        family_rows[clean(row.get("wms_id"))].append(row)

    records: list[dict] = []
    tag_coverage = 0
    no_author_count = 0
    for row in rows:
        key = clean(row.get("workshop_key"))
        livelabs_id = clean(row.get("livelabs_id"))
        wms_id = clean(row.get("wms_id"))
        title = clean(row.get("title")) or "N/A"
        publish_status = display(row.get("publish_status"))
        publish_type = display(row.get("publish_type"))
        sprint_flag = clean(row.get("sprint_flag")).upper()
        content_type = "Sprint" if sprint_flag == "Y" else "Workshop"
        category = clean(row.get("category"))
        owner = clean(row.get("workshop_owner_email")) or clean(row.get("workshop_owner_group"))
        coverage_label, coverage_tier = contact_coverage(row)
        if coverage_tier == "Missing":
            no_author_count += 1
        metrics = (
            metrics_by_title.get(clean(row.get("normalized_title")), {})
            if metrics_by_title
            else metrics_by_key.get(key, {})
        )
        update_row = workshop_updates_by_key.get(key, {})
        update_source = clean(update_row.get("last_updated_source"))
        update_confidence = clean(update_row.get("last_updated_confidence")) or "unknown"
        meaningful_update = clean(update_row.get("last_meaningful_workshop_update_date"))
        workshop_specific_update = update_source.endswith("workshop_path")
        repository_proxy_update = update_source.endswith("repo_level_proxy")
        evidence_label = update_evidence(update_row, row.get("wms_last_update_time"))
        record_tags = tags.get(livelabs_id, {}) if livelabs_id else {}
        if record_tags:
            tag_coverage += 1

        values: list[list[str]] = []
        details: list[list[str]] = []
        for target in (values, details):
            add_pair(target, "LiveLabs ID", livelabs_id)
            add_pair(target, "WMS ID", wms_id)
            add_pair(target, "Content Type", content_type)
            add_pair(target, "Publish Status", publish_status)
            add_pair(target, "Publish Type", publish_type)
            add_pair(target, "Workshop Status", row.get("workshop_status"))
            add_pair(target, "Workshop Level", row.get("workshop_level"))
            add_pair(target, "Council Area", category)
            add_pair(target, "WMS Last Update", row.get("wms_last_update_time"))
            add_pair(target, "Completion Date", row.get("completion_date"))
            add_pair(target, "Author Coverage", coverage_label)
            add_pair(target, "Contact Coverage Tier", coverage_tier)
            add_pair(target, "GitHub Repository", row.get("repo_slug"))
            add_pair(target, "Repository Mapping Status", display(row.get("repository_mapping_status")))
            add_pair(target, "Workshop Time", row.get("workshop_time"))
        add_pair(details, "Production URL", row.get("production_url"))
        add_pair(details, "Production GitHub URL", row.get("prod_github_url"))
        add_pair(details, "Repository Mapping Evidence", row.get("repository_mapping_evidence"))
        add_pair(details, "Repository Mapping Confidence", display(row.get("repo_mapping_confidence")))
        add_pair(details, "Owner Email", row.get("workshop_owner_email"))
        add_pair(details, "Owner Group", row.get("workshop_owner_group"))
        add_pair(details, "Short Description", row.get("short_description"))
        add_pair(details, "Long Description", row.get("long_description"))
        add_pair(details, "YouTube Link", row.get("youtube_link"))
        add_pair(details, "Update Evidence", evidence_label)
        add_pair(details, "Update Confidence", update_confidence)
        add_pair(details, "Update Scope", update_scope(update_source))
        add_pair(details, "Repository Evidence Status", display(update_row.get("repository_evidence_status")))
        add_pair(details, "Latest GitHub Update", meaningful_update)
        if workshop_specific_update:
            add_pair(details, "Last Meaningful Workshop Update", meaningful_update)
            add_pair(details, "Latest Workshop Commit Date", update_row.get("latest_workshop_commit_date"))
            add_pair(details, "First Workshop Commit Date", update_row.get("first_workshop_commit_date"))
        elif repository_proxy_update:
            add_pair(details, "Latest Repository Update Proxy", meaningful_update)
        add_pair(details, "Latest Live Repo Commit Date", update_row.get("latest_live_git_commit_date"))
        add_pair(
            details,
            "Latest Workshop Markdown Commit Date",
            update_row.get("latest_workshop_markdown_commit_date"),
        )
        add_pair(details, "Latest Meaningful Commit", update_row.get("latest_meaningful_commit_subject"))
        add_pair(details, "Git Commit Author", update_row.get("commit_author_name"))
        add_pair(details, "Resolved Workshop Path", update_row.get("resolved_workshop_path"))
        add_pair(details, "Resolved Manifest Path", update_row.get("resolved_manifest_path"))
        add_pair(details, "Acknowledgement Date", update_row.get("latest_acknowledgement_date"))
        add_pair(details, "Acknowledgement Author", clean_contact_list(update_row.get("acknowledgement_author")))
        add_pair(details, "Acknowledgement Updater", clean_contact_list(update_row.get("acknowledgement_updater")))
        add_pair(
            details,
            "Acknowledgement Contributors",
            clean_contact_list(update_row.get("acknowledgement_contributors")),
        )
        add_pair(details, "Acknowledgement Source File", update_row.get("acknowledgement_source_file"))
        add_pair(
            details,
            "Acknowledgement vs Git",
            normalize_na(update_row.get("acknowledgement_vs_git_sync_status")),
        )
        add_pair(
            details,
            "Acknowledgement vs WMS",
            normalize_na(update_row.get("acknowledgement_vs_wms_sync_status")),
        )
        add_pair(details, "Publish Type Resolution", display(row.get("publish_type_resolution_status")))
        add_pair(details, "Publish Type Resolution Reason", row.get("publish_type_resolution_reason"))
        add_pair(details, "Dashboard Metric Status", display(row.get("dashboard_metric_status")))
        add_pair(details, "Dashboard Metric Scope", display(row.get("dashboard_metric_scope")))
        add_pair(details, "Dashboard Metric Resolution", row.get("dashboard_metric_resolution_reason"))
        add_pair(details, "Dashboard Shared Record Count", row.get("dashboard_metric_shared_record_count"))
        for field in VIEW_FIELDS:
            if metrics.get(field) is not None:
                add_pair(values, VIEW_LABELS[field], metrics[field])
                add_pair(details, VIEW_LABELS[field], metrics[field])
            rank_field = f"{field}_rank"
            if metrics.get(rank_field) is not None:
                add_pair(details, f"{VIEW_LABELS[field]} Rank", metrics[rank_field])
        for tag_category, items in sorted(record_tags.items()):
            add_pair(details, tag_category, ", ".join(sorted(items)))

        title_missing = not clean(row.get("title"))
        livelabs_missing = not bool(livelabs_id)
        review_state = ""
        review_reason = ""
        if livelabs_missing:
            review_state = "Content to review/remove"
            review_reason = "Missing LiveLabs ID in current WMS export; review as a draft or unpublished row"

        source_flags = {
            "in_current_canonical": bool(metrics),
            "in_dashboard_windows": any(metrics.get(field) is not None for field in VIEW_FIELDS),
            "in_top_1000": key in top_1000_keys,
            "in_wms_14_august": True,
            "github_repo_mapped": bool(clean(row.get("repo_slug"))),
            "github_repository_live": github_live.get(clean(row.get("repo_slug"))),
            "github_update_evidence_available": bool(meaningful_update),
            "github_workshop_path_evidence": update_source.endswith("workshop_path"),
            "github_repository_proxy_evidence": update_source.endswith("repo_level_proxy"),
            "github_update_evidence_source": update_source or None,
            "github_update_evidence_confidence": update_confidence,
            "repository_mapping_status": clean(row.get("repository_mapping_status")) or None,
            "repository_mapping_confidence": clean(row.get("repo_mapping_confidence")) or None,
            "repository_evidence_status": clean(update_row.get("repository_evidence_status")) or None,
            "publish_type_resolution_status": clean(row.get("publish_type_resolution_status")) or None,
            "dashboard_metric_status": clean(row.get("dashboard_metric_status")) or None,
            "dashboard_metric_scope": clean(row.get("dashboard_metric_scope")) or None,
            "dashboard_metric_shared_record_count": row.get("dashboard_metric_shared_record_count"),
        }
        search_parts = [
            title,
            wms_id,
            livelabs_id,
            category,
            owner,
            content_type,
            publish_status,
            publish_type,
            row.get("workshop_status"),
            row.get("short_description"),
            row.get("long_description"),
            coverage_label,
            coverage_tier,
            review_state,
            review_reason,
            *[value for _label, value in values],
            *[value for _label, value in details],
        ]
        records.append(
            {
                "key": key,
                "title": title,
                "wmsId": wms_id,
                "livelabsId": livelabs_id,
                "category": category,
                "owner": owner,
                "type": content_type,
                "status": clean(row.get("workshop_status")),
                "source": "14 August 2026 WMS and LiveLabs dashboard views; 15 August 2026 GitHub repository census",
                "update": clean(row.get("wms_last_update_time")),
                "searchable": " ".join(clean(part) for part in search_parts if clean(part)),
                "values": values,
                "details": details,
                "fileUpdates": [],
                "family": {},
                "rawTitle": clean(row.get("title")),
                "titleMissing": title_missing,
                "wmsIdMissing": not bool(wms_id),
                "livelabsIdMissing": livelabs_missing,
                "contentReviewState": review_state,
                "contentReviewReason": review_reason,
                "sourceFlags": source_flags,
                "publishStatus": publish_status,
                "publishType": publish_type,
                "contactCoverage": {
                    "authorMissing": coverage_tier == "Missing",
                    "label": coverage_label,
                    "rank": coverage_tier.lower(),
                    "tier": coverage_tier,
                },
            }
        )

    record_by_key = {record["key"]: record for record in records}
    for wms_id, members in family_rows.items():
        member_records = [record_by_key[clean(row.get("workshop_key"))] for row in members]
        for record in member_records:
            record["family"] = {
                "wmsId": wms_id,
                "total": len(member_records),
                "siblings": [
                    {
                        "key": sibling["key"],
                        "livelabsId": sibling["livelabsId"],
                        "wmsId": sibling["wmsId"],
                        "title": sibling["title"],
                        "publishStatus": sibling["publishStatus"],
                        "publishType": sibling["publishType"],
                        "category": sibling["category"],
                    }
                    for sibling in member_records
                    if sibling["key"] != record["key"]
                ],
            }

    generated_at = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    publish_types = Counter(record["publishType"] or "Missing" for record in records)
    publish_statuses = Counter(record["publishStatus"] or "Missing" for record in records)
    content_types = Counter(record["type"] for record in records)
    review_count = sum(1 for record in records if record["contentReviewState"])
    matched_update_keys = set(workshop_updates_by_key).intersection(record_by_key)
    update_source_counts = Counter(
        clean(workshop_updates_by_key[key].get("last_updated_source")) or "missing"
        for key in matched_update_keys
    )
    update_confidence_counts = Counter(
        clean(workshop_updates_by_key[key].get("last_updated_confidence")) or "unknown"
        for key in matched_update_keys
    )
    meaningful_update_count = sum(
        1
        for key in matched_update_keys
        if clean(workshop_updates_by_key[key].get("last_meaningful_workshop_update_date"))
    )
    workshop_specific_update_count = sum(
        1
        for key in matched_update_keys
        if clean(workshop_updates_by_key[key].get("last_updated_source")).endswith("workshop_path")
    )
    repository_proxy_update_count = sum(
        1
        for key in matched_update_keys
        if clean(workshop_updates_by_key[key].get("last_updated_source")).endswith("repo_level_proxy")
    )
    quality_gaps = {
        "missing_title": sum(1 for record in records if record["titleMissing"]),
        "missing_wms_id": sum(1 for record in records if record["wmsIdMissing"]),
        "missing_livelabs_id": sum(1 for record in records if record["livelabsIdMissing"]),
        "content_to_review_or_remove": sum(
            1 for record in records if record["contentReviewState"] == "Content to review/remove"
        ),
        "delete_requested": sum(1 for record in records if record["publishStatus"].lower() == "delete requested"),
    }
    common_metadata = {
        "generated_at": generated_at,
        "snapshot_date": dashboard_payload.get("metadata", {}).get("source_snapshot_date"),
        "source": "14 August 2026 WMS, dashboard views, and WMS tag reports; 15 August 2026 GitHub repository census",
        "row_identity": "livelabs_id_or_wms_title_fallback",
        "family_grouping": "wms_id",
        "records": len(records),
        "stable_livelabs_id_records": sum(1 for record in records if record["livelabsId"]),
        "draft_or_unpublished_id_pending_records": sum(1 for record in records if not record["livelabsId"]),
        "dashboard_metric_records": sum(1 for record in records if record["sourceFlags"]["in_dashboard_windows"]),
        "dashboard_metric_unique_title_records": sum(
            1 for record in records
            if record["sourceFlags"]["dashboard_metric_status"] == "available_unique_title_scope"
        ),
        "dashboard_metric_shared_title_records": sum(
            1 for record in records
            if record["sourceFlags"]["dashboard_metric_status"] == "available_shared_title_scope"
        ),
        "dashboard_metric_unavailable_records": sum(
            1 for record in records
            if record["sourceFlags"]["dashboard_metric_status"] == "not_in_dashboard_snapshot"
        ),
        "top_1000_rows": len(top_1000_keys),
        "shared_wms_family_count": sum(1 for members in family_rows.values() if len(members) > 1),
        "no_author_record_count": no_author_count,
        "tagged_livelabs_id_records": tag_coverage,
        "tag_taxonomy_rows": taxonomy_rows,
        "new_livelabs_id_count_vs_prior": wms_payload.get("metadata", {}).get("new_livelabs_id_count_vs_prior"),
        "removed_livelabs_id_count_vs_prior": wms_payload.get("metadata", {}).get("removed_livelabs_id_count_vs_prior"),
        "internal_contact_data": True,
        "contact_email_domain_policy": "Oracle internal contacts retained",
        "quality_gaps": quality_gaps,
        "content_review_count": review_count,
        "github_audit": github_metadata,
        "workshop_updates": {
            "metadata": workshop_updates_metadata,
            "source_snapshot_date": "2026-08-14",
            "matched_records": len(matched_update_keys),
            "unmatched_wms_records": len(record_by_key) - len(matched_update_keys),
            "orphan_update_records": len(workshop_updates_by_key) - len(matched_update_keys),
            "meaningful_git_update_records": meaningful_update_count,
            "workshop_specific_git_update_records": workshop_specific_update_count,
            "repository_proxy_git_update_records": repository_proxy_update_count,
            "wms_metadata_fallback_records": len(record_by_key) - meaningful_update_count,
            "source_counts": dict(update_source_counts),
            "confidence_counts": dict(update_confidence_counts),
        },
    }
    search_payload = {"metadata": common_metadata, "records": records}

    inventory_records = []
    for record in records:
        inventory_records.append(
            {
                "key": record["key"],
                "title": record["title"],
                "rawTitle": record["rawTitle"],
                "titleMissing": record["titleMissing"],
                "wmsId": record["wmsId"],
                "wmsIdMissing": record["wmsIdMissing"],
                "livelabsId": record["livelabsId"],
                "livelabsIdMissing": record["livelabsIdMissing"],
                "category": record["category"],
                "categoryMissing": not bool(record["category"]),
                "owner": record["owner"],
                "ownerMissing": not bool(record["owner"]),
                "type": record["type"],
                "publishStatus": record["publishStatus"],
                "publishType": record["publishType"],
                "status": record["status"],
                "lifecycleState": record["status"],
                "update": record["update"],
                "contactCoverage": record["contactCoverage"],
                "source": record["source"],
                "sourceFlags": record["sourceFlags"],
                "searchable": record["searchable"],
                "values": record["values"],
                "details": record["details"],
                "fileUpdates": record["fileUpdates"],
                "family": record["family"],
                "contentReviewState": record["contentReviewState"],
                "contentReviewReason": record["contentReviewReason"],
            }
        )
    inventory_metadata = {
        **common_metadata,
        "source_file": "portfolio_inventory.json",
        "canonical_payload": True,
        "counts": {
            "type": dict(content_types),
            "publish_status": dict(publish_statuses),
            "publish_type": dict(publish_types),
            "contact_coverage": dict(Counter(record["contactCoverage"]["tier"] for record in records)),
        },
        "governance_layer_notice": (
            "Inventory includes all current WMS rows. Governance rankings remain limited to stable WMS-dashboard joins."
        ),
    }
    inventory_payload = {"metadata": inventory_metadata, "records": inventory_records}

    inventory_output = Path(args.inventory_output)
    inventory_output.parent.mkdir(parents=True, exist_ok=True)
    if args.search_output:
        search_output = Path(args.search_output)
        search_output.parent.mkdir(parents=True, exist_ok=True)
        search_output.write_text(json.dumps(search_payload, separators=(",", ":")), encoding="utf-8")
    inventory_output.write_text(json.dumps(inventory_payload, separators=(",", ":")), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
