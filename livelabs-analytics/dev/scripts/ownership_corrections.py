"""Apply reviewed ownership corrections without rewriting WMS source exports."""
import json
from collections import Counter
from pathlib import Path

DEFAULT_CORRECTIONS = Path(__file__).resolve().parents[2] / "inventory/data/ownership_corrections.json"


def apply_ownership_corrections(payload, corrections_path=DEFAULT_CORRECTIONS, source_by_key=None):
    corrections = json.loads(Path(corrections_path).read_text(encoding="utf-8"))["corrections"]
    applied = []
    for correction in corrections:
        matches = [record for record in payload["records"]
                   if record.get("livelabsId") == correction["livelabsId"]
                   and record.get("wmsId") == correction["wmsId"]]
        if len(matches) != 1:
            raise ValueError(f"Ownership correction must resolve exactly one dual-ID record: {correction['livelabsId']}")
        record = matches[0]
        prior = record.get("ownership") or {}
        reported = record.get("owner") or prior.get("reportedOwner", "")
        if reported != correction["reportedOwner"]:
            raise ValueError(f"Reported owner changed for {record['key']}; review the correction before applying it")
        if correction["status"] != "disputed":
            raise ValueError("Only reviewed disputed ownership corrections are supported")
        record["ownership"] = {**correction, "source": "WMS Workshop Owner Email; human correction"}
        record["owner"] = ""
        record["ownerMissing"] = True
        source = (source_by_key or {}).get(record["key"], {})
        details = dict(record.get("details", []))
        contacts = {label: source.get(label, "").strip() or details.get(label, "")
                    for label in ("Support Contact Email", "Tech Contact Email")}
        has_fallback = any(contacts.values()) or bool(details.get("Acknowledgement Updater"))
        record["contactCoverage"] = {
            "authorMissing": True, "label": "Fallback contact" if has_fallback else "No contact evidence",
            "rank": "fallback" if has_fallback else "missing", "tier": "Fallback" if has_fallback else "Missing"
        }
        for target in ("values", "details"):
            pairs = [pair for pair in record.get(target, [])
                     if pair[0] not in {"Owner Email", "Workshop Owner Email", "Author Coverage", "Contact Coverage Tier",
                                        "Ownership Status", "WMS Reported Owner Email (disputed)", "Ownership Review Evidence"}]
            pairs.extend([["Author Coverage", record["contactCoverage"]["label"]],
                          ["Contact Coverage Tier", record["contactCoverage"]["tier"]],
                          ["Ownership Status", "Disputed — current owner needs confirmation"]])
            if target == "details":
                pairs.extend([["WMS Reported Owner Email (disputed)", reported], ["Ownership Review Evidence", correction["reason"]]])
                for label, value in contacts.items():
                    if value and not any(pair[0] == label for pair in pairs):
                        pairs.append([label, value])
            record[target] = pairs
        record["searchable"] = " ".join(str(value) for value in [
            record["title"], record["wmsId"], record["livelabsId"], record.get("category", ""), record.get("type", ""),
            record.get("status", ""), *[pair[1] for pair in record["values"] + record["details"]]
        ])
        applied.append(record["key"])
    payload["metadata"]["ownership_corrections"] = {"reviewed_at": "2026-10-09", "applied_keys": applied}
    payload["metadata"]["counts"]["contact_coverage"] = dict(Counter(record.get("contactCoverage", {}).get("tier") for record in payload["records"]))
    return applied
