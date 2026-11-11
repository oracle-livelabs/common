"""Build a pinned, private Admin report from saved JSON without running QA."""
import argparse
import gzip
import hashlib
import json
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from jenkins_reports import normalize_report, FILES

ROOT = Path(__file__).resolve().parents[2]


def build(source):
    content = source.read_bytes()
    source_hash = hashlib.sha256(content).hexdigest()
    vendor = json.loads((ROOT / 'dev/vendor/marco-qa/UPSTREAM.json').read_text(encoding='utf-8'))
    for name, expected in vendor['files'].items():
        if hashlib.sha256((ROOT / 'dev/vendor/marco-qa' / name).read_bytes()).hexdigest() != expected:
            raise ValueError('Pinned renderer verification failed: ' + name)
    summary = normalize_report(json.loads(content))
    if not summary.get('runId') or not isinstance(summary.get('catalogItems'), list):
        raise ValueError('A saved report needs a run ID and catalog items.')
    adapter_hash = hashlib.sha256(b''.join((ROOT / 'dev/scripts' / name).read_bytes() for name in
        ('jenkins_reports.py', 'render-jenkins-report.mjs', 'build-jenkins-report.py'))).hexdigest()
    version = hashlib.sha256((source_hash + vendor['commit'] + adapter_hash).encode()).hexdigest()
    directory = ROOT / '.private/admin/jenkins-reports' / version
    if (directory / 'manifest.json').exists():
        return json.loads((directory / 'manifest.json').read_text(encoding='utf-8'))
    directory.mkdir(parents=True, exist_ok=True)
    normalized = directory / 'source-normalized.json'
    normalized.write_text(json.dumps(summary, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
    subprocess.run(['node', str(ROOT / 'dev/scripts/render-jenkins-report.mjs'), str(normalized), str(directory)], check=True)
    sizes = {}
    for name in FILES:
        target = directory / name
        if target.is_file():
            data = target.read_bytes()
            (directory / (name + '.gz')).write_bytes(gzip.compress(data, compresslevel=6, mtime=0))
            sizes[name] = {'bytes': len(data), 'gzipBytes': (directory / (name + '.gz')).stat().st_size}
    manifest = {'id': version, 'runId': summary['runId'], 'startedAt': summary.get('startedAt', ''),
                'builtAt': datetime.now(timezone.utc).isoformat(), 'adapterSha256': adapter_hash,
                'recordedEvidence': len(summary.get('failures', [])),
                'runType': summary.get('runType', 'regression'), 'status': summary.get('status', ''),
                'items': len(summary['catalogItems']), 'counts': summary.get('counts', {}),
                'sourceFile': source.name, 'sourceSha256': source_hash, 'upstreamCommit': vendor['commit'],
                'renderer': vendor['renderer'], 'source': 'saved-export', 'executedNewChecks': False,
                'groupedIdentities': summary.get('sourceReport', {}).get('groupedIdentities', []), 'files': sizes}
    (directory / 'manifest.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    return manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    result = build(args.source.resolve())
    print(json.dumps({key: result[key] for key in ('id', 'runId', 'items', 'sourceSha256', 'files')}, indent=2))
