"""Build baseline scores and optionally a private sanitized evidence sidecar."""
import argparse
import json
from pathlib import Path
from author_reports import ROOT, build_evidence, score_baselines, source_hash

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--evidence-source', type=Path)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--inventory', type=Path, default=ROOT / 'inventory/data/public_portfolio_inventory.json')
    parser.add_argument('--output', type=Path, default=ROOT / 'assets/data/score-baselines.json')
    args = parser.parse_args()
    source = args.inventory
    target = args.output
    projection = score_baselines(json.loads(source.read_text(encoding='utf-8')))
    projection['sourceHash'] = source_hash(source)
    if args.check:
        if not target.exists() or json.loads(target.read_text(encoding='utf-8')) != projection:
            raise ValueError('Score projection is stale. Run build-author-reports.py after publishing public inventory.')
    else:
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(projection, separators=(',', ':')), encoding='utf-8')
    summary = {'baselineRecords': len(projection['records']), 'check': args.check}
    if args.evidence_source:
        evidence = build_evidence(json.loads(args.evidence_source.read_text(encoding='utf-8')))
        evidence['sourceHash'] = source_hash(args.evidence_source)
        target = ROOT / '.private/admin/author-evidence.json'
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(json.dumps(evidence, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
        summary.update(evidenceEntries=len(evidence['entries']), ambiguous=evidence['ambiguousCount'])
    print(json.dumps(summary))

if __name__ == '__main__': main()
