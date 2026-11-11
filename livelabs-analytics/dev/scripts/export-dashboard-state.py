"""Export the public API projection for a versioned static release; never private DB rows."""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.util
import json
from pathlib import Path
from urllib.request import urlopen
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--url', default='http://127.0.0.1:4175/api/dashboard-admin-state')
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists(): raise ValueError('Choose a new export filename; existing evidence is preserved.')
    if urlsplit(args.url).hostname not in ('127.0.0.1', 'localhost', '::1'):
        raise ValueError('Export from the reviewed local service.')
    source = ROOT / 'inventory/data/public_portfolio_inventory.json'
    inventory = json.loads(source.read_text(encoding='utf-8'))
    ids = {str(r['livelabsId']) for r in inventory['records']}
    with urlopen(args.url, timeout=30) as response: payload = json.load(response)
    merge = payload.get('qaReportMerge')
    if not merge or not merge.get('overlay'): raise ValueError('Apply a reviewed Jenkins report in Admin before export.')
    if set(merge['overlay']) - ids: raise ValueError('API export contains records outside the reviewed public cohort.')
    spec = importlib.util.spec_from_file_location('state_export_server', ROOT / 'dev/scripts/admin-server.py')
    app = importlib.util.module_from_spec(spec); spec.loader.exec_module(app)
    for item in merge['overlay'].values(): app.enrich_dashboard_qa_overlay(item, item.get('scorePolicy'))
    payload['releaseEvidence'] = {'schemaVersion': 1, 'exportedAt': datetime.now(timezone.utc).isoformat(),
        'inventorySha256': hashlib.sha256(source.read_bytes()).hexdigest(),
        'snapshotDate': inventory['metadata']['snapshot_date'], 'scoreValidityVersion': 2,
        'qaRunIds': sorted({str(item.get('runId', '')) for item in merge['overlay'].values()})}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8')
    print(json.dumps({'exportedItems': len(merge['overlay']), 'output': str(args.output)}))


if __name__ == '__main__': main()
