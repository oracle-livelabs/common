"""Build a portable service archive without credentials, databases or local state."""
import argparse
import hashlib
import json
import zipfile
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Choose a new archive path; existing archives are preserved.')
    runpy.run_path(str(ROOT / 'dev/scripts/build-page-entrypoints.py'), run_name='__main__')
    paths = [ROOT / 'index.html', ROOT / 'dashboard/index.html', ROOT / 'search/index.html', ROOT / 'inventory/index.html',
             ROOT / 'inventory/data/portfolio_inventory.json', ROOT / 'inventory/data/portfolio_inventory.file.js']
    paths += [p for p in (ROOT / 'assets').rglob('*') if p.is_file()]
    paths += [ROOT / 'dev/admin' / name for name in ('login.html', 'login.js', 'panel.html', 'panel.js', 'admin.css', 'README.md', 'TENANCY-DEPLOYMENT.md')]
    paths += [ROOT / 'dev/scripts' / name for name in ('admin-server.py', 'admin_data.py', 'capture-snapshot.py', 'refresh-top-performers.py')]
    allowed = {p.relative_to(ROOT).as_posix() for p in paths}
    if any('.private' in Path(p).parts or Path(p).suffix in ('.sqlite3', '.db', '.env') for p in allowed):
        raise ValueError('Private material cannot be packaged.')
    manifest = {'runtime': 'Python 3.10 or newer', 'entryPoint': '/admin-panel-login',
                'requiresRunningService': True, 'credentialsIncluded': False, 'privateStateDirectory': '.private/admin',
                'files': [{'path': p.relative_to(ROOT).as_posix(), 'sha256': hashlib.sha256(p.read_bytes()).hexdigest()} for p in paths]}
    args.output.parent.mkdir(parents=True, exist_ok=True)
    with zipfile.ZipFile(args.output, 'x', compression=zipfile.ZIP_DEFLATED) as archive:
        for path in paths:
            archive.write(path, path.relative_to(ROOT).as_posix())
        archive.writestr('admin-service-manifest.json', json.dumps(manifest, indent=2))
    print('Admin service package created without credentials: ' + str(args.output))


if __name__ == '__main__':
    main()
