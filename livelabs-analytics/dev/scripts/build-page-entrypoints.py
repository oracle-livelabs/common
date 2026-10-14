"""Generate static dashboard, search and inventory entries from the shared shell."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def build():
    source = (ROOT / 'index.html').read_text(encoding='utf-8')
    # Directory-index hosts use /inventory/; the service serves index.html at
    # /inventory directly. Both routes then pin their base through page-loading.js.
    source = source.replace('<head>', '<head>\n  <base href="../">', 1)
    for name in ('dashboard', 'search', 'inventory'):
        (ROOT / name).mkdir(exist_ok=True)
        (ROOT / name / 'index.html').write_text(source, encoding='utf-8')


if __name__ == '__main__':
    build()
