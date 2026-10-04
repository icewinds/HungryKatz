// Zero-dependency static dev server. Usage: node server.js  (PORT=xxxx to change port)
// Listens on all interfaces so phones on the same Wi-Fi can connect.

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { networkInterfaces } from 'node:os';
import { join, normalize, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));
const PORT = Number(process.env.PORT) || 8080;
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav',
};

createServer(async (req, res) => {
  try {
    let path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (path.endsWith('/')) path += 'index.html';
    const file = join(ROOT, normalize(path));
    // Stay inside the project, and never serve hidden files/folders (.git, .claude, ...)
    // — the server is reachable from the whole Wi-Fi network.
    if (!file.startsWith(ROOT) || /(^|[\\/])\./.test(file.slice(ROOT.length))) { res.writeHead(403).end(); return; }
    const data = await readFile(file);
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
      'X-Content-Type-Options': 'nosniff',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' }).end('Not found');
  }
}).listen(PORT, '0.0.0.0', () => {
  console.log(`HungryKatz running:\n  http://localhost:${PORT}`);
  for (const nets of Object.values(networkInterfaces())) {
    for (const n of nets || []) if (n.family === 'IPv4' && !n.internal) console.log(`  http://${n.address}:${PORT}   (phone on same Wi-Fi)`);
  }
});
