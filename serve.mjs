// Development server: ES modules don't load from file://, so serve the repo over HTTP.
// Node standard library only.
//
//   node serve.mjs          then open http://localhost:8124
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const PORT = 8124;
const ROOT = fileURLToPath(new URL('./', import.meta.url));

const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', md: 'text/plain; charset=utf-8' };

createServer((req, res) => {
  let file;
  try {
    const raw = req.url.split('?')[0];
    const path = decodeURIComponent(raw === '/' ? '/index.html' : raw);
    file = resolve(ROOT, `.${path}`);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  // Keep the server to its own directory: resolve first, then check the result.
  if (!file.startsWith(ROOT)) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = readFileSync(file);
    const ext = file.split('.').pop();
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Fretmap dev server: http://localhost:${PORT}  (Ctrl+C to stop)`);
});
