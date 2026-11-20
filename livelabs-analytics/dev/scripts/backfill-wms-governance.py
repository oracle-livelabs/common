#!/usr/bin/env python3
"""Backfill governance-only fields from the prior stable-ID catalog into current WMS rows."""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path


def pair_map(record: dict) -> dict[str, object]:
    result: dict[str, object] = {}
    for section in ("values", "details"):
        for pair in record.get(section) or []:
            if isinstance(pair, list) and len(pair) >= 2 and pair[0]:
                result[str(pair[0])] = pair[1]
    return result


def text(value: object) -> str | None:
    if value in (None, ""):
        return None
    result = str(value).strip()
    return result or None


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wms-json", required=True, help="Current canonical WMS JSON path")
    parser.add_argument("--prior-index", required=True, help="Prior full-content search index JSON path")
    parser.add_argument("--output", required=True, help="Output canonical WMS JSON path")
    args = parser.parse_args()

    wms_path = Path(args.wms_json)
    prior_path = Path(args.prior_index)
    payload = json.loads(wms_path.read_text(encoding="utf-8"))
    prior_payload = json.loads(prior_path.read_text(encoding="utf-8"))
    prior_by_livelabs_id = {
        str(record.get("livelabsId")): {"record": record, "pairs": pair_map(record)}
        for record in prior_payload.get("records", [])
        if text(record.get("livelabsId"))
    }

    prior_snapshot = text((prior_payload.get("metadata") or {}).get("generated_at"))
    prior_snapshot_date = prior_snapshot[:10] if prior_snapshot else None
    backfill_counts: Counter[str] = Counter()
    current_ids: set[str] = set()

    for row in payload.get("canonical_rows", []):
        livelabs_id = text(row.get("livelabs_id"))
        if not livelabs_id:
            continue
        current_ids.add(livelabs_id)
        prior = prior_by_livelabs_id.get(livelabs_id)
        if not prior:
            continue
        pairs = prior["pairs"]
        prior_publish_type = text(pairs.get("Publish Type"))
        if prior_publish_type:
            row["publish_type"] = prior_publish_type.lower()
            backfill_counts[f"publish_type_{prior_publish_type.lower()}"] += 1
            if prior_publish_type.lower() == "disabled":
                row["disabled_since_date"] = row.get("disabled_since_date") or prior_snapshot_date
                row["disabled_since_source"] = "prior_full_content_catalog"
                row["disabled_since_note"] = (
                    "Publish type carried forward by stable LiveLabs ID from the prior catalog snapshot."
                )
        prior_sprint_flag = text(pairs.get("Sprint Flag"))
        if prior_sprint_flag and not text(row.get("sprint_flag")):
            row["sprint_flag"] = prior_sprint_flag
            backfill_counts["sprint_flag"] += 1
        prior_level = text(pairs.get("Workshop Level"))
        if prior_level and not text(row.get("workshop_level")):
            row["workshop_level"] = prior_level
            backfill_counts["workshop_level"] += 1

    payload.setdefault("metadata", {}).update(
        {
            "governance_backfill_generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "governance_backfill_source": str(prior_path),
            "governance_backfill_snapshot_date": prior_snapshot_date,
            "governance_backfill_counts": dict(backfill_counts),
            "new_livelabs_id_count_vs_prior": len(current_ids - set(prior_by_livelabs_id)),
            "removed_livelabs_id_count_vs_prior": len(set(prior_by_livelabs_id) - current_ids),
            "removed_livelabs_ids_vs_prior": sorted(set(prior_by_livelabs_id) - current_ids),
        }
    )
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
