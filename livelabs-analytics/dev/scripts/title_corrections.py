"""Restore reviewed display titles after source matching; retain original titles."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
CONFIG = ROOT / 'dev/config/title-corrections.json'


def apply_title_corrections(payload, corrections_path=CONFIG):
    corrections = json.loads(Path(corrections_path).read_text(encoding='utf-8'))['corrections']
    applied = []
    for correction in corrections:
        matches = [r for r in payload['records'] if r.get('key') == correction['recordKey']
                   and str(r.get('wmsId')) == correction['wmsId']]
        if len(matches) > 1:
            raise ValueError('Title correction has ambiguous record identity.')
        if not matches:
            continue
        record = matches[0]
        old, new = correction['reportedTitle'], correction['displayTitle']
        # A newer source title supersedes this correction. Never overwrite it.
        if record.get('title') not in (old, new):
            continue
        record.setdefault('rawTitle', old)
        record['title'] = new
        record['titleCorrection'] = {'evidence': correction['evidence'], 'reportedTitle': old}
        record['searchable'] = str(record.get('searchable', '')).replace(old, new).replace(old.lower(), new.lower())
        for field in ('values', 'details'):
            for pair in record.get(field, []):
                if len(pair) >= 2 and pair[0] in ('Title', 'Publish Title', 'WMS Workshop Title', 'Workshop Title') and pair[1] == old:
                    pair[1] = new
        applied.append(record['key'])
    by_key = {r['key']: r for r in payload['records']}
    by_id = {str(r['livelabsId']): r for r in payload['records'] if r.get('livelabsId')}
    for record in payload['records']:
        for sibling in record.get('family', {}).get('siblings', []):
            match = by_key.get(sibling.get('key')) or by_id.get(str(sibling.get('livelabsId')))
            if match and match['key'] in applied:
                old = sibling.get('title', '')
                sibling['title'] = match['title']
                if old:
                    record['searchable'] = str(record.get('searchable', '')).replace(old, match['title'])
    payload.setdefault('metadata', {})['title_corrections'] = {'applied_keys': applied}
    return applied


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--inventory', type=Path, default=ROOT / 'inventory/data/portfolio_inventory.json')
    parser.add_argument('--apply', action='store_true')
    args = parser.parse_args()
    payload = json.loads(args.inventory.read_text(encoding='utf-8'))
    applied = apply_title_corrections(payload)
    if args.apply:
        args.inventory.write_text(json.dumps(payload, separators=(',', ':'), ensure_ascii=False) + '\n', encoding='utf-8')
    print(json.dumps({'applied' if args.apply else 'preview': applied}))
