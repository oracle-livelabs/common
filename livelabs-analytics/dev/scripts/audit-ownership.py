"""Compare ownership against WMS exports and preserve reviewed corrections."""
import argparse
import csv
import json
from pathlib import Path
from ownership_corrections import apply_ownership_corrections


def read_csv(path):
    for encoding in ("utf-8-sig", "cp1252"):
        try:
            with path.open(encoding=encoding, newline="") as handle:
                return list(csv.DictReader(handle))
        except UnicodeDecodeError:
            continue
    raise ValueError(f"Cannot decode {path}")


def identity(row):
    return (row.get("Livelabsid") or row.get("Livelabs ID") or "").strip(), row.get("Workshop Id", "").strip()


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", required=True, type=Path)
    parser.add_argument("--apply-corrections", action="store_true")
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[2]
    inventory = root / "inventory/data/portfolio_inventory.json"
    payload = json.loads(inventory.read_text(encoding="utf-8"))
    source_rows = read_csv(args.snapshot / "All Workshops Report (4).csv")
    by_identity = {}
    for row in source_rows:
        key = identity(row)
        if key in by_identity:
            raise ValueError(f"Duplicate source identity: {key}")
        by_identity[key] = row
    unmatched, mismatches, field_mismatches, source_conflicts = [], [], [], []
    owner_updater_matches, user_records, source_by_key = [], [], {}
    for record in payload["records"]:
        key = record["livelabsId"], record["wmsId"]
        source = by_identity.get(key)
        if not source:
            unmatched.append(record["key"])
            continue
        source_by_key[record["key"]] = source
        email = source.get("Workshop Owner Email", "").strip()
        reported = email or source.get("Workshop Owner Group", "").strip()
        actual_reported = (record.get("ownership") or {}).get("reportedOwner", record.get("owner", ""))
        if actual_reported != reported:
            mismatches.append({"key": record["key"], "canonical": actual_reported, "source": reported})
        for label, value in record.get("details", []):
            if label in ("Owner Email", "Workshop Owner Email") and value.strip() != email:
                field_mismatches.append({"key": record["key"], "label": label, "value": value, "source": email})
        item = {
            "key": record["key"], "livelabs_id": record["livelabsId"], "wms_id": record["wmsId"],
            "title": record["title"], "wms_reported_owner": email,
            "last_update_person": source.get("Last Update Person", ""),
            "support_contact": source.get("Support Contact Email", ""),
            "technical_contact": source.get("Tech Contact Email", ""),
            "acknowledgement_authors": dict(record.get("details", [])).get("Acknowledgement Author", "")
        }
        if email and email == source.get("Last Update Person", "").strip():
            owner_updater_matches.append(item)
        if email == "vasile-lucian.brinzei@oracle.com":
            user_records.append(item)
    for file in args.snapshot.glob("All Workshops Report*.csv"):
        if file.name == "All Workshops Report (4).csv":
            continue
        for row in read_csv(file):
            if "Workshop Owner Email" not in row:
                continue
            baseline = by_identity.get(identity(row))
            if baseline and row["Workshop Owner Email"].strip() != baseline.get("Workshop Owner Email", "").strip():
                source_conflicts.append({"file": file.name, "identity": identity(row)})
    if args.apply_corrections:
        apply_ownership_corrections(payload, source_by_key=source_by_key)
        inventory.write_text(json.dumps(payload, separators=(",", ":"), ensure_ascii=False) + "\n", encoding="utf-8")
    audit = {
        "reviewed_at": "2026-10-09", "snapshot_date": "2026-09-28", "records_checked": len(payload["records"]),
        "unmatched_source_records": unmatched, "owner_mapping_mismatches": mismatches,
        "owner_detail_field_mismatches": field_mismatches, "cross_export_owner_conflicts": source_conflicts,
        "confirmed_disputed_ownership": [r["key"] for r in payload["records"] if (r.get("ownership") or {}).get("status") == "disputed"],
        "owner_equals_updater_count": len(owner_updater_matches),
        "owner_equals_updater_notice": "Diagnostic overlap only. Being both owner and updater is not proof of an error.",
        "records_reporting_user_as_owner": user_records
    }
    (root / "dev/ownership-audit-2026-10-09.json").write_text(json.dumps(audit, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    with (root / "dev/ownership-updater-overlap-2026-10-09.csv").open("w", encoding="utf-8-sig", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(owner_updater_matches[0]) if owner_updater_matches else ["key"])
        writer.writeheader()
        writer.writerows(owner_updater_matches)
    report = ["# Ownership audit — 9 October 2026", "",
              f"Compared all {len(payload['records']):,} records with the 28 September WMS export using both LiveLabs and WMS IDs.", "",
              f"- Unmatched source records: {len(unmatched)}.", f"- Owner mapping mismatches: {len(mismatches)}.",
              f"- Owner detail-field mismatches: {len(field_mismatches)}.", f"- Ownership conflicts between WMS exports: {len(source_conflicts)}.",
              f"- Active disputed-owner corrections: {len(audit['confirmed_disputed_ownership'])}.",
              "- LiveLabs 4074 / WMS 11763: restored the WMS-reported owner on 9 October at the user's request. The September export is the selected attribution source.",
              "- Acknowledgement authors, support contacts, and technical contacts retain their separate roles.", "",
              "## Other records attributed to the same person", "", "| LiveLabs ID | WMS ID | Title | Finding |", "|---|---|---|---|"]
    for item in user_records:
        finding = "WMS source attribution restored at user request" if item["livelabs_id"] == "4074" else "Matches WMS source; real-world ownership not independently verified"
        report.append(f"| {item['livelabs_id'] or 'N/A'} | {item['wms_id']} | {item['title']} | {finding} |")
    report.extend(["", "## Limits", "",
                   f"There are {len(owner_updater_matches)} records whose reported owner is also the last updater. This overlap is recorded separately as a diagnostic signal; it does not establish incorrect ownership.",
                   "Matching a WMS export validates the mapping, not the real-world assignment. Additional ownership corrections require reliable evidence or confirmation from the listed person.",
                   "Owner attribution follows the WMS snapshot. No local ownership correction is currently active.", ""])
    (root / "dev/ownership-audit-2026-10-09.md").write_text("\n".join(report), encoding="utf-8")
    print(json.dumps({key: len(value) if isinstance(value, list) else value for key, value in audit.items() if key != "owner_equals_updater_notice"}, indent=2))
    if unmatched or mismatches or field_mismatches or source_conflicts:
        raise SystemExit(1)


if __name__ == "__main__":
    main()
