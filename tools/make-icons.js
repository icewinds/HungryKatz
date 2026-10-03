// Generates the PWA icons (cat face) as PNGs with no dependencies.
// Usage: npm run icons   -> assets/ui/icon-192.png, icon-512.png, icon-maskable-512.png
// Replace these files with real artwork whenever you like (keep the sizes).

import { deflateSync } from 'node:zlib';
import { writeFileSync, mkdirSync } from 'node:fs';

const CRC = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function png(size, rgba) {
  const stride = size * 4 + 1, raw = Buffer.alloc(stride * size);
  for (let y = 0; y < size; y++) rgba.copy(raw, y * stride + 1, y * size * 4, (y + 1) * size * 4);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const inEll = (x, y, cx, cy, rx, ry) => ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2 <= 1;
const inTri = (x, y, [a, b, c]) => {
  const s = (p, q) => (x - q[0]) * (p[1] - q[1]) - (p[0] - q[0]) * (y - q[1]);
  const d1 = s(a, b), d2 = s(b, c), d3 = s(c, a);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
};
const shrink = (t, k) => {
  const cx = (t[0][0] + t[1][0] + t[2][0]) / 3, cy = (t[0][1] + t[1][1] + t[2][1]) / 3;
  return t.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k]);
};
const EARS = [[[0.25, 0.45], [0.29, 0.16], [0.47, 0.33]], [[0.75, 0.45], [0.71, 0.16], [0.53, 0.33]]];

/** Colour of point (u,v) in [0,1]², or null for transparent. Later shapes paint over earlier. */
function sample(u, v, maskable) {
  let col = null;
  if (maskable) col = '#ff8fab';
  else {
    const r = 0.22, qx = Math.max(Math.abs(u - 0.5) - (0.5 - r), 0), qy = Math.max(Math.abs(v - 0.5) - (0.5 - r), 0);
    if (qx * qx + qy * qy <= r * r) col = '#ff8fab';
  }
  // content scaled into the maskable safe zone
  const k = maskable ? 0.78 : 1, x = 0.5 + (u - 0.5) / k, y = 0.5 + (v - 0.5) / k;
  if (inEll(x, y, 0.5, 0.55, 0.38, 0.38)) col = '#ffc2d1';
  for (const e of EARS) if (inTri(x, y, e)) col = '#c0702c';
  for (const e of EARS) { if (inTri(x, y, shrink(e, 0.82))) col = '#f4a259'; if (inTri(x, y, shrink(e, 0.45))) col = '#ffb3c6'; }
  if (inEll(x, y, 0.5, 0.56, 0.3, 0.27)) col = '#c0702c';
  const head = inEll(x, y, 0.5, 0.56, 0.285, 0.255);
  if (head) col = '#f4a259';
  if (head && [0.44, 0.5, 0.56].some(sx => Math.abs(x - sx) < 0.013 && y > 0.31 && y < 0.39)) col = '#c0702c';
  if (inEll(x, y, 0.5, 0.655, 0.12, 0.08)) col = '#fff1dc';
  if (inEll(x, y, 0.32, 0.63, 0.035, 0.035) || inEll(x, y, 0.68, 0.63, 0.035, 0.035)) col = '#ff9fb5';
  if (inEll(x, y, 0.39, 0.54, 0.045, 0.06) || inEll(x, y, 0.61, 0.54, 0.045, 0.06)) col = '#2b2230';
  if (inEll(x, y, 0.377, 0.52, 0.016, 0.016) || inEll(x, y, 0.597, 0.52, 0.016, 0.016)) col = '#ffffff';
  if (inEll(x, y, 0.5, 0.615, 0.03, 0.021)) col = '#ff7a9a';
  return col;
}

function render(size, maskable) {
  const buf = Buffer.alloc(size * size * 4), SS = 4;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    let r = 0, g = 0, b = 0, a = 0;
    for (let sy = 0; sy < SS; sy++) for (let sx = 0; sx < SS; sx++) {
      const c = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, maskable);
      if (!c) continue;
      const [cr, cg, cb] = hex(c); r += cr; g += cg; b += cb; a++;
    }
    const i = (py * size + px) * 4;
    if (a) { buf[i] = r / a; buf[i + 1] = g / a; buf[i + 2] = b / a; buf[i + 3] = (a / (SS * SS)) * 255; }
  }
  return png(size, buf);
}

const out = new URL('../assets/ui/', import.meta.url);
mkdirSync(out, { recursive: true });
writeFileSync(new URL('icon-192.png', out), render(192, false));
writeFileSync(new URL('icon-512.png', out), render(512, false));
writeFileSync(new URL('icon-maskable-512.png', out), render(512, true));
console.log('Icons written to assets/ui/');
