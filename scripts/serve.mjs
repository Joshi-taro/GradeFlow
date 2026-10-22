import http from 'node:http';
import { readFile } from 'node:fs/promises';
const files = { '/':'index.html', '/index.html':'index.html', '/style.css':'style.css', '/script.js':'script.js', '/core.js':'core.js', '/config.js':'config.js' };
const types = {html:'text/html',css:'text/css',js:'text/javascript'};
http.createServer(async(req,res)=>{
    if (req.url === '/healthz') { res.end('ok\n'); return; }
    const file = files[req.url];
    if (!file) { res.writeHead(404);res.end();return; }
    try { const body = await readFile(new URL(`../${file}`,import.meta.url));res.setHeader('Content-Type',types[file.split('.').pop()]);res.end(body); }
    catch {res.writeHead(500);res.end();}
}).listen(8080,'127.0.0.1',()=>console.log('GradeFlow: http://127.0.0.1:8080'));
