// Procedural placeholder art for HungryKatz.
// Every function only needs a world position + animation state, so swapping in
// real sprite sheets later means replacing these bodies with ctx.drawImage()
// calls (images go in /assets/cats, /assets/food, /assets/backgrounds).

import { LAYOUT, WORLD } from './config.js';

export const FONT = '"Fredoka", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
const TAU = Math.PI * 2;
const INK = '#5a3d4a';

const ellipse = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); };
const circle = (ctx, x, y, r) => ellipse(ctx, x, y, r, r);
const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
const tri = (ctx, a, b, c) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); };
const fillStroke = (ctx, fill, stroke, lw = 2) => {
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.stroke(); }
};
export const easeOutBack = k => { const c = 1.70158; return 1 + (c + 1) * (k - 1) ** 3 + c * (k - 1) ** 2; };
export const easeOutCubic = k => 1 - (1 - k) ** 3;

// ---------------------------------------------------------------- cat looks
const FURS = [
  { fur: '#f4a259', light: '#ffe6c9', dark: '#c0702c' }, // ginger
  { fur: '#9a9aa8', light: '#ececf2', dark: '#626270' }, // grey
  { fur: '#433a46', light: '#f6f2f6', dark: '#241e26' }, // black
  { fur: '#fbf3ea', light: '#ffffff', dark: '#c9b6a2' }, // cream
  { fur: '#b07a52', light: '#f3dcc6', dark: '#7a4d2e' }, // brown
  { fur: '#c9b7e8', light: '#f4effc', dark: '#8e78bd' }, // lavender
  { fur: '#9fd8cb', light: '#e9f8f3', dark: '#5ea999' }, // mint
  { fur: '#f2b5c4', light: '#fdeaf0', dark: '#cc7f93' }, // pink
];
const PATTERNS = ['none', 'stripes', 'spots', 'patch', 'tuxedo', 'socks'];
const ACCESSORIES = ['none', 'bow', 'bell', 'scarf', 'hat', 'glasses', 'flower', 'beanie'];
const ACC_COLORS = ['#ff6b8a', '#5aa9e6', '#ffc94d', '#6cc788', '#a07be0', '#ff9f68'];
const EYES = ['#5cb85c', '#3b82c4', '#d4a017', '#8a5cc7', '#3b2a33'];
const PATCHES = ['#f4a259', '#433a46', '#b07a52', '#fbf3ea'];
const pick = (arr, rng) => arr[Math.floor(rng() * arr.length)];

export function randomLook(rng = Math.random) {
  return {
    ...pick(FURS, rng),
    pattern: pick(PATTERNS, rng),
    accessory: pick(ACCESSORIES, rng),
    acc: pick(ACC_COLORS, rng),
    eye: pick(EYES, rng),
    patch: pick(PATCHES, rng),
    size: 0.92 + rng() * 0.14,
    seed: rng() * 10,
  };
}

export const PLAYER_LOOK = {
  fur: '#f4a259', light: '#fff1dc', dark: '#c0702c',
  pattern: 'stripes', accessory: 'chef', acc: '#ff8fab', eye: '#3b2a33',
  patch: '#fff', size: 1.08, seed: 0,
};

// ---------------------------------------------------------------- cat
/**
 * Draw a cat with its feet at (x, y).
 * o.state: 'idle' | 'walk' | 'eat'   o.mood: null | 'happy' | 'sad'
 * Only this sprite is flipped by o.facing; callers draw overlays separately
 * so icons and text never mirror.
 */
export function drawCat(ctx, x, y, look, o = {}) {
  const { state = 'idle', t = 0, facing = 1, squash = 0, mood = null } = o;
  const s = look.size || 1;
  const walk = state === 'walk', eat = state === 'eat';
  const happy = eat || mood === 'happy', sad = mood === 'sad';
  const bob = walk ? -Math.abs(Math.sin(t * 11)) * 4 : Math.sin(t * 2.4) * 0.8;
  const swing = walk ? Math.sin(t * 11) * 4 : 0;
  const ol = look.dark;

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = 'rgba(110,60,80,0.18)';
  ellipse(ctx, 0, 0, 22, 6); ctx.fill();
  ctx.scale(facing * (1 + squash * 0.16), 1 - squash * 0.14);
  ctx.translate(0, bob);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';

  // tail
  const sway = Math.sin(t * (walk ? 9 : 2.6)) * 6;
  ctx.beginPath(); ctx.moveTo(-14, -16);
  ctx.quadraticCurveTo(-34, -18, -30 + sway, -44);
  ctx.strokeStyle = ol; ctx.lineWidth = 9; ctx.stroke();
  ctx.strokeStyle = look.fur; ctx.lineWidth = 5; ctx.stroke();

  // far legs, body, near legs
  leg(ctx, -10 - swing, look.dark, ol, look);
  leg(ctx, 7 + swing, look.dark, ol, look);
  ellipse(ctx, 0, -20, 19, 15); ctx.fillStyle = look.fur; ctx.fill();
  ctx.save(); ctx.clip(); bodyPattern(ctx, look); ctx.restore();
  ellipse(ctx, 0, -20, 19, 15); ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.stroke();
  if (look.accessory === 'chef') { // apron
    rrect(ctx, -1, -31, 17, 22, 5); fillStroke(ctx, look.acc, '#e56b8c', 1.6);
    rrect(ctx, 3, -20, 9, 6, 2); fillStroke(ctx, '#ffd0de', null);
  }
  leg(ctx, -5 + swing, look.fur, ol, look, true);
  leg(ctx, 11 - swing, look.fur, ol, look, true);

  // head
  const hx = 5, hy = -44 + (eat ? 3 + Math.abs(Math.sin(t * 14)) * 3 : 0);
  const droop = sad ? 6 : 0;
  const ears = [
    [[hx - 15, hy - 6], [hx - 13 - droop, hy - 26 + droop * 1.5], [hx - 2, hy - 15]],
    [[hx + 5, hy - 15], [hx + 16 + droop, hy - 26 + droop * 1.5], [hx + 18, hy - 5]],
  ];
  for (const [a, b, c] of ears) {
    tri(ctx, a, b, c); fillStroke(ctx, look.fur, ol, 2.2);
    const cx = (a[0] + b[0] + c[0]) / 3, cy = (a[1] + b[1] + c[1]) / 3;
    const k = p => [cx + (p[0] - cx) * 0.5, cy + (p[1] - cy) * 0.5];
    tri(ctx, k(a), k(b), k(c)); fillStroke(ctx, '#ffb3c6', null);
  }
  ellipse(ctx, hx, hy, 18, 17); ctx.fillStyle = look.fur; ctx.fill();
  ctx.save(); ctx.clip(); headPattern(ctx, look, hx, hy); ctx.restore();
  ellipse(ctx, hx, hy, 18, 17); ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.stroke();
  ellipse(ctx, hx + 4, hy + 7, 8, 5.5); fillStroke(ctx, look.light, null);

  // eyes
  const blink = (t + look.seed) % 3.6 < 0.13;
  ctx.strokeStyle = '#2b2230'; ctx.lineWidth = 2.2;
  for (const ex of [hx - 3, hx + 10]) {
    const ey = hy - 1;
    if (happy) { ctx.beginPath(); ctx.arc(ex, ey + 2, 3.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
    else if (blink) { ctx.beginPath(); ctx.moveTo(ex - 3, ey); ctx.lineTo(ex + 3, ey); ctx.stroke(); }
    else {
      ellipse(ctx, ex, ey, 3.6, 4.6); fillStroke(ctx, look.eye, null);
      ellipse(ctx, ex + 0.4, ey + 0.6, 2.3, 3.3); fillStroke(ctx, '#2b2230', null);
      circle(ctx, ex - 1, ey - 1.6, 1.3); fillStroke(ctx, '#fff', null);
    }
  }
  if (sad) {
    ctx.beginPath();
    ctx.moveTo(hx - 7, hy - 9); ctx.lineTo(hx - 1, hy - 7);
    ctx.moveTo(hx + 14, hy - 9); ctx.lineTo(hx + 8, hy - 7);
    ctx.stroke();
    ellipse(ctx, hx - 5, hy + 5 + ((t * 18) % 8), 1.6, 2.4); fillStroke(ctx, '#7cc4ff', null);
  }

  // nose, mouth, cheeks, whiskers
  tri(ctx, [hx + 1.5, hy + 3], [hx + 6.5, hy + 3], [hx + 4, hy + 6]); fillStroke(ctx, '#ff7a9a', null);
  ctx.strokeStyle = '#7a2e45'; ctx.lineWidth = 1.4;
  if (eat && Math.sin(t * 14) > 0) { ellipse(ctx, hx + 4, hy + 9.5, 2.6, 2.2); fillStroke(ctx, '#7a2e45', null); }
  else if (sad) { ctx.beginPath(); ctx.arc(hx + 4, hy + 11, 2.6, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
  else {
    ctx.beginPath(); ctx.arc(hx + 2.5, hy + 7, 1.6, 0, Math.PI); ctx.stroke();
    ctx.beginPath(); ctx.arc(hx + 5.5, hy + 7, 1.6, 0, Math.PI); ctx.stroke();
  }
  ctx.fillStyle = 'rgba(255,120,150,0.4)';
  circle(ctx, hx - 9, hy + 6, 3.2); ctx.fill();
  circle(ctx, hx + 15, hy + 6, 3); ctx.fill();
  ctx.strokeStyle = 'rgba(90,61,74,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx + 12, hy + 5); ctx.lineTo(hx + 23, hy + 3);
  ctx.moveTo(hx + 12, hy + 7); ctx.lineTo(hx + 23, hy + 8);
  ctx.moveTo(hx - 4, hy + 5); ctx.lineTo(hx - 15, hy + 3);
  ctx.moveTo(hx - 4, hy + 7); ctx.lineTo(hx - 15, hy + 8);
  ctx.stroke();

  accessory(ctx, look, hx, hy);
  ctx.restore();
}

function leg(ctx, lx, fill, ol, look, near = false) {
  rrect(ctx, lx - 3.5, -14, 7, 14, 3.5); fillStroke(ctx, fill, ol, 1.8);
  if (near && (look.pattern === 'socks' || look.pattern === 'tuxedo')) {
    rrect(ctx, lx - 3.5, -5, 7, 5, 2.5); fillStroke(ctx, '#fff', ol, 1.4);
  }
}

function bodyPattern(ctx, look) {
  ctx.fillStyle = look.dark; ctx.strokeStyle = look.dark; ctx.lineWidth = 3;
  switch (look.pattern) {
    case 'stripes':
      for (const i of [-12, -5, 2]) { ctx.beginPath(); ctx.moveTo(i, -36); ctx.quadraticCurveTo(i + 4, -26, i, -16); ctx.stroke(); }
      break;
    case 'spots':
      for (const [x, y, r] of [[-9, -24, 4], [2, -31, 3], [-4, -13, 3.5]]) { circle(ctx, x, y, r); ctx.fill(); }
      break;
    case 'patch': circle(ctx, -9, -22, 11); ctx.fillStyle = look.patch; ctx.fill(); break;
    case 'tuxedo': ellipse(ctx, 8, -18, 12, 14); ctx.fillStyle = '#fff'; ctx.fill(); break;
  }
  ellipse(ctx, 7, -16, 9, 9); ctx.fillStyle = look.pattern === 'tuxedo' ? '#fff' : look.light; ctx.fill();
}

function headPattern(ctx, look, hx, hy) {
  ctx.fillStyle = look.dark; ctx.strokeStyle = look.dark; ctx.lineWidth = 2.6;
  switch (look.pattern) {
    case 'stripes':
      for (const i of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(hx + 3 + i * 5, hy - 18); ctx.lineTo(hx + 3 + i * 4, hy - 11); ctx.stroke(); }
      break;
    case 'spots': circle(ctx, hx - 8, hy - 7, 4); ctx.fill(); break;
    case 'patch': circle(ctx, hx - 8, hy - 6, 9); ctx.fillStyle = look.patch; ctx.fill(); break;
    case 'tuxedo': ellipse(ctx, hx + 4, hy + 10, 12, 9); ctx.fillStyle = '#fff'; ctx.fill(); break;
  }
}

function accessory(ctx, look, hx, hy) {
  const c = look.acc, ol = 'rgba(90,61,74,0.75)';
  switch (look.accessory) {
    case 'bow': {
      const bx = hx - 11, by = hy - 15;
      tri(ctx, [bx, by], [bx - 8, by - 6], [bx - 8, by + 6]); fillStroke(ctx, c, ol, 1.4);
      tri(ctx, [bx, by], [bx + 8, by - 6], [bx + 8, by + 6]); fillStroke(ctx, c, ol, 1.4);
      circle(ctx, bx, by, 2.6); fillStroke(ctx, c, ol, 1.4);
      break;
    }
    case 'bell':
      rrect(ctx, -12, -32, 28, 5, 2.5); fillStroke(ctx, c, ol, 1.4);
      circle(ctx, 6, -25.5, 3.4); fillStroke(ctx, '#ffd34d', ol, 1.4);
      break;
    case 'scarf':
      rrect(ctx, -14, -34, 32, 7, 3.5); fillStroke(ctx, c, ol, 1.4);
      rrect(ctx, -10, -30, 7, 15, 3); fillStroke(ctx, c, ol, 1.4);
      break;
    case 'hat':
      rrect(ctx, hx - 13, hy - 21, 28, 4.5, 2); fillStroke(ctx, '#3d3540', null);
      rrect(ctx, hx - 8, hy - 37, 18, 17, 3); fillStroke(ctx, '#3d3540', null);
      rrect(ctx, hx - 8, hy - 25, 18, 4, 1); fillStroke(ctx, c, null);
      break;
    case 'beanie':
      ctx.beginPath(); ctx.arc(hx + 1, hy - 10, 15, Math.PI, 0); ctx.closePath(); fillStroke(ctx, c, ol, 1.4);
      rrect(ctx, hx - 15, hy - 13, 32, 5, 2.5); fillStroke(ctx, '#fff', ol, 1.2);
      circle(ctx, hx + 1, hy - 27, 4); fillStroke(ctx, '#fff', ol, 1.2);
      break;
    case 'glasses':
      ctx.strokeStyle = '#3d3540'; ctx.lineWidth = 1.8;
      circle(ctx, hx - 3, hy - 1, 5.6); ctx.stroke();
      circle(ctx, hx + 10, hy - 1, 5.6); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(hx + 2.6, hy - 1); ctx.lineTo(hx + 4.4, hy - 1); ctx.stroke();
      break;
    case 'flower':
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * TAU;
        circle(ctx, hx + 12 + Math.cos(a) * 4, hy - 18 + Math.sin(a) * 4, 3); fillStroke(ctx, c, null);
      }
      circle(ctx, hx + 12, hy - 18, 2.2); fillStroke(ctx, '#ffd34d', null);
      break;
    case 'chef':
      for (const [x, y, r] of [[hx - 7, hy - 25, 8], [hx + 3, hy - 30, 9.5], [hx + 13, hy - 24, 7.5]]) {
        circle(ctx, x, y, r); fillStroke(ctx, '#fff', '#e3d3da', 1.6);
      }
      rrect(ctx, hx - 11, hy - 23, 26, 8, 3); fillStroke(ctx, '#fff', '#e3d3da', 1.6);
      break;
  }
}

// ---------------------------------------------------------------- food icons
/** Food icon centred at (x, y); ~24px tall at s = 1. */
export function drawFoodIcon(ctx, type, x, y, s = 1, alpha = 1) {
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.globalAlpha *= alpha;
  ctx.lineJoin = 'round';
  if (type === 'milk') {
    rrect(ctx, -9, -7, 18, 19, 3); fillStroke(ctx, '#fff', '#5b8bd6', 2);
    tri(ctx, [-9, -7], [0, -15], [9, -7]); fillStroke(ctx, '#dbe9ff', '#5b8bd6', 2);
    rrect(ctx, -3, -18, 6, 4, 1.5); fillStroke(ctx, '#5b8bd6', null);
    rrect(ctx, -8, 1, 16, 7, 2); fillStroke(ctx, '#7fb3ff', null);
    ellipse(ctx, 0, 4.5, 2, 2.4); fillStroke(ctx, '#fff', null);
  } else {
    ctx.fillStyle = '#b8763e';
    for (const [kx, ky, r] of [[-6, -3, 4], [0, -6, 4.5], [6, -3, 4], [-2, -1, 3], [3, -1, 3]]) {
      circle(ctx, kx, ky, r); ctx.fill();
    }
    ctx.beginPath();
    ctx.moveTo(-12, -1); ctx.lineTo(12, -1);
    ctx.quadraticCurveTo(11, 10, 0, 10); ctx.quadraticCurveTo(-11, 10, -12, -1);
    fillStroke(ctx, '#ff8fab', '#d4607e', 2);
    ellipse(ctx, -1, 4.5, 3.5, 2); fillStroke(ctx, '#fff', null); // fish logo
    tri(ctx, [2, 4.5], [5, 2.5], [5, 6.5]); fillStroke(ctx, '#fff', null);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- overlays
const SHADOW = 'rgba(120,70,60,0.13)';

/** Flat pickup pad on the floor; pulses while the player can still pick up. */
export function drawPad(ctx, zone, type, ready, t, flash) {
  const { x, y } = zone;
  ellipse(ctx, x, y + 10, 48, 21);
  fillStroke(ctx, ready ? '#d6f4e8' : '#eee8ea', ready ? '#86d6b2' : '#ddd3d7', 3);
  if (ready) {
    const k = (t * 0.7) % 1;
    ctx.globalAlpha = 1 - k;
    ellipse(ctx, x, y + 10, 48 + k * 16, 21 + k * 7);
    ctx.strokeStyle = '#86d6b2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  }
  if (flash > 0) {
    ctx.globalAlpha = flash / 0.4;
    ellipse(ctx, x, y + 10, 52, 24); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.globalAlpha = 1;
  }
  drawFoodIcon(ctx, type, x, y - 4 + (ready ? Math.sin(t * 3) * 3 : 0), 1.25, ready ? 1 : 0.45);
}

/** Tiny badge above the player: only the foods actually carried. Never flipped. */
export function drawCarryBadge(ctx, x, y, inv) {
  const items = ['milk', 'catfood'].filter(k => inv.items[k] > 0);
  if (!items.length) return;
  const w = items.length * 34 + 6, h = 24, top = y - 114;
  rrect(ctx, x - w / 2, top, w, h, 12); fillStroke(ctx, 'rgba(255,255,255,0.95)', '#f6d3dd', 1.5);
  ctx.font = `700 12px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  items.forEach((k, i) => {
    const ix = x - w / 2 + 13 + i * 34;
    drawFoodIcon(ctx, k, ix, top + 12, 0.55);
    ctx.fillStyle = INK; ctx.fillText(inv.items[k], ix + 9, top + 13);
  });
}

/** Round café table; drawn per frame so cats behind it are occluded. */
export function drawTable(ctx, t) {
  ellipse(ctx, t.x, t.y + 4, 36, 10); ctx.fillStyle = SHADOW; ctx.fill();
  ellipse(ctx, t.x, t.y + 1, 16, 5); fillStroke(ctx, '#d2a98d', null);
  rrect(ctx, t.x - 5, t.y - 24, 10, 25, 4); fillStroke(ctx, '#ddb79b', null);
  ellipse(ctx, t.x, t.y - 26, 46, 24); fillStroke(ctx, '#fff', '#f1cfd8', 3);
  ellipse(ctx, t.x, t.y - 27, 34, 16); ctx.strokeStyle = '#fbe9ee'; ctx.lineWidth = 2; ctx.stroke();
  rrect(ctx, t.x - 4, t.y - 38, 8, 12, 3); fillStroke(ctx, '#a9dcf5', null);
  circle(ctx, t.x, t.y - 43, 4.5); fillStroke(ctx, '#ff8fab', null);
  circle(ctx, t.x, t.y - 43, 1.8); fillStroke(ctx, '#ffd166', null);
}

/** Request bubble with circular countdown ring. */
export function drawRequest(ctx, npc, t) {
  const k = Math.min(1, npc.arriveT / 0.35);
  const urgent = npc.frac < 0.3;
  const sc = easeOutBack(k) * (urgent ? 1 + Math.sin(t * 14) * 0.07 : 1);
  if (sc <= 0) return;
  ctx.save();
  ctx.translate(npc.x, npc.y - 104 * (npc.look.size || 1));
  ctx.scale(sc, sc);
  if (urgent) { circle(ctx, 0, 0, 27); ctx.fillStyle = 'rgba(255,93,115,0.18)'; ctx.fill(); }
  tri(ctx, [-5, 15], [5, 15], [0, 23]); ctx.fillStyle = '#fff'; ctx.fill();
  circle(ctx, 0, 0, 19); fillStroke(ctx, '#fff', null);
  ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  circle(ctx, 0, 0, 21); ctx.strokeStyle = 'rgba(90,61,74,0.12)'; ctx.stroke();
  const f = npc.frac;
  ctx.beginPath();
  ctx.arc(0, 0, 21, -Math.PI / 2, -Math.PI / 2 + f * TAU);
  ctx.strokeStyle = f > 0.6 ? '#5ccf8a' : f > 0.3 ? '#ffc94d' : '#ff5d73';
  ctx.stroke();
  drawFoodIcon(ctx, npc.request, 0, 1, 0.85);
  ctx.restore();
}

export function drawSadCloud(ctx, x, y, t) {
  ctx.fillStyle = '#9aa3b5';
  for (const [cx, cy, r] of [[-9, 0, 7], [0, -4, 9], [9, 0, 7]]) { circle(ctx, x + cx, y + cy, r); ctx.fill(); }
  ctx.strokeStyle = '#7cc4ff'; ctx.lineWidth = 2; ctx.lineCap = 'round';
  for (const dx of [-7, 0, 7]) {
    const dy = ((t * 30 + dx * 3) % 12 + 12) % 12;
    ctx.beginPath(); ctx.moveTo(x + dx, y + 8 + dy); ctx.lineTo(x + dx - 1, y + 12 + dy); ctx.stroke();
  }
}

export function drawHeart(ctx, x, y, s, color = '#ff6b8a') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s / 10, s / 10);
  ctx.beginPath();
  ctx.moveTo(0, 6);
  ctx.bezierCurveTo(-12, -2, -6, -12, 0, -5);
  ctx.bezierCurveTo(6, -12, 12, -2, 0, 6);
  ctx.fillStyle = color; ctx.fill();
  ctx.restore();
}

/** Effects: layer 'under' = tap markers, 'over' = text and particles. */
export function drawFx(ctx, fx, layer) {
  for (const f of fx) {
    const k = f.t / f.life;
    if ((f.kind === 'tap') !== (layer === 'under')) continue;
    if (f.kind === 'tap') {
      ctx.globalAlpha = 1 - k;
      const r = 8 + k * 22;
      ellipse(ctx, f.x, f.y, r, r * 0.45);
      ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 3; ctx.stroke();
    } else if (f.kind === 'text') {
      ctx.globalAlpha = 1 - Math.max(0, (k - 0.6) / 0.4);
      const pop = easeOutBack(Math.min(1, f.t / 0.25));
      ctx.font = `700 ${Math.max(1, f.size * pop)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const y = f.y - easeOutCubic(k) * 50;
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
      ctx.strokeText(f.text, f.x, y);
      ctx.fillStyle = f.color; ctx.fillText(f.text, f.x, y);
    } else {
      ctx.globalAlpha = 1 - k * k;
      if (f.shape === 'heart') drawHeart(ctx, f.x, f.y, 9, f.color);
      else if (f.shape === 'coin') {
        circle(ctx, f.x, f.y, 5.5); fillStroke(ctx, '#ffc94d', '#d99a00', 1.5);
        circle(ctx, f.x - 1.5, f.y - 1.5, 1.5); fillStroke(ctx, '#fff6d0', null);
      } else { // sparkle
        ctx.save(); ctx.translate(f.x, f.y); ctx.rotate(f.t * 6);
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
          const r = i % 2 ? 2 : 7, a = (i / 8) * TAU;
          ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fillStyle = f.color; ctx.fill();
        ctx.restore();
      }
    }
  }
  ctx.globalAlpha = 1;
}

// ---------------------------------------------------------------- background
/** Static café, drawn once into an offscreen canvas (world coordinates). */
export function drawBackground(ctx) {
  const { W, H } = WORLD;
  // wood plank floor
  ctx.fillStyle = '#f8eadb'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = '#f0dcc6'; ctx.lineWidth = 2;
  for (let y = 172, r = 0; y < H; y += 38, r++) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    for (let x = (r % 3) * 70 + 40; x < W; x += 210) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + 38); ctx.stroke(); }
  }

  // back wall, windows, clock
  ctx.fillStyle = '#fde7ed'; ctx.fillRect(0, 0, W, 172);
  ctx.fillStyle = '#fff5f8'; ctx.fillRect(0, 128, W, 44);
  ctx.fillStyle = '#f6cfd9'; ctx.fillRect(0, 126, W, 3); ctx.fillRect(0, 169, W, 3);
  for (const wx of [26, 320]) drawWindow(ctx, wx, 22, 194, 96);
  circle(ctx, 270, 70, 25); fillStroke(ctx, '#fff', '#f2b8c8', 4);
  ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(270, 70); ctx.lineTo(270, 55); ctx.moveTo(270, 70); ctx.lineTo(281, 76); ctx.stroke();

  // window bar with saucers, cushions for every seat
  const b = LAYOUT.windowBar;
  rrect(ctx, b.x + 4, b.y + 10, b.w, b.h, 12); ctx.fillStyle = SHADOW; ctx.fill();
  rrect(ctx, b.x, b.y + 22, b.w, b.h - 22, 10); fillStroke(ctx, '#ddb08d', null);
  rrect(ctx, b.x - 6, b.y, b.w + 12, 30, 12); fillStroke(ctx, '#f1cdab', null);
  rrect(ctx, b.x + 6, b.y + 4, b.w - 12, 4, 2); fillStroke(ctx, '#fbe3cd', null);
  for (const s of LAYOUT.spots) {
    if (s.row === 'bar') { ellipse(ctx, s.x, b.y + 15, 13, 5); fillStroke(ctx, '#fff', '#f1d4dc', 1.5); }
    ellipse(ctx, s.x, s.y, 22, 8); fillStroke(ctx, '#fbd3de', '#f3b4c5', 2);
  }

  // door + welcome mat on the left wall
  rrect(ctx, -6, 280, 18, 100, 6); fillStroke(ctx, '#ecbccb', null);
  rrect(ctx, 8, 298, 42, 64, 12); fillStroke(ctx, '#d6f2e6', '#ade3cc', 2);

  kitchen(ctx);
}

function drawWindow(ctx, x, y, w, h) {
  rrect(ctx, x, y, w, h, 16); fillStroke(ctx, '#ddf1fb', '#fff', 6);
  ctx.fillStyle = '#fff';
  for (const [cx, cy, r] of [[x + 50, y + 44, 11], [x + 64, y + 38, 14], [x + 80, y + 44, 11], [x + 140, y + 62, 8], [x + 151, y + 58, 10]]) { circle(ctx, cx, cy, r); ctx.fill(); }
  ctx.fillRect(x + w / 2 - 2, y, 4, h);
  rrect(ctx, x - 6, y + h - 2, w + 12, 8, 4); fillStroke(ctx, '#fff', null);
  // little potted plant on the sill
  ctx.fillStyle = '#7fd1a1';
  for (const [dx, dy, r] of [[-6, -12, 6], [6, -12, 6], [0, -18, 6]]) { circle(ctx, x + 28 + dx, y + h - 8 + dy, r); ctx.fill(); }
  rrect(ctx, x + 20, y + h - 14, 16, 12, 3); fillStroke(ctx, '#f6a07c', null);
}

function kitchen(ctx) {
  const y = LAYOUT.kitchenY, { W, H } = WORLD;
  ctx.fillStyle = SHADOW; ctx.fillRect(0, y - 6, W, 8);
  // counter front with mint tile band, under-counter fridge and cupboard
  ctx.fillStyle = '#efd5bb'; ctx.fillRect(0, y + 24, W, H - y - 24);
  ctx.fillStyle = '#c9eedf'; ctx.fillRect(0, y + 24, W, 16);
  ctx.strokeStyle = '#b3e3cf'; ctx.lineWidth = 2;
  for (let x = 24; x < W; x += 24) { ctx.beginPath(); ctx.moveTo(x, y + 24); ctx.lineTo(x, y + 40); ctx.stroke(); }
  rrect(ctx, 110, y + 50, 120, 74, 10); fillStroke(ctx, '#e4f4fb', '#b9dff0', 3);
  for (const bx of [136, 160, 184, 208]) { rrect(ctx, bx - 6, y + 74, 12, 30, 4); fillStroke(ctx, '#fff', '#9cc3ea', 1.5); }
  rrect(ctx, 310, y + 50, 120, 74, 10); fillStroke(ctx, '#f6e2cd', '#e6c6a6', 3);
  drawFoodIcon(ctx, 'catfood', 370, y + 88, 1.1, 0.5);
  // counter top + props
  rrect(ctx, -6, y, W + 12, 28, 10); fillStroke(ctx, '#f6e6d6', '#ead2bb', 2);
  for (const bx of [154, 170, 186]) { // milk bottles in a crate
    rrect(ctx, bx - 6, y - 20, 12, 24, 4); fillStroke(ctx, '#fff', '#9cc3ea', 1.5);
    rrect(ctx, bx - 3, y - 24, 6, 5, 2); fillStroke(ctx, '#5b8bd6', null);
  }
  rrect(ctx, 144, y - 4, 52, 14, 3); fillStroke(ctx, '#e7c3a0', null);
  drawFoodIcon(ctx, 'catfood', 370, y - 2, 1.7);
  for (const px of [40, 500]) {
    ctx.fillStyle = '#7fd1a1';
    for (const [dx, dy, r] of [[-9, -22, 10], [9, -22, 10], [0, -32, 11]]) { circle(ctx, px + dx, y + dy, r); ctx.fill(); }
    rrect(ctx, px - 12, y - 16, 24, 20, 5); fillStroke(ctx, '#f6a07c', null);
  }
}
