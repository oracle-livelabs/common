"""Refresh only WMS record-update dates from an exact-ID private candidate.

This does not promote candidate classifications, views, tags, contacts, QA,
eligibility, or calculated scores. The portfolio snapshot date remains the
date of the other source datasets; only WMS field freshness is advanced.
"""

from __future__ import annotations

import argparse
from datetime import datetime, timezone
import json
from pathlib import Path
import re
import shutil
import tempfile


ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CANDIDATE = ROOT / ".private/admin/data-update-candidates/2026-11-12-analytics-refresh-07/portfolio_inventory.json"
PAYLOADS = (
    ROOT / "inventory/data/portfolio_inventory.json",
    ROOT / "inventory/data/public_portfolio_inventory.json",
)
FALLBACK = ROOT / "inventory/data/portfolio_inventory.file.js"


def load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def wms_detail(record: dict) -> str | None:
    for pair in record.get("details", []):
        if isinstance(pair, list) and len(pair) >= 2 and pair[0] == "WMS Last Update":
            value = str(pair[1]).strip() if pair[1] is not None else ""
            return value or None
    return None


def set_wms_detail(record: dict, value: str) -> bool:
    for pair in record.get("details", []):
        if isinstance(pair, list) and len(pair) >= 2 and pair[0] == "WMS Last Update":
            if pair[1] == value:
                return False
            pair[1] = value
            return True
    record.setdefault("details", []).append(["WMS Last Update", value])
    return True


def candidate_updates(candidate: dict) -> tuple[dict[str, tuple[str, str | None]], str]:
    metadata = candidate.get("metadata", {})
    snapshot = str(metadata.get("data_freshness", {}).get("wms_snapshot_date") or metadata.get("snapshot_date") or "")
    datetime.strptime(snapshot, "%Y-%m-%d")
    updates: dict[str, tuple[str, str | None]] = {}
    duplicates: set[str] = set()
    for record in candidate.get("records", []):
        identity = str(record.get("livelabsId") or "").strip()
        updated = str(record.get("update") or "").strip()
        if not identity or not updated:
            continue
        if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", updated):
            raise ValueError(f"Candidate has a non-date WMS update for LiveLabs ID {identity}.")
        if identity in updates:
            duplicates.add(identity)
            continue
        updates[identity] = (updated, wms_detail(record))
    if duplicates:
        raise ValueError(f"Candidate has duplicate LiveLabs IDs: {len(duplicates)}.")
    return updates, snapshot


def update_payload(payload: dict, updates: dict[str, tuple[str, str | None]], snapshot: str, require_complete: bool) -> tuple[dict, int, int, list[str]]:
    records = payload.get("records", [])
    seen: set[str] = set()
    matched = changed = 0
    missing: list[str] = []
    for record in records:
        identity = str(record.get("livelabsId") or "").strip()
        if not identity:
            continue
        if identity in seen:
            raise ValueError(f"Target contains duplicate LiveLabs ID {identity}.")
        seen.add(identity)
        source = updates.get(identity)
        if not source:
            missing.append(identity)
            continue
        matched += 1
        date_value, detail_value = source
        changed_record = record.get("update") != date_value
        record["update"] = date_value
        if detail_value:
            changed_record = set_wms_detail(record, detail_value) or changed_record
        flags = record.get("sourceFlags")
        if isinstance(flags, dict):
            flags["wms_snapshot_date"] = snapshot
        if changed_record:
            changed += 1

    if require_complete and missing:
        raise ValueError(f"Public projection has {len(missing)} records without exact candidate LiveLabs ID matches.")
    metadata = payload.setdefault("metadata", {})
    metadata.setdefault("data_freshness", {})["wms_snapshot_date"] = snapshot
    metadata["generated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds").replace("+00:00", "Z")
    return payload, matched, changed, missing


def write_json_atomic(path: Path, payload: dict) -> None:
    text = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", newline="\n", dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        stream.write(text)
    temporary.replace(path)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--candidate", type=Path, default=DEFAULT_CANDIDATE)
    parser.add_argument("--backup-dir", type=Path)
    args = parser.parse_args()

    candidate = load(args.candidate)
    updates, snapshot = candidate_updates(candidate)
    loaded = [(path, load(path)) for path in PAYLOADS]
    planned = []
    for path, payload in loaded:
        updated, matched, changed, missing = update_payload(payload, updates, snapshot, require_complete=path.name == "public_portfolio_inventory.json")
        planned.append((path, updated, matched, changed, missing))

    backup_stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    backup_dir = args.backup_dir or ROOT / f".private/admin/data-update-backups/2026-11-16-wms-update-refresh-{backup_stamp}"
    backup_dir.mkdir(parents=True, exist_ok=True)
    for path in (*PAYLOADS, FALLBACK):
        shutil.copy2(path, backup_dir / path.name)

    for path, payload, _, _, _ in planned:
        write_json_atomic(path, payload)

    for path, _, matched, changed, missing in planned:
        print(f"{path.relative_to(ROOT)}: {matched} exact LiveLabs ID matches, {changed} records refreshed, {len(missing)} unmatched.")
    print(f"WMS source capture date: {snapshot}. Portfolio snapshot date was retained.")
    print(f"Backups: {backup_dir.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
