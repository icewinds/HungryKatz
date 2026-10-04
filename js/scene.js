// Café scenery: colour themes ("scenes", chosen in Settings) and the makeover stages
// (shabby -> tidy -> cosy -> fancy) that unlock as the restaurant levels up.
// A scene object is { stage: 0..3, pal: palette, level } — see makeScene().

import { LAYOUT, WORLD, decorStage, tablesForLevel, spotsForLevel } from './config.js';
import { ellipse, circle, rrect, tri, fillStroke, drawFoodIcon, drawHeart, hexRgb, INK, SHADOW } from './art.js';

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
export const makeScene = (themeId, level, season = null) => ({ theme: THEMES[themeId] ? themeId : 'strawberry', level, season, stage: decorStage(level), pal: palette(themeId, decorStage(level)) });

/** Seasonal decorations by date: Halloween (Oct), winter (1 Dec - 6 Jan), Valentine's (1-14 Feb). */
export function seasonFor(d = new Date()) {
  const m = d.getMonth(), day = d.getDate();
  if (m === 9) return 'halloween';
  if (m === 11 || (m === 0 && day <= 6)) return 'winter';
  if (m === 1 && day <= 14) return 'valentine';
  return null;
}

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
  if (sc.theme !== 'seaside') clipped(ctx, () => rrect(ctx, b.x, b.y + 22, b.w, b.h - 22, 10), () => woodGrain(ctx, b.x, b.y + 24, b.w, b.h - 24, 7));
  rrect(ctx, b.x - 6, b.y, b.w + 12, 30, 12); fillStroke(ctx, p.bar, null);
  if (sc.theme !== 'seaside') clipped(ctx, () => rrect(ctx, b.x - 6, b.y, b.w + 12, 30, 12), () => woodGrain(ctx, b.x - 6, b.y + 6, b.w + 12, 24, 3));
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
      clipped(ctx, () => rrect(ctx, s.x - 17, s.y - 9, 34, 16, 3), () => woodGrain(ctx, s.x - 17, s.y - 9, 34, 16, s.x + s.y));
      ctx.fillStyle = p.woodDark; for (const nx of [-13, 13]) for (const ny of [-5, 3]) { circle(ctx, s.x + nx, s.y + ny, 0.9); ctx.fill(); } // nails
    } else {
      ellipse(ctx, s.x, s.y, 22, 8); fillStroke(ctx, p.cushion, p.cushionEdge, 2);
    }
  }

  // doorway + welcome mat on the left wall (the door itself swings open live: drawDoor)
  rrect(ctx, -6, DOOR.hy - DOOR.H, 18, DOOR.W + DOOR.H, 6); fillStroke(ctx, DAYLIGHT, null);
  rrect(ctx, 8, 298, 42, 64, 12); fillStroke(ctx, p.mat, p.matEdge, 2);
  if (st === 0) { ctx.strokeStyle = p.matEdge; ctx.lineWidth = 1.5; for (let y = 304; y < 360; y += 8) { ctx.beginPath(); ctx.moveTo(8, y); ctx.lineTo(3, y + 3); ctx.stroke(); } }

  if (st <= 1) { cardboardBoxes(ctx); oldBroom(ctx); } // cleared away once the café gets cosy

  kitchen(ctx, sc);
}

// ---------------------------------------------------------------- wood grain + clutter
const GRAIN = 'rgba(90,50,20,0.5)';
/** Run `draw` clipped to the path that `shape` builds. */
function clipped(ctx, shape, draw) {
  ctx.save(); shape(); ctx.clip(); draw(); ctx.restore();
}
/** Wood grain inside the current clip: gently wavy lines along the board, plus a knot on bigger pieces.
 *  `vertical` runs the grain up a leg or handle. Deterministic per `seed` so the background never shimmers. */
function woodGrain(ctx, x, y, w, h, seed = 1, vertical = false) {
  let r = Math.abs(Math.round(seed * 9301)) % 233280;
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280;
  const across = vertical ? w : h, along = vertical ? h : w, n = Math.max(2, Math.round(across / 6));
  ctx.save();
  ctx.strokeStyle = GRAIN; ctx.lineWidth = 1; ctx.globalAlpha *= 0.55;
  const pt = (a, c) => (vertical ? [x + c, y + a] : [x + a, y + c]);
  for (let i = 0; i < n; i++) {
    const c0 = ((i + 0.3 + rnd() * 0.4) / n) * across, amp = 0.6 + rnd() * 1.4, ph = rnd() * 6;
    ctx.beginPath();
    for (let a = 0; a <= along; a += 6) ctx.lineTo(...pt(a, c0 + Math.sin(a / 15 + ph) * amp));
    ctx.stroke();
  }
  if (along * across > 700) { // a knot
    const [kx, ky] = pt(along * (0.2 + rnd() * 0.6), across * (0.3 + rnd() * 0.4));
    ellipse(ctx, kx, ky, vertical ? 1.6 : 3.4, vertical ? 3.4 : 1.6); ctx.stroke();
    ellipse(ctx, kx, ky, vertical ? 0.7 : 1.4, vertical ? 1.4 : 0.7); ctx.fillStyle = GRAIN; ctx.fill();
  }
  ctx.restore();
}

/** Empty cardboard boxes stacked in the top-right corner (left over from moving in). */
function cardboardBoxes(ctx) {
  const FACE = '#d6a56b', SIDE = '#bf8c52', TOP = '#e7bf86', EDGE = '#9c6c38', TAPE = '#efdcae';
  // box with its front-bottom-left corner at (x, y): front w x h, receding d up and to the right
  const box = (x, y, w, h, d, open) => {
    const dy = d * 0.6;
    ctx.beginPath(); ctx.moveTo(x + w, y); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w + d, y - h - dy); ctx.lineTo(x + w + d, y - dy); ctx.closePath();
    fillStroke(ctx, SIDE, EDGE, 1.2);                                                                   // side
    rrect(ctx, x, y - h, w, h, 1.5); fillStroke(ctx, FACE, EDGE, 1.2);                                    // front
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + d, y - h - dy); ctx.lineTo(x + w + d, y - h - dy); ctx.lineTo(x + w, y - h); ctx.closePath();
    if (!open) {
      fillStroke(ctx, TOP, EDGE, 1.2);
      ctx.strokeStyle = TAPE; ctx.lineWidth = 4;                                                          // packing tape
      ctx.beginPath(); ctx.moveTo(x + w / 2, y - h + 8); ctx.lineTo(x + w / 2, y - h); ctx.lineTo(x + w / 2 + d, y - h - dy); ctx.stroke();
      ctx.fillStyle = 'rgba(156,108,56,0.45)'; // paw stamp
      ellipse(ctx, x + 12, y - h / 2 + 3, 4, 3.2); ctx.fill();
      for (const [px, py] of [[-4, -4], [0, -6], [4, -4]]) { circle(ctx, x + 12 + px, y - h / 2 + 3 + py, 1.4); ctx.fill(); }
      return;
    }
    fillStroke(ctx, '#7a5530', EDGE, 1.2);                                                                // empty inside
    for (const [ax, ay, bx, by, lean] of [[x, y - h, x + d, y - h - dy, -1], [x + w, y - h, x + w + d, y - h - dy, 1]]) {
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.lineTo(bx + lean * 9, by - 10); ctx.lineTo(ax + lean * 9, ay - 10); ctx.closePath();
      fillStroke(ctx, TOP, EDGE, 1.2);                                                                    // side flaps up
    }
    ctx.beginPath(); ctx.moveTo(x, y - h); ctx.lineTo(x + w, y - h); ctx.lineTo(x + w - 2, y - h + 9); ctx.lineTo(x + 2, y - h + 9); ctx.closePath();
    fillStroke(ctx, '#c99560', EDGE, 1.2);                                                                // front flap folded down
  };
  // flattened box leaning on the right wall, then the stack
  ctx.beginPath(); ctx.moveTo(522, 268); ctx.lineTo(540, 270); ctx.lineTo(540, 196); ctx.lineTo(530, 194); ctx.closePath();
  fillStroke(ctx, SIDE, EDGE, 1.2);
  ellipse(ctx, 494, 268, 40, 6); ctx.fillStyle = SHADOW; ctx.fill();
  box(462, 268, 46, 30, 14, false);
  box(468, 236, 34, 22, 11, true);
}

/** An old broom leaning on the right wall: frayed bristles, taped handle. */
function oldBroom(ctx) {
  ellipse(ctx, 519, 694, 16, 4); ctx.fillStyle = SHADOW; ctx.fill();
  ctx.save();
  ctx.translate(518, 692); ctx.rotate(0.2); // leans right, against the wall
  rrect(ctx, -2.5, -128, 5, 112, 2.5); fillStroke(ctx, '#b07a48', '#7d5230', 1);                      // handle
  clipped(ctx, () => rrect(ctx, -2.5, -128, 5, 112, 2.5), () => woodGrain(ctx, -2.5, -128, 5, 112, 11, true));
  rrect(ctx, -3.2, -96, 6.4, 7, 1.5); fillStroke(ctx, '#d8d0c4', '#a89a88', 0.8);                     // old tape wrap
  rrect(ctx, -6, -18, 12, 6, 2); fillStroke(ctx, '#8f8f97', '#66666e', 1);                             // ferrule
  ctx.beginPath(); ctx.moveTo(-6, -12); ctx.lineTo(6, -12); ctx.lineTo(13, 2); ctx.lineTo(4, 0); ctx.lineTo(-2, 3); ctx.lineTo(-12, 1); ctx.closePath();
  fillStroke(ctx, '#d9b866', '#a8863a', 1.2);                                                          // worn, uneven bristles
  ctx.strokeStyle = '#a8863a'; ctx.lineWidth = 0.9;
  for (const [x0, x1, y1] of [[-3, -8, 1], [0, -1, 2], [3, 6, 0], [5, 11, 1]]) { ctx.beginPath(); ctx.moveTo(x0, -11); ctx.lineTo(x1, y1); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(10, 1); ctx.lineTo(15, 4); ctx.moveTo(-11, 0); ctx.lineTo(-15, 3); ctx.stroke();  // stray bristles
  ctx.restore();
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
  clipped(ctx, () => rrect(ctx, t.x - 5, t.y - 24, 10, 25, 4), () => woodGrain(ctx, t.x - 5, t.y - 24, 10, 25, t.x, true));
  if (st === 0) { // bare, slightly tilted wooden top with a crack
    ctx.save(); ctx.translate(t.x, t.y - 26); ctx.rotate(-0.04);
    ellipse(ctx, 0, 0, 44, 22); fillStroke(ctx, p.wood, p.woodDark, 2.5);
    clipped(ctx, () => ellipse(ctx, 0, 0, 42.5, 20.5), () => woodGrain(ctx, -44, -22, 88, 44, t.x + t.y));
    ctx.strokeStyle = p.woodDark; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-10, -12); ctx.lineTo(-4, -4); ctx.lineTo(-9, 4); ctx.stroke();
    ctx.restore();
    return;
  }
  ellipse(ctx, t.x, t.y - 26, 46, 24); fillStroke(ctx, p.cloth, st >= 3 ? '#e3b94f' : p.clothRim, 3);
  ellipse(ctx, t.x, t.y - 27, 34, 16); ctx.strokeStyle = 'rgba(255,255,255,0.6)'; ctx.lineWidth = 2; ctx.stroke();
  if (st >= 2) { // vase + flower
    rrect(ctx, t.x - 22, t.y - 28, 8, 12, 3); fillStroke(ctx, '#a9dcf5', null);  // front-left, clear of the plates
    circle(ctx, t.x - 18, t.y - 33, 4.5); fillStroke(ctx, '#ff8fab', null);
    circle(ctx, t.x - 18, t.y - 33, 1.8); fillStroke(ctx, '#ffd166', null);
  }
  if (st >= 3) { // little candle with a flickering flame
    const cx = t.x + 22, cy = t.y - 44; // back-right, between the back and side plates
    rrect(ctx, cx - 2.5, cy, 5, 9, 1.5); fillStroke(ctx, '#fff7e0', '#e3b94f', 1);
    const f = 1 + Math.sin(time * 13 + t.x) * 0.15;
    ellipse(ctx, cx, cy - 4, 2.2 * f, 3.6 * f); ctx.fillStyle = '#ffb347'; ctx.fill();
    ellipse(ctx, cx, cy - 3, 1, 1.8); ctx.fillStyle = '#fff6c2'; ctx.fill();
  }
}

/** Open tables at the scene's level. */
export const sceneTables = sc => tablesForLevel(sc.level);

// ---------------------------------------------------------------- live wall: sky, clock, lights
/** Tap area (world coords) of the top-left window-sill plant: 5 taps = secret Ghost cat. */
export const EGG_POT = { x: 28, y: 76, w: 56, h: 48 };
/** Seaside Diner only: a garden gnome on the right window sill who screams when tapped. */
export const GNOME_SPOT = { x: 446, y: 70, w: 50, h: 52 };
export const gnome = { x: 471, y: 116, screamAt: -1e9 }; // screamAt = render time (s) of the last tap

function drawGnome(ctx, t) {
  const since = t - gnome.screamAt, scream = since >= 0 && since < 0.8;
  const jump = scream ? Math.sin((since / 0.8) * Math.PI) * 10 : 0;
  const shake = scream ? Math.sin(since * 60) * 1.2 : 0;
  ctx.save();
  ctx.translate(gnome.x + shake, gnome.y - jump);
  if (scream) ctx.scale(1.12, 1.12);
  ellipse(ctx, -4, 0, 4, 2.2); fillStroke(ctx, '#6b4a3a', null);       // boots
  ellipse(ctx, 4, 0, 4, 2.2); fillStroke(ctx, '#6b4a3a', null);
  rrect(ctx, -8, -14, 16, 13, 6); fillStroke(ctx, '#5b8bd6', '#3f6fb8', 1.2); // shirt
  rrect(ctx, -8, -8, 16, 3, 1.5); fillStroke(ctx, '#6b4a3a', null);    // belt
  circle(ctx, 0, -19, 6); fillStroke(ctx, '#ffd7c2', '#e8b9a2', 1);    // face
  ctx.beginPath(); ctx.moveTo(-6.5, -19); ctx.quadraticCurveTo(-5, -5, 0, -4); ctx.quadraticCurveTo(5, -5, 6.5, -19);
  fillStroke(ctx, '#ffffff', '#ddd7cf', 1);                           // beard
  ctx.fillStyle = '#2b2230';
  if (scream) { // wide eyes + big round mouth
    circle(ctx, -2.6, -21, 1.6); ctx.fill(); circle(ctx, 2.6, -21, 1.6); ctx.fill();
    ellipse(ctx, 0, -12.5, 2.4, 3.4); fillStroke(ctx, '#5a1f2a', null);
  } else {
    circle(ctx, -2.4, -20.5, 1); ctx.fill(); circle(ctx, 2.4, -20.5, 1); ctx.fill();
  }
  circle(ctx, 0, -18, 2.2); fillStroke(ctx, '#ff9f8a', null);          // nose
  tri(ctx, [-7.5, -22], [7.5, -22], [2, -42]); fillStroke(ctx, '#e8504f', '#c43d3d', 1.2); // hat
  ctx.restore();
}
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
    if (sc.season === 'winter') { // falling snow
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      for (let k = 0; k < 18; k++) {
        const fx = x + ((k * 53 + i * 29) % w) + Math.sin(t * 1.5 + k) * 4, fy = y + ((t * (14 + (k % 5) * 3) + k * 37) % h);
        circle(ctx, fx, fy, 1.3 + (k % 3) * 0.5); ctx.fill();
      }
    }
    if (sc.season === 'halloween') { // bats flitting past
      ctx.fillStyle = '#3a2f45';
      for (let k = 0; k < 2; k++) {
        const bx = x + ((t * 30 + k * 97 + i * 60) % (w + 40)) - 20, by = y + 30 + k * 26 + Math.sin(t * 3 + k) * 6, flap = Math.sin(t * 16 + k) * 3;
        ctx.beginPath(); ctx.moveTo(bx, by); ctx.quadraticCurveTo(bx - 5, by - 4 - flap, bx - 10, by - flap); ctx.quadraticCurveTo(bx - 5, by + 1, bx, by + 2);
        ctx.quadraticCurveTo(bx + 5, by + 1, bx + 10, by - flap); ctx.quadraticCurveTo(bx + 5, by - 4 - flap, bx, by); ctx.fill();
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
  if (sc.theme === 'seaside') drawGnome(ctx, t);
  if (sc.season) drawSeason(ctx, t, sc);
}

function drawSeason(ctx, t, sc) {
  const y = LAYOUT.kitchenY;
  if (sc.season === 'winter') {
    if (sc.stage < 3) fairyLights(ctx, t);                          // (fancy cafés already have them)
    ctx.fillStyle = '#ffffff';                                        // snow on the sills
    for (const wx of [26, 320]) { rrect(ctx, wx - 4, 112, 202, 5, 3); ctx.fill(); }
  }
  if (sc.season === 'halloween') {                                    // glowing pumpkins on the counter
    for (const [px, s] of [[230, 1], [300, 0.8]]) {
      ctx.save(); ctx.translate(px, y + 2); ctx.scale(s, s);
      ellipse(ctx, 0, -10, 15, 12); fillStroke(ctx, '#ff8a2a', '#d96a12', 1.6);
      ctx.strokeStyle = '#d96a12'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(0, -21); ctx.lineTo(0, 1); ctx.stroke();
      rrect(ctx, -2, -25, 4, 6, 2); fillStroke(ctx, '#5b8a3c', null);
      const glow = 0.6 + 0.4 * Math.sin(t * 5 + px);
      ctx.fillStyle = `rgba(255,220,90,${glow})`;
      tri(ctx, [-8, -13], [-3, -13], [-5.5, -17]); ctx.fill();
      tri(ctx, [3, -13], [8, -13], [5.5, -17]); ctx.fill();
      ctx.beginPath(); ctx.moveTo(-8, -7); ctx.lineTo(-4, -5); ctx.lineTo(0, -7); ctx.lineTo(4, -5); ctx.lineTo(8, -7); ctx.lineTo(4, -3); ctx.lineTo(-4, -3); ctx.closePath(); ctx.fill();
      ctx.restore();
    }
  }
  if (sc.season === 'valentine') {                                    // hearts garland + floating hearts
    ctx.strokeStyle = 'rgba(90,61,74,0.3)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(0, 124); ctx.quadraticCurveTo(270, 150, 540, 124); ctx.stroke();
    for (let i = 0; i < 12; i++) {
      const hx = 22 + i * 45, sag = Math.sin((hx / 540) * Math.PI) * 13;
      drawHeart(ctx, hx, 128 + sag + Math.sin(t * 2 + i) * 1.5, 12, i % 2 ? '#ff6b8a' : '#ffb3c6');
    }
    for (let k = 0; k < 4; k++) {
      const p = (t * 0.12 + k * 0.25) % 1;
      ctx.globalAlpha = Math.sin(p * Math.PI) * 0.7;
      drawHeart(ctx, 60 + k * 130 + Math.sin(t + k) * 12, 760 - p * 520, 11, '#ff8fab');
    }
    ctx.globalAlpha = 1;
  }
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

// ---------------------------------------------------------------- café pets (bought in Upgrades)
/** Draw owned pets: goldfish bowl (bar, left end), parrot (bar, right end), puppy (floor, right). */
export function drawPets(ctx, pets, t) {
  if (pets.includes('goldfish')) {
    const bx = 98, by = 176;
    ellipse(ctx, bx, by + 13, 14, 4); ctx.fillStyle = SHADOW; ctx.fill();
    circle(ctx, bx, by, 15); fillStroke(ctx, 'rgba(205,236,250,0.7)', '#b5dcf0', 2);
    ctx.save(); circle(ctx, bx, by, 13.5); ctx.clip();
    ctx.fillStyle = 'rgba(110,185,240,0.45)'; ctx.fillRect(bx - 15, by - 3, 30, 20);
    const fx = bx + Math.sin(t * 1.3) * 6, dir = Math.cos(t * 1.3) >= 0 ? 1 : -1;
    tri(ctx, [fx - dir * 4, by + 4], [fx - dir * 9, by + 1], [fx - dir * 9, by + 7]); ctx.fillStyle = '#ff8a3d'; ctx.fill();
    ellipse(ctx, fx, by + 4, 5, 3.2); ctx.fillStyle = '#ffa04d'; ctx.fill();
    circle(ctx, fx + dir * 2.5, by + 3, 0.9); ctx.fillStyle = '#2b2230'; ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 2; i++) { const k = (t * 0.6 + i * 0.5) % 1; circle(ctx, bx + 5 - i * 3, by + 6 - k * 14, 1.2); ctx.fill(); }
    ctx.restore();
    ellipse(ctx, bx, by - 12, 8, 2.5); ctx.strokeStyle = '#b5dcf0'; ctx.lineWidth = 2; ctx.stroke();
  }
  if (pets.includes('parrot')) {
    const x = 452, y = 170 + Math.sin(t * 2) * 1.5;
    tri(ctx, [x - 2, y - 4], [x + 3, y - 4], [x - 4, y + 10]); ctx.fillStyle = '#4a90e2'; ctx.fill();   // tail
    ellipse(ctx, x, y - 12, 7, 11); fillStroke(ctx, '#4cc36a', '#2f9e4f', 1.2);                         // body
    ellipse(ctx, x - 3, y - 11, 4, 8); ctx.fillStyle = '#2f9e4f'; ctx.fill();                           // wing
    circle(ctx, x + 1, y - 25, 6); fillStroke(ctx, '#ff5d5d', '#d94444', 1.2);                          // head
    tri(ctx, [x + 6, y - 26], [x + 11, y - 24], [x + 6, y - 22]); ctx.fillStyle = '#ffc94d'; ctx.fill(); // beak
    circle(ctx, x + 3, y - 26, 1.1); ctx.fillStyle = '#2b2230'; ctx.fill();
    ctx.strokeStyle = '#8a5a3c'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(x - 3, y - 1); ctx.lineTo(x - 3, y + 2); ctx.moveTo(x + 2, y - 1); ctx.lineTo(x + 2, y + 2); ctx.stroke();
  }
  if (pets.includes('puppy')) {
    const x = 488, y = 304, wag = Math.sin(t * 10) * 0.6;
    ellipse(ctx, x, y + 2, 22, 5); ctx.fillStyle = SHADOW; ctx.fill();
    ctx.save(); ctx.translate(x + 16, y - 10); ctx.rotate(-0.6 + wag);                                // wagging tail
    rrect(ctx, -2, -12, 4, 12, 2); fillStroke(ctx, '#c98b55', null); ctx.restore();
    ellipse(ctx, x + 2, y - 7, 17, 8.5); fillStroke(ctx, '#e0a96d', '#b67f4a', 1.4);                 // body (lying down)
    rrect(ctx, x - 16, y - 4, 7, 5, 2.5); fillStroke(ctx, '#e0a96d', '#b67f4a', 1.2);                // front paws
    rrect(ctx, x - 9, y - 4, 7, 5, 2.5); fillStroke(ctx, '#e0a96d', '#b67f4a', 1.2);
    circle(ctx, x - 15, y - 15, 9); fillStroke(ctx, '#e0a96d', '#b67f4a', 1.4);                      // head
    const flop = Math.sin(t * 1.7) * 0.15;
    for (const [ex, dir] of [[-22, -1], [-9, 1]]) {                                                   // floppy ears
      ctx.save(); ctx.translate(x + ex, y - 20); ctx.rotate(dir * (0.3 + flop));
      ellipse(ctx, 0, 6, 3.5, 7); fillStroke(ctx, '#a8703f', null); ctx.restore();
    }
    ellipse(ctx, x - 18, y - 11, 4.5, 3.2); fillStroke(ctx, '#f4d3ae', null);                      // snout
    circle(ctx, x - 20, y - 12, 1.5); fillStroke(ctx, '#2b2230', null);                              // nose
    if (t % 4 < 0.15) { ctx.strokeStyle = '#2b2230'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 17, y - 17); ctx.lineTo(x - 14, y - 17); ctx.stroke(); }
    else { circle(ctx, x - 15.5, y - 17, 1.3); fillStroke(ctx, '#2b2230', null); }
  }
}

// ---------------------------------------------------------------- the front door
const DAYLIGHT = '#fff3d6';
// Door leaf: hinged on the floor at (hx, hy), W wide along the wall, H tall. Shut, it lies flush in the
// wall and (seen from this angle) covers the strip hy-H .. hy+W, the same footprint the open leaf swings from.
const DOOR = { hx: 6, hy: 282, W: 96, H: 104 };
/** The front door on the left wall, swung open by `open` (0 shut .. 1 wide open), hinged at the back
 *  jamb so it opens toward the wall and cats walk in front of it. Daylight spills in while open. */
export function drawDoor(ctx, sc, open) {
  const p = sc.pal;
  if (open > 0.01) { // warm light on the floor through the doorway
    const g = ctx.createLinearGradient(12, 0, 12 + 110 * open, 0);
    g.addColorStop(0, `rgba(255, 236, 190, ${0.55 * open})`); g.addColorStop(1, 'rgba(255, 236, 190, 0)');
    ctx.beginPath(); ctx.moveTo(12, 284); ctx.lineTo(12 + 110 * open, 268); ctx.lineTo(12 + 110 * open, 400); ctx.lineTo(12, 378); ctx.closePath();
    ctx.fillStyle = g; ctx.fill();
  }
  if (open < 0.25) { // shut: the door lies flush in the wall, fading as it swings away
    ctx.save(); ctx.globalAlpha = 1 - open * 4;
    const top = DOOR.hy - DOOR.H, len = DOOR.W + DOOR.H;
    rrect(ctx, -6, top, 18, len, 6); fillStroke(ctx, p.door, 'rgba(90,61,74,0.25)', 1.5);
    rrect(ctx, -2, top + 12, 9, len * 0.42, 3); fillStroke(ctx, 'rgba(255,255,255,0.3)', null);       // panels
    rrect(ctx, -2, top + len * 0.52, 9, len * 0.42, 3); fillStroke(ctx, 'rgba(255,255,255,0.3)', null);
    // knob on the room side, at handle height near the opening edge, sticking out into the café
    drawKnob(ctx, 12, DOOR.hy + DOOR.W - KNOB_IN - DOOR.H * KNOB_UP, 1, 0);
    ctx.restore();
  }
  if (open <= 0.01) return;
  // The door leaf stands upright: its bottom edge swings across the floor around the hinge,
  // and its face (96 wide, 104 tall) turns toward us. Map leaf coords (u along, v up) to the floor.
  const a = open * 1.35, { W, H, hx, hy } = DOOR;
  ctx.save();
  ctx.transform(Math.sin(a), Math.cos(a), 0, -1, hx, hy);
  rrect(ctx, 0, 0, W, H, 5); fillStroke(ctx, p.door, 'rgba(90,61,74,0.35)', 1.5);
  rrect(ctx, 8, 12, 30, H - 24, 4); fillStroke(ctx, 'rgba(255,255,255,0.3)', 'rgba(90,61,74,0.15)', 1); // panels
  rrect(ctx, 46, 12, 30, H - 24, 4); fillStroke(ctx, 'rgba(255,255,255,0.3)', 'rgba(90,61,74,0.15)', 1);
  rrect(ctx, W - 4, 0, 4, H, 2); fillStroke(ctx, 'rgba(90,61,74,0.18)', null);                          // edge
  ctx.restore();
  // knob on the face we see, near the opening edge; it sticks out toward us (drawn round, not skewed)
  ctx.save(); ctx.globalAlpha = Math.min(1, open * 4);
  const u = W - KNOB_IN;
  drawKnob(ctx, hx + Math.sin(a) * u, hy + Math.cos(a) * u - H * KNOB_UP, -Math.cos(a), Math.sin(a));
  ctx.restore();
}

const KNOB_IN = 10, KNOB_UP = 0.45; // knob sits 10px in from the opening edge, just under half height
/** A round brass doorknob: back plate on the door at (x, y), stem and shaded ball out along (nx, ny). */
function drawKnob(ctx, x, y, nx, ny) {
  const bx = x + nx * 5, by = y + ny * 5;
  ellipse(ctx, x, y, 3.4, 4.4); fillStroke(ctx, '#e0a92a', '#a87a12', 1);                    // back plate
  ctx.strokeStyle = '#a87a12'; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(bx, by); ctx.stroke();                      // stem
  ellipse(ctx, bx + 1.6, by + 2.4, 4, 2); ctx.fillStyle = 'rgba(60,40,30,0.22)'; ctx.fill(); // soft shadow
  const g = ctx.createRadialGradient(bx - 1.4, by - 1.6, 0.4, bx, by, 4.4);
  g.addColorStop(0, '#fff6c8'); g.addColorStop(0.35, '#ffd34d'); g.addColorStop(1, '#b8860b');
  circle(ctx, bx, by, 4.2); ctx.fillStyle = g; ctx.fill();                                  // ball
  ctx.strokeStyle = 'rgba(120,80,10,0.6)'; ctx.lineWidth = 0.8; ctx.stroke();
}
