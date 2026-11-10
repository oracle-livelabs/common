"""One navigation shell for protected Admin pages and archived QA reports.

Archived source files stay immutable; only the served HTML receives the shell.
"""
import re

PAGES = (
    ('/admin/dashboard-management', 'Dashboard management'),
    ('/admin/governance', 'Data governance'),
    ('/admin/data-merge', 'Data merge'),
    ('/admin/jenkins', 'Jenkins reports'),
    ('/admin/inventory', 'Portfolio inventory'),
)
ASSETS = ('<link rel="stylesheet" href="/admin-assets/admin-shell.css?v=20261108">'
          '<script defer src="/admin-assets/admin-shell.js?v=20261108"></script>')


def navigation(route):
    links = ''.join(f'<a href="{url}"' + (' aria-current="page"' if route == url or route.startswith(url + '/') else '')
                    + f'>{label}</a>' for url, label in PAGES)
    return (f'<aside class="rail analytics-rail"><div class="analytics-brand">'
            '<img src="/assets/images/oracle-logo-white.svg" alt="Oracle"><span>LiveLabs Analytics</span></div>'
            '<details class="analytics-navigation" open><summary>Administration</summary>'
            f'<div class="analytics-nav-content"><p class="analytics-nav-label">Administration</p>'
            f'<nav class="analytics-nav" aria-label="Admin pages">{links}</nav>'
            '<div class="analytics-nav-footer"><a class="analytics-back" href="/dashboard/#overview">Back to dashboard</a>'
            '<button type="button" class="analytics-signout">Sign out</button>'
            '<p class="analytics-nav-status" role="status"></p></div></div></details></aside>')


def admin_page(html, route):
    html = html.replace('<!-- ADMIN_NAV -->', navigation(route))
    return html.replace('</head>', ASSETS + '</head>', 1)


def report_page(html):
    """Keep renderer scripts, IDs and relative report links intact."""
    html = html.replace('</head>', ASSETS + '</head>', 1)
    # The shared sidebar owns Admin navigation; report-specific links stay local.
    html = re.sub(r'<a\b[^>]*href="/admin/dashboard-management"[^>]*>Analytics Admin</a>', '', html)
    html = html.replace('<h1>LiveLabs QA Summary</h1>', '<h1>Jenkins reports</h1>')
    html = html.replace('<h1>Retest List</h1>', '<h1>Jenkins retest list</h1>')
    html = html.replace('<div class="page-title">', '<div class="page-title"><p class="analytics-report-eyebrow">Administration</p>', 1)
    notice = re.search(r'<div class="analytics-archive-notice">[\s\S]*?</div>', html)
    if notice:
        html = html[:notice.start()] + html[notice.end():]
        html = html.replace('</header>', '</header>' + notice.group(), 1)
    html = re.sub(r'(<body\b[^>]*>)', lambda match: match[0] + '<div class="analytics-shell-layout analytics-report-layout">'
                  + navigation('/admin/jenkins') + '<div class="analytics-report-content">', html, count=1)
    return html.replace('</body>', '</div></div></body>', 1)
