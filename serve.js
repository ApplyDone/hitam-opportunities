'use strict';
// Tiny static server for previewing dist/ locally. Dev tool only.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, 'dist');
const PORT = Number(process.env.PORT) || 5177;

http.createServer((req, res) => {
  const dataFile = { '/data/jobs.json': 'jobs.json', '/data/campus.json': 'campus.json' }[req.url.split('?')[0]];
  if (dataFile) {
    fs.readFile(path.join(__dirname, 'data', dataFile), (err, buf) => {
      if (err) { res.writeHead(404); res.end('{}'); return; }
      res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
      res.end(buf);
    });
    return;
  }
  const file = path.join(ROOT, 'HITAM Opportunities Intelligence v2.html');
  if (req.url !== '/' && !req.url.startsWith('/?') && !req.url.startsWith('/#')) {
    res.writeHead(404); res.end('Not found'); return;
  }
  fs.readFile(file, (err, buf) => {
    if (err) { res.writeHead(500); res.end('Run `node build.js` first'); return; }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
    res.end(buf);
  });
}).listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}`));
