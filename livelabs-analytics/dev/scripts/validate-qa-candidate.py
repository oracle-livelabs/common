"""Validate generated artifacts against frozen inputs; no network or mutations."""
import argparse
import csv
import json
from collections import Counter
from pathlib import Path
from qa_governance import digest
from qa_tables import parse

def validate(candidate):
    root=Path(candidate)
    manifest=json.loads((root/'manifest.json').read_text(encoding='utf-8'))
    original=json.loads((root/'inputs/analytics-inventory.json').read_text(encoding='utf-8-sig'))
    payload=json.loads((root/'site/inventory/data/portfolio_inventory.json').read_text(encoding='utf-8'))
    report=json.loads((root/'reports/governance.json').read_text(encoding='utf-8'))
    comparisons=json.loads((root/'reports/ranking-comparison.json').read_text(encoding='utf-8'))
    checks=[]
    def check(condition,message):
        if not condition:raise ValueError(message)
        checks.append(message)
    check(len(original['records'])==len(payload['records'])==len(report['records']), 'All Analytics records retained at original grain')
    check(digest(root/'inputs/analytics-inventory.json')==manifest['source_hashes']['analytics_inventory'], 'Frozen Analytics input hash matches')
    check(digest(root/'inputs/jenkins-results.csv')==manifest['source_hashes']['jenkins_csv'], 'Frozen Jenkins input hash matches')
    for name,sha in manifest['output_hashes'].items():check(digest(root/name)==sha,'Output hash matches: '+name)
    for before,after in zip(original['records'],payload['records']):
        restored={k:v for k,v in after.items() if k!='qa'}
        baseline={k:v for k,v in before.items() if k!='qa'}
        for k in ('values','details'):
            restored[k]=[p for p in restored[k] if not p[0].startswith('QA ')]
            baseline[k]=[p for p in baseline[k] if not p[0].startswith('QA ')]
        if restored!=baseline:raise ValueError('Original item altered beyond QA enrichment: '+str(before['key']))
        q=after['qa']
        if q['state']=='not_observed' and q['observed_error_score'] is not None:raise ValueError('Unobserved item received score')
        if q.get('ranking_applicable') and q['match_status']!='matched':raise ValueError('Conflicted identity affects ranking')
        if q['observed_error_score'] is not None and not 0<=q['observed_error_score']<=100:raise ValueError('Score out of bounds')
    checks.append('Original identities, lifecycle, owners, demand and content fields unchanged; unknown/type-conflict gates hold')
    for name in manifest['tables']:
        expected=[r for r in comparisons if r['table']==name and r['displayed']]
        found=[]
        for fragment in (root/'site/assets/fragments').glob('*.html'):
            doc=parse(fragment.read_text(encoding='utf-8'))
            found.extend(n for n in doc.walk('table') if n.attrs.get('id')==name)
        check(len(found)==1,'Unique table: '+name)
        rows=[r for r in found[0].walk('tr') if 'expandable-row' in r.attrs.get('class','')]
        check(len(rows)==len(expected),'Rendered population matches ranking report: '+name)
        headers=[n.text() for n in found[0].first('thead').walk('th')]
        id_ix=headers.index('Current LiveLabs ID' if name=='replacement-recommendations' else 'LiveLabs ID')
        ids=[[n for n in r.children if getattr(n,'tag',None)=='td'][id_ix].text() for r in rows]
        check(ids==[r['livelabs_id'] for r in expected],'Rendered order matches ranking report: '+name)
    check(not (root/'site/inputs').exists() and not (root/'site/reports').exists(),'Raw evidence stays outside preview document root')
    counts=Counter(q['match_status'] for q in report['jenkins_items'])
    check(dict(counts)==manifest['match_counts'],'Jenkins reconciliation accounts for every exported item')
    return {'status':'PASS','checks':checks,'total_checks':len(checks)}

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('candidate');args=p.parse_args()
    try:print(json.dumps(validate(args.candidate),indent=2))
    except (ValueError,KeyError,OSError) as error:p.exit(1,str(error)+'\n')
