#!/usr/bin/env python3
"""Build a private WMS contact index from preserved exports for local review.

Contacts are matched only by LiveLabs ID. Support email takes precedence over
technical contact email; owner/author and GitHub commit identities are excluded.
The source workbooks are read only and are never changed. Output must stay under
the ignored .private directory; this data is not approved for public assets.
"""

from __future__ import annotations

import argparse
import json
import re
from collections import defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

try:
    from openpyxl import load_workbook
except ImportError as exc:  # pragma: no cover - environment-specific help
    raise SystemExit("Install openpyxl to read WMS .xlsx exports: python -m pip install openpyxl") from exc


def normalized_label(value: Any) -> str:
    return re.sub(r"[^a-z0-9]", "", str(value or "").casefold())


def live_labs_id(value: Any) -> str:
    if value is None or isinstance(value, bool):
        return ""
    if isinstance(value, int):
        return str(value)
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    return str(value).strip()


def private_output_path(value: str | Path) -> Path:
    project_root = Path(__file__).resolve().parents[2]
    private_root = (project_root / ".private").resolve()
    output = Path(value).expanduser().resolve()
    if not output.is_relative_to(private_root):
        raise argparse.ArgumentTypeError("WMS contact index output must be under .private")
    return output


def load_inventory(path: Path) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    payload = json.loads(path.read_text(encoding="utf-8-sig"))
    records = payload if isinstance(payload, list) else payload.get("records", [])
    if not isinstance(records, list):
        raise ValueError("Public inventory must contain a records array.")

    public_records = [
        record for record in records
        if isinstance(record, dict)
        and str(record.get("publishStatus") or "").strip().casefold() == "published"
        and str(record.get("publishType") or "").strip().casefold() == "public"
        and str(record.get("type") or "").strip().casefold() in {"workshop", "sprint"}
    ]
    return public_records, payload.get("metadata", {}) if isinstance(payload, dict) else {}


def read_contact_report(path: Path, public_ids: set[str]) -> tuple[dict[str, dict[str, list[str]]], dict[str, int]]:
    """Read contact columns from one WMS export without changing its source rows."""
    workbook = load_workbook(path, read_only=True, data_only=True)
    try:
        sheet = workbook.active
        rows = sheet.iter_rows(values_only=True)
        header = next(rows, None)
        if not header:
            raise ValueError(f"WMS workbook is empty: {path.name}")

        columns = {normalized_label(label): index for index, label in enumerate(header)}
        id_column = columns.get("livelabsid")
        if id_column is None:
            id_column = columns.get("livelabid")
        if id_column is None:
            raise ValueError(f"No LiveLabs ID column found in {path.name}")

        roles = {
            "Support": {"supportcontactemail", "supportemail"},
            "Technical": {"techcontactemail", "technicalcontactemail", "technicalemail"},
            "Manager": {"managercontactemail", "manageremail"},
            "Other": {"othercontactemail", "contactemail"},
        }
        role_columns: dict[str, list[int]] = {}
        for role, labels in roles.items():
            role_columns[role] = [columns[label] for label in labels if label in columns]

        contacts: dict[str, dict[str, list[str]]] = defaultdict(lambda: defaultdict(list))
        summary = {"rowsWithLiveLabsId": 0, "publicIdRows": 0}
        for row in rows:
            if not row or id_column >= len(row):
                continue
            item_id = live_labs_id(row[id_column])
            if not item_id:
                continue
            summary["rowsWithLiveLabsId"] += 1
            if item_id not in public_ids:
                continue
            summary["publicIdRows"] += 1
            for role, indexes in role_columns.items():
                for index in indexes:
                    value = str(row[index] or "").strip() if index < len(row) else ""
                    if "@" in value:
                        contacts[item_id][role].append(value)
        return contacts, summary
    finally:
        workbook.close()


def one_unambiguous(values: list[str]) -> str | None:
    unique = {value.strip().casefold(): value.strip() for value in values if value.strip()}
    return next(iter(unique.values())) if len(unique) == 1 else None


def build(args: argparse.Namespace) -> tuple[dict[str, Any], dict[str, Any]]:
    records, inventory_metadata = load_inventory(args.inventory)
    id_counts: dict[str, int] = defaultdict(int)
    for record in records:
        item_id = live_labs_id(record.get("livelabsId"))
        if item_id:
            id_counts[item_id] += 1
    public_ids = {item_id for item_id, count in id_counts.items() if count == 1}
    ambiguous_inventory_ids = sum(1 for count in id_counts.values() if count > 1)

    sources = [
        ("published", args.published_report),
        ("primary", args.primary_report),
        ("kitchenSink", args.kitchen_sink_report),
    ]
    collected: dict[str, dict[str, dict[str, list[str]]]] = {}
    source_summary: dict[str, dict[str, int]] = {}
    for name, path in sources:
        collected[name], source_summary[name] = read_contact_report(path, public_ids)

    # Prefer a dedicated support email from the published report. Broader WMS
    # reports fill gaps; technical and manager contacts are subsequent fallbacks.
    priorities = [
        ("Support", "published"),
        ("Support", "primary"),
        ("Support", "kitchenSink"),
        ("Technical", "kitchenSink"),
        ("Manager", "kitchenSink"),
        ("Other", "kitchenSink"),
    ]
    index: dict[str, dict[str, str]] = {}
    contact_conflicts = 0
    same_as_owner_skipped = 0
    owner_by_id = {
        live_labs_id(record.get("livelabsId")): str(record.get("owner") or "").strip().casefold()
        for record in records
    }
    for item_id in sorted(public_ids):
        owner_email = owner_by_id.get(item_id, "")
        skipped_owner_email = False
        for role, source_name in priorities:
            values = collected[source_name].get(item_id, {}).get(role, [])
            if not values:
                continue
            contact = one_unambiguous(values)
            if contact is None:
                contact_conflicts += 1
                break
            # Keep this as a second point of contact. If WMS repeats the
            # owner email, prefer a distinct contact from a lower-priority
            # role when one is available.
            if owner_email and contact.casefold() == owner_email:
                skipped_owner_email = True
                continue
            index[item_id] = {"email": contact, "type": role}
            break
        if skipped_owner_email:
            same_as_owner_skipped += 1

    role_counts: dict[str, int] = defaultdict(int)
    for contact in index.values():
        role_counts[contact["type"]] += 1
    source_files = [path.name for _, path in sources]
    payload = {
        "schemaVersion": 1,
        "snapshotDate": args.snapshot_date,
        "mappingKey": "livelabsId",
        "contactPriority": ["Support Contact Email", "Tech Contact Email", "Manager Email", "Contact Email"],
        "sourceReports": source_files,
        "items": index,
        "summary": {
            "publicRecords": len(records),
            "uniquePublicLiveLabsIds": len(public_ids),
            "recordsWithContact": len(index),
            "recordsWithoutContact": max(0, len(records) - len(index)),
            "supportContacts": role_counts["Support"],
            "technicalContacts": role_counts["Technical"],
            "managerContacts": role_counts["Manager"],
            "otherContacts": role_counts["Other"],
            "sameAsOwnerSkipped": same_as_owner_skipped,
            "ambiguousInventoryIds": ambiguous_inventory_ids,
            "ambiguousContactSourceRecords": contact_conflicts,
        },
        "sourceCoverage": source_summary,
        "inventorySnapshotDate": inventory_metadata.get("snapshot_date"),
        "generatedAt": datetime.now(timezone.utc).isoformat(timespec="seconds"),
    }
    result = {
        "payload": payload,
        "summary": payload["summary"],
        "output": str(args.output),
    }
    return payload, result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--inventory", type=Path, required=True, help="Public inventory JSON used to scope displayed records")
    parser.add_argument("--published-report", type=Path, required=True, help="WMS All Published report export")
    parser.add_argument("--primary-report", type=Path, required=True, help="WMS Primary Report export")
    parser.add_argument("--kitchen-sink-report", type=Path, required=True, help="WMS Kitchen Sink export")
    parser.add_argument("--snapshot-date", required=True, help="Date shown by the source collection, YYYY-MM-DD")
    parser.add_argument("--output", type=private_output_path, required=True,
                        help="Private JSON (service) or JavaScript (candidate) contact-index path under .private")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    payload, result = build(args)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    content = json.dumps(payload, ensure_ascii=False, separators=(",", ":"))
    if args.output.suffix.lower() != '.json':
        content = "/* Generated by dev/scripts/build-views-wms-contact-index.py; do not edit directly. */\n" + "globalThis.__livelabsViewsContactPayload = " + content + ";\n"
    args.output.write_text(content, encoding="utf-8", newline="\n")
    print(json.dumps(result["summary"], indent=2))
    print(f"Output: {args.output}")


if __name__ == "__main__":
    main()
