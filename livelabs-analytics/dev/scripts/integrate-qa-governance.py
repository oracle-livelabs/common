#!/usr/bin/env python3
"""Build an immutable local governance candidate from Jenkins and Analytics files.

No Jenkins execution, Analytics network sync, deployment or source overwrite occurs.
"""
import argparse
from collections import Counter
from datetime import datetime, timezone
import json
import re
from html import escape
from pathlib import Path
import shutil
from qa_governance import digest, read_results, reconcile, validate_policy, write_csv
from qa_tables import build_rankings

ROOT = Path(__file__).resolve().parents[2]

def dump(path, data):
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2, allow_nan=False)+'\n', encoding='utf-8')

def build(args):
    inventory, jenkins, output = Path(args.inventory).resolve(), Path(args.jenkins).resolve(), Path(args.output).resolve()
    if output.exists():
        raise ValueError('Output already exists. Choose a new candidate directory; inputs and earlier candidates are immutable.')
    payload = json.loads(inventory.read_text(encoding='utf-8-sig'))
    policy = validate_policy(json.loads(Path(args.policy).read_text(encoding='utf-8-sig')))
    rows = read_results(jenkins)
    run_manifest = json.loads(Path(args.run_manifest).read_text(encoding='utf-8-sig')) if args.run_manifest else None
    # Validate and reconcile before creating any candidate files.
    reconciliation, manifest = reconcile(payload, rows, policy, args.as_of, args.mode, run_manifest, digest(jenkins))
    manifest.update({'schema_version':1, 'as_of':args.as_of, 'scope':'local candidate; no publish or lifecycle mutation',
        'formula':f"100 * weighted_burden / (weighted_burden + {policy['burden_half_score']})",
        'source_hashes':{'jenkins_csv':digest(jenkins),'analytics_inventory':digest(inventory),'policy':digest(args.policy)},
        'analytics_records':len(payload['records']), 'jenkins_rows':len(rows), 'jenkins_items':len(reconciliation),
        'ranking_applicable_items':sum(q['ranking_applicable'] for q in reconciliation),
        'evidence_state_counts':dict(Counter(q['state'] for q in reconciliation)),
        'limitations':['CSV findings are not a complete test ledger; score is a severity-weighted burden index, not a failure percentage.',
            'Text-matched finding deduplication and aggregate occurrence parsing require source-level finding IDs for stronger guarantees.',
            'Legacy At-Risk and Retire-Now membership/base scores are retained until their full governed inputs are refreshed.',
            'Replacement candidates retain their original pair population. Target QA changes ranking, not approval.',
            'Unknown QA remains visible with a null score. Rankings do not certify unobserved content.']})
    payload['metadata']['qa_governance'] = manifest
    output.mkdir(parents=True)
    inputs=output/'inputs';inputs.mkdir()
    shutil.copy2(jenkins,inputs/'jenkins-results.csv')
    shutil.copy2(inventory,inputs/'analytics-inventory.json')
    shutil.copy2(args.policy,inputs/'qa-policy.json')
    shutil.copytree(args.fragments,inputs/'analytics-fragments')
    manifest['source_hashes']['ranking_fragments']={p.name:digest(p) for p in sorted(Path(args.fragments).glob('*.html'))}
    manifest['source_hashes']['top_formula_implementation']=digest(ROOT/'dev/scripts/refresh-top-performers.py')
    if args.run_manifest:shutil.copy2(args.run_manifest,inputs/'run-manifest.json')
    # Analytics CSV at item grain preserves input metrics without title/family joins.
    analytics_rows=[]
    for r in payload['records']:
        values=dict(r.get('values',[]))
        analytics_rows.append({k:r.get(k) for k in ('key','livelabsId','wmsId','title','type','publishStatus','publishType','owner','category','update')} | {
            'snapshot_date':payload['metadata']['snapshot_date'], 'views_12m':values.get('Views - Last 12 Months'),
            'views_90d':values.get('Views - Last 90 Days')})
    write_csv(inputs/'analytics-export.csv',analytics_rows)
    reports=output/'reports';reports.mkdir()
    report=[]
    for r in payload['records']:
        q=r['qa']
        report.append({k:r.get(k) for k in ('key','livelabsId','wmsId','title','type','publishStatus','publishType','owner')} | {
            k:q.get(k) for k in ('state','match_status','observed_error_score','ranking_error_score','ranking_applicable','finding_count','occurrence_count',
                                'weighted_burden','severity_counts','evidence_gap_count','completeness','owner_action','run_id','started_at','policy_version')})
    write_csv(reports/'governance.csv',report)
    write_csv(reports/'reconciliation.csv',reconciliation)
    findings=[{'item_id':q['item_id'],'item_type':q['jenkins_type'],'match_status':q['match_status'],**f} for q in reconciliation for f in q['findings']]
    write_csv(reports/'findings.csv',findings, ['item_id','item_type','match_status','id','code','severity','message','kind','occurrences','count_basis','weight','weighted_burden','source_rows','test_sections','severity_conflict'])
    dump(reports/'governance.json',{'metadata':manifest,'policy':policy,'records':report,'jenkins_items':reconciliation})
    site=output/'site';site.mkdir()
    shutil.copytree(ROOT/'assets',site/'assets')
    shutil.copy2(ROOT/'index.html',site/'index.html')
    source=(site/'index.html').read_text(encoding='utf-8').replace('<head>','<head>\n  <base href="../">',1)
    for route in ('dashboard','inventory','search'):
        (site/route).mkdir(exist_ok=True)
        (site/route/'index.html').write_text(source,encoding='utf-8')
    data=site/'inventory/data';data.mkdir()
    dump(data/'portfolio_inventory.json',payload)
    serialized=json.dumps(payload,ensure_ascii=False,allow_nan=False).replace('</','<\\/')
    (data/'portfolio_inventory.file.js').write_text('window.__LIVELABS_PORTFOLIO_INVENTORY__ = '+serialized+';\n',encoding='utf-8')
    # Use the same variable name as the production file-safe loader.
    original=(ROOT/'inventory/data/portfolio_inventory.file.js').read_text(encoding='utf-8')
    assignment=re.search(r'((?:window|globalThis)\.[A-Za-z_$][\w$]*\s*=)',original)
    if not assignment:raise ValueError('Cannot identify file-safe inventory assignment')
    (data/'portfolio_inventory.file.js').write_text(assignment[1]+' '+serialized+';\n',encoding='utf-8')
    comparisons=build_rankings(payload,ROOT,site/'assets/fragments',policy,inputs/'analytics-fragments')
    # Overview leaders must follow the new tables, not retain historical winners.
    shell=(site/'index.html').read_text(encoding='utf-8')
    by_id={str(r['livelabsId']):r for r in payload['records'] if r.get('livelabsId')}
    for label,table in [('Top Performer Workshop','top-performer-top-100-workshops'),('Top Performer Sprint','top-performer-top-100-sprints'),
                        ('Highest-Risk Workshop','at-risk-top-100-workshops'),('Highest-Risk Sprint','at-risk-top-100-sprints'),
                        ('Top Retire-Now Workshop','retire-now-top-100-workshops'),('Top Retire-Now Sprint','retire-now-top-100-sprints')]:
        leader=next((r for r in comparisons if r['table']==table and r['adjusted_rank']==1),None)
        record=by_id.get(leader['livelabs_id']) if leader else None
        title=record['title'] if record else 'No eligible record'
        note=(f"Adjusted score {leader['adjusted_score']} | QA {leader['qa_error_score'] if leader['qa_error_score'] is not None else 'Unknown'} | {leader['evidence_state']}" if leader else 'Evidence unavailable')
        if leader and leader['base_source']=='published_historical_score':note+=' | historical baseline'
        pattern=r'(<div class="card compact-card"><span>'+re.escape(label)+r'</span>)<strong>.*?</strong><p>.*?</p>'
        shell,count=re.subn(pattern,lambda m:m[1]+'<strong>'+escape(title)+'</strong><p>'+escape(note)+'</p>',shell,flags=re.S)
        if count!=1:raise ValueError('Overview card contract changed: '+label)
    (site/'index.html').write_text(shell,encoding='utf-8')
    for route in ('dashboard','inventory','search'):
        (site/route/'index.html').write_text(shell.replace('<head>','<head>\n  <base href="../">',1),encoding='utf-8')
    write_csv(reports/'ranking-comparison.csv',comparisons)
    dump(reports/'ranking-comparison.json',comparisons)
    manifest['tables']={name:{'population':len(items),'displayed':sum(x['displayed'] for x in items),
        'scores_changed':sum(x['baseline_score']!=x['adjusted_score'] for x in items),'positions_changed':sum(x['rank_delta']!=0 for x in items)}
        for name in sorted({x['table'] for x in comparisons}) for items in [[x for x in comparisons if x['table']==name]]}
    manifest['output_hashes']={str(p.relative_to(output)).replace('\\','/'):digest(p) for p in sorted(reports.glob('*'))}
    dump(output/'manifest.json',manifest)
    (output/'README.md').write_text('# QA governance candidate\n\nMode: '+args.mode+'; run '+manifest['run_id']+'; Analytics '+manifest['snapshot_date']+'.\n\n'
        'Open reports/governance.csv for one row per Analytics item, reconciliation.csv for every Jenkins item including quarantined identities, findings.csv for normalized evidence, and ranking-comparison.csv for before/after rankings.\n\n'
        'Serve only the site directory for the local preview. Inputs and reports remain outside its document root. This candidate changes no source snapshot or deployed service.\n\n'
        'Promotion gaps: '+('; '.join(manifest['promotion_gaps']) or 'None at run level')+'.\n',encoding='utf-8')
    return manifest

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--jenkins',required=True)
    parser.add_argument('--inventory',default=str(ROOT/'inventory/data/portfolio_inventory.json'))
    parser.add_argument('--policy',default=str(ROOT/'dev/config/qa-governance-policy.json'))
    parser.add_argument('--fragments',default=str(ROOT/'assets/fragments'),help='Baseline fragments; use a prior candidate inputs/analytics-fragments for replay')
    parser.add_argument('--output',required=True)
    parser.add_argument('--mode',choices=['pilot','strict'],default='pilot')
    parser.add_argument('--run-manifest')
    parser.add_argument('--as-of',default=datetime.now(timezone.utc).date().isoformat())
    args=parser.parse_args()
    try:
        manifest=build(args)
    except (ValueError,KeyError,TypeError,OSError) as error:
        parser.exit(2,str(error)+'\n')
    print(json.dumps({k:manifest[k] for k in ('run_id','analytics_records','jenkins_items','ranking_applicable_items','match_counts','promotion_gaps','tables')},indent=2))

if __name__=='__main__':main()
