"""Build a portable service archive without credentials, databases or local state."""
import argparse
import hashlib
import json
import zipfile
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True)
    args = parser.parse_args()
    if args.output.exists():
        raise ValueError('Choose a new archive path; existing archives are preserved.')
    subprocess.run([sys.executable, str(ROOT / 'dev/scripts/build-page-entrypoints.py'), '--check'], check=True)
    subprocess.run([sys.executable, str(ROOT / 'dev/scripts/build-author-reports.py'), '--check'], check=True)
    paths = [ROOT / 'index.html', ROOT / 'dashboard/index.html', ROOT / 'search/index.html', ROOT / 'inventory/index.html',
             ROOT / 'inventory/data/portfolio_inventory.json', ROOT / 'inventory/data/public_portfolio_inventory.json']
    paths += [p for p in (ROOT / 'assets').rglob('*') if p.is_file()]
    paths += [ROOT / 'dev/admin' / name for name in ('login.html', 'login.js', 'dashboard-management.html', 'dashboard-management.js',
             'data-merge.html', 'data-merge.js', 'panel.html', 'panel.js', 'admin-shell.css', 'admin-shell.js',
             'jenkins.html', 'jenkins.js', 'jenkins.css', 'jenkins-report-theme.css', 'jenkins-report-bridge.js', 'inventory.html', 'inventory.js', 'inventory.css', 'admin.css', 'README.md', 'REVIEW-RULES.md', 'TENANCY-DEPLOYMENT.md')]
    paths += [ROOT / 'dev/scripts' / name for name in ('admin-server.py', 'admin_data.py', 'capture-snapshot.py', 'refresh-top-performers.py',
              'admin_shell.py', 'jenkins_reports.py', 'build-jenkins-report.py', 'render-jenkins-report.mjs', 'author_reports.py', 'build-author-reports.py', 'dashboard_policy.py', 'dashboard_audit.py', 'review_rules.py', 'qa_validity.py', 'portfolio_diagnostics.py', 'review_presentation.py', 'title_corrections.py', 'build-public-inventory.mjs', 'build-public-review-fragments.py')]
    paths += [ROOT / 'dev/config/dashboard-policy.json', ROOT / 'dev/config/title-corrections.json']
    paths += [p for p in (ROOT / 'dev/vendor/marco-qa').rglob('*') if p.is_file()]
    allowed = {p.relative_to(ROOT).as_posix() for p in paths}
    if any('.private' in Path(p).parts or Path(p).suffix in ('.sqlite3', '.db', '.env') for p in allowed):
        raise ValueError('Private material cannot be packaged.')
    manifest = {'runtime': 'Python 3.10 or newer; Node.js 18 or newer for visibility publishing', 'entryPoint': '/admin',
                'dashboardManagementPage': '/admin/dashboard-management',
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
