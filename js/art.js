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
export function drawLabel(ctx, x, y, text, { bg = '#fff', color = INK, size = 13 } = {}) {
  ctx.font = `600 ${size}px ${FONT}`;
  const w = ctx.measureText(text).width + 16, h = size + 10;
  rrect(ctx, x - w / 2, y - h / 2, w, h, h / 2); fillStroke(ctx, bg, 'rgba(255,255,255,0.9)', 2);
  ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + 1);
}

export function drawReady(ctx, x, y, text, ready, t) {
  const by = y + (ready ? Math.sin(t * 3) * 3 : 0);
  tri(ctx, [x - 5, by + 9], [x + 5, by + 9], [x, by + 15]);
  ctx.fillStyle = ready ? '#6fcf9f' : '#e9e2e6'; ctx.fill();
  drawLabel(ctx, x, by, text, { bg: ready ? '#6fcf9f' : '#e9e2e6', color: ready ? '#fff' : '#9a8a92' });
}

/** Carried food above the player's head: slots per type + "n/max" counts. Never flipped. */
export function drawInventory(ctx, x, y, inv) {
  const n = inv.max, slot = 12, w = 22 + n * slot + 28, h = 42, top = y - 132;
  rrect(ctx, x - w / 2, top, w, h, 12); fillStroke(ctx, 'rgba(255,255,255,0.93)', '#ffc6d6', 2);
  ['milk', 'catfood'].forEach((type, i) => {
    const ry = top + 12 + i * 19, cnt = inv.items[type];
    for (let k = 0; k < n; k++) drawFoodIcon(ctx, type, x - w / 2 + 14 + k * slot, ry, 0.5, k < cnt ? 1 : 0.22);
    ctx.font = `700 12px ${FONT}`;
    ctx.fillStyle = cnt ? INK : '#b9a9b1';
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    ctx.fillText(`${cnt}/${n}`, x + w / 2 - 7, ry + 1);
  });
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
  tri(ctx, [-6, 16], [6, 16], [0, 26]); ctx.fillStyle = '#fff'; ctx.fill();
  circle(ctx, 0, 0, 20); fillStroke(ctx, '#fff', null);
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  circle(ctx, 0, 0, 24); ctx.strokeStyle = 'rgba(90,61,74,0.15)'; ctx.stroke();
  const f = npc.frac;
  ctx.beginPath();
  ctx.arc(0, 0, 24, -Math.PI / 2, -Math.PI / 2 + f * TAU);
  ctx.strokeStyle = f > 0.6 ? '#5ccf8a' : f > 0.3 ? '#ffc94d' : '#ff5d73';
  ctx.stroke();
  drawFoodIcon(ctx, npc.request, 0, 1, 0.95);
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
  // floor
  ctx.fillStyle = '#fff4e8'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#ffe9d9';
  for (let y = 172, r = 0; y < H; y += 46, r++) for (let x = (r % 2) * 46; x < W; x += 92) ctx.fillRect(x, y, 46, 46);
  ellipse(ctx, 250, 535, 160, 96); ctx.fillStyle = '#ffdbe6'; ctx.fill();
  ellipse(ctx, 250, 535, 144, 82); ctx.setLineDash([10, 8]); ctx.strokeStyle = '#fff'; ctx.lineWidth = 4; ctx.stroke(); ctx.setLineDash([]);

  // wall
  ctx.fillStyle = '#ffc9d9'; ctx.fillRect(0, 0, W, 172);
  ctx.fillStyle = '#ffbfd2'; for (let x = 0; x < W; x += 36) ctx.fillRect(x, 0, 18, 136);
  ctx.fillStyle = '#fff0f5'; ctx.fillRect(0, 136, W, 36);
  ctx.fillStyle = '#f2a7bf'; ctx.fillRect(0, 136, W, 4); ctx.fillRect(0, 168, W, 4);
  for (const wx of [30, 390]) {
    rrect(ctx, wx, 34, 120, 88, 14); fillStroke(ctx, '#c7ecff', '#fff', 6);
    ctx.fillStyle = '#fff';
    for (const [cx, cy, r] of [[wx + 35, 70, 10], [wx + 48, 64, 13], [wx + 62, 70, 10]]) { circle(ctx, cx, cy, r); ctx.fill(); }
    ctx.fillRect(wx + 58, 34, 4, 88); ctx.fillRect(wx, 76, 120, 4);
    rrect(ctx, wx - 6, 120, 132, 8, 4); fillStroke(ctx, '#fff', null);
  }
  rrect(ctx, 180, 40, 180, 72, 20); fillStroke(ctx, '#fff', '#ff8fab', 4);
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillStyle = '#ff7096'; ctx.font = `700 28px ${FONT}`; ctx.fillText('HungryKatz', 270, 68);
  ctx.fillStyle = '#c99'; ctx.font = `600 13px ${FONT}`; ctx.fillText('C A T   C A F É', 270, 96);
  for (let i = 0; i < 14; i++) { // bunting
    const fx = 10 + i * 38;
    tri(ctx, [fx, 10], [fx + 26, 10], [fx + 13, 28]);
    ctx.fillStyle = ['#ff8fab', '#ffd166', '#8fd9b6', '#9fd3ff'][i % 4]; ctx.fill();
  }

  // door + welcome mat on the left
  rrect(ctx, -6, 440, 16, 120, 4); fillStroke(ctx, '#d9a5b8', null);
  rrect(ctx, 6, 458, 44, 84, 10); fillStroke(ctx, '#a8e6cf', '#8fd9b6', 3);
  ctx.fillStyle = '#8fd9b6'; for (let y = 470; y < 535; y += 14) ctx.fillRect(12, y, 32, 5);

  counter(ctx, LAYOUT.topCounter, 'top');
  counter(ctx, LAYOUT.bottomCounter, 'bottom');
  fridge(ctx, LAYOUT.fridge);

  // cat food station
  const b = LAYOUT.bowl;
  ellipse(ctx, b.x, b.y + 12, 46, 17); fillStroke(ctx, '#bde0fe', '#9fd3ff', 3);
  drawFoodIcon(ctx, 'catfood', b.x, b.y - 2, 2.1);

  plant(ctx, 500, 925); plant(ctx, 36, 930);
}

function counter(ctx, c, row) {
  const top = 30;
  rrect(ctx, c.x + 4, c.y + 10, c.w, c.h, 16); ctx.fillStyle = 'rgba(120,70,60,0.15)'; ctx.fill();
  rrect(ctx, c.x, c.y + top - 10, c.w, c.h - top + 10, 14); fillStroke(ctx, '#d4956a', null);
  ctx.strokeStyle = '#c07f55'; ctx.lineWidth = 3;
  for (let x = c.x + 60; x < c.x + c.w - 20; x += 70) { ctx.beginPath(); ctx.moveTo(x, c.y + top + 8); ctx.lineTo(x, c.y + c.h - 8); ctx.stroke(); }
  rrect(ctx, c.x - 4, c.y, c.w + 8, top, 14); fillStroke(ctx, '#f2c6a0', null);
  rrect(ctx, c.x + 8, c.y + 4, c.w - 16, 5, 3); fillStroke(ctx, '#ffe0c4', null);
  for (const s of LAYOUT.spots) {
    if (s.row !== row) continue;
    ellipse(ctx, s.x, c.y + top / 2 + 1, 16, 7); fillStroke(ctx, '#fff', '#f0d0dc', 2);
    ellipse(ctx, s.x, c.y + top / 2 + 1, 9, 3.5); fillStroke(ctx, '#fbeef3', null);
  }
}

function fridge(ctx, f) {
  ellipse(ctx, f.x + f.w / 2, f.y + f.h, f.w / 2 + 6, 8); ctx.fillStyle = 'rgba(120,70,60,0.15)'; ctx.fill();
  rrect(ctx, f.x, f.y, f.w, f.h, 14); fillStroke(ctx, '#e3f5ff', '#8ec5e8', 3);
  rrect(ctx, f.x + f.w - 14, f.y + 5, 9, f.h - 10, 5); fillStroke(ctx, '#cbe8fa', null);
  ctx.strokeStyle = '#8ec5e8'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(f.x + 2, f.y + 70); ctx.lineTo(f.x + f.w - 2, f.y + 70); ctx.stroke();
  rrect(ctx, f.x + 9, f.y + 24, 6, 30, 3); fillStroke(ctx, '#8ec5e8', null);
  rrect(ctx, f.x + 9, f.y + 84, 6, 52, 3); fillStroke(ctx, '#8ec5e8', null);
  const sx = f.x + f.w / 2 + 4, sy = f.y + 36; // snowflake
  ctx.lineWidth = 2;
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI;
    ctx.beginPath(); ctx.moveTo(sx - Math.cos(a) * 9, sy - Math.sin(a) * 9); ctx.lineTo(sx + Math.cos(a) * 9, sy + Math.sin(a) * 9); ctx.stroke();
  }
  drawFoodIcon(ctx, 'milk', f.x + f.w / 2 + 4, f.y + 150, 1.5);
  ctx.fillStyle = '#5b8bd6'; ctx.font = `700 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText('MILK', f.x + f.w / 2 + 4, f.y + 192);
}

function plant(ctx, x, y) {
  ctx.fillStyle = '#6cc788';
  for (const [dx, dy, r] of [[-10, -30, 12], [10, -32, 12], [0, -44, 13], [-14, -16, 9], [14, -18, 9]]) { circle(ctx, x + dx, y + dy, r); ctx.fill(); }
  ctx.beginPath();
  ctx.moveTo(x - 16, y - 14); ctx.lineTo(x + 16, y - 14); ctx.lineTo(x + 12, y + 14); ctx.lineTo(x - 12, y + 14); ctx.closePath();
  fillStroke(ctx, '#f08a5d', '#d26f45', 2);
}
