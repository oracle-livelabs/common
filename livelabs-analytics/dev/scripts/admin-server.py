"""Loopback admin service. Private pages and APIs require a server-issued session.

Run --configure once to choose credentials, then run normally. No default password.
Runtime state is local SQLite, excluded from static releases. Production requires
an approved HTTPS gateway and identity-provider integration.
"""
import argparse
import getpass
import hashlib
import hmac
import json
import mimetypes
import os
import secrets
import sqlite3
import threading
import time
from datetime import datetime, timezone
from http.cookies import SimpleCookie
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, parse_qs
from admin_data import compare_snapshots, identity, provenance, quality_queue, validate_snapshot
from importlib.util import module_from_spec, spec_from_file_location

ROOT = Path(__file__).resolve().parents[2]
PRIVATE = ROOT / 'dev/admin'
STATE = ROOT / '.private/admin'
DATABASE = STATE / 'admin.sqlite3'
ITERATIONS = 600000
SESSION_SECONDS = 2 * 60 * 60
MAX_BODY = 32 * 1024 * 1024
LOCK = threading.Lock()
ATTEMPTS = {}


def db():
    connection = sqlite3.connect(DATABASE)
    connection.row_factory = sqlite3.Row
    return connection


def initialize():
    STATE.mkdir(parents=True, exist_ok=True)
    with db() as conn:
        conn.executescript('''
            CREATE TABLE IF NOT EXISTS account (id INTEGER PRIMARY KEY CHECK(id=1), username TEXT NOT NULL, salt TEXT NOT NULL, digest TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, csrf TEXT NOT NULL, expires REAL NOT NULL);
            CREATE TABLE IF NOT EXISTS snapshots (id TEXT PRIMARY KEY, label TEXT NOT NULL, date TEXT NOT NULL, created TEXT NOT NULL, payload TEXT NOT NULL);
            CREATE TABLE IF NOT EXISTS reviews (id TEXT PRIMARY KEY, record_key TEXT NOT NULL, snapshot_id TEXT NOT NULL, candidate_key TEXT, decision TEXT NOT NULL, reason TEXT NOT NULL, reviewer TEXT NOT NULL, created TEXT NOT NULL);
        ''')


def configure(username=None, password=None):
    username = username or input('Admin username: ').strip()
    password = password or getpass.getpass('Admin password (at least 14 characters): ')
    if not username or len(password) < 14:
        raise ValueError('A username and password of at least 14 characters are required.')
    salt = secrets.token_hex(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), ITERATIONS).hex()
    with db() as conn:
        conn.execute('INSERT OR REPLACE INTO account VALUES(1,?,?,?)', (username, salt, digest))
        conn.execute('DELETE FROM sessions')
    (STATE / 'initial-credentials.txt').unlink(missing_ok=True)


def now():
    return datetime.now(timezone.utc).isoformat()


def current_snapshot():
    spec = spec_from_file_location('capture_snapshot', ROOT / 'dev/scripts/capture-snapshot.py')
    module = module_from_spec(spec)
    spec.loader.exec_module(module)
    return module.capture()


def store_snapshot(payload, label):
    validate_snapshot(payload)
    info = provenance(payload)
    with db() as conn:
        conn.execute('INSERT OR IGNORE INTO snapshots VALUES(?,?,?,?,?)', (info['snapshotId'], label[:100], info['snapshotDate'], now(), json.dumps(payload, ensure_ascii=False)))
    return info


def snapshot_by_id(snapshot_id):
    with db() as conn:
        row = conn.execute('SELECT payload FROM snapshots WHERE id=?', (snapshot_id,)).fetchone()
    if not row:
        raise ValueError('Snapshot not found.')
    return json.loads(row['payload'])


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt, *args):
        # Login requests and tokens are never logged.
        pass

    def send(self, status, body=b'', content_type='application/json', cookie=None):
        if not isinstance(body, bytes):
            body = json.dumps(body, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header('Content-Type', content_type)
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Cache-Control', 'no-store')
        self.send_header('X-Content-Type-Options', 'nosniff')
        self.send_header('Referrer-Policy', 'same-origin')
        self.send_header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'")
        if cookie:
            self.send_header('Set-Cookie', cookie)
        self.end_headers()
        self.wfile.write(body)

    def redirect(self):
        self.send_response(303)
        self.send_header('Location', '/admin-panel-login')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def session(self):
        try:
            cookies = SimpleCookie(self.headers.get('Cookie', ''))
            raw = cookies.get('ll_admin')
            token = hashlib.sha256(raw.value.encode()).hexdigest() if raw else ''
        except Exception:
            return None
        with db() as conn:
            conn.execute('DELETE FROM sessions WHERE expires < ?', (time.time(),))
            row = conn.execute('SELECT * FROM sessions WHERE token=? AND expires>?', (token, time.time())).fetchone()
        return dict(row) if row else None

    def file(self, path):
        if not path.is_file():
            return self.send(404, {'error': 'Not found.'})
        mime = mimetypes.guess_type(str(path))[0] or 'application/octet-stream'
        self.send(200, path.read_bytes(), mime + (';charset=utf-8' if mime.startswith('text/') else ''))

    def do_GET(self):
        if self.headers.get('Host') not in self.server.allowed_hosts:
            return self.send(403, {'error': 'Local host required.'})
        url = urlsplit(self.path)
        path = url.path
        entry_paths = ('/', '/index.html', '/dashboard', '/dashboard/', '/dashboard/index.html',
                       '/search', '/search/', '/search/index.html', '/inventory', '/inventory/', '/inventory/index.html')
        if path in entry_paths:
            query = parse_qs(url.query)
            has_value = lambda key: bool(query.get(key, [''])[0].strip())
            inventory_list = path in ('/inventory', '/inventory/', '/inventory/index.html') or query.get('view') == ['inventory']
            record_requested = has_value('livelabs_id') or has_value('content_key') or (has_value('wms_id') and not inventory_list)
            destination = '/search/' if record_requested or (has_value('q') and not inventory_list) else '/inventory' if inventory_list else '/dashboard/'
            if path != destination:
                self.send_response(302)
                self.send_header('Location', destination + ('?' + url.query if url.query else ''))
                self.send_header('Content-Length', '0')
                self.end_headers()
                return
            entry = 'index.html' if destination == '/inventory' else destination.strip('/') + '/index.html'
            return self.file(ROOT / entry)
        if path == '/admin-panel-login':
            return self.file(PRIVATE / ('panel.html' if self.session() else 'login.html'))
        if path in ('/admin', '/admin/', '/admin-panel', '/login.html', '/admin.html'):
            return self.redirect()
        if path.startswith('/api/admin/'):
            session = self.session()
            if not session:
                return self.send(401, {'error': 'Sign in required.'})
            try:
                if path == '/api/admin/session':
                    with db() as conn:
                        account = conn.execute('SELECT username FROM account WHERE id=1').fetchone()
                    return self.send(200, {'username': account['username'], 'csrf': session['csrf'], 'expires': session['expires']})
                if path == '/api/admin/snapshots':
                    with db() as conn:
                        rows = conn.execute('SELECT id,label,date,created FROM snapshots ORDER BY date,created').fetchall()
                    return self.send(200, [dict(row) for row in rows])
                if path == '/api/admin/reviews':
                    with db() as conn:
                        rows = conn.execute('SELECT * FROM reviews ORDER BY created DESC').fetchall()
                    return self.send(200, [dict(row) for row in rows])
                query = parse_qs(url.query)
                if path == '/api/admin/compare':
                    return self.send(200, compare_snapshots(snapshot_by_id(query.get('before', [''])[0]), snapshot_by_id(query.get('after', [''])[0])))
                payload = snapshot_by_id(query.get('snapshot', [''])[0])
                if path == '/api/admin/quality':
                    return self.send(200, {'provenance': provenance(payload), 'issues': quality_queue(payload)})
                if path == '/api/admin/snapshot':
                    return self.send(200, payload)
                return self.send(404, {'error': 'Unknown endpoint.'})
            except (ValueError, KeyError) as error:
                return self.send(400, {'error': str(error)})
        if path.startswith('/admin-assets/'):
            if not self.session():
                return self.send(401, {'error': 'Sign in required.'})
            name = path.removeprefix('/admin-assets/')
            if name not in ('panel.js', 'admin.css'):
                return self.send(404, {'error': 'Not found.'})
            return self.file(PRIVATE / name)
        if path in ('/assets/admin-login.js', '/assets/admin-login.css'):
            return self.file(PRIVATE / ('login.js' if path.endswith('.js') else 'admin.css'))
        # Explicit public roots: never serve dev, git, runtime state or secrets.
        relative = 'index.html' if path == '/' else path.lstrip('/')
        target = (ROOT / relative).resolve()
        allowed = relative in ('index.html', 'inventory/index.html') or relative.startswith('assets/') or relative in ('inventory/data/portfolio_inventory.json', 'inventory/data/portfolio_inventory.file.js')
        if not allowed or not target.is_relative_to(ROOT) or any(part.startswith('.') for part in Path(relative).parts):
            return self.send(404, {'error': 'Not found.'})
        return self.file(target)

    def do_POST(self):
        if self.headers.get('Host') not in self.server.allowed_hosts:
            return self.send(403, {'error': 'Local host required.'})
        path = urlsplit(self.path).path
        expected_origin = self.server.public_origin or 'http://' + self.headers.get('Host', '')
        if self.headers.get('Origin') != expected_origin:
            return self.send(403, {'error': 'Same-origin request required.'})
        try:
            length = int(self.headers.get('Content-Length', '0'))
            limit = 4096 if path == '/api/admin/login' else MAX_BODY
            if not 0 < length <= limit:
                return self.send(413, {'error': 'Request size exceeds limit.'})
            payload = json.loads(self.rfile.read(length))
            if not isinstance(payload, dict):
                raise ValueError('Expected a JSON object.')
        except (ValueError, UnicodeError):
            return self.send(400, {'error': 'Invalid JSON request.'})
        if path == '/api/admin/login':
            peer = self.client_address[0]
            with LOCK:
                attempts = [t for t in ATTEMPTS.get(peer, []) if t > time.time() - 300]
                if len(attempts) >= 5:
                    return self.send(429, {'error': 'Too many attempts. Try again in five minutes.'})
                ATTEMPTS[peer] = attempts + [time.time()]
            with db() as conn:
                account = conn.execute('SELECT * FROM account WHERE id=1').fetchone()
            if not account:
                return self.send(503, {'error': 'Admin credentials have not been configured. Run admin-server.py --configure.'})
            password = payload.get('password', '')
            if not isinstance(password, str) or not isinstance(payload.get('username'), str):
                return self.send(400, {'error': 'Invalid credentials.'})
            digest = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(account['salt']), ITERATIONS).hex()
            valid_user = hmac.compare_digest(payload['username'].encode(), account['username'].encode())
            if not valid_user or not hmac.compare_digest(digest, account['digest']):
                return self.send(401, {'error': 'Invalid username or password.'})
            token, csrf = secrets.token_urlsafe(32), secrets.token_urlsafe(32)
            with db() as conn:
                conn.execute('INSERT INTO sessions VALUES(?,?,?)', (hashlib.sha256(token.encode()).hexdigest(), csrf, time.time() + SESSION_SECONDS))
            with LOCK:
                ATTEMPTS.pop(peer, None)
            secure = '; Secure' if self.server.public_origin else ''
            return self.send(200, {'ok': True}, cookie=f'll_admin={token}; Path=/; HttpOnly; SameSite=Strict; Max-Age={SESSION_SECONDS}{secure}')
        session = self.session()
        if not session:
            return self.send(401, {'error': 'Sign in required.'})
        if not hmac.compare_digest(self.headers.get('X-CSRF-Token', ''), session['csrf']):
            return self.send(403, {'error': 'Session request token required.'})
        try:
            if path == '/api/admin/logout':
                with db() as conn:
                    conn.execute('DELETE FROM sessions WHERE token=?', (session['token'],))
                return self.send(200, {'ok': True}, cookie='ll_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
            if path == '/api/admin/password':
                if not isinstance(payload.get('password'), str) or len(payload['password']) < 14:
                    raise ValueError('Password must contain at least 14 characters.')
                with db() as conn:
                    username = conn.execute('SELECT username FROM account WHERE id=1').fetchone()['username']
                configure(username, payload['password'])
                return self.send(200, {'ok': True}, cookie='ll_admin=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0')
            if path == '/api/admin/snapshots':
                if payload.get('captureCurrent'):
                    snapshot = current_snapshot()
                    label = 'Current inventory capture'
                else:
                    snapshot = payload.get('snapshot')
                    label = str(payload.get('label', 'Imported snapshot'))
                return self.send(201, store_snapshot(snapshot, label))
            if path == '/api/admin/reviews':
                decision = payload.get('decision')
                reason = str(payload.get('reason', '')).strip()
                key = str(payload.get('recordKey', ''))
                snapshot_id = str(payload.get('snapshotId', ''))
                snapshot = snapshot_by_id(snapshot_id)
                valid_keys = {identity(record) for record in snapshot['records']}
                candidate = str(payload.get('candidateKey', ''))
                if key not in valid_keys or candidate and (candidate not in valid_keys or candidate == key):
                    raise ValueError('Choose distinct existing record identities from the selected snapshot.')
                if decision not in ('Keep active', 'Refresh content', 'Investigate data', 'Replacement approved', 'Replacement rejected', 'Retirement proposed') or not reason or len(reason) > 4000:
                    raise ValueError('Choose a decision and provide a reason of 1–4,000 characters.')
                if decision in ('Replacement approved', 'Replacement rejected') and not candidate:
                    raise ValueError('Replacement decisions require a candidate identity.')
                with db() as conn:
                    reviewer = conn.execute('SELECT username FROM account WHERE id=1').fetchone()['username']
                    conn.execute('INSERT INTO reviews VALUES(?,?,?,?,?,?,?,?)', (secrets.token_hex(16), key, snapshot_id, candidate, decision, reason, reviewer, now()))
                return self.send(201, {'ok': True})
            return self.send(404, {'error': 'Unknown endpoint.'})
        except (ValueError, TypeError, KeyError) as error:
            return self.send(400, {'error': str(error)})


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=4176)
    parser.add_argument('--host', default='127.0.0.1', help='Bind address; remote binding requires --public-origin behind an HTTPS gateway')
    parser.add_argument('--public-origin', default=os.environ.get('LIVELABS_ADMIN_PUBLIC_ORIGIN'), help='Exact HTTPS origin presented by the trusted gateway, e.g. https://analytics.example.com')
    parser.add_argument('--configure', action='store_true')
    parser.add_argument('--initialize-local-account', action='store_true', help='Create a random initial password only when no account exists.')
    args = parser.parse_args()
    if args.public_origin:
        origin = urlsplit(args.public_origin)
        if origin.scheme != 'https' or not origin.netloc or origin.path or origin.query or origin.fragment or origin.username:
            raise ValueError('--public-origin must be an HTTPS origin without a path, query or credentials.')
    if args.host not in ('127.0.0.1', 'localhost') and not args.public_origin:
        raise ValueError('Remote binding requires an HTTPS public origin and a trusted gateway.')
    initialize()
    if args.initialize_local_account:
        with db() as conn:
            exists = conn.execute('SELECT 1 FROM account').fetchone()
        if exists:
            raise ValueError('An account already exists. Use --configure to change it.')
        password = secrets.token_urlsafe(24)
        configure('admin', password)
        credentials = STATE / 'initial-credentials.txt'
        credentials.write_text('Local LiveLabs Analytics admin\nUsername: admin\nPassword: ' + password + '\n\nChange this password in Account after signing in.\n', encoding='utf-8')
        print('Local account created. Initial credentials file: ' + str(credentials))
        return
    if args.configure:
        configure()
        print('Credentials configured; existing sessions revoked.')
        return
    store_snapshot(current_snapshot(), 'Initial / current inventory capture')
    print(f'Local dashboard: http://127.0.0.1:{args.port}/', flush=True)
    print(f'Admin entry: http://127.0.0.1:{args.port}/admin-panel-login', flush=True)
    server = ThreadingHTTPServer((args.host, args.port), Handler)
    server.public_origin = args.public_origin
    server.allowed_hosts = {f'127.0.0.1:{args.port}', f'localhost:{args.port}'}
    if args.public_origin:
        server.allowed_hosts.add(urlsplit(args.public_origin).netloc)
    server.serve_forever()


if __name__ == '__main__':
    main()
