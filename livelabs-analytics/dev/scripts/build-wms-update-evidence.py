#!/usr/bin/env python3
"""Build deterministic workshop update evidence from a canonical WMS payload."""

from __future__ import annotations

import argparse
from collections import Counter
from datetime import datetime, timezone
import json
from pathlib import Path


def load_rows(path: Path) -> list[dict]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if isinstance(payload, list):
        return payload
    for key in ("canonical_rows", "rows"):
        if isinstance(payload.get(key), list):
            return payload[key]
    raise ValueError(f"Unsupported WMS payload: {path}")


def build_row(row: dict) -> dict:
    update_date = row.get("wms_last_update_time") or row.get("last_updated") or row.get("completion_date")
    source_field = (
        "wms_last_update_time"
        if row.get("wms_last_update_time") or row.get("last_updated")
        else "completion_date"
        if row.get("completion_date")
        else None
    )
    source = "wms_workshop_update" if update_date else "update_unavailable"
    confidence = "medium" if update_date else "unknown"
    return {
        "workshop_key": row["workshop_key"],
        "repo_slug": row.get("repo_slug"),
        "last_meaningful_workshop_update_date": update_date,
        "last_updated_source": source,
        "last_updated_confidence": confidence,
        "update_source": source,
        "update_source_field": source_field,
        "wms_workshop_update_date": update_date,
        "wms_workshop_update_field": source_field,
        "resolved_subpath": None,
        "resolved_workshop_path": None,
        "resolved_manifest_path": None,
        "latest_live_git_commit_date": None,
        "latest_workshop_markdown_commit_date": None,
        "latest_workshop_commit_date": None,
        "latest_meaningful_commit_subject": None,
        "first_workshop_commit_date": None,
        "live_fetch_status": "repository_census_separate",
        "local_mirror_sync_status": "not_attempted",
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", required=True, help="Canonical WMS JSON path")
    parser.add_argument("--output", required=True, help="Output JSON path")
    args = parser.parse_args()

    input_path = Path(args.input)
    rows = [build_row(row) for row in load_rows(input_path)]
    source_counts = Counter(row["last_updated_source"] for row in rows)
    payload = {
        "metadata": {
            "generated_at": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
            "source": "current_wms_last_update_time",
            "source_path": str(input_path),
            "row_count": len(rows),
            "confidence_counts": dict(Counter(row["last_updated_confidence"] for row in rows)),
            "source_counts": dict(source_counts),
            "repository_evidence": "separate_github_repository_audit",
        },
        "rows": rows,
    }
    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
