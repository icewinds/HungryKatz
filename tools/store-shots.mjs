// Google Play store graphics, captured from the real game with headless Chrome (no extra packages).
//   1. npm start   (dev server on http://localhost:8080)
//   2. node tools/store-shots.mjs
// Writes store/screenshot-*.png (1080x1920 phone shots), store/feature-graphic.png (1024x500)
// and store/icon-512.png. Set CHROME=path/to/chrome if Chrome is installed somewhere else.

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const BASE = 'http://localhost:8080/';
const OUT = new URL('../store/', import.meta.url);
const PORT = 9333;
const sleep = ms => new Promise(r => setTimeout(r, ms));

const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'hk-shots-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--mute-audio', '--no-first-run', 'about:blank'], { stdio: 'ignore' });

let target;
for (let i = 0; i < 50 && !target; i++) {
  await sleep(200);
  target = await fetch(`http://127.0.0.1:${PORT}/json/list`).then(r => r.json()).then(l => l.find(t => t.type === 'page')).catch(() => null);
}
if (!target) throw new Error('Chrome did not start');

// minimal CDP client
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', e => {
  const m = JSON.parse(e.data);
  if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); }
});
const cdp = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, m => (m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result)));
  ws.send(JSON.stringify({ id, method, params }));
});
const run = async js => {
  const r = await cdp('Runtime.evaluate', { expression: `(async () => { ${js} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description ?? r.exceptionDetails.text);
  return r.result.value;
};
const open = async (url, w, h, dsf) => {
  await cdp('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: dsf, mobile: w < 600 });
  await cdp('Page.navigate', { url });
  for (let i = 0; i < 50; i++) { await sleep(150); if (await run('return document.readyState') === 'complete') break; }
  await sleep(1200);
  await run("const b = document.getElementById('banner'); if (b) b.style.display = 'none'; return 1"); // no pop-up messages in the shots
};
const save = async name => {
  const { data } = await cdp('Page.captureScreenshot', { format: 'png' });
  fs.writeFileSync(new URL(name, OUT), Buffer.from(data, 'base64'));
  console.log('wrote store/' + name);
};

await cdp('Page.enable');
await cdp('Runtime.enable');

// A well-played café: level 9, a few cats and stickers, today's bonus already claimed, no seasonal decor.
const today = new Date(), day = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
const SAVE = {
  coins: 1240, level: 9, totalEarned: 99999, highScores: [{ score: 1860, name: '' }], character: 'mango',
  ownedCats: ['smokey', 'mochi', 'lilac'], pets: ['goldfish', 'parrot'], stickers: ['first', 'serve100', 'combo5', 'vip', 'tidy', 'fancy', 'cupcake', 'gnome'],
  stats: { served: 240, vips: 6, specials: 3, tips: 30, bestCombo: 7, gnome: true }, daily: { last: day, streak: 4 },
  outfit: { hat: 'none', apron: 'classic' }, ownedOutfits: ['party', 'mint'], waiter: true,
  settings: { music: false, sfx: false, debug: false, difficulty: 'normal', scene: 'strawberry' },
};
await open(BASE, 360, 640, 3);
await run(`localStorage.setItem('hungrykatz.save.v1', ${JSON.stringify(JSON.stringify(SAVE))}); return 1`);

// 1. main menu
await open(BASE + '?season=none', 360, 640, 3);
await save('screenshot-1-menu.png');

// 2. a busy café: customers seated, the chef cooking, plates on the counter, the waiter carrying a tray
await open(BASE + '?debug&season=none', 360, 640, 3);
await run(`
  const click = async a => { document.querySelector('[data-action="' + a + '"]').click(); await new Promise(r => setTimeout(r, 700)); };
  await click('play');
  document.querySelector('[data-action="startLevel"][data-level="9"]').click();
  await new Promise(r => setTimeout(r, 600));
  const g = window.hungryKatz.gm;
  g.spawner.timer = Infinity; g.npcs.length = 0;
  const want = ['milk', 'fish', 'cupcake', 'sushi', 'catfood', 'milk', 'fish', 'sushi', 'cupcake', 'catfood'];
  ['W1', 'W3', 'W4', 'T1a', 'T1b', 'T2c', 'T3b', 'T4a', 'T5c', 'T5b'].forEach((id, i) =>
    g.spawnNpc({ spot: g.spots.find(s => s.id === id), request: want[i], patience: 99, vip: i === 4 }));
  for (let i = 0; i < 60 * 4.5; i++) g.update(1 / 60);       // everyone arrives, the kitchen gets busy
  g.kitchen.ready = { milk: 2, catfood: 3 };
  Object.assign(g.inventory.items, { fish: 1, sushi: 1, cupcake: 1 });
  Object.assign(g.player, { x: 300, y: 690, facing: 1 }); g.player.stop();
  g.paused = false;
  document.querySelector('.toggle-debug').click();                // debug drawing off
  document.querySelector('.toggle-debug').style.display = 'none';
  document.getElementById('banner').style.display = 'none';       // no start-of-game message
  document.getElementById('debug-panel').hidden = true;
  setInterval(() => { g.paused = false; document.querySelectorAll('.screen.active').forEach(s => s.classList.remove('active')); }, 50);
  await new Promise(r => setTimeout(r, 900));
  return 1`);
await save('screenshot-2-cafe.png');

// 3. choose cat: the wardrobe
await open(BASE + '?season=none', 360, 640, 3);
await run(`document.querySelector('[data-action="openCharacters"]').click(); await new Promise(r => setTimeout(r, 600));
  document.getElementById('tab-btn-wardrobe').click(); await new Promise(r => setTimeout(r, 500)); return 1`);
await save('screenshot-3-wardrobe.png');

// 4. sticker book
await open(BASE + '?season=none', 360, 640, 3);
await run(`document.querySelector('[data-action="openStickers"]').click(); await new Promise(r => setTimeout(r, 900)); return 1`);
await save('screenshot-4-stickers.png');

// feature graphic + icon
await open(BASE + 'store/feature-graphic.html', 1024, 500, 1);
for (let i = 0; i < 30 && (await run('return document.title')) !== 'ready'; i++) await sleep(150);
await save('feature-graphic.png');
fs.copyFileSync(new URL('../assets/ui/icon-512.png', import.meta.url), new URL('icon-512.png', OUT));
console.log('wrote store/icon-512.png');

ws.close();
chrome.kill();
