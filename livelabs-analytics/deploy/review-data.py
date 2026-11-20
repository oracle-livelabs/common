"""Review active data lineage against the latest supplied private candidate."""
import argparse
from collections import Counter
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path):
    return json.loads(path.read_text(encoding='utf-8'))


def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def review(candidate):
    full_path = ROOT / 'inventory/data/portfolio_inventory.json'
    public_path = ROOT / 'inventory/data/public_portfolio_inventory.json'
    full, public = read(full_path), read(public_path)
    scores = read(ROOT / 'assets/data/score-baselines.json')
    ids = [str(row.get('livelabsId') or '') for row in full['records']]
    populated = [value for value in ids if value]
    public_ids = [str(row.get('livelabsId') or '') for row in public['records']]
    checks = {
        'full_record_keys_unique':len({row['key'] for row in full['records']}) == len(ids),
        'populated_livelabs_ids_unique':len(set(populated)) == len(populated),
        'public_livelabs_ids_unique_nonempty':all(public_ids) and len(set(public_ids)) == len(public_ids),
        'public_only':all(row.get('publishType') == 'Public' and row.get('publishStatus') == 'Published' for row in public['records']),
        'baseline_bound_to_current_public_inventory':scores.get('sourceHash') == digest(public_path),
        'baseline_covers_current_public_inventory':set(scores.get('records', {})) == set(public_ids),
    }
    report = {'reviewed_at':datetime.now(timezone.utc).isoformat(), 'live_sources_fetched':False,
        'current':{'records':len(ids),'populated_livelabs_ids':len(populated),'missing_livelabs_ids':len(ids)-len(populated),
            'public_records':len(public_ids),'public_types':dict(Counter(row['type'] for row in public['records'])),
            'source_snapshot_date':full['metadata'].get('snapshot_date'),'source_dates':full['metadata'].get('data_freshness',{}),
            'full_inventory_sha256':digest(full_path),'public_inventory_sha256':digest(public_path)},
        'integrity_checks':checks, 'freshness_verified':False, 'promotion_blockers':[],
        'freshness_checks':{'reviewed_candidate_available':candidate.exists()}}
    if candidate.exists():
        summary, manifest = read(candidate/'review-summary.json'), read(candidate/'source-manifest.json')
        proposed = read(candidate/'portfolio_inventory.json')
        candidate_ids = {str(row['livelabsId']) for row in proposed['records'] if row.get('livelabsId')}
        inputs=[]
        for key,item in manifest.get('sources',{}).items():
            path=Path(item.get('path',''))
            matches=path.is_file() and digest(path)==item.get('sha256') and path.stat().st_size==item.get('bytes')
            inputs.append({'source':key,'file':item.get('file'),'matches_recorded_hash':bool(matches),
                'role':'historical baseline; active inventory was subsequently refreshed' if key=='baseline_inventory' else 'supplied source input'})
        checks['supplied_source_inputs_match_recorded_hashes']=all(item['matches_recorded_hash'] for item in inputs if item['source']!='baseline_inventory')
        report['newer_candidate']={'directory':str(candidate),'status':summary.get('candidate_status'),
            'records':len(proposed['records']),'new_livelabs_ids':len(candidate_ids-set(populated)),
            'missing_content_types':summary.get('content_type_resolution',{}).get('unknown'),
            'missing_publish_types':summary.get('publish_type_resolution',{}).get('distribution',{}).get('Unknown'),
            'fresh_tags_available':summary.get('tags',{}).get('fresh_export_present'),
            'promotion_gates':summary.get('promotion_gates',{}),'source_integrity':inputs}
        dates=manifest.get('dates',{});active_dates=report['current']['source_dates']
        github_date=str(dates.get('github_collection_finalized_at_utc') or '')[:10]
        report['freshness_checks'].update({
            'candidate_matches_active_inventory':digest(full_path)==digest(candidate/'portfolio_inventory.json'),
            'supplied_sources_unchanged':checks['supplied_source_inputs_match_recorded_hashes'],
            'content_types_resolved':summary.get('content_type_resolution',{}).get('unknown')==0,
            'publication_types_resolved':summary.get('publish_type_resolution',{}).get('distribution',{}).get('Unknown',0)==0,
            'fresh_tags_available':summary.get('tags',{}).get('fresh_export_present') is True,
            'view_periods_confirmed':str(dates.get('views_period_boundaries') or '').lower() not in ('','unconfirmed','unknown'),
            'fresh_qa_executed':summary.get('jenkins',{}).get('new_checks_executed') is True,
            'candidate_review_gates_resolved':not summary.get('promotion_gates'),
            'wms_date_matches_supplied_set':bool(dates.get('wms_snapshot_date')) and active_dates.get('wms_snapshot_date')==dates.get('wms_snapshot_date'),
            'views_date_matches_supplied_set':bool(dates.get('views_collection_date')) and active_dates.get('dashboard_views_snapshot_date')==dates.get('views_collection_date'),
            'github_evidence_matches_supplied_set':bool(github_date) and str(active_dates.get('workshop_update_evidence_snapshot_date') or '')>=github_date,
        })
        report['promotion_blockers'].extend(str(item) for item in summary.get('promotion_gates',[]))
    report['freshness_verified']=all(report['freshness_checks'].values())
    report['promotion_blockers'].extend(name.replace('_',' ') for name,passed in report['freshness_checks'].items() if not passed)
    report['integrity_status']='passed' if all(checks.values()) else 'failed'
    return report


if __name__ == '__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--candidate',type=Path,default=ROOT/'.private/admin/data-update-candidates/2026-11-12-analytics-refresh-07')
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args()
    result=review(args.candidate)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    print(json.dumps({'integrity':result['integrity_status'],'freshness_verified':result['freshness_verified'],'output':str(args.output)}))
    raise SystemExit(0 if result['integrity_status']=='passed' else 1)
