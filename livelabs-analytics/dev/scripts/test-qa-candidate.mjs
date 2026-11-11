// Serve an isolated candidate and run its browser checks in one local process tree.
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const candidate=path.resolve(process.argv[2] || '');
const site=path.join(candidate,'site');
if (!process.argv[2] || !fs.existsSync(path.join(site,'inventory/data/portfolio_inventory.json'))) throw new Error('Pass a generated candidate directory.');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.png':'image/png','.svg':'image/svg+xml','.woff2':'font/woff2','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{
  try {
    let file=path.resolve(site,'.'+decodeURIComponent(new URL(req.url,'http://localhost').pathname));
    if (file!==site && !file.startsWith(site+path.sep)) {res.writeHead(403);res.end();return;}
    if(fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    res.writeHead(200,{'Content-Type':mime[path.extname(file)] || 'application/octet-stream'});
    fs.createReadStream(file).pipe(res);
  } catch {res.writeHead(404);res.end('Not found');}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const child=spawn(process.execPath,['dev/node_modules/@playwright/test/cli.js','test','--config','dev/config/playwright.config.cjs','qa-governance.spec.cjs','--output',path.join(candidate,'validation/browser'),'--reporter=line',...process.argv.slice(3)],{
  cwd:root,stdio:'inherit',env:{...process.env,DASHBOARD_URL:`http://127.0.0.1:${port}`}
});
child.on('error',error=>{console.error(error);server.close();process.exitCode=1;});
child.on('exit',code=>{server.close();process.exitCode=code ?? 1;});
