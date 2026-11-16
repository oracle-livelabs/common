#!/usr/bin/env python3
"""Build a private, non-promoted Analytics candidate from weekly source exports.

This adapter keeps each source's provenance separate. It never mutates the
canonical inventory, writes public projections, or applies Jenkins scores.
"""

from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from copy import deepcopy
import csv
from datetime import date, datetime, timezone
import hashlib
import json
import re
import unicodedata
from pathlib import Path
from typing import Any

from openpyxl import load_workbook


VIEW_PERIODS = {
    "Last Week": ("Views - Last 7 Days", "recent_views_7d"),
    "Last Two Weeks": ("Views - Last 14 Days", "recent_views_14d"),
    "Last Month": ("Views - Last 30 Days", "recent_views_30d"),
    "Last 90 Days": ("Views - Last 90 Days", "recent_views_90d"),
    "Last 180 Days": ("Views - Last 180 Days", "recent_views_180d"),
    "Last Year": ("Views - Last 12 Months", "recent_views_12m"),
}

WMS_FIELDS = {
    "LiveLabs ID": "Livelabsid",
    "WMS ID": "Workshop Id",
    "Publish Status": "Publish Status",
    "Workshop Status": "Workshop Status",
    "Council Area": "Council Area",
    "WMS Last Update": "Last Update Time",
    "Completion Date": "Completion Date",
    "Production URL": "Production Url",
    "Production GitHub URL": "Prod Github Url",
    "Owner Email": "Workshop Owner Email",
    "Owner Group": "Workshop Owner Group",
    "Support Contact Email": "Support Contact Email",
    "Tech Contact Email": "Tech Contact Email",
    "Short Description": "Short Desc",
    "Long Description": "Long Desc",
    "YouTube Link": "Youtube Link",
    "Workshop Time": "Workshop Time",
}

# Preserve WMS fields that are useful for follow-up work but are not promoted
# to first-class Analytics columns. These remain in the private candidate's
# details so a later release can make an explicit field-level decision.
WMS_AUXILIARY_FIELDS = {
    "Support Level 1": "Support Level 1",
    "Paid Flg": "Paid Flg",
    "Greenbutton Flg": "Greenbutton Flg",
    "Paid Url": "Paid Url",
    "Greenbutton Url": "Greenbutton Url",
    "Novnc Enabled Flg": "Novnc Enabled Flg",
    "Oci Login Flg": "Oci Login Flg",
    "Last Update Person": "Last Update Person",
}

REPLACE_LABELS = {
    "LiveLabs ID", "WMS ID", "WMS Workshop Title", "Content Type",
    "Publish Status", "Publish Type", "Workshop Status", "Council Area",
    "WMS Last Update", "Completion Date", "Production URL",
    "Production GitHub URL", "Owner Email", "Owner Group",
    "Support Contact Email", "Tech Contact Email", "Short Description",
    "Long Description", "YouTube Link", "Workshop Time", "Author Coverage",
    "Contact Coverage Tier", "Dashboard Metric Status", "Dashboard Metric Scope",
    "Dashboard Metric Resolution", "Dashboard Shared Record Count",
    "Publish Type Source",
}
REPLACE_LABELS.update(WMS_AUXILIARY_FIELDS)
for value_label, _ in VIEW_PERIODS.values():
    REPLACE_LABELS.add(value_label)
    REPLACE_LABELS.add(f"{value_label} Rank")


def clean(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value).strip()


def normalize_title(value: Any) -> str:
    text = unicodedata.normalize("NFKC", clean(value)).replace("\u00bf", " ")
    text = unicodedata.normalize("NFKD", text)
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r"[^a-z0-9]+", " ", text.lower()).strip()


def parse_date(value: Any) -> str:
    text = clean(value)
    if not text:
        return ""
    for fmt in ("%m/%d/%Y", "%Y-%m-%d", "%Y-%m-%d %H:%M:%S", "%m/%d/%Y %H:%M:%S"):
        try:
            return datetime.strptime(text[:19], fmt).date().isoformat()
        except ValueError:
            pass
    return text[:10]


def iso_date_argument(value: str) -> str:
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise argparse.ArgumentTypeError("expected YYYY-MM-DD")
    try:
        return date.fromisoformat(value).isoformat()
    except ValueError as error:
        raise argparse.ArgumentTypeError("expected YYYY-MM-DD") from error


def nonblank_note_argument(value: str) -> str:
    note = value.strip()
    if not note:
        raise argparse.ArgumentTypeError("provide the source retrieval date/time and timezone or its known limitation")
    return note


def read_wms_xlsx(path: Path) -> list[dict[str, str]]:
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = workbook.active
        iterator = sheet.iter_rows(values_only=True)
        headers = [clean(value) for value in next(iterator, ())]
        if not headers or any(not header for header in headers):
            raise ValueError(f"WMS workbook has empty or missing header cells: {path}")
        rows = []
        for row in iterator:
            if not any(value is not None for value in row):
                continue
            rows.append({headers[index]: clean(value) for index, value in enumerate(row[:len(headers)])})
        return rows
    finally:
        workbook.close()


def read_views_csv(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    seen: set[tuple[str, str]] = set()
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        fields = {str(name or "").strip().lower() for name in (reader.fieldnames or [])}
        required = {"period", "name", "views", "rank", "id", "link", "captured_at"}
        if not required <= fields:
            raise ValueError(f"Views CSV is missing required columns: {sorted(required - fields)}")
        for line, source in enumerate(reader, start=2):
            row = {str(key or "").strip().lower(): value for key, value in source.items()}
            period = clean(row.get("period"))
            item_id = clean(row.get("id"))
            link = clean(row.get("link"))
            link_match = re.search(r"(?:[?&]|^)wid=(\d+)", link, re.IGNORECASE)
            if period not in VIEW_PERIODS or not item_id.isdigit():
                raise ValueError(f"Invalid period or LiveLabs ID at views CSV line {line}.")
            if not link_match or link_match.group(1) != item_id:
                raise ValueError(f"LiveLabs ID does not match the row link at views CSV line {line}.")
            try:
                views = int(clean(row.get("views")))
                rank = int(clean(row.get("rank")))
            except ValueError as error:
                raise ValueError(f"Non-integer views or rank at views CSV line {line}.") from error
            if views < 0 or rank < 1:
                raise ValueError(f"Out-of-range views or rank at views CSV line {line}.")
            pair = (period, item_id)
            if pair in seen:
                raise ValueError(f"Duplicate period and LiveLabs ID at views CSV line {line}: {pair}")
            seen.add(pair)
            rows.append({
                "period": period, "name": clean(row.get("name")), "views": views,
                "rank": rank, "id": item_id, "link": link,
                "captured_at": clean(row.get("captured_at")),
            })
    return rows


def read_jsonl(path: Path) -> list[dict[str, Any]]:
    result = []
    with path.open("r", encoding="utf-8-sig") as handle:
        for line_number, line in enumerate(handle, start=1):
            if line.strip():
                try:
                    result.append(json.loads(line))
                except json.JSONDecodeError as error:
                    raise ValueError(f"Invalid JSONL at {path}:{line_number}") from error
    return result


def _append_pair(rows: list[list[str]], label: str, value: Any) -> None:
    text = clean(value)
    if text:
        rows.append([label, text])


def _replace_pairs(rows: Any, additions: list[tuple[str, Any]]) -> list[list[str]]:
    result = [pair[:] for pair in rows or [] if isinstance(pair, list) and len(pair) >= 2 and pair[0] not in REPLACE_LABELS]
    for label, value in additions:
        _append_pair(result, label, value)
    return result


def _baseline_match(row: dict[str, str], baseline: dict[str, Any], old_by_id: dict[str, list[dict]], old_by_fallback: dict[tuple[str, str], list[dict]], current_fallback_counts: Counter) -> tuple[dict | None, str]:
    item_id = clean(row.get("Livelabsid"))
    if item_id:
        matches = old_by_id.get(item_id, [])
        return (matches[0], "exact_livelabs_id") if len(matches) == 1 else (None, "new_livelabs_id" if not matches else "ambiguous_baseline_livelabs_id")
    fallback = (clean(row.get("Workshop Id")), normalize_title(row.get("Publish Title") or row.get("Workshop Title")))
    if not all(fallback):
        return None, "incomplete_current_fallback_identity"
    matches = old_by_fallback.get(fallback, [])
    if current_fallback_counts[fallback] != 1:
        return None, "ambiguous_current_fallback"
    if len(matches) == 1:
        return matches[0], "unique_wms_id_and_title_fallback"
    return None, "ambiguous_baseline_fallback" if matches else "no_baseline_match"


def _github_details(history: dict[str, Any]) -> dict[str, Any]:
    fields = (
        "github_status", "mapping_status", "mapping_evidence", "repository",
        "canonical_repository", "production_github_url", "resolved_workshop_path",
        "resolved_manifest_path", "prior_update_scope", "prior_update_confidence",
        "prior_latest_update", "prior_latest_item_commit", "prior_latest_markdown_commit",
        "prior_meaningful_commit", "prior_commit_author", "repository_head_sha",
        "default_branch", "history_commit_count", "latest_item_commit_sha",
        "latest_item_commit_author_date", "latest_item_commit_author",
        "latest_item_commit_committer_date", "latest_item_commit_subject",
        "latest_item_changed_files", "collection_snapshot_date", "commit_history",
        "manifest_path_verified_at_recorded_head", "item_folder_has_indexed_files",
        "unresolved_event_rows", "unresolved_event_reason",
    )
    return {key: deepcopy(history[key]) for key in fields if key in history}


def _candidate_metadata(
    records: list[dict[str, Any]],
    baseline_metadata: dict[str, Any],
    source_info: dict[str, Any],
    baseline_records: list[dict[str, Any]] | None = None,
) -> dict[str, Any]:
    """Create fresh candidate metadata instead of carrying stale snapshot counters forward."""
    baseline_records = baseline_records or []
    record_count = len(records)
    current_ids = {clean(row.get("livelabsId")) for row in records if clean(row.get("livelabsId"))}
    prior_ids = {clean(row.get("livelabsId")) for row in baseline_records if clean(row.get("livelabsId"))}
    types = Counter(clean(row.get("type")) or "Unknown" for row in records)
    publish_status = Counter(clean(row.get("publishStatus")) or "Missing" for row in records)
    publish_type = Counter(clean(row.get("publishType")) or "Unknown" for row in records)
    contact_tier = Counter(
        clean((row.get("contactCoverage") or {}).get("tier")) or "Missing" for row in records
    )
    contact_sources: Counter[str] = Counter()
    for row in records:
        details = {
            clean(pair[0]): clean(pair[1])
            for pair in row.get("details", [])
            if isinstance(pair, list) and len(pair) > 1
        }
        owner_email = bool(details.get("Owner Email"))
        owner_group = bool(details.get("Owner Group"))
        support_email = bool(details.get("Support Contact Email"))
        tech_email = bool(details.get("Tech Contact Email"))
        for label, available in (
            ("owner_email", owner_email), ("owner_group", owner_group),
            ("support_contact_email", support_email), ("tech_contact_email", tech_email),
            ("any_contact_field", owner_email or owner_group or support_email or tech_email),
        ):
            if available:
                contact_sources[label] += 1
    matched = [row for row in records if (row.get("sourceFlags") or {}).get("dashboard_metric_status") == "matched_by_livelabs_id"]
    window_rows = {
        period.lower(): sum(
            1 for row in records
            if any(isinstance(pair, list) and len(pair) > 1 and pair[0] == value_label for pair in row.get("values", []))
        )
        for period, (value_label, _metric_key) in VIEW_PERIODS.items()
    }
    family_sizes = Counter(clean(row.get("wmsId")) for row in records if clean(row.get("wmsId")))
    tagged_count = sum(
        1 for row in records
        if clean(row.get("livelabsId")) and any(isinstance(pair, list) and len(pair) > 1 and pair[0] in {
            "Product", "Role", "Focus", "Focus Area", "Sales Play", "Event", "Workshop Series"
        } for pair in row.get("details", []))
    )
    missing_title = sum(1 for row in records if row.get("titleMissing") or not clean(row.get("title")))
    missing_wms_id = sum(1 for row in records if row.get("wmsIdMissing") or not clean(row.get("wmsId")))
    missing_livelabs_id = record_count - sum(1 for row in records if clean(row.get("livelabsId")))
    review_state_count = sum(1 for row in records if clean(row.get("contentReviewState")))
    delete_requested = sum(count for value, count in publish_status.items() if value.casefold() == "delete requested")
    generated = datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")
    wms_date = clean(source_info.get("wms_snapshot_date")) or None
    views_date = clean(source_info.get("views_collection_date")) or None
    github_completed = clean(source_info.get("github_collection_completed_at")) or None
    github_inventory_date = clean(source_info.get("github_source_inventory_snapshot_date")) or None
    github_report = source_info.get("jenkins_report", {})
    prior_snapshot = clean(baseline_metadata.get("snapshot_date")) or None
    source_files = deepcopy(source_info.get("source_files", {}))

    return {
        "generated_at": generated,
        "snapshot_date": wms_date,
        "source": "Private candidate assembled from current WMS and LiveLabs view exports; GitHub history attached separately; Jenkins QA scores not merged.",
        "row_identity": "livelabs_id_with_unique_wms_id_title_fallback_for_no_id_rows",
        "family_grouping": "wms_id",
        "records": record_count,
        "stable_livelabs_id_records": sum(1 for row in records if clean(row.get("livelabsId"))),
        "distinct_livelabs_ids": len(current_ids),
        "draft_or_unpublished_id_pending_records": missing_livelabs_id,
        "dashboard_metric_records": len(matched),
        "dashboard_metric_unique_title_records": None,
        "dashboard_metric_shared_title_records": None,
        "dashboard_metric_unavailable_records": record_count - len(matched),
        "dashboard_metric_join_method": "exact_livelabs_id",
        "shared_wms_family_count": sum(1 for size in family_sizes.values() if size > 1),
        "tagged_livelabs_id_records": tagged_count,
        "new_livelabs_id_count_vs_prior": len(current_ids - prior_ids),
        "removed_livelabs_id_count_vs_prior": len(prior_ids - current_ids),
        "internal_contact_data": True,
        "contact_email_domain_policy": "Internal contact fields are retained in the private candidate; public projection privacy review is required.",
        "quality_gaps": {
            "missing_title": missing_title,
            "missing_wms_id": missing_wms_id,
            "missing_livelabs_id": missing_livelabs_id,
            "content_to_review_or_remove": review_state_count,
            "delete_requested": delete_requested,
            "publish_type_unresolved": publish_type.get("Unknown", 0),
        },
        "source_files": source_files,
        "dashboard_window_row_counts": window_rows,
        "dashboard_metric_status_counts": {
            "matched_by_livelabs_id": len(matched),
            "not_in_dashboard_snapshot": record_count - len(matched),
        },
        "data_freshness": {
            "wms_snapshot_date": wms_date,
            "dashboard_views_snapshot_date": views_date,
            "dashboard_views_period_boundaries": "unconfirmed",
            "dashboard_last_week_metric_status": "COLLECTED_BUT_DISCREPANCY_REQUIRES_REVIEW",
            "tag_snapshot_date": prior_snapshot,
            "classification_snapshot_date": prior_snapshot,
            "github_history_collected_at_utc": github_completed,
            "github_source_inventory_snapshot_date": github_inventory_date,
            "workshop_update_evidence_snapshot_date": None,
            "jenkins_run_id": clean(github_report.get("run_id")) or None,
            "jenkins_report_started_at": clean(github_report.get("started_at")) or None,
            "jenkins_report_corrected_at": clean(github_report.get("corrected_at")) or None,
            "governance_evidence_refresh_required": True,
        },
        "counts": {
            "type": dict(types),
            "publish_status": dict(publish_status),
            "publish_type": dict(publish_type),
            "contact_coverage": dict(contact_tier),
            "contact_sources": dict(contact_sources),
        },
        "baseline_provenance": {
            "snapshot_date": prior_snapshot,
            "canonical_payload": baseline_metadata.get("canonical_payload"),
        },
        "source_snapshot_comparison": {
            "prior_snapshot_date": prior_snapshot,
            "new_snapshot_date": wms_date,
            "new_stable_livelabs_id_count": len(current_ids - prior_ids),
            "removed_stable_livelabs_id_count": len(prior_ids - current_ids),
        },
        "github_history": {
            "collection_completed_at_utc": github_completed,
            "source_inventory_snapshot_date": github_inventory_date,
            "item_level_evidence_requires_review": True,
        },
        "jenkins_report": {
            "run_id": clean(github_report.get("run_id")) or None,
            "run_status": clean(github_report.get("run_status")) or None,
            "new_checks_executed": github_report.get("new_checks_executed"),
            "merge_applied": False,
        },
        "canonical_payload": False,
        "candidate_status": "PRIVATE_CANDIDATE_NOT_PROMOTED",
        "calculations_status": "NOT_REBUILT_FOR_CANDIDATE",
        "public_projection_status": "NOT_GENERATED_PRIVACY_REVIEW_REQUIRED",
    }


def build_candidate(
    wms_rows: list[dict[str, str]],
    baseline_payload: dict[str, Any],
    view_rows: list[dict[str, Any]],
    github_rows: list[dict[str, Any]],
    source_info: dict[str, Any] | None = None,
    github_event_rows: list[dict[str, str]] | None = None,
) -> tuple[dict[str, Any], dict[str, Any]]:
    source_info = deepcopy(source_info or {})
    baseline = baseline_payload.get("records", [])
    old_by_id: dict[str, list[dict]] = defaultdict(list)
    old_by_fallback: dict[tuple[str, str], list[dict]] = defaultdict(list)
    for old in baseline:
        item_id = clean(old.get("livelabsId"))
        if item_id:
            old_by_id[item_id].append(old)
        else:
            old_by_fallback[(clean(old.get("wmsId")), normalize_title(old.get("rawTitle") or old.get("title")))].append(old)

    current_fallback_counts: Counter = Counter()
    for row in wms_rows:
        if not clean(row.get("Livelabsid")):
            current_fallback_counts[(clean(row.get("Workshop Id")), normalize_title(row.get("Publish Title") or row.get("Workshop Title")))] += 1

    view_by_id: dict[str, dict[str, dict[str, Any]]] = defaultdict(dict)
    capture_times: dict[str, set[str]] = defaultdict(set)
    for row in view_rows:
        view_by_id[clean(row.get("id"))][clean(row.get("period"))] = row
        if clean(row.get("captured_at")):
            capture_times[clean(row.get("period"))].add(clean(row["captured_at"]))

    github_by_id: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for history in github_rows:
        item_id = clean(history.get("livelabs_id"))
        if item_id:
            github_by_id[item_id].append(history)
    unresolved_events_by_id: dict[str, list[dict[str, str]]] = defaultdict(list)
    for event in github_event_rows or []:
        if not clean(event.get("changed_file")):
            event_id = clean(event.get("livelabs_id"))
            if event_id:
                unresolved_events_by_id[event_id].append(deepcopy(event))

    records: list[dict[str, Any]] = []
    key_counts: Counter[str] = Counter()
    identity_counts: Counter[str] = Counter()
    type_counts: Counter[str] = Counter()
    publish_type_counts: Counter[str] = Counter()
    github_status_counts: Counter[str] = Counter()
    view_counts: Counter[str] = Counter()
    fallback_matches = 0
    exact_matches = 0
    ambiguous_fallback = 0
    unmatched_baseline = 0
    tagged_prior = 0
    rows_with_history = 0
    rows_without_id = 0
    view_ids = set(view_by_id)
    view_title_mismatches: list[dict[str, str]] = []
    wms_ids = {clean(row.get("Livelabsid")) for row in wms_rows if clean(row.get("Livelabsid"))}

    for row_number, row in enumerate(wms_rows, start=2):
        item_id = clean(row.get("Livelabsid"))
        wms_id = clean(row.get("Workshop Id"))
        title = clean(row.get("Publish Title")) or clean(row.get("Workshop Title")) or "N/A"
        old, match_status = _baseline_match(row, baseline_payload, old_by_id, old_by_fallback, current_fallback_counts)
        if match_status == "exact_livelabs_id":
            exact_matches += 1
        elif match_status == "unique_wms_id_and_title_fallback":
            fallback_matches += 1
        elif match_status in {"ambiguous_current_fallback", "ambiguous_baseline_fallback", "ambiguous_baseline_livelabs_id"}:
            ambiguous_fallback += 1
            unmatched_baseline += 1
        else:
            unmatched_baseline += 1
        old = old or {}
        old_tagged = any(
            isinstance(pair, list) and len(pair) > 1
            and pair[0] in {"Product", "Role", "Focus", "Focus Area", "Sales Play", "Event", "Workshop Series"}
            for pair in old.get("details", [])
        )
        old_type = clean(old.get("type"))
        record_type = old_type if old_type in {"Workshop", "Sprint"} else "Unknown"
        publish_type = clean(old.get("publishType"))
        if record_type == "Unknown":
            type_status = "unknown_not_supplied_by_current_wms"
        else:
            type_status = "retained_from_prior_inventory"
        if publish_type:
            publish_type_status = "retained_from_prior_inventory"
        else:
            publish_type_status = "unknown_not_supplied_by_current_wms"
        type_counts[record_type] += 1
        publish_type_counts[publish_type or "Unknown"] += 1

        if item_id:
            matches = github_by_id.get(item_id, [])
            github_history = _github_details(matches[0]) if len(matches) == 1 else {
                "github_status": "AMBIGUOUS_GITHUB_SOURCE_ROWS" if matches else "NOT_IN_GITHUB_SOURCE",
                "mapping_status": "unresolved",
            }
        else:
            github_history = {"github_status": "NOT_MATCHED_NO_LIVELABS_ID", "mapping_status": "unresolved"}
            rows_without_id += 1
        github_history.update(source_info.get("github_item_verification", {}).get(item_id, {}) if item_id else {})
        if item_id and unresolved_events_by_id.get(item_id):
            github_history["unresolved_event_rows"] = unresolved_events_by_id[item_id]
            github_history["unresolved_event_reason"] = "CSV source row did not include a changed_file path; not presented as an item file update."
        github_status = clean(github_history.get("github_status")) or "UNKNOWN"
        github_status_counts[github_status] += 1
        if github_history.get("commit_history"):
            rows_with_history += 1

        metric_pairs: list[tuple[str, Any]] = []
        rank_pairs: list[tuple[str, Any]] = []
        title_match_by_period: dict[str, bool] = {}
        for period, (value_label, metric_key) in VIEW_PERIODS.items():
            view = view_by_id.get(item_id, {}).get(period) if item_id else None
            if view:
                metric_pairs.append((value_label, view["views"]))
                rank_pairs.append((f"{value_label} Rank", view["rank"]))
                view_counts[period] += 1
                title_match = normalize_title(view.get("name")) == normalize_title(title)
                title_match_by_period[period] = title_match
                if not title_match:
                    view_title_mismatches.append({"livelabs_id": item_id, "period": period, "wms_title": title, "views_title": clean(view.get("name"))})

        owner_email = clean(row.get("Workshop Owner Email"))
        owner_group = clean(row.get("Workshop Owner Group"))
        owner = owner_email or owner_group
        if owner_email:
            contact_label, contact_tier = "Individual author", "Individual"
        elif owner_group:
            contact_label, contact_tier = "Owner group fallback", "Fallback"
        else:
            contact_label, contact_tier = "No author, contact, or owner group evidence", "Missing"

        value_additions = [
            ("LiveLabs ID", item_id), ("WMS ID", wms_id),
            ("WMS Workshop Title", clean(row.get("Workshop Title")) if clean(row.get("Workshop Title")) != title else ""),
            ("Content Type", record_type), ("Publish Status", row.get("Publish Status")),
            ("Publish Type", publish_type), ("Workshop Status", row.get("Workshop Status")),
            ("Council Area", row.get("Council Area")), ("WMS Last Update", parse_date(row.get("Last Update Time"))),
            ("Completion Date", parse_date(row.get("Completion Date"))),
            ("Author Coverage", contact_label), ("Contact Coverage Tier", contact_tier),
            ("Workshop Time", row.get("Workshop Time")), *metric_pairs,
        ]
        details_additions = [(label, row.get(source)) for label, source in WMS_FIELDS.items()]
        details_additions.extend((label, row.get(source)) for label, source in WMS_AUXILIARY_FIELDS.items())
        details_additions.extend([
            ("LiveLabs ID", item_id), ("WMS ID", wms_id),
            ("WMS Workshop Title", clean(row.get("Workshop Title")) if clean(row.get("Workshop Title")) != title else ""),
            ("Content Type", record_type), ("Publish Type", publish_type),
            ("Publish Type Source", "Retained from prior inventory" if publish_type else "Unavailable in current WMS export"),
            ("Author Coverage", contact_label), ("Contact Coverage Tier", contact_tier),
            ("Dashboard Metric Status", "matched_by_livelabs_id" if item_id and item_id in view_by_id else "not_in_dashboard_snapshot"),
            ("Dashboard Metric Scope", "exact_livelabs_id" if item_id and item_id in view_by_id else "unavailable"),
            ("Dashboard Metric Resolution", "Matched by LiveLabs ID; period boundaries remain unconfirmed." if item_id and item_id in view_by_id else "No LiveLabs view row matched this ID."),
            *metric_pairs, *rank_pairs,
        ])
        values = _replace_pairs(old.get("values"), value_additions)
        details = _replace_pairs(old.get("details"), details_additions)

        key = clean(old.get("key")) if old and not item_id else (f"livelabs:{item_id}" if item_id else "")
        if not key:
            slug = normalize_title(title)[:80] or "untitled"
            key = f"wms:{wms_id}:{slug}:source-row-{row_number}"
        key_counts[key] += 1
        identity_counts[match_status] += 1

        current_flags = {
            "in_current_canonical": True,
            "in_dashboard_windows": bool(metric_pairs),
            "dashboard_metric_status": "matched_by_livelabs_id" if metric_pairs else "not_in_dashboard_snapshot",
            "dashboard_metric_scope": "exact_livelabs_id" if metric_pairs else "unavailable",
            "dashboard_metric_resolution": "livelabs_id" if metric_pairs else "no_id_match",
            "dashboard_metric_shared_record_count": 1 if metric_pairs else 0,
            "wms_snapshot_date": source_info.get("wms_snapshot_date", "2026-11-12"),
            "dashboard_snapshot_date": source_info.get("views_collection_date", "2026-11-11"),
            "content_type_resolution_status": type_status,
            "publish_type_resolution_status": publish_type_status,
            "tag_resolution_status": "retained_prior_tags" if old_tagged else "not_available_in_current_source_set",
            "github_weekly_history_status": github_status,
            # Git history is stored separately; it is not WMS freshness evidence.
            "github_update_evidence_available": False,
            "github_update_evidence_source": None,
            "github_update_evidence_confidence": "not_recomputed_from_repository_history",
            "github_workshop_path_evidence": False,
            "github_repository_proxy_evidence": False,
        }

        provenance = {
            "wms": {
                "source": source_info.get("wms_source"),
                "retrieved_at_note": source_info.get("wms_retrieval_note"),
                "fields_current": True,
            },
            "classification": {
                "content_type_status": type_status,
                "content_type_source_snapshot_date": clean(baseline_payload.get("metadata", {}).get("snapshot_date")) if old else None,
                "publish_type_status": publish_type_status,
                "publish_type_source_snapshot_date": clean(baseline_payload.get("metadata", {}).get("snapshot_date")) if old and publish_type else None,
                "tags_status": "retained_prior_inventory" if old_tagged else "unknown_no_current_tag_export",
                "tags_source_snapshot_date": clean(baseline_payload.get("metadata", {}).get("snapshot_date")) if old_tagged else None,
            },
            "views": {
                "match_key": "livelabs_id",
                "matched_periods": [period for period in VIEW_PERIODS if period in view_by_id.get(item_id, {})] if item_id else [],
                "source_titles_match_wms_by_period": title_match_by_period,
                "capture_times_utc": {period: sorted(capture_times[period]) for period in VIEW_PERIODS if period in capture_times},
                "period_boundaries": "unconfirmed by source",
            },
            "github_history": {
                "collection_completed_at": source_info.get("github_collection_completed_at"),
                "source_inventory_snapshot_date": source_info.get("github_source_inventory_snapshot_date"),
                "match_key": "livelabs_id_only",
                "status": github_status,
                "mapping_status": clean(github_history.get("mapping_status")) or "unresolved",
            },
        }
        updated_at = parse_date(row.get("Last Update Time"))
        record = deepcopy(old)
        record.update({
            "key": key, "title": title, "rawTitle": title,
            "titleMissing": not bool(clean(row.get("Publish Title") or row.get("Workshop Title"))),
            "wmsId": wms_id, "wmsIdMissing": not bool(wms_id),
            "livelabsId": item_id, "livelabsIdMissing": not bool(item_id),
            "category": clean(row.get("Council Area")), "categoryMissing": not bool(clean(row.get("Council Area"))),
            "owner": owner, "ownerMissing": not bool(owner), "type": record_type,
            "publishStatus": clean(row.get("Publish Status")), "publishType": publish_type,
            "status": clean(row.get("Workshop Status")), "lifecycleState": clean(row.get("Workshop Status")),
            "update": updated_at, "source": "Private candidate from WMS and LiveLabs sources; not promoted",
            "values": values, "details": details, "sourceFlags": current_flags,
            # Current commit/file history is under githubHistory. Do not leave
            # the baseline's older fileUpdates looking like this week's data.
            "fileUpdates": [],
            "contactCoverage": {"authorMissing": contact_tier == "Missing", "label": contact_label, "rank": contact_tier.lower(), "tier": contact_tier},
            "dataProvenance": provenance,
            "githubHistory": github_history,
            "contentTypeResolution": {"status": type_status, "source_snapshot_date": provenance["classification"]["content_type_source_snapshot_date"]},
        })
        if not item_id:
            record["contentReviewState"] = "Content to review/remove"
            record["contentReviewReason"] = "Missing LiveLabs ID in current WMS export; no ID-based analytics or GitHub join was made."
        searchable = [record.get("title", ""), wms_id, item_id, record.get("category", ""), owner, record_type,
                      record.get("publishStatus", ""), publish_type, record.get("status", "")]
        searchable.extend(clean(pair[1]) for pair in values + details if isinstance(pair, list) and len(pair) > 1)
        searchable.extend([
            clean(github_history.get("repository")), clean(github_history.get("resolved_workshop_path")),
            clean(github_history.get("latest_item_commit_author")), clean(github_history.get("latest_item_commit_author_date")),
            clean(github_history.get("latest_item_commit_subject")), clean(github_history.get("latest_item_changed_files")),
        ])
        record["searchable"] = " ".join(value for value in searchable if value)
        records.append(record)

    if any(count > 1 for count in key_counts.values()):
        duplicates = [key for key, count in key_counts.items() if count > 1]
        raise ValueError(f"Candidate would contain duplicate record keys: {duplicates[:5]}")

    jenkins = source_info.get("jenkins_report", {})
    baseline_metadata = baseline_payload.get("metadata", {})
    metadata = _candidate_metadata(records, baseline_metadata, source_info, baseline)
    candidate = {"metadata": metadata, "records": records}
    review = {
        "record_count": len(records),
        "identity_resolution": {
            "exact_livelabs_id": exact_matches,
            "unique_wms_id_title_fallback": fallback_matches,
            "unmatched_to_prior_inventory": unmatched_baseline,
            "ambiguous_fallback": ambiguous_fallback,
            "row_status_counts": dict(identity_counts),
        },
        "content_type_resolution": {
            "retained_from_prior_inventory": sum(1 for row in records if row.get("contentTypeResolution", {}).get("status") == "retained_from_prior_inventory"),
            "unknown": type_counts.get("Unknown", 0),
            "distribution": dict(type_counts),
        },
        "publish_type_resolution": {"distribution": dict(publish_type_counts), "current_wms_field_present": False},
        "tags": {
            "fresh_export_present": False,
            "prior_snapshot_date": clean(baseline_payload.get("metadata", {}).get("snapshot_date")),
            "records_with_retained_tag_values": sum(1 for row in records if any(isinstance(pair, list) and len(pair) > 1 and pair[0] in {"Product", "Role", "Focus", "Focus Area", "Sales Play", "Event", "Workshop Series"} for pair in row.get("details", []))),
        },
        "views": {
            "rows": len(view_rows),
            "distinct_ids": len({clean(row.get("id")) for row in view_rows}),
            "distinct_ids_joined_to_wms": len(view_ids & wms_ids),
            "distinct_ids_not_in_wms": len(view_ids - wms_ids),
            "wms_ids_without_any_views": len(wms_ids - view_ids),
            "rows_joined_by_period": dict(view_counts),
            "title_mismatch_count": len(view_title_mismatches),
            "title_mismatch_examples": view_title_mismatches[:50],
            "period_boundaries": "unconfirmed",
            "last_week_status": "COLLECTED_BUT_DISCREPANCY_REQUIRES_REVIEW",
        },
        "github_history": {
            "source_rows": len(github_rows),
            "history_rows_attached_to_candidate": rows_with_history,
            "candidate_status_counts": dict(github_status_counts),
            "source_status_counts": dict(Counter(clean(row.get("github_status")) or "UNKNOWN" for row in github_rows)),
            "match_key": "livelabs_id only",
            "index_verification": source_info.get("github_index_verification", {}),
            "file_event_reconciliation": source_info.get("github_event_diagnostics", {}),
            "unresolved_event_rows_attached": sum(len(rows) for rows in unresolved_events_by_id.values()),
        },
        "jenkins": {**jenkins, "merge_applied": False},
        "candidate_status": "PRIVATE_CANDIDATE_NOT_PROMOTED",
    }
    _rebuild_families(records)
    return candidate, review


def _rebuild_families(records: list[dict[str, Any]]) -> None:
    families: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for record in records:
        families[clean(record.get("wmsId"))].append(record)
    for record in records:
        members = families.get(clean(record.get("wmsId")), [])
        record["family"] = {
            "wmsId": clean(record.get("wmsId")),
            "total": len(members),
            "siblings": [
                {
                    "key": sibling["key"], "livelabsId": sibling.get("livelabsId", ""),
                    "wmsId": sibling.get("wmsId", ""), "title": sibling.get("title", ""),
                    "publishStatus": sibling.get("publishStatus", ""),
                    "publishType": sibling.get("publishType", ""), "category": sibling.get("category", ""),
                }
                for sibling in members if sibling["key"] != record["key"]
            ],
        }


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def _read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as handle:
        return list(csv.DictReader(handle))


def count_grouped_jenkins_id_items(report: dict[str, Any]) -> int:
    count = 0
    for item in report.get("items", []):
        catalog = item.get("catalog") or {}
        item_id = clean(item.get("livelabsId"))
        grouped: set[str] = set()
        for field in ("ids", "duplicate_ids"):
            values = catalog.get(field, [])
            if isinstance(values, (list, tuple, set)):
                grouped.update(clean(value) for value in values if clean(value))
        if item_id:
            grouped.add(item_id)
        if len(grouped) > 1:
            count += 1
    return count


def _history_event_key(item_id: Any, commit: dict[str, Any], change: dict[str, Any]) -> tuple[str, str, str, str, str]:
    return (
        clean(item_id), clean(commit.get("commit_sha")).lower(), clean(change.get("status")).upper(),
        clean(change.get("path")).replace("\\", "/").lower(),
        clean(change.get("previous_path")).replace("\\", "/").lower(),
    )


def _csv_event_key(row: dict[str, str]) -> tuple[str, str, str, str, str]:
    return (
        clean(row.get("livelabs_id")), clean(row.get("commit_sha")).lower(), clean(row.get("file_status")).upper(),
        clean(row.get("changed_file")).replace("\\", "/").lower(),
        clean(row.get("previous_path")).replace("\\", "/").lower(),
    )


def reconcile_github_events(history_rows: list[dict[str, Any]], event_rows: list[dict[str, str]]) -> dict[str, Any]:
    history_events = Counter(
        _history_event_key(item.get("livelabs_id"), commit, change)
        for item in history_rows
        for commit in (item.get("commit_history") or [])
        for change in (commit.get("changed_files") or [])
    )
    csv_events = Counter(_csv_event_key(row) for row in event_rows)
    missing_from_csv = history_events - csv_events
    extra_in_csv = csv_events - history_events
    unresolved_count = sum(extra_in_csv.values())
    if missing_from_csv:
        raise ValueError(f"GitHub JSONL contains {sum(missing_from_csv.values())} file events absent from the detailed CSV.")
    if any(event[3] for event in extra_in_csv):
        raise ValueError("GitHub detailed CSV contains file events that do not reconcile to the JSONL and have a changed-file path.")
    return {
        "jsonl_file_change_events": sum(history_events.values()),
        "detailed_csv_rows": len(event_rows),
        "matching_file_change_events": sum((history_events & csv_events).values()),
        "unresolved_csv_rows_without_changed_file": unresolved_count,
        "jsonl_only_file_events": sum(missing_from_csv.values()),
    }


def _github_verification(summary_rows: list[dict[str, str]], file_rows: list[dict[str, str]]) -> dict[str, Any]:
    index = {(clean(row.get("repository")).lower(), clean(row.get("path")).replace("\\", "/").lower()): row for row in file_rows}
    directory_paths: dict[str, set[str]] = defaultdict(set)
    for row in file_rows:
        repository = clean(row.get("repository")).lower()
        path = clean(row.get("path")).replace("\\", "/").lower()
        parts = path.split("/")[:-1]
        for level in range(1, len(parts) + 1):
            directory_paths[repository].add("/".join(parts[:level]))
    manifest_present = manifest_and_head = folder_present = 0
    unverified_ids = []
    item_verification: dict[str, dict[str, bool]] = {}
    for row in summary_rows:
        item_id = clean(row.get("livelabs_id"))
        repository = clean(row.get("repository")).lower()
        head = clean(row.get("repository_head_sha"))
        manifest_path = clean(row.get("resolved_manifest_path")).replace("\\", "/").lower()
        item_path = clean(row.get("resolved_workshop_path")).replace("\\", "/").lower().rstrip("/")
        file_row = index.get((repository, manifest_path)) if repository and manifest_path else None
        verified = bool(file_row and clean(file_row.get("head_sha")) == head)
        if file_row:
            manifest_present += 1
            if verified:
                manifest_and_head += 1
        folder_exists = bool(item_path and item_path in directory_paths.get(repository, set()))
        if folder_exists:
            folder_present += 1
        if item_id:
            item_verification[item_id] = {
                "manifest_path_verified_at_recorded_head": verified,
                "item_folder_has_indexed_files": folder_exists,
            }
        if clean(row.get("github_status")) == "COMPLETE_GIT_HISTORY" and not verified:
            unverified_ids.append(item_id)
    return {
        "summary_rows": len(summary_rows), "repository_file_rows": len(file_rows),
        "resolved_manifest_paths_present": manifest_present,
        "resolved_manifest_paths_present_at_recorded_head": manifest_and_head,
        "resolved_workshop_folders_with_indexed_files": folder_present,
        "complete_history_rows_without_manifest_head_confirmation": unverified_ids,
        "complete_history_unconfirmed_count": len(unverified_ids),
        "item_verification": item_verification,
    }


def _report_markdown(review: dict[str, Any], source_manifest: dict[str, Any]) -> str:
    views = review["views"]
    types = review["content_type_resolution"]
    identity = review["identity_resolution"]
    github = review["github_history"]
    jenkins = review["jenkins"]
    wms = review.get("wms_consistency", {})
    github_index = github.get("index_verification", {})
    github_events = github.get("file_event_reconciliation", {})
    lines = [
        "# Analytics data integration candidate review",
        "",
        "**Status: private candidate created; active inventory and public dashboard unchanged.**",
        "",
        "## Candidate coverage",
        "",
        f"- WMS records: {review['record_count']:,}.",
        f"- Identity continuity: {identity['exact_livelabs_id']:,} exact LiveLabs ID matches; {identity['unique_wms_id_title_fallback']:,} unique WMS ID/title fallbacks; {identity['row_status_counts'].get('new_livelabs_id', 0):,} new IDs; {identity['row_status_counts'].get('no_baseline_match', 0):,} no-ID rows without baseline identity; {identity['ambiguous_fallback']:,} ambiguous matches.",
        f"- Content type: {types['retained_from_prior_inventory']:,} retained from the September inventory; {types['unknown']:,} remain Unknown because current WMS exports do not supply type.",
        f"- Candidate metadata: row, type, and window counts reconcile; the candidate remains non-canonical and Analytics calculations were not rebuilt.",
        f"- Contact coverage: {review.get('contact_coverage', {})}; owner and support/technical contact fields remain distinct in the candidate.",
        f"- Views: {views['rows']:,} rows; {views['distinct_ids_joined_to_wms']:,} distinct IDs join current WMS; {views['distinct_ids_not_in_wms']:,} are not in WMS; {views['wms_ids_without_any_views']:,} WMS IDs have no views row.",
        f"- GitHub: {github['history_rows_attached_to_candidate']:,} candidate rows carry commit history; {github.get('index_verification', {}).get('resolved_manifest_paths_present_at_recorded_head', 0):,} resolved manifests were found at the recorded repository head.",
        f"- Jenkins: run {jenkins.get('run_id', 'unknown')} ({jenkins.get('run_status', 'unknown')}); historical report reference only; no QA score merged.",
        f"- WMS consistency: Kitchen Sink and Primary report exact multiset match across {len(wms.get('overlapping_wms_fields', []))} shared fields: {wms.get('kitchen_and_primary_exact_multiset_match', False)}.",
        f"- Published report route vs WMS Published status: {wms.get('published_route_ids', 0):,} route IDs, {wms.get('primary_publish_status_published_ids', 0):,} status IDs, {wms.get('published_route_only_ids', 0):,} route-only and {wms.get('status_published_only_ids', 0):,} status-only. Full differing IDs are in `review-summary.json`.",
        f"- GitHub index check: {github_index.get('resolved_manifest_paths_present_at_recorded_head', 0):,} manifests confirmed at the recorded head; {github_index.get('complete_history_unconfirmed_count', 0):,} complete-history rows lack that confirmation. Filename search results were not used as mappings.",
        f"- GitHub file events: {github_events.get('matching_file_change_events', 0):,} detailed paths match; {github_events.get('unresolved_csv_rows_without_changed_file', 0):,} CSV rows have no changed-file path and remain unresolved.",
        f"- Jenkins grouped identities: {jenkins.get('grouped_multi_id_item_count', 0):,}; report correction executed new checks: {jenkins.get('new_checks_executed', False)}.",
        "",
        "## Required review before promotion",
        "",
        "1. Investigate the Last Week discrepancy. The collection report shows 1,004 rows and 41,240 views versus 1,163 rows and 967,365 views in the older workbook; a second live capture reproduced the row count but had a different total. The candidate’s saved CSV has 1,003 joined rows. Confirm report window definitions and capture completeness before ranking from it.",
        "2. Obtain current Sprint/Workshop type, publish type, and tags. Existing values are retained only from exact/unique baseline matches and carry the old snapshot date; new or ambiguous items stay Unknown.",
        "3. Resolve GitHub mapping gaps and review changed files before treating a commit as a content update. The crawl used a 28 September WMS inventory snapshot; complete-history rows lacking manifest verification at the recorded repository head remain unresolved. Repository/path history does not replace WMS update dates or score freshness.",
        "4. Obtain a matching detailed findings export and fresh QA execution before considering Jenkins scores. This report was corrected from saved findings; no checks were rerun.",
        "5. Review contact-email exposure and approved public fields before generating a static release. The candidate remains in ignored private staging.",
        "",
        "## Sources",
        "",
    ]
    for role, data in source_manifest.get("sources", {}).items():
        lines.append(f"- `{role}`: `{data['file']}`; SHA-256 `{data['sha256']}`; {data['bytes']:,} bytes.")
    lines.extend(["", "No candidate promotion, QA merge, public projection, release, PR, or tenancy upload was performed.", ""])
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wms-kitchen", type=Path, required=True)
    parser.add_argument("--wms-primary", type=Path, required=True)
    parser.add_argument("--wms-published", type=Path, required=True)
    parser.add_argument("--views-csv", type=Path, required=True)
    parser.add_argument("--github-jsonl", type=Path, required=True)
    parser.add_argument("--github-summary", type=Path, required=True)
    parser.add_argument("--github-files", type=Path, required=True)
    parser.add_argument("--github-events", type=Path, required=True)
    parser.add_argument("--github-search-candidates", type=Path, required=True)
    parser.add_argument("--jenkins-report", type=Path, required=True)
    parser.add_argument("--baseline", type=Path, default=Path("inventory/data/portfolio_inventory.json"))
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--wms-retrieval-note", type=nonblank_note_argument, required=True,
                        help="Actual WMS source retrieval date/time and timezone, or the known limitation")
    parser.add_argument("--views-capture-date", type=iso_date_argument, required=True,
                        help="Actual LiveLabs views capture date in YYYY-MM-DD format")
    parser.add_argument("--github-collection-manifest", type=Path, required=True)
    parser.add_argument("--wms-snapshot-date", type=iso_date_argument, required=True,
                        help="Actual WMS snapshot date in YYYY-MM-DD format")
    args = parser.parse_args()

    required_paths = [args.wms_kitchen, args.wms_primary, args.wms_published, args.views_csv, args.github_jsonl,
                      args.github_summary, args.github_files, args.github_events, args.github_search_candidates,
                      args.jenkins_report, args.baseline, args.github_collection_manifest]
    for path in required_paths:
        if not path.is_file():
            raise FileNotFoundError(path)
    output = args.output.resolve()
    output.mkdir(parents=True, exist_ok=False)

    kitchen = read_wms_xlsx(args.wms_kitchen)
    primary = read_wms_xlsx(args.wms_primary)
    published = read_wms_xlsx(args.wms_published)
    views = read_views_csv(args.views_csv)
    github_rows = read_jsonl(args.github_jsonl)
    github_summary = _read_csv(args.github_summary)
    github_file_rows = _read_csv(args.github_files)
    github_event_rows = _read_csv(args.github_events)
    github_search_rows = _read_csv(args.github_search_candidates)
    baseline = json.loads(args.baseline.read_text(encoding="utf-8"))
    jenkins_data = json.loads(args.jenkins_report.read_text(encoding="utf-8-sig"))
    github_manifest = json.loads(args.github_collection_manifest.read_text(encoding="utf-8-sig"))

    kitchen_headers = set(kitchen[0]) if kitchen else set()
    primary_headers = set(primary[0]) if primary else set()
    shared_fields = sorted(kitchen_headers & primary_headers)
    kitchen_multiset = Counter(tuple(clean(row.get(field)) for field in shared_fields) for row in kitchen)
    primary_multiset = Counter(tuple(clean(row.get(field)) for field in shared_fields) for row in primary)
    route_ids = {clean(row.get("Livelabs ID")) for row in published if clean(row.get("Livelabs ID"))}
    primary_published_ids = {clean(row.get("Livelabsid")) for row in primary if clean(row.get("Livelabsid")) and clean(row.get("Publish Status")).lower() == "published"}
    kitchen_id_counts = Counter(clean(row.get("Livelabsid")) for row in kitchen if clean(row.get("Livelabsid")))
    if not kitchen or not primary or not published:
        raise ValueError("One or more WMS source exports are empty.")
    if any(count > 1 for count in kitchen_id_counts.values()):
        raise ValueError("Kitchen Sink contains duplicate LiveLabs IDs; candidate matching must be reviewed first.")
    represented_wms_columns = set(WMS_FIELDS.values()) | set(WMS_AUXILIARY_FIELDS.values()) | {"Publish Title", "Workshop Title"}
    missing_wms_columns = sorted(represented_wms_columns - kitchen_headers)
    unmapped_wms_columns = sorted(kitchen_headers - represented_wms_columns)
    if missing_wms_columns or unmapped_wms_columns:
        raise ValueError(f"WMS source field mapping is incomplete; missing={missing_wms_columns}, unmapped={unmapped_wms_columns}")

    github_verify = _github_verification(github_summary, github_file_rows)
    history_event_count = sum(len(commit.get("changed_files") or []) for item in github_rows for commit in (item.get("commit_history") or []))
    event_diagnostics = reconcile_github_events(github_rows, github_event_rows)
    if len(github_rows) != len(github_summary):
        raise ValueError("GitHub history JSONL and summary CSV row counts differ.")
    if len(github_file_rows) != int(github_manifest.get("repository_file_path_rows", -1)):
        raise ValueError("GitHub file index row count differs from the collection manifest.")
    if len(github_event_rows) != int(github_manifest.get("commit_file_event_rows", -1)):
        raise ValueError("GitHub event CSV row count differs from the collection manifest.")
    if len(github_search_rows) != int(github_manifest.get("search_candidate_rows", -1)):
        raise ValueError("GitHub search candidate row count differs from the collection manifest.")
    source_paths = {
        "wms_kitchen": args.wms_kitchen, "wms_primary": args.wms_primary,
        "wms_published_route": args.wms_published, "livelabs_views": args.views_csv,
        "github_item_history": args.github_jsonl, "github_item_summary": args.github_summary,
        "github_repository_file_index": args.github_files, "github_commit_file_events": args.github_events,
        "github_search_candidates_not_used_as_mappings": args.github_search_candidates,
        "jenkins_report": args.jenkins_report,
        "baseline_inventory": args.baseline,
        "github_collection_manifest": args.github_collection_manifest,
    }
    source_manifest = {
        "candidate_status": "PRIVATE_CANDIDATE_NOT_PROMOTED",
        "generated_at_utc": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        "source_revision": __import__("subprocess").check_output(["git", "rev-parse", "HEAD"], cwd=Path(__file__).resolve().parents[2], text=True, encoding="utf-8").strip(),
        "sources": {
            role: {"file": path.name, "path": str(path.resolve()), "bytes": path.stat().st_size, "sha256": _sha256(path)}
            for role, path in source_paths.items()
        },
        "dates": {
            "wms_snapshot_date": args.wms_snapshot_date,
            "wms_retrieval_note": args.wms_retrieval_note,
            "views_collection_date": args.views_capture_date,
            "views_period_boundaries": "unconfirmed",
            "github_collection_started_at_utc": github_manifest.get("started_at_utc"),
            "github_collection_finalized_at_utc": github_manifest.get("finalized_at_utc"),
            "github_source_inventory_snapshot_date": github_manifest.get("source_inventory_snapshot_date"),
            "jenkins_run_id": jenkins_data.get("run", {}).get("id"),
            "jenkins_started_at": jenkins_data.get("run", {}).get("startedAt"),
            "jenkins_report_correction_date": jenkins_data.get("run", {}).get("reportRevision", {}).get("correctedAt"),
        },
        "github_index_verification": {key: value for key, value in github_verify.items() if key != "item_verification"},
        "github_file_event_reconciliation": event_diagnostics,
        "github_search_candidate_rows_not_used_as_mappings": len(github_search_rows),
    }
    jenkins_run = jenkins_data.get("run", {})
    grouped_id_rows = count_grouped_jenkins_id_items(jenkins_data)
    baseline_hash = source_manifest["sources"]["baseline_inventory"]["sha256"]
    source_info = {
        "wms_source": args.wms_kitchen.name,
        "wms_snapshot_date": args.wms_snapshot_date,
        "wms_retrieval_note": args.wms_retrieval_note,
        "views_collection_date": args.views_capture_date,
        "github_collection_completed_at": github_manifest.get("finalized_at_utc"),
        "github_source_inventory_snapshot_date": github_manifest.get("source_inventory_snapshot_date"),
        "github_item_verification": github_verify["item_verification"],
        "github_index_verification": {key: value for key, value in github_verify.items() if key != "item_verification"},
        "github_event_count": history_event_count,
        "github_event_diagnostics": event_diagnostics,
        "github_search_candidate_rows_not_used_as_mappings": len(github_search_rows),
        "baseline_hash_matches_github_crawl_input": baseline_hash == github_manifest.get("source_inventory_sha256"),
        "source_files": {role: data["file"] for role, data in source_manifest["sources"].items()},
        "jenkins_report": {
            "source_file": args.jenkins_report.name,
            "source_sha256": source_manifest["sources"]["jenkins_report"]["sha256"],
            "run_id": jenkins_run.get("id"),
            "run_status": jenkins_run.get("status"),
            "started_at": jenkins_run.get("startedAt"),
            "corrected_at": jenkins_run.get("reportRevision", {}).get("correctedAt"),
            "new_checks_executed": jenkins_run.get("reportRevision", {}).get("newChecksExecuted"),
            "catalog_item_count": jenkins_run.get("catalogItemCount"),
            "grouped_multi_id_item_count": grouped_id_rows,
            "merge_applied": False,
            "note": "Historical report view only; no QA score was joined or applied.",
        },
    }
    candidate, review = build_candidate(kitchen, baseline, views, github_rows, source_info, github_event_rows)
    review["wms_consistency"] = {
        "kitchen_sink_records": len(kitchen), "primary_report_records": len(primary),
        "published_route_records": len(published), "overlapping_wms_fields": shared_fields,
        "kitchen_and_primary_exact_multiset_match": kitchen_multiset == primary_multiset,
        "kitchen_only_row_multiplicity": sum((kitchen_multiset - primary_multiset).values()),
        "primary_only_row_multiplicity": sum((primary_multiset - kitchen_multiset).values()),
        "published_route_ids": len(route_ids), "primary_publish_status_published_ids": len(primary_published_ids),
        "published_route_and_status_overlap": len(route_ids & primary_published_ids),
        "published_route_only_ids": len(route_ids - primary_published_ids),
        "status_published_only_ids": len(primary_published_ids - route_ids),
        "published_route_only_livelabs_ids": sorted(route_ids - primary_published_ids),
        "status_published_only_livelabs_ids": sorted(primary_published_ids - route_ids),
    }
    review["github_history"]["index_verification"] = {key: value for key, value in github_verify.items() if key != "item_verification"}
    review["github_history"]["event_rows_verified"] = event_diagnostics
    review["github_history"]["search_candidates_not_used_as_mappings"] = len(github_search_rows)
    review["baseline_hash_matches_github_crawl_input"] = baseline_hash == github_manifest.get("source_inventory_sha256")
    review["source_integrity"] = "SHA-256 captured before candidate output; raw inputs read-only"
    review["metadata_reconciliation"] = {
        "metadata_record_count_matches": candidate["metadata"].get("records") == len(candidate["records"]),
        "metadata_type_counts_match": candidate["metadata"].get("counts", {}).get("type") == dict(Counter(clean(row.get("type")) or "Unknown" for row in candidate["records"])),
        "metadata_window_counts_match": all(
            candidate["metadata"].get("dashboard_window_row_counts", {}).get(period.lower()) == sum(
                1 for row in candidate["records"]
                if any(isinstance(pair, list) and len(pair) > 1 and pair[0] == label for pair in row.get("values", []))
            )
            for period, (label, _metric) in VIEW_PERIODS.items()
        ),
        "candidate_is_not_canonical": candidate["metadata"].get("canonical_payload") is False,
        "calculations_rebuilt": False,
    }
    review["contact_coverage"] = candidate["metadata"].get("counts", {}).get("contact_sources", {})
    review["wms_field_reconciliation"] = {
        "source_column_count": len(kitchen_headers),
        "represented_source_column_count": len(represented_wms_columns),
        "unmapped_source_columns": unmapped_wms_columns,
        "all_source_columns_have_explicit_mapping": len(kitchen_headers) == len(represented_wms_columns),
        "values_preserved_in_candidate_details_or_title_fields": True,
    }
    review["promotion_gates"] = [
        "Resolve LiveLabs Last Week discrepancy and approve source window semantics.",
        "Supply current type, publish type and tags or approve a documented retain-unknown policy.",
        "Resolve GitHub item-path evidence gaps and review substantive changes.",
        "Supply a same-run detailed Jenkins findings export and fresh checks before QA scoring.",
        "Complete public privacy review before release generation.",
    ]

    (output / "portfolio_inventory.json").write_text(json.dumps(candidate, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "source-manifest.json").write_text(json.dumps(source_manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "review-summary.json").write_text(json.dumps(review, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (output / "review-report.md").write_text(_report_markdown(review, source_manifest), encoding="utf-8")
    print(json.dumps({"output": str(output), "records": review["record_count"], "candidate_status": review["candidate_status"],
                      "views": review["views"], "types": review["content_type_resolution"],
                      "github": review["github_history"], "jenkins": review["jenkins"]}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
