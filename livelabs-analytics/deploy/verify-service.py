"""Smoke-test the extracted Admin archive with disposable credentials and state."""
import argparse
from datetime import datetime, timezone
from http.cookiejar import CookieJar
from http.server import ThreadingHTTPServer
import importlib.util
import json
from pathlib import Path
import secrets
import sys
import tempfile
import threading
from urllib.error import HTTPError
from urllib.request import Request, build_opener, HTTPCookieProcessor
import zipfile


def verify(archive_path):
    result={'status':'failed','checks':[],'checked_at':datetime.now(timezone.utc).isoformat(),'deployed':False}
    with tempfile.TemporaryDirectory(prefix='analytics-service-package-') as directory:
        root=Path(directory)
        with zipfile.ZipFile(archive_path) as archive:
            for item in archive.infolist():
                destination=(root/item.filename).resolve()
                if not destination.is_relative_to(root.resolve()) or Path(item.filename).drive:
                    raise ValueError('Unsafe archive path')
            archive.extractall(root)
        sys.path.insert(0,str(root/'dev/scripts'))
        spec=importlib.util.spec_from_file_location('packaged_service',root/'dev/scripts/admin-server.py')
        app=importlib.util.module_from_spec(spec);spec.loader.exec_module(app)
        app.initialize()
        password=secrets.token_urlsafe(32)
        app.configure('package-review',password)
        server=ThreadingHTTPServer(('127.0.0.1',0),app.Handler)
        server.allowed_hosts={f'127.0.0.1:{server.server_address[1]}'}
        server.public_origin=None
        thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
        origin='http://127.0.0.1:'+str(server.server_address[1])
        opener=build_opener(HTTPCookieProcessor(CookieJar()))

        def request(path,data=None):
            body=json.dumps(data).encode() if data is not None else None
            req=Request(origin+path,data=body,headers={'Origin':origin,'Content-Type':'application/json'})
            try:
                with opener.open(req,timeout=45) as response:return response.status,response.read()
            except HTTPError as error:return error.code,error.read()

        def check(name,condition):
            if not condition:raise AssertionError(name)
            result['checks'].append(name)

        try:
            for path in ['/dashboard/','/views/','/assets/css/tables.css']:
                check('Packaged route '+path,request(path)[0]==200)
            for path in ['/inventory/data/portfolio_inventory.json','/.private/admin/admin.sqlite3','/dev/scripts/admin-server.py']:
                check('Protected source '+path,request(path)[0] in (403,404))
            check('Inventory requires login',request('/api/admin/inventory')[0]==401)
            check('Disposable login succeeds',request('/api/admin/login',{'username':'package-review','password':password})[0]==200)
            status,body=request('/api/admin/inventory')
            expected=json.loads((root/'inventory/data/portfolio_inventory.json').read_text(encoding='utf-8'))
            check('Packaged full inventory available only after login',status==200 and len(json.loads(body)['records'])==len(expected['records']))
            check('Protected inventory page loads',request('/admin/inventory')[0]==200)
            result['status']='passed'
        except Exception as error:
            result['error']=str(error)
        finally:
            server.shutdown();server.server_close();thread.join(timeout=5)
    result['passed_checks']=len(result['checks'])
    return result


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive',type=Path,required=True)
    parser.add_argument('--output',type=Path,required=True)
    args=parser.parse_args();report=verify(args.archive)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
    print(json.dumps(report))
    raise SystemExit(0 if report['status']=='passed' else 1)
