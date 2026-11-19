"""Build a shallow website/service handoff and verify the exact packaged website."""
import argparse
from datetime import datetime, timezone
import hashlib
import json
import mimetypes
from pathlib import Path
import re
import shutil
import subprocess
import sys
import time
import zipfile

ROOT = Path(__file__).resolve().parents[1]
SECRET = re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----|\bgh[pousr]_[A-Za-z0-9]{30,}|\bgithub_pat_[A-Za-z0-9_]{20,}|https?://[^\s"<>]*objectstorage[^\s"<>]*/p/[A-Za-z0-9_-]{12,}/',re.I)


def run(command,log,required=True):
    with log.open('w',encoding='utf-8') as stream:
        result=subprocess.run(command,cwd=ROOT,stdout=stream,stderr=subprocess.STDOUT)
    if required and result.returncode:
        raise RuntimeError(f'Check failed; see {log}')
    return result.returncode


def safe_output(path):
    target=path.resolve()
    if target != ROOT/'upload' and not target.is_relative_to(ROOT/'dev/releases'):
        raise ValueError('Output must be upload/ or a new directory inside dev/releases/.')
    if target.exists():
        raise ValueError('Output already exists. Preserve it and choose a new dev/releases/ directory.')
    return target


def inspect_package(site,service_zip):
    files=[]
    forbidden={'.private','node_modules','dev','archive','output','service','verification'}
    for path in site.rglob('*'):
        if not path.is_file():continue
        name=path.relative_to(site).as_posix()
        if path.is_symlink() or not path.resolve().is_relative_to(site.resolve()):
            raise ValueError(f'External or symbolic website input: {name}')
        if forbidden.intersection(path.relative_to(site).parts) or path.suffix in {'.sqlite3','.db','.key','.pem','.zip'}:
            raise ValueError(f'Non-website content in website: {name}')
        data=path.read_bytes()
        if SECRET.search(data):raise ValueError(f'Access-bearing material in website: {name}')
        if len(Path(name).parts)>3:raise ValueError(f'Website exceeds three file-path levels: {name}')
        files.append({'key':name,'bytes':len(data),'sha256':hashlib.sha256(data).hexdigest(),
            'content_type':{'.js':'text/javascript','.json':'application/json','.ttf':'font/ttf'}.get(path.suffix,mimetypes.guess_type(name)[0] or 'application/octet-stream')})
    with zipfile.ZipFile(service_zip) as archive:
        for entry in archive.infolist():
            parts=Path(entry.filename).parts
            if Path(entry.filename).is_absolute() or Path(entry.filename).drive or '.private' in parts or Path(entry.filename).suffix in {'.sqlite3','.db','.key','.pem'} or '..' in parts:
                raise ValueError('Private runtime state or unsafe path in Admin archive.')
            if SECRET.search(archive.read(entry)):
                raise ValueError(f'Access-bearing material in service archive: {entry.filename}')
    return sorted(files,key=lambda item:item['key'])


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'upload')
    parser.add_argument('--service-url',default='http://127.0.0.1:4176')
    parser.add_argument('--candidate',type=Path,default=ROOT/'.private/admin/data-update-candidates/2026-11-12-analytics-refresh-07')
    args=parser.parse_args()
    output=safe_output(args.output)
    staging=output.with_name(output.name+'.staging-'+datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ'))
    staging.mkdir(parents=True)
    evidence=staging/'verification';evidence.mkdir()
    service=staging/'service';service.mkdir()
    site=staging/'website'
    print('Building candidate; logs are under '+str(evidence),flush=True)
    run([sys.executable,'deploy/review-data.py','--candidate',str(args.candidate),'--output',str(evidence/'data-review.json')],evidence/'data-review.log')
    state=evidence/'dashboard-state.json'
    run([sys.executable,'dev/scripts/export-dashboard-state.py','--url',args.service_url.rstrip('/')+'/api/dashboard-admin-state','--output',str(state)],evidence/'state-export.log')
    run(['node','dev/scripts/build-static-release.mjs','--output',str(site),'--dashboard-state',str(state),'--compact'],evidence/'website-build.log')
    run([sys.executable,'dev/scripts/build-admin-service.py','--output',str(service/'admin-service.zip')],evidence/'service-build.log')
    objects=inspect_package(site,service/'admin-service.zip')
    run([sys.executable,'deploy/verify-service.py','--archive',str(service/'admin-service.zip'),'--output',str(evidence/'service-smoke.json')],evidence/'service-smoke.log')
    (evidence/'upload-objects.json').write_text(json.dumps(objects,indent=2)+'\n',encoding='utf-8')
    run(['node','dev/scripts/verify-release-acceptance.cjs','--release',str(site),'--output',str(evidence/'browser')],evidence/'browser.log')
    preflight=run(['node','dev/scripts/preflight-object-storage.mjs','--release',str(site),'--access-model','internal-authenticated',
        '--browser-evidence',str(evidence/'browser/browser-evidence.json'),'--strict','--report',str(evidence/'preflight.json')],evidence/'preflight.log',required=False)
    source_review=json.loads((evidence/'data-review.json').read_text(encoding='utf-8'))
    manifest=json.loads((site/'release-manifest.json').read_text(encoding='utf-8'))
    browser=json.loads((evidence/'browser/browser-evidence.json').read_text(encoding='utf-8'))
    ready=preflight==0 and source_review['freshness_verified']
    result={'release_id':manifest['release_id'],'package_integrity':'passed','packaged_browser_checks':'passed',
        'source_integrity':source_review['integrity_status'],'source_freshness_verified':source_review['freshness_verified'],
        'ready_for_promotion':ready,'strict_preflight_exit_code':preflight,'website_files':len(objects),
        'packaged_browser_check_count':browser['passedTests'],
        'service_archive_sha256':hashlib.sha256((service/'admin-service.zip').read_bytes()).hexdigest(),
        'service_archive_bytes':(service/'admin-service.zip').stat().st_size,
        'website_bytes':sum(item['bytes'] for item in objects),'maximum_website_file_path_depth':max(len(Path(item['key']).parts) for item in objects),
        'promotion_blockers':source_review['promotion_blockers'],'deployed':False,
        'tenancy_prerequisites':['Approved authenticated gateway required; Object Storage or a PAR URL alone does not authenticate users.',
            'Admin service and private contacts require a private host and secure provisioning; they are not website objects.']}
    (staging/'READINESS.json').write_text(json.dumps(result,indent=2)+'\n',encoding='utf-8')
    (staging/'UPLOAD.md').write_text('# Analytics upload handoff\n\nPromotion status: '+('READY' if ready else 'BLOCKED: unresolved source freshness/review gates')+
        '\n\n- `website/`: only these contents belong in the authenticated Object Storage release prefix. Do not upload the parent directory.\n'
        '- `service/admin-service.zip`: private Admin host only; configure credentials and provision private state separately.\n'
        '- `verification/`: local review evidence, not website content.\n\n'
        'See READINESS.json, verification/data-review.json and verification/preflight.json before uploading. '
        'Browser evidence is bound to this exact release manifest. No deployment was performed.\n\n'
        'Gateway routes: `/` -> `index.html`; `/dashboard/` -> `dashboard/index.html`; `/views/` -> `views/index.html`; `/search/` -> `search/index.html`. '
        'Preserve query strings. Serve assets as files with the content types in verification/upload-objects.json. '
        'Use the manifest immutable release prefix and retain the prior prefix for rollback. '
        'Route Admin/API paths to the authenticated service as described in deploy/README.md in the source project.\n',encoding='utf-8')
    # Evidence moves with the package; keep recorded local artifact paths valid.
    for file in evidence.rglob('*'):
        if file.is_file() and file.suffix in {'.json','.md','.log'}:
            text=file.read_text(encoding='utf-8')
            rewritten=text.replace(str(staging),str(output)).replace(str(staging).replace('\\','\\\\'),str(output).replace('\\','\\\\'))
            if rewritten != text:file.write_text(rewritten,encoding='utf-8')
    # Windows file scanners can briefly retain a handle after the checks finish.
    # Keep the verified staging directory intact if the rename stays blocked.
    for attempt in range(6):
        try:
            staging.rename(output)
            break
        except PermissionError:
            if attempt == 5:
                raise
            time.sleep(.25 * 2 ** attempt)
    print(json.dumps({'output':str(output),**result},indent=2))
    return 0 if ready else 2


if __name__=='__main__':
    raise SystemExit(main())
