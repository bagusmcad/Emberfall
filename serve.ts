// Emberfall static file server (Node 22, standard library only).
//
// Serves game/ on http://localhost:8080 so the game can be played in a
// desktop browser. No build step, no dependencies: run `node serve.ts`
// from this directory and open http://localhost:8080 in Chrome.

import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(resolve(fileURLToPath(import.meta.url), '..'), 'game');
const port = 8080;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.wasm': 'application/wasm',
};

function safePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const joined = normalize(join(root, decoded));
  if (!joined.startsWith(root + sep) && joined !== root) return null;
  return joined;
}

const server = createServer((req, res) => {
  const rawPath = (req.url || '/').split('?')[0];
  const path = safePath(rawPath === '/' ? '/index.html' : rawPath);
  if (!path || !existsSync(path) || !statSync(path).isFile()) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('not found\n');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES[extname(path).toLowerCase()] || 'application/octet-stream',
    'cache-control': 'no-store',
  });
  createReadStream(path).pipe(res);
});

server.listen(port, () => {
  console.log(`Emberfall serving game/ at http://localhost:${port}`);
});
