// Development server: ES modules don't load from file://, so serve the repo over HTTP.
// Node standard library only.
//
//   node serve.mjs          then open http://localhost:8124
import { createServer } from 'node:http';
import { readFileSync } from 'node:fs';

const PORT = 8124;
const root = new URL('./', import.meta.url);

const TYPES = { html: 'text/html; charset=utf-8', js: 'text/javascript; charset=utf-8', mjs: 'text/javascript; charset=utf-8', md: 'text/plain; charset=utf-8' };

createServer((req, res) => {
  const path = decodeURIComponent((req.url === '/' ? '/index.html' : req.url).split('?')[0]);
  // Keep the server to its own directory: no traversal out of the project.
  if (path.includes('..')) {
    res.writeHead(403).end('forbidden');
    return;
  }
  try {
    const body = readFileSync(new URL(`.${path}`, root));
    const ext = path.split('.').pop();
    res.writeHead(200, { 'content-type': TYPES[ext] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  } catch {
    res.writeHead(404).end('not found');
  }
}).listen(PORT, '127.0.0.1', () => {
  console.log(`Fretmap dev server: http://localhost:${PORT}  (Ctrl+C to stop)`);
});
