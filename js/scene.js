// Café scenery: colour themes ("scenes", chosen in Settings) and the makeover stages
// (shabby -> tidy -> cosy -> fancy) that unlock as the restaurant levels up.
// A scene object is { stage: 0..3, pal: palette, level } — see makeScene().

import { LAYOUT, WORLD, decorStage, tablesForLevel, spotsForLevel } from './config.js';
import { ellipse, circle, rrect, tri, fillStroke, drawFoodIcon, hexRgb, INK, SHADOW } from './art.js';

const TAU = Math.PI * 2;

export const THEMES = {
  strawberry: {
    name: 'Strawberry Café', swatch: ['#fde7ed', '#ff8fab'],
    wall: '#fde7ed', stripe: '#fbdde6', wainscot: '#fff5f8', trim: '#f6cfd9',
    floor: '#f8eadb', plank: '#f0dcc6', rug: '#ffdbe6',
    bar: '#f1cdab', barFront: '#ddb08d', barHi: '#fbe3cd',
    counter: '#f6e6d6', counterEdge: '#ead2bb', counterFront: '#efd5bb', tile: '#c9eedf', tileLine: '#b3e3cf',
    cushion: '#fbd3de', cushionEdge: '#f3b4c5', cloth: '#ffffff', clothRim: '#f1cfd8',
    door: '#ecbccb', mat: '#d6f2e6', matEdge: '#ade3cc', frame: '#ffffff', clockRim: '#f2b8c8',
    wood: '#d4a57c', woodDark: '#a57650',
    bunting: ['#ff8fab', '#ffd166', '#8fd9b6', '#9fd3ff'],
  },
  matcha: {
    name: 'Matcha Garden', swatch: ['#e4f2df', '#6cc788'],
    wall: '#e4f2df', stripe: '#d9ecd2', wainscot: '#f7fbf2', trim: '#bcd9b0',
    floor: '#f2e8d5', plank: '#e3d5bb', rug: '#d3ecc8',
    bar: '#d8bf94', barFront: '#b99d70', barHi: '#ecdab5',
    counter: '#f3ecdc', counterEdge: '#ddd0b4', counterFront: '#e4d6b8', tile: '#f5d7a8', tileLine: '#e8c48b',
    cushion: '#cde8c1', cushionEdge: '#a3cf93', cloth: '#fffdf4', clothRim: '#d6e6cc',
    door: '#a9cf9c', mat: '#f4e2c4', matEdge: '#e3c592', frame: '#ffffff', clockRim: '#a9cf9c',
    wood: '#c9a77a', woodDark: '#987650',
    bunting: ['#8fd9b6', '#ffd166', '#f6a07c', '#c8e6a0'],
  },
  seaside: {
    name: 'Seaside Diner', swatch: ['#dcefff', '#ff9f8a'],
    wall: '#dcefff', stripe: '#cfe6fb', wainscot: '#f4faff', trim: '#9fcbef',
    floor: '#f5efe4', plank: '#e6dccb', rug: '#cfe8fb',
    bar: '#e9f3fb', barFront: '#7fa8d1', barHi: '#ffffff',
    counter: '#ffffff', counterEdge: '#cfe0ef', counterFront: '#8fb6dc', tile: '#ffe3a3', tileLine: '#f1cd7a',
    cushion: '#ff9f8a', cushionEdge: '#e97f6a', cloth: '#ffffff', clothRim: '#bcd9f2',
    door: '#7fa8d1', mat: '#ffe3a3', matEdge: '#f1cd7a', frame: '#ffffff', clockRim: '#9fcbef',
    wood: '#cfae86', woodDark: '#9e7c58',
    bunting: ['#ff9f8a', '#ffe3a3', '#7fc4ef', '#ffffff'],
  },
  moonlight: {
    name: 'Moonlight Bistro', swatch: ['#3d3566', '#b39ddb'],
    wall: '#3d3566', stripe: '#443b70', wainscot: '#4b4278', trim: '#8f7fd1',
    floor: '#5b4b60', plank: '#4f4154', rug: '#6c5a92',
    bar: '#8a5a4a', barFront: '#6b4436', barHi: '#a87562',
    counter: '#e4d8f2', counterEdge: '#bfaedb', counterFront: '#9d8bc0', tile: '#7e6fc0', tileLine: '#6c5eaa',
    cushion: '#b39ddb', cushionEdge: '#8f79c2', cloth: '#f4efff', clothRim: '#c9b8ee',
    door: '#8f7fd1', mat: '#6a5f9e', matEdge: '#8f7fd1', frame: '#d9d2f2', clockRim: '#8f7fd1',
    wood: '#9a7058', woodDark: '#6e4c3a',
    bunting: ['#ffd166', '#b39ddb', '#ff8fab', '#9fd3ff'],
  },
};

// How dusty/faded each makeover stage looks (0 shabby .. 3 fancy).
const FADE = [0.45, 0.12, 0, 0];
const DUST = '#a89888';
const toHex = rgb => '#' + rgb.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
const mix = (a, b, k) => { const [x, y] = [hexRgb(a), hexRgb(b)]; return toHex(x.map((v, i) => v + (y[i] - v) * k)); };

const paletteCache = new Map();
function palette(themeId, stage) {
  const key = `${themeId}:${stage}`;
  if (!paletteCache.has(key)) {
    const th = THEMES[themeId] ?? THEMES.strawberry, k = FADE[stage];
    const fade = v => (typeof v === 'string' && v[0] === '#' ? mix(v, DUST, k) : Array.isArray(v) ? v.map(fade) : v);
    paletteCache.set(key, Object.fromEntries(Object.entries(th).map(([n, v]) => [n, fade(v)])));
  }
  return paletteCache.get(key);
}

/** Everything the scenery needs for a theme + restaurant level. */
export const makeScene = (themeId, level) => ({ level, stage: decorStage(level), pal: palette(themeId, decorStage(level)) });

// ---------------------------------------------------------------- static background
/** Café drawn once into an offscreen canvas (world coordinates). Rebuilt when the level/theme changes. */
export function drawBackground(ctx, sc) {
  const { W, H } = WORLD, p = sc.pal, st = sc.stage;

  // floor planks
  ctx.fillStyle = p.floor; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = p.plank; ctx.lineWidth = 2;
  for (let y = 172, r = 0; y < H; y += 38, r++) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    for (let x = (r % 3) * 70 + 40; x < W; x += 210) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 38); ctx.stroke(); }
  }
  if (st === 0) shabbyFloor(ctx);
  if (st >= 2) { // rug under the first table
    ellipse(ctx, 270, 530, 150, 74); ctx.fillStyle = p.rug; ctx.fill();
    ellipse(ctx, 270, 530, 136, 64); ctx.setLineDash([10, 8]); ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 3; ctx.stroke(); ctx.setLineDash([]);
  }

  // back wall
  ctx.fillStyle = p.wall; ctx.fillRect(0, 0, W, 172);
  if (st >= 1) { ctx.fillStyle = p.stripe; for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 14, 126); }
  ctx.fillStyle = p.wainscot; ctx.fillRect(0, 128, W, 44);
  ctx.fillStyle = p.trim; ctx.fillRect(0, 126, W, 3); ctx.fillRect(0, 169, W, 3);
  if (st >= 3) { ctx.fillStyle = '#e3b94f'; ctx.fillRect(0, 131, W, 2); ctx.fillRect(0, 166, W, 2); } // gold trim
  if (st === 0) shabbyWall(ctx, p);
  if (st >= 2) bunting(ctx, p);

  // window bar
  const b = LAYOUT.windowBar;
  rrect(ctx, b.x + 4, b.y + 10, b.w, b.h, 12); ctx.fillStyle = SHADOW; ctx.fill();
  rrect(ctx, b.x, b.y + 22, b.w, b.h - 22, 10); fillStroke(ctx, p.barFront, null);
  rrect(ctx, b.x - 6, b.y, b.w + 12, 30, 12); fillStroke(ctx, p.bar, null);
  rrect(ctx, b.x + 6, b.y + 4, b.w - 12, 4, 2); fillStroke(ctx, p.barHi, null);
  if (st === 0) { // scratches
    ctx.strokeStyle = 'rgba(80,50,30,0.25)'; ctx.lineWidth = 1.5;
    for (const [x, y, l] of [[130, 182, 30], [250, 190, 22], [360, 178, 34]]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + l, y + 3); ctx.stroke(); }
  }
  if (st >= 3) { ctx.fillStyle = '#e3b94f'; ctx.fillRect(b.x, b.y + 27, b.w, 2); }

  // seats for every open spot: wooden crates when shabby, cushions after
  for (const s of spotsForLevel(sc.level)) {
    if (s.row === 'bar' && st >= 1) { ellipse(ctx, s.x, b.y + 15, 13, 5); fillStroke(ctx, '#fff', '#f1d4dc', 1.5); }
    if (st === 0) {
      rrect(ctx, s.x - 17, s.y - 9, 34, 16, 3); fillStroke(ctx, p.wood, p.woodDark, 2);
      ctx.strokeStyle = p.woodDark; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(s.x - 15, s.y - 1); ctx.lineTo(s.x + 15, s.y - 1); ctx.stroke();
    } else {
      ellipse(ctx, s.x, s.y, 22, 8); fillStroke(ctx, p.cushion, p.cushionEdge, 2);
    }
  }

  // door + welcome mat on the left wall
  rrect(ctx, -6, 280, 18, 100, 6); fillStroke(ctx, p.door, null);
  rrect(ctx, 8, 298, 42, 64, 12); fillStroke(ctx, p.mat, p.matEdge, 2);
  if (st === 0) { ctx.strokeStyle = p.matEdge; ctx.lineWidth = 1.5; for (let y = 304; y < 360; y += 8) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(3, y + 3); ctx.stroke(); } }

  kitchen(ctx, sc);
}

function shabbyFloor(ctx) {
  ctx.fillStyle = 'rgba(110,80,50,0.10)';
  for (const [x, y, rx, ry] of [[90, 300, 38, 14], [430, 480, 44, 16], [200, 680, 30, 11], [470, 300, 26, 10]]) { ellipse(ctx, x, y, rx, ry); ctx.fill(); }
  ctx.strokeStyle = 'rgba(80,55,35,0.35)'; ctx.lineWidth = 1.5;
  for (const [x, y] of [[320, 360], [60, 560], [380, 700]]) { // cracks
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 10, y + 6); ctx.lineTo(x + 18, y + 3); ctx.lineTo(x + 30, y + 10); ctx.stroke();
  }
  rrect(ctx, 236, 372, 70, 14, 2); ctx.fillStyle = 'rgba(70,45,30,0.18)'; ctx.fill(); // loose plank
}

function shabbyWall(ctx, p) {
  // peeling patches
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  for (const [x, y] of [[236, 14], [470, 128], [8, 132]]) {
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 22, y + 4); ctx.lineTo(x + 16, y + 18); ctx.lineTo(x + 4, y + 22); ctx.closePath(); ctx.fill();
  }
  // crack and stain
  ctx.strokeStyle = 'rgba(70,50,40,0.35)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(300, 100); ctx.lineTo(308, 110); ctx.lineTo(303, 118); ctx.lineTo(312, 126); ctx.stroke();
  ellipse(ctx, 230, 150, 16, 8); ctx.fillStyle = 'rgba(110,80,50,0.12)'; ctx.fill();
  cobweb(ctx, 0, 0, 1);
  cobweb(ctx, WORLD.W, 0, -1);
}

function cobweb(ctx, x, y, dir) {
  ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 1;
  for (const a of [0.15, 0.55, 0.95, 1.35]) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + dir * Math.cos(a) * 38, y + Math.sin(a) * 38); ctx.stroke(); }
  for (const r of [12, 22, 32]) { ctx.beginPath(); ctx.arc(x, y, r, dir > 0 ? 0.1 : Math.PI - 1.45, dir > 0 ? 1.45 : Math.PI - 0.1); ctx.stroke(); }
}

function bunting(ctx, p) {
  ctx.strokeStyle = 'rgba(90,61,74,0.3)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(0, 6); ctx.quadraticCurveTo(135, 20, 270, 6); ctx.quadraticCurveTo(405, 20, 540, 6); ctx.stroke();
  for (let i = 0; i < 18; i++) {
    const fx = 8 + i * 30, sag = Math.sin(((fx % 270) / 270) * Math.PI) * 7;
    tri(ctx, [fx, 6 + sag], [fx + 20, 6 + sag], [fx + 10, 22 + sag]);
    ctx.fillStyle = p.bunting[i % p.bunting.length]; ctx.fill();
  }
}

function kitchen(ctx, sc) {
  const p = sc.pal, st = sc.stage, y = LAYOUT.kitchenY, { W, H } = WORLD;
  ctx.fillStyle = SHADOW; ctx.fillRect(0, y - 6, W, 8);
  ctx.fillStyle = p.counterFront; ctx.fillRect(0, y + 24, W, H - y - 24);
  ctx.fillStyle = p.tile; ctx.fillRect(0, y + 24, W, 16);
  ctx.strokeStyle = p.tileLine; ctx.lineWidth = 2;
  for (let x = 24; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, y + 24); ctx.lineTo(x, y + 40); ctx.stroke(); }
  rrect(ctx, 110, y + 50, 120, 74, 10); fillStroke(ctx, '#e4f4fb', '#b9dff0', 3);
  for (const bx of [136, 160, 184, 208]) { rrect(ctx, bx - 6, y + 74, 12, 30, 4); fillStroke(ctx, '#fff', '#9cc3ea', 1.5); }
  rrect(ctx, 310, y + 50, 120, 74, 10); fillStroke(ctx, p.counter, p.counterEdge, 3);
  drawFoodIcon(ctx, 'catfood', 370, y + 88, 1.1, 0.5);
  if (st >= 3) for (const hx of [120, 320]) { rrect(ctx, hx, y + 80, 5, 18, 2); fillStroke(ctx, '#e3b94f', null); } // gold handles
  rrect(ctx, -6, y, W + 12, 28, 10); fillStroke(ctx, p.counter, p.counterEdge, 2);
  if (st === 0) { ctx.fillStyle = 'rgba(110,80,50,0.15)'; ellipse(ctx, 280, y + 12, 26, 6); ctx.fill(); } // stain
  if (st >= 1) for (const px of [40, 500]) { // potted plants
    ctx.fillStyle = '#7fd1a1';
    for (const [dx, dy, r] of [[-9, -22, 10], [9, -22, 10], [0, -32, 11]]) { circle(ctx, px + dx, y + dy, r); ctx.fill(); }
    rrect(ctx, px - 12, y - 16, 24, 20, 5); fillStroke(ctx, '#f6a07c', null);
  }
}

// ---------------------------------------------------------------- tables (drawn per frame for depth)
/** Round table: bare wobbly wood when shabby, tablecloth when tidy, flowers when cosy, gold + candle when fancy. */
export function drawTable(ctx, t, sc, time = 0) {
  const p = sc.pal, st = sc.stage;
  ellipse(ctx, t.x, t.y + 4, 36, 10); ctx.fillStyle = SHADOW; ctx.fill();
  ellipse(ctx, t.x, t.y + 1, 16, 5); fillStroke(ctx, p.woodDark, null);
  rrect(ctx, t.x - 5, t.y - 24, 10, 25, 4); fillStroke(ctx, p.wood, null);
  if (st === 0) { // bare, slightly tilted wooden top with a crack
    ctx.save(); ctx.translate(t.x, t.y - 26); ctx.rotate(-0.04);
    ellipse(ctx, 0, 0, 44, 22); fillStroke(ctx, p.wood, p.woodDark, 2.5);
    ctx.strokeStyle = p.woodDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-4, -4); ctx.lineTo(-9, 4); ctx.stroke();
    ctx.restore();
    return;
  }
  ellipse(ctx, t.x, t.y - 26, 46, 24); fillStroke(ctx, p.cloth, st >= 3 ? '#e3b94f' : p.clothRim, 3);
  ellipse(ctx, t.x, t.y - 27, 34, 16); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  if (st >= 2) { // vase + flower
    rrect(ctx, t.x - 4, t.y - 38, 8, 12, 3); fillStroke(ctx, '#a9dcf5', null);
    circle(ctx, t.x, t.y - 43, 4.5); fillStroke(ctx, '#ff8fab', null);
    circle(ctx, t.x, t.y - 43, 1.8); fillStroke(ctx, '#ffd166', null);
  }
  if (st >= 3) { // little candle with a flickering flame
    rrect(ctx, t.x + 14, t.y - 36, 5, 9, 1.5); fillStroke(ctx, '#fff7e0', '#e3b94f', 1);
    const f = 1 + Math.sin(time * 13 + t.x) * 0.15;
    ellipse(ctx, t.x + 16.5, t.y - 40, 2.2 * f, 3.6 * f); ctx.fillStyle = '#ffb347'; ctx.fill();
    ellipse(ctx, t.x + 16.5, t.y - 39, 1, 1.8); ctx.fillStyle = '#fff6c2'; ctx.fill();
  }
}

/** Open tables at the scene's level. */
export const sceneTables = sc => tablesForLevel(sc.level);

// ---------------------------------------------------------------- live wall: sky, clock, lights
/** Tap area (world coords) of the top-left window-sill plant: 5 taps = secret Ghost cat. */
export const EGG_POT = { x: 28, y: 76, w: 56, h: 48 };
const WINDOWS = [{ x: 26, y: 22, w: 194, h: 96 }, { x: 320, y: 22, w: 194, h: 96 }];
// Clouds live in one strip spanning both windows, so they drift from pane to pane.
const CLOUDS = [
  { x: 0, y: 52, s: 1, v: 9 }, { x: 150, y: 78, s: 0.75, v: 6 }, { x: 290, y: 44, s: 1.15, v: 8 },
  { x: 420, y: 84, s: 0.7, v: 5 }, { x: 520, y: 60, s: 0.9, v: 7 },
];
// Sky colour through a day (local hour -> colour), interpolated.
// Purple/pink steps at dawn and dusk keep the blend from going muddy grey.
const SKY = [
  [0, '#1e2a5a'], [5, '#2b3a74'], [5.8, '#8a74b8'], [6.5, '#ffc8a8'], [8, '#d6effa'], [17, '#d6effa'],
  [18.3, '#ffcfa0'], [19.2, '#ffa9a0'], [19.8, '#e58fb4'], [20.3, '#8a74b8'], [21, '#2f3570'], [24, '#1e2a5a'],
];
function skyColor(hour) {
  let i = 0;
  while (i < SKY.length - 2 && hour >= SKY[i + 1][0]) i++;
  const [h0, c0] = SKY[i], [h1, c1] = SKY[i + 1], k = (hour - h0) / (h1 - h0);
  const [a, b] = [hexRgb(c0), hexRgb(c1)];
  return `rgb(${a.map((v, j) => Math.round(v + (b[j] - v) * k)).join()})`;
}

/** Animated windows (clouds, sun/moon, stars, birds), real-time clock, and fairy lights when fancy. */
export function drawWallLive(ctx, t, sc, now = new Date()) {
  const p = sc.pal, st = sc.stage;
  const hour = now.getHours() + now.getMinutes() / 60;
  const night = hour < 6 || hour >= 20.5;
  const sky = skyColor(hour);
  for (const [i, { x, y, w, h }] of WINDOWS.entries()) {
    ctx.save();
    rrect(ctx, x, y, w, h, 16); ctx.fillStyle = sky; ctx.fill(); ctx.clip();
    if (night) {
      for (let k = 0; k < 14; k++) { // twinkling stars
        const sx = x + ((k * 73 + i * 31) % w), sy = y + ((k * 41) % (h - 20)) + 6;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * 2 + k);
        circle(ctx, sx, sy, 1.4); ctx.fillStyle = '#fff'; ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    if (i === 0) { // sun or moon
      const by = y + 34 + Math.sin(t * 0.5) * 3;
      ctx.globalAlpha = 0.3; circle(ctx, x + 40, by, 20); ctx.fillStyle = night ? '#fff6d0' : '#ffe08a'; ctx.fill();
      ctx.globalAlpha = 1; circle(ctx, x + 40, by, 13); ctx.fillStyle = night ? '#fff6d0' : '#ffd166'; ctx.fill();
      if (night) { circle(ctx, x + 46, by - 4, 11); ctx.fillStyle = sky; ctx.fill(); } // crescent
    }
    ctx.fillStyle = night ? 'rgba(160,170,220,0.55)' : '#fff';
    for (const c of CLOUDS) {
      const cx = ((c.x + t * c.v) % 600) - 40;
      for (const [dx, dy, r] of [[-14, 4, 10], [0, -2, 14], [15, 4, 10]]) { circle(ctx, cx + dx * c.s, c.y + dy * c.s, r * c.s); ctx.fill(); }
    }
    if (!night) { // a pair of birds every ~22s
      const bx = ((t * 45) % 1000) - 60, by = 46 + Math.sin(t * 1.5) * 6, flap = Math.sin(t * 12) * 3;
      ctx.strokeStyle = '#6b5a66'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
      for (const [ox, oy] of [[0, 0], [16, 8]]) {
        ctx.beginPath();
        ctx.moveTo(bx + ox - 5, by + oy - flap); ctx.quadraticCurveTo(bx + ox - 2, by + oy - 2, bx + ox, by + oy);
        ctx.quadraticCurveTo(bx + ox + 2, by + oy - 2, bx + ox + 5, by + oy - flap); ctx.stroke();
      }
    }
    if (st === 0) { // grimy glass
      ctx.fillStyle = 'rgba(120,95,70,0.22)';
      for (const [dx, dy, rx, ry] of [[40, 70, 34, 16], [130, 30, 28, 12], [160, 80, 24, 14]]) { ellipse(ctx, x + dx, y + dy, rx, ry); ctx.fill(); }
    }
    ctx.restore();
    // frame, mullion, sill (+ plant once it's cosy)
    rrect(ctx, x, y, w, h, 16); ctx.strokeStyle = p.frame; ctx.lineWidth = 6; ctx.stroke();
    ctx.fillStyle = p.frame; ctx.fillRect(x + w / 2 - 2, y, 4, h);
    rrect(ctx, x - 6, y + h - 2, w + 12, 8, 4); fillStroke(ctx, p.frame, null);
    if (st === 0 && i === 1) { // cracked pane
      ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x + 150, y + 6); ctx.lineTo(x + 140, y + 30); ctx.lineTo(x + 156, y + 44); ctx.lineTo(x + 146, y + 70); ctx.stroke();
    }
    if (st >= 2 || i === 0) { // the left pot is always there (easter-egg target); wilted until the café is cosy
      const wilted = st < 2;
      ctx.fillStyle = wilted ? '#a8a172' : '#7fd1a1';
      const leaves = wilted ? [[-8, -8, 5], [7, -9, 5], [0, -12, 4.5]] : [[-6, -12, 6], [6, -12, 6], [0, -18, 6]];
      for (const [dx, dy, r] of leaves) { circle(ctx, x + 28 + dx, y + h - 8 + dy, r); ctx.fill(); }
      rrect(ctx, x + 20, y + h - 14, 16, 12, 3); fillStroke(ctx, wilted ? '#c99a7a' : '#f6a07c', null);
    }
  }
  // wall clock showing the real time
  const cx = 270, cy = 70, m = now.getMinutes() + now.getSeconds() / 60, hr = (now.getHours() % 12) + m / 60;
  circle(ctx, cx, cy, 25); fillStroke(ctx, '#fff', st >= 3 ? '#e3b94f' : p.clockRim, 4);
  ctx.strokeStyle = INK; ctx.lineCap = 'round';
  const hand = (a, len, lw) => {
    ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.sin(a) * len, cy - Math.cos(a) * len); ctx.stroke();
  };
  hand((hr / 12) * TAU, 10, 3.5);
  hand((m / 60) * TAU, 16, 2.5);
  circle(ctx, cx, cy, 2.5); ctx.fillStyle = '#ff8fab'; ctx.fill();
  if (st >= 3) fairyLights(ctx, t);
}

function fairyLights(ctx, t) {
  const y0 = 128, cols = ['#ffd166', '#ff8fab', '#9fd3ff', '#8fd9b6'];
  ctx.strokeStyle = 'rgba(90,61,74,0.35)'; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(0, y0); ctx.quadraticCurveTo(135, y0 + 22, 270, y0); ctx.quadraticCurveTo(405, y0 + 22, 540, y0); ctx.stroke();
  for (let i = 0; i < 22; i++) {
    const x = 6 + i * 25, sag = Math.sin(((x % 270) / 270) * Math.PI) * 11;
    const glow = 0.55 + 0.45 * Math.sin(t * 3 + i * 1.7);
    ctx.globalAlpha = glow * 0.35; circle(ctx, x, y0 + sag + 3, 6); ctx.fillStyle = cols[i % 4]; ctx.fill();
    ctx.globalAlpha = 0.6 + glow * 0.4; circle(ctx, x, y0 + sag + 3, 2.6); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
