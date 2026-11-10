"""Keep legacy entries synchronized with the canonical, reviewed dashboard."""
import argparse
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def build(check=False):
    source = (ROOT / 'dashboard/index.html').read_text(encoding='utf-8')
    for tab in ('performance', 'urgent', 'at-risk', 'retirement'):
        if f'data-dashboard-tab="{tab}"' not in source:
            raise ValueError(f'Canonical dashboard is missing the {tab} tab; refusing to replace entries.')
    root_source = re.sub(r'\s*<base\s+href="\.\./">', '', source, count=1)
    outputs = {'index.html': root_source, 'search/index.html': source, 'inventory/index.html': source}
    for name, content in outputs.items():
        target = ROOT / name
        if check:
            if not target.exists() or target.read_text(encoding='utf-8') != content:
                raise ValueError(f'{name} differs from the canonical dashboard. Run build-page-entrypoints.py explicitly.')
        else:
            target.parent.mkdir(exist_ok=True)
            target.write_text(content, encoding='utf-8')
    print('Page entries match the canonical dashboard.' if check else 'Updated root, search and inventory entries from dashboard/index.html.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true')
    build(parser.parse_args().check)
