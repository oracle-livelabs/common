"""Prepare reconciled snapshot outputs without replacing dashboard files.

Outputs stay in a review directory until separately approved for promotion.
The previous and incoming bundles can be imported into the admin comparison.
"""
import argparse
import json
import subprocess
import sys
from pathlib import Path
from admin_data import provenance, quality_queue, validate_snapshot
from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--snapshot', type=Path, required=True)
    parser.add_argument('--manifest', type=Path, required=True)
    parser.add_argument('--output', type=Path, required=True, help='New review directory; existing directories are never overwritten')
    args = parser.parse_args()
    output = args.output.resolve()
    if output.exists():
        raise ValueError('Choose a new output directory; preserve existing snapshot evidence.')
    manifest = json.loads(args.manifest.read_text(encoding='utf-8'))
    required = {'wms', 'sprints', 'views', 'tags_product', 'tags_role', 'tags_focus', 'tags_sales_play'}
    if not required <= set(manifest.get('files', {})):
        raise ValueError('Manifest must identify each WMS, sprint, views and tag input.')
    spec = spec_from_file_location('capture_snapshot', ROOT / 'dev/scripts/capture-snapshot.py')
    capture = module_from_spec(spec)
    spec.loader.exec_module(capture)
    before = capture.capture()
    output.mkdir(parents=True)
    (output / 'before-snapshot.json').write_text(json.dumps(before, ensure_ascii=False), encoding='utf-8')
    inventory = output / 'portfolio_inventory.json'
    inventory.write_text(json.dumps({k:v for k,v in before.items() if k not in ('capture', 'rankings')}, ensure_ascii=False), encoding='utf-8')
    subprocess.run([sys.executable, str(ROOT / 'dev/scripts/refresh-snapshot-data.py'), '--snapshot', str(args.snapshot.resolve()), '--source-manifest', str(args.manifest.resolve()), '--inventory', str(inventory)], cwd=ROOT, check=True)
    payload = validate_snapshot(json.loads(inventory.read_text(encoding='utf-8')))
    subprocess.run([sys.executable, str(ROOT / 'dev/scripts/refresh-top-performers.py'), '--inventory', str(inventory), '--snapshot-date', manifest['snapshot_date'], '--output', str(output / 'top-performers.html')], cwd=ROOT, check=True)
    mirror = '/* Generated from portfolio_inventory.json. Do not edit directly. */\nglobalThis.__livelabsPortfolioInventoryPayload = ' + inventory.read_text(encoding='utf-8').strip() + ';\n'
    (output / 'portfolio_inventory.file.js').write_text(mirror, encoding='utf-8')
    (output / 'after-snapshot.json').write_text(json.dumps(capture.capture(inventory), ensure_ascii=False), encoding='utf-8')
    (output / 'readiness.json').write_text(json.dumps({'provenance': provenance(payload), 'qualityIssueCount': len(quality_queue(payload)), 'historicalQueuesRequireFreshEvidence': ['At-Risk', 'Retire-Now', 'Replacement'], 'promotionStatus': 'Prepared for review; dashboard files are unchanged'}, indent=2), encoding='utf-8')
    print('Prepared inventory, demand ranking, file mirror, before/after captures and readiness report: ' + str(output))


if __name__ == '__main__':
    main()
