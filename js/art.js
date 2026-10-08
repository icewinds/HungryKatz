// Procedural placeholder art for HungryKatz.
// Every function only needs a world position + animation state, so swapping in
// real sprite sheets later means replacing these bodies with ctx.drawImage()
// calls (images go in /assets/cats, /assets/food, /assets/backgrounds).

import { WORLD } from './config.js';

// Text face (Lilita One, single weight: draw at 400 so it is never fake-bolded).
export const FONT = '"Lilita One", "Fredoka", ui-rounded, "Arial Rounded MT Bold", system-ui, sans-serif';
const TAU = Math.PI * 2;
export const INK = '#5a3d4a';
// Set by game.js to icons.js renderers so canvas text shows drawn icons instead of emoji
// (art.js stays free of DOM-only imports for the Node tests).
export const canvasIcons = { text: null, icon: null };

export const ellipse = (ctx, x, y, rx, ry) => { ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); };
export const circle = (ctx, x, y, r) => ellipse(ctx, x, y, r, r);
export const rrect = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };
export const tri = (ctx, a, b, c) => { ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.closePath(); };
export const fillStroke = (ctx, fill, stroke, lw = 2) => {
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

// Playable waiter cats (character select). `acc` = apron colour.
const WAITER = { accessory: 'waiter', size: 1.08, seed: 0 };
// Dusty the cleaner (hired staff, not playable): blue-grey with a mint scarf and a broom.
export const CLEANER_LOOK = { id: 'dusty', name: 'Dusty', fur: '#9fb0c4', light: '#eef3f8', dark: '#5f6f82', pattern: 'stripes',
  acc: '#6fcf9f', eye: '#3b2a33', patch: '#fff', accessory: 'scarf', size: 1, seed: 0.3 };
/** Dusty's broom, held at the side (drawn after the cat). */
export function drawBroom(ctx, x, y, facing, t, walking) {
  const sway = walking ? Math.sin(t * 11) * 0.12 : Math.sin(t * 2) * 0.04;
  ctx.save(); ctx.translate(x + facing * 16, y - 6); ctx.rotate(facing * (0.25 + sway));
  rrect(ctx, -1.8, -62, 3.6, 56, 1.8); fillStroke(ctx, '#b07a48', '#7d5230', 1);
  ctx.beginPath(); ctx.moveTo(-5, -8); ctx.lineTo(5, -8); ctx.lineTo(9, 4); ctx.lineTo(-9, 4); ctx.closePath();
  fillStroke(ctx, '#e3c06a', '#a8863a', 1.2);
  ctx.restore();
}
/** A stack of empty plates (crumbs on top), e.g. what Dusty is carrying. */
export function drawPlateStack(ctx, x, y, n) {
  for (let i = 0; i < Math.min(n, 4); i++) { ellipse(ctx, x, y - i * 3, 9, 3.4); fillStroke(ctx, '#fff', '#e3cbd4', 1); }
  ctx.fillStyle = '#d9b49a';
  for (const [dx, dy] of [[-3, 0], [2, 1], [4, -1]]) { circle(ctx, x + dx, y - Math.min(n, 4) * 3 + 3 + dy, 1); ctx.fill(); }
}
// Chef Biscuit runs the kitchen (not playable).
export const KITCHEN_CHEF = { id: 'biscuit', name: 'Chef Biscuit', fur: '#f1dcb8', light: '#fff8ec', dark: '#b8925e', pattern: 'socks',
  acc: '#ffffff', eye: '#4a7fc9', patch: '#fff', accessory: 'chef', size: 1.18, seed: 0.6 };
export const PLAYER_LOOKS = [
  { id: 'mango', name: 'Mango', fur: '#f4a259', light: '#fff1dc', dark: '#c0702c', pattern: 'stripes', acc: '#ff8fab', eye: '#3b2a33', patch: '#fff', ...WAITER },
  { id: 'smokey', name: 'Smokey', fur: '#9a9aa8', light: '#ececf2', dark: '#626270', pattern: 'stripes', acc: '#7fb3ff', eye: '#d4a017', patch: '#fff', ...WAITER },
  { id: 'oreo', name: 'Frankie', fur: '#433a46', light: '#f6f2f6', dark: '#241e26', pattern: 'tuxedo', acc: '#ff6b8a', eye: '#5cb85c', patch: '#fff', ...WAITER }, // id kept so saves still work
  { id: 'mochi', name: 'Snowy', fur: '#fdfbf7', light: '#ffffff', dark: '#cdbfb3', pattern: 'patch', acc: '#6fcf9f', eye: '#9bbf3a', patchR: 6.5, // white body, small tan patch
    patch: '#d6a273', headPatch: '#4a3328', ear: '#d9a273', tail: '#4a3328', ...WAITER }, // id kept so owned/selected saves still work
  { id: 'lilac', name: 'Lilac', fur: '#c9b7e8', light: '#f4effc', dark: '#8e78bd', pattern: 'socks', acc: '#ffc94d', eye: '#8a5cc7', patch: '#fff', ...WAITER },
  { id: 'cocoa', name: 'Cocoa', fur: '#b07a52', light: '#f3dcc6', dark: '#7a4d2e', pattern: 'spots', acc: '#a07be0', eye: '#5cb85c', patch: '#fff', ...WAITER },
  // secret: tap the top-left window plant 5 times
  { id: 'ghost', name: 'Ghost', fur: '#6d6c68', light: '#a9a7a0', dark: '#2e2d2b', pattern: 'none', acc: '#3b3f35', eye: '#c9b48a',
    patch: '#fff', tail: '#4a4945', accessory: 'ghost', size: 1.08, seed: 0, secret: true },
];
/** Look for a saved character id (falls back to the first cat). */
export const playerLook = id => PLAYER_LOOKS.find(l => l.id === id) || PLAYER_LOOKS[0];
/** Waiter cat wearing a wardrobe outfit ({ hat, apron } ids from OUTFITS). Ghost keeps his gear. */
export function dressUp(look, outfit, OUTFITS) {
  if (look.accessory !== 'waiter') return look;
  const hat = OUTFITS.hats.find(h => h.id === outfit.hat), apron = OUTFITS.aprons.find(a => a.id === outfit.apron);
  return { ...look, hat: hat?.id ?? 'none', hatColor: hat?.color, acc: apron?.color ?? look.acc };
}

// ---------------------------------------------------------------- cat
/**
 * Draw a cat with its feet at (x, y).
 * o.state: 'idle' | 'walk' | 'eat'   o.mood: null | 'happy' | 'sad'
 * Only this sprite is flipped by o.facing; callers draw overlays separately
 * so icons and text never mirror.
 */
export function drawCat(ctx, x, y, look, o = {}) {
  const { state = 'idle', t = 0, facing = 1, squash = 0, mood = null, yawn = 0 } = o; // yawn 0..1: eyes shut, mouth wide
  const s = look.size || 1;
  const walk = state === 'walk', eat = state === 'eat', talk = state === 'talk';
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

  if (o.back) { // seated facing away from us (window bar)
    drawCatBack(ctx, look, { t, state, sad });
    ctx.restore();
    return;
  }

  // tail
  // walking: quick small wag; sitting/waiting: big slow sway with a little flick, whole tail bending
  const sway = walk ? Math.sin(t * 9) * 6 : Math.sin(t * 2.2) * 13 + Math.sin(t * 5.3) * 2;
  ctx.beginPath(); ctx.moveTo(-14, -16);
  ctx.quadraticCurveTo(-34 + sway * 0.4, -18, -30 + sway, -44 + Math.abs(sway) * 0.3);
  ctx.strokeStyle = ol; ctx.lineWidth = 9; ctx.stroke();
  ctx.strokeStyle = look.tail ?? look.fur; ctx.lineWidth = 5; ctx.stroke();

  // far legs, body, near legs
  leg(ctx, -10 - swing, look.dark, ol, look);
  leg(ctx, 7 + swing, look.dark, ol, look);
  ellipse(ctx, 0, -20, 19, 15); ctx.fillStyle = look.fur; ctx.fill();
  ctx.save(); ctx.clip(); bodyPattern(ctx, look); ctx.restore();
  ellipse(ctx, 0, -20, 19, 15); ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.stroke();
  if (look.accessory === 'chef' || look.accessory === 'waiter') { // apron
    rrect(ctx, -1, -31, 17, 22, 5); fillStroke(ctx, look.acc, '#e56b8c', 1.6);
    rrect(ctx, 3, -20, 9, 6, 2); fillStroke(ctx, '#ffd0de', null);
  }
  if (look.accessory === 'ghost') { // tactical vest with pouches
    rrect(ctx, -3, -32, 20, 24, 5); fillStroke(ctx, look.acc, '#1f211c', 1.6);
    for (const px of [0, 8]) { rrect(ctx, px, -22, 7, 7, 1.5); fillStroke(ctx, '#2c2f27', '#1f211c', 1); }
    rrect(ctx, -3, -31, 20, 3, 1); fillStroke(ctx, '#2c2f27', null);
  }
  leg(ctx, -5 + swing, look.fur, ol, look, true);
  leg(ctx, 11 - swing, look.fur, ol, look, true);

  // head
  const hx = 5, hy = -44 - yawn * 3 + (eat ? 3 + Math.abs(Math.sin(t * 14)) * 3 : talk ? Math.abs(Math.sin(t * 7)) * 2 : 0);
  const droop = sad ? 6 : 0;
  const ears = [
    [[hx - 15, hy - 6], [hx - 13 - droop, hy - 26 + droop * 1.5], [hx - 2, hy - 15]],
    [[hx + 5, hy - 15], [hx + 16 + droop, hy - 26 + droop * 1.5], [hx + 18, hy - 5]],
  ];
  for (const [i, [a, b, c]] of ears.entries()) {
    tri(ctx, a, b, c); fillStroke(ctx, i === 1 && look.ear ? look.ear : look.fur, ol, 2.2);
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
    if (yawn > 0.3) { // squeezed shut: > <
      const d = ex < hx ? 1 : -1;
      ctx.beginPath(); ctx.moveTo(ex - d * 3, ey - 2.5); ctx.lineTo(ex + d * 2, ey); ctx.lineTo(ex - d * 3, ey + 2.5); ctx.stroke();
    } else if (happy) { ctx.beginPath(); ctx.arc(ex, ey + 2, 3.4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); }
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
  if (yawn > 0.05) { // big yawn: open mouth, tongue, two tiny fangs
    const my = hy + 10 + yawn, rx = 2.5 + yawn * 3.5, ry = 2 + yawn * 4.5;
    ellipse(ctx, hx + 4, my, rx, ry); fillStroke(ctx, '#7a2e45', null);
    ellipse(ctx, hx + 4, my + ry * 0.55, rx * 0.65, ry * 0.4); fillStroke(ctx, '#ff8fab', null);
    if (yawn > 0.5) { ctx.fillStyle = '#fff'; for (const fx of [hx + 4 - rx * 0.55, hx + 4 + rx * 0.55]) tri(ctx, [fx - 1.2, my - ry * 0.8], [fx + 1.2, my - ry * 0.8], [fx, my - ry * 0.8 + 2.4]), ctx.fill(); }
  } else if ((eat || talk) && Math.sin(t * (talk ? 18 : 14)) > 0) { ellipse(ctx, hx + 4, hy + 9.5, 2.6, 2.2); fillStroke(ctx, '#7a2e45', null); }
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

  accessory(ctx, look, hx, hy, blink);
  ctx.restore();
}

/** Seated cat seen from behind. Runs inside drawCat's transform (facing = side its head turns to). */
function drawCatBack(ctx, look, { t, state, sad }) {
  const ol = look.dark, eat = state === 'eat', talk = state === 'talk';
  const white = look.pattern === 'socks' || look.pattern === 'tuxedo';


  // sitting body with the pattern across its back, hind paws peeking out
  ellipse(ctx, 0, -18, 18, 17); ctx.fillStyle = look.fur; ctx.fill();
  ctx.save(); ctx.clip(); backPattern(ctx, look); ctx.restore();
  ellipse(ctx, 0, -18, 18, 17); ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.stroke();
  for (const px of [-10, 10]) { ellipse(ctx, px, -2, 6.5, 3.5); fillStroke(ctx, white ? '#fff' : look.fur, ol, 1.6); }

  // tail: from the bottom middle, swishing slowly side to side while waiting (in front: we're behind the cat)
  const swish = Math.sin(t * 2.2) * 15 + Math.sin(t * 5.3) * 2; // big slow swing + a little flick
  ctx.beginPath(); ctx.moveTo(0, -5);
  ctx.quadraticCurveTo(swish * 0.5, 9, swish * 1.25, -12 + Math.abs(swish) * 0.25);
  ctx.strokeStyle = ol; ctx.lineWidth = 9; ctx.stroke();
  ctx.strokeStyle = look.tail ?? look.fur; ctx.lineWidth = 5; ctx.stroke();

  // head: dips while eating, turns toward its friend while chatting
  const hx = talk ? 3 + Math.sin(t * 7) : 0;
  const hy = -44 + (eat ? 2 + Math.abs(Math.sin(t * 10)) * 3 : 0);
  const droop = sad ? 6 : 0;
  for (const [i, [a, b, c]] of [
    [[hx - 16, hy - 5], [hx - 12 - droop, hy - 25 + droop * 1.5], [hx - 2, hy - 14]],
    [[hx + 2, hy - 14], [hx + 12 + droop, hy - 25 + droop * 1.5], [hx + 16, hy - 5]],
  ].entries()) { tri(ctx, a, b, c); fillStroke(ctx, i === 1 && look.ear ? look.ear : look.fur, ol, 2.2); }
  ellipse(ctx, hx, hy, 18, 17); ctx.fillStyle = look.fur; ctx.fill();
  ctx.save(); ctx.clip(); backHeadPattern(ctx, look, hx, hy); ctx.restore();
  ellipse(ctx, hx, hy, 18, 17); ctx.strokeStyle = ol; ctx.lineWidth = 2.2; ctx.stroke();
  // whisker tips poking out either side of the head
  ctx.strokeStyle = 'rgba(90,61,74,0.45)'; ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hx - 17, hy + 6); ctx.lineTo(hx - 23, hy + 4);
  ctx.moveTo(hx + 17, hy + 6); ctx.lineTo(hx + 23, hy + 4);
  ctx.stroke();
  accessoryBack(ctx, look, hx, hy);
}

function backPattern(ctx, look) {
  ctx.fillStyle = look.dark; ctx.strokeStyle = look.dark; ctx.lineWidth = 3;
  switch (look.pattern) {
    case 'stripes':
      for (const y of [-29, -21, -13]) { ctx.beginPath(); ctx.moveTo(-14, y + 3); ctx.quadraticCurveTo(0, y - 3, 14, y + 3); ctx.stroke(); }
      break;
    case 'spots':
      for (const [x, y, r] of [[-7, -24, 4], [6, -16, 3.5], [-3, -10, 3]]) { circle(ctx, x, y, r); ctx.fill(); }
      break;
    case 'patch': circle(ctx, 8, -24, look.patchR ?? 11); ctx.fillStyle = look.patch; ctx.fill(); break;
  }
}

function backHeadPattern(ctx, look, hx, hy) {
  ctx.fillStyle = look.dark; ctx.strokeStyle = look.dark; ctx.lineWidth = 2.6;
  switch (look.pattern) {
    case 'stripes':
      for (const i of [-1, 0, 1]) { ctx.beginPath(); ctx.moveTo(hx + i * 5, hy - 16); ctx.lineTo(hx + i * 5, hy - 6); ctx.stroke(); }
      break;
    case 'spots': circle(ctx, hx + 6, hy - 6, 4); ctx.fill(); break;
    case 'patch': circle(ctx, hx + 8, hy - 4, 9); ctx.fillStyle = look.headPatch ?? look.patch; ctx.fill(); break;
  }
}

/** Accessories seen from behind: collars wrap round, glasses show only their arms. */
function accessoryBack(ctx, look, hx, hy) {
  const c = look.acc, ol = 'rgba(90,61,74,0.75)';
  switch (look.accessory) {
    case 'bell': rrect(ctx, -13, -31, 26, 5, 2.5); fillStroke(ctx, c, ol, 1.4); break;
    case 'scarf':
      rrect(ctx, -14, -33, 28, 7, 3.5); fillStroke(ctx, c, ol, 1.4);
      rrect(ctx, 3, -29, 7, 16, 3); fillStroke(ctx, c, ol, 1.4);
      break;
    case 'glasses':
      ctx.strokeStyle = '#3d3540'; ctx.lineWidth = 1.8; ctx.beginPath();
      ctx.moveTo(hx - 19, hy); ctx.lineTo(hx - 13, hy - 3);
      ctx.moveTo(hx + 19, hy); ctx.lineTo(hx + 13, hy - 3);
      ctx.stroke();
      break;
    default: accessory(ctx, look, hx, hy); // hats, bows and flowers look the same from behind
  }
}

/** A served dish on its plate; `left` 0..1 = food remaining (0 = empty plate with crumbs). */
export function drawDish(ctx, x, y, type, left, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  ellipse(ctx, x, y + 6, 15, 6); fillStroke(ctx, '#fff', '#f0d0dc', 1.5);
  if (left > 0) drawFoodIcon(ctx, type, x, y - 3, 0.55 + 0.35 * left);
  else {
    ctx.fillStyle = '#d9b49a';
    for (const [dx, dy] of [[-5, 5], [3, 7], [7, 4], [-1, 3]]) { circle(ctx, x + dx, y + dy, 1.4); ctx.fill(); }
  }
  ctx.restore();
}

/** Skull-print balaclava + headset (Ghost easter-egg cat). Drawn over the face. */
function ghostMask(ctx, hx, hy, blink = false) {
  // balaclava: dark hood around the face, pale skull print on the front
  ellipse(ctx, hx, hy, 18, 17); ctx.strokeStyle = '#262624'; ctx.lineWidth = 5; ctx.stroke();
  ellipse(ctx, hx + 4, hy + 2, 12.5, 13); fillStroke(ctx, '#d8d4ca', '#9d998f', 1.2);
  ctx.strokeStyle = 'rgba(60,58,54,0.35)'; ctx.lineWidth = 1; // worn fabric streaks
  for (const dx of [-4, 2, 9]) { ctx.beginPath(); ctx.moveTo(hx + dx, hy - 10); ctx.lineTo(hx + dx + 1, hy - 3); ctx.stroke(); }
  // eye sockets with eyes peering out
  for (const ex of [hx - 3, hx + 10]) {
    ellipse(ctx, ex, hy - 1, 5.2, 4.6); fillStroke(ctx, '#1b1b1a', null);
    if (blink) { // eyelids closed: a soft line inside the dark socket
      ctx.strokeStyle = '#8f8a80'; ctx.lineWidth = 1.4; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ex - 2.4, hy - 0.2); ctx.quadraticCurveTo(ex + 0.5, hy + 1.3, ex + 3.2, hy - 0.2); ctx.stroke();
      continue;
    }
    ellipse(ctx, ex + 0.5, hy - 0.5, 2.2, 1.8); fillStroke(ctx, '#e8e2d2', null);
    circle(ctx, ex + 0.8, hy - 0.4, 1.1); fillStroke(ctx, '#1b1b1a', null);
  }
  // nose cavity and teeth
  tri(ctx, [hx + 2, hy + 4], [hx + 6, hy + 4], [hx + 4, hy + 7.5]); fillStroke(ctx, '#1b1b1a', null);
  rrect(ctx, hx - 2, hy + 9, 13, 5, 1.5); fillStroke(ctx, '#f1eee6', '#3a3936', 1);
  ctx.strokeStyle = '#3a3936'; ctx.lineWidth = 0.9;
  for (let i = 1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(hx - 2 + i * 2.6, hy + 9); ctx.lineTo(hx - 2 + i * 2.6, hy + 14); ctx.stroke(); }
  // headset: band over the head, ear cup, mic boom to the mouth
  ctx.strokeStyle = '#1c1c1b'; ctx.lineWidth = 3.2; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.arc(hx, hy - 2, 18.5, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
  rrect(ctx, hx - 20, hy - 6, 7, 12, 3); fillStroke(ctx, '#2a2a28', '#121211', 1.2);
  ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(hx - 15, hy + 4); ctx.quadraticCurveTo(hx - 4, hy + 16, hx + 8, hy + 13); ctx.stroke();
  circle(ctx, hx + 9, hy + 13, 2.2); fillStroke(ctx, '#1c1c1b', null);
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
    case 'patch': circle(ctx, -9, -26, look.patchR ?? 11); ctx.fillStyle = look.patch; ctx.fill(); break;
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
    case 'patch': circle(ctx, hx - 8, hy - 6, 9); ctx.fillStyle = look.headPatch ?? look.patch; ctx.fill(); break;
    case 'tuxedo': ellipse(ctx, hx + 4, hy + 10, 12, 9); ctx.fillStyle = '#fff'; ctx.fill(); break;
  }
}

export function accessory(ctx, look, hx, hy, blink = false) {
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
    case 'ghost': ghostMask(ctx, hx, hy, blink); break;
    case 'crown': { // VIP customer
      ctx.beginPath();
      ctx.moveTo(hx - 10, hy - 18); ctx.lineTo(hx - 11, hy - 30); ctx.lineTo(hx - 5, hy - 24); ctx.lineTo(hx, hy - 33);
      ctx.lineTo(hx + 5, hy - 24); ctx.lineTo(hx + 11, hy - 30); ctx.lineTo(hx + 10, hy - 18); ctx.closePath();
      fillStroke(ctx, '#ffcf3a', '#c99a00', 1.4);
      circle(ctx, hx, hy - 23, 2.2); fillStroke(ctx, '#ff5d73', null);
      circle(ctx, hx - 6, hy - 21, 1.4); fillStroke(ctx, '#5aa9e6', null);
      circle(ctx, hx + 6, hy - 21, 1.4); fillStroke(ctx, '#5aa9e6', null);
      break;
    }
    case 'party': // striped cone + pompom
      tri(ctx, [hx - 9, hy - 16], [hx + 9, hy - 16], [hx + 1, hy - 40]); fillStroke(ctx, c, ol, 1.4);
      ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(hx - 6, hy - 22); ctx.lineTo(hx + 6, hy - 25); ctx.moveTo(hx - 3, hy - 30); ctx.lineTo(hx + 4, hy - 32); ctx.stroke();
      circle(ctx, hx + 1, hy - 41, 3.2); fillStroke(ctx, '#ffd34d', ol, 1);
      break;
    case 'beret':
      ellipse(ctx, hx + 2, hy - 16, 16, 6); fillStroke(ctx, c, ol, 1.4);
      rrect(ctx, hx + 1, hy - 25, 3, 5, 1.5); fillStroke(ctx, c, null);
      break;
    case 'waiter': { // bow tie, plus any wardrobe hat
      const bx = hx + 3, by = hy + 19;
      for (const d of [-1, 1]) { tri(ctx, [bx, by], [bx + d * 7.5, by - 4.5], [bx + d * 7.5, by + 4.5]); fillStroke(ctx, '#e8504f', ol, 1.2); }
      circle(ctx, bx, by, 2.2); fillStroke(ctx, '#c43d5c', ol, 1);
      if (look.hat === 'chef') accessory(ctx, { ...look, accessory: 'chef', hat: null }, hx, hy, blink);
      else if (look.hat && look.hat !== 'none') accessory(ctx, { ...look, accessory: look.hat, acc: look.hatColor ?? look.acc }, hx, hy, blink);
      break;
    }
    case 'chef':
      if (look.hat && look.hat !== 'chef') { // wardrobe hat instead of the chef hat
        accessory(ctx, { ...look, accessory: look.hat, acc: look.hatColor ?? look.acc }, hx, hy, blink);
        break;
      }
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
  } else if (type === 'catfood') {
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
  } else if (type === 'fish') {
    tri(ctx, [6, 0], [14, -8], [14, 8]); fillStroke(ctx, '#7cc4ff', '#3f8fd0', 2);
    ellipse(ctx, -2, 0, 11, 7); fillStroke(ctx, '#9fd3ff', '#3f8fd0', 2);
    ctx.beginPath(); ctx.arc(-4, 0, 4.5, -0.9, 0.9); ctx.strokeStyle = '#3f8fd0'; ctx.lineWidth = 1.5; ctx.stroke();
    circle(ctx, -8, -1.5, 1.7); fillStroke(ctx, '#2b2230', null);
  } else if (type === 'sushi') {
    rrect(ctx, -11, -2, 22, 12, 5); fillStroke(ctx, '#fff', '#d9cbd2', 2);
    rrect(ctx, -12, -9, 24, 10, 5); fillStroke(ctx, '#ff9f7a', '#e2735a', 2);
    ctx.strokeStyle = '#ffd3c2'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.moveTo(-6, -7); ctx.lineTo(-8, -2); ctx.moveTo(6, -7); ctx.lineTo(4, -2); ctx.stroke();
    rrect(ctx, -3, -9, 6, 19, 1.5); fillStroke(ctx, '#3d4a3d', null);
  } else if (type === 'cupcake') {
    ctx.beginPath(); ctx.moveTo(-8, 2); ctx.lineTo(8, 2); ctx.lineTo(6, 12); ctx.lineTo(-6, 12); ctx.closePath();
    fillStroke(ctx, '#ffc94d', '#e3a400', 2);
    for (const [cx, cy, r] of [[-5, -1, 5.5], [5, -1, 5.5], [0, -5, 6.5]]) { circle(ctx, cx, cy, r); fillStroke(ctx, '#ffb3c6', null); }
    circle(ctx, 0, -12, 3); fillStroke(ctx, '#ff5d73', null);
  }
  ctx.restore();
}

// ---------------------------------------------------------------- overlays
export const SHADOW = 'rgba(120,70,60,0.13)';

/** One food's spot at the counter: the plates the chef has put out (up to 3 drawn, then a ×N badge) and,
 *  while there is something to collect, a glow on the floor where the waiter stands. Locked foods show their level. */
export function drawPass(ctx, zone, type, ready, canTake, t, flash, lockedLevel = 0) {
  const { x, y } = zone, cy = y + 38; // counter top
  ctx.font = `400 12px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (lockedLevel) {
    rrect(ctx, x - 26, cy - 6, 52, 18, 9); fillStroke(ctx, 'rgba(255,255,255,0.6)', '#e2d8dc', 1.5);
    drawFoodIcon(ctx, type, x - 10, cy + 3, 0.55, 0.35);
    ctx.fillStyle = '#9a8590';
    if (canvasIcons.icon) { canvasIcons.icon(ctx, 'lock', x + 5, cy + 2, 12); ctx.fillText(lockedLevel, x + 16, cy + 3); }
    else ctx.fillText(`🔒${lockedLevel}`, x + 8, cy + 3);
    return;
  }
  if (ready && canTake) { // floor glow: stand here to collect
    ellipse(ctx, x, y + 4, 34, 12); fillStroke(ctx, '#d6f4e8', '#86d6b2', 2.5);
    const k = (t * 0.7) % 1;
    ctx.globalAlpha = 1 - k;
    ellipse(ctx, x, y + 4, 36 + k * 14, 13 + k * 5); ctx.strokeStyle = '#86d6b2'; ctx.lineWidth = 2; ctx.stroke();
    ctx.globalAlpha = 1;
  } else {
    ellipse(ctx, x, y + 4, 30, 10); ctx.setLineDash([5, 5]); ctx.strokeStyle = 'rgba(90,61,74,0.15)'; ctx.lineWidth = 2; ctx.stroke(); ctx.setLineDash([]);
  }
  rrect(ctx, x - 30, cy - 4, 60, 16, 8); fillStroke(ctx, 'rgba(255,255,255,0.5)', 'rgba(90,61,74,0.12)', 1); // place mat
  if (!ready) drawFoodIcon(ctx, type, x, cy + 3, 0.6, 0.3);
  const shown = Math.min(ready, 3);
  for (const dx of [[0], [-11, 11], [-17, 0, 17]][shown - 1] ?? []) drawDish(ctx, x + dx, cy - 6, type, 1);
  if (ready > 3) {
    rrect(ctx, x + 14, cy - 26, 26, 16, 8); fillStroke(ctx, '#ec5f89', '#fff', 1.5);
    ctx.fillStyle = '#fff'; ctx.fillText(`×${ready}`, x + 27, cy - 17.5);
  }
  if (flash > 0) {
    ctx.globalAlpha = flash / 0.4;
    ellipse(ctx, x, cy, 36, 14); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.globalAlpha = 1;
  }
}

/** Tiny badge above the player: only the foods actually carried. Never flipped. */
/** The waiter's silver tray. Empty: tucked under the arm, behind the body (draw before the cat).
 *  Carrying food: held up on one paw beside the head with a little plate of each food (draw after the cat). */
export function drawWaiterTray(ctx, x, y, facing, look, inv, t, walking, held, dirty = 0) {
  const items = Object.keys(inv.items).filter(k => inv.items[k] > 0);
  if (held !== (items.length > 0 || dirty > 0)) return;
  const s = look.size || 1, bob = walking ? -Math.abs(Math.sin(t * 11)) * 3 : Math.sin(t * 2.4) * 0.8;
  ctx.save();
  ctx.translate(x, y); ctx.scale(s, s);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  if (!held) { // tucked: seen edge-on behind the far side of the body
    ctx.save(); ctx.translate(-facing * 15, -30 + bob); ctx.rotate(facing * 0.25);
    ellipse(ctx, 0, 0, 4, 17); fillStroke(ctx, '#dfe3ea', '#9aa3b2', 1.6);
    ctx.restore(); ctx.restore();
    return;
  }
  const tx = facing * 30, ty = -66 + bob;
  ctx.strokeStyle = look.dark; ctx.lineWidth = 9;                       // arm up to the tray
  ctx.beginPath(); ctx.moveTo(facing * 13, -30 + bob); ctx.quadraticCurveTo(facing * 30, -38 + bob, tx, ty + 4); ctx.stroke();
  ctx.strokeStyle = look.fur; ctx.lineWidth = 6; ctx.stroke();
  ellipse(ctx, tx, ty + 3, 23, 6.5); fillStroke(ctx, '#c7ccd6', '#8e97a6', 1.6); // tray rim
  ellipse(ctx, tx, ty + 1.5, 20, 5); fillStroke(ctx, '#eef1f6', null);           // tray top
  ellipse(ctx, tx - 7, ty, 7, 1.6); ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.fill(); // shine
  const shown = [...items.slice(0, 3), ...(dirty ? ['dirty'] : [])].slice(0, 4), gap = shown.length > 1 ? 26 / (shown.length - 1) : 0;
  shown.forEach((k, i) => {
    const px = tx - (shown.length > 1 ? 13 : 0) + i * gap;
    if (k === 'dirty') { drawPlateStack(ctx, px, ty + 1, dirty); return; } // empty plates to take back
    ellipse(ctx, px, ty + 1, 8, 3); fillStroke(ctx, '#fff', '#f0d0dc', 1);
    drawFoodIcon(ctx, k, px, ty - 5, 0.5);
  });
  circle(ctx, tx, ty + 8, 4.5); fillStroke(ctx, look.light ?? look.fur, look.dark, 1.4); // paw under the tray
  ctx.restore();
}

export function drawCarryBadge(ctx, x, y, inv, dirty = 0) {
  const items = Object.keys(inv.items).filter(k => inv.items[k] > 0);
  if (dirty) items.push('dirty');
  if (!items.length) return;
  const w = items.length * 34 + 6, h = 24, top = y - 114;
  x = Math.min(Math.max(x, w / 2 + 4), WORLD.W - w / 2 - 4); // keep the badge on screen near walls
  rrect(ctx, x - w / 2, top, w, h, 12); fillStroke(ctx, 'rgba(255,255,255,0.95)', '#f6d3dd', 1.5);
  ctx.font = `400 12px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
  items.forEach((k, i) => {
    const ix = x - w / 2 + 13 + i * 34;
    if (k === 'dirty') drawPlateStack(ctx, ix, top + 15, 2); else drawFoodIcon(ctx, k, ix, top + 12, 0.55);
    ctx.fillStyle = INK; ctx.fillText(k === 'dirty' ? dirty : inv.items[k], ix + 9, top + 13);
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
  const two = npc.requests?.length > 1;          // weekend special: two dishes
  const R = two ? 25 : 19, ring = R + 2;
  if (urgent) { circle(ctx, 0, 0, ring + 6); ctx.fillStyle = 'rgba(255,93,115,0.18)'; ctx.fill(); }
  if (npc.vip) { // gold VIP halo with a twinkle
    circle(ctx, 0, 0, ring + 5); ctx.strokeStyle = '#e3b94f'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * 6);
    drawSparkle(ctx, ring + 3, -ring + 1, 5, '#ffd34d');
    ctx.globalAlpha = 1;
  }
  tri(ctx, [-5, R - 4], [5, R - 4], [0, R + 4]); ctx.fillStyle = '#fff'; ctx.fill();
  circle(ctx, 0, 0, R); fillStroke(ctx, '#fff', null);
  ctx.lineWidth = 3.5; ctx.lineCap = 'round';
  circle(ctx, 0, 0, ring); ctx.strokeStyle = 'rgba(90,61,74,0.12)'; ctx.stroke();
  const f = npc.frac;
  ctx.beginPath();
  ctx.arc(0, 0, ring, -Math.PI / 2, -Math.PI / 2 + f * TAU);
  ctx.strokeStyle = f > 0.6 ? '#5ccf8a' : f > 0.3 ? '#ffc94d' : '#ff5d73';
  ctx.stroke();
  if (two) {
    drawFoodIcon(ctx, npc.requests[0], -10, 1, 0.62);
    drawFoodIcon(ctx, npc.requests[1], 10, 1, 0.62);
    ctx.fillStyle = '#c43d5c'; ctx.font = `400 11px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('+', 0, 2);
  } else {
    drawFoodIcon(ctx, npc.request, 0, 1, 0.85);
  }
  ctx.restore();
}

const CHAT_KINDS = ['dots', 'heart', 'note', 'milk', 'catfood'];

/** Little speech bubble beside a chatting cat's head, on the side it faces. */
export function drawChatBubble(ctx, x, y, dir, n, t) {
  const kind = CHAT_KINDS[n % CHAT_KINDS.length];
  const bx = x + dir * 38, by = y - 68 + Math.sin(t * 4) * 1.5;
  tri(ctx, [bx - dir * 8, by + 4], [bx - dir * 20, by + 12], [bx - dir * 2, by + 9]);
  ctx.fillStyle = '#fff'; ctx.fill();
  rrect(ctx, bx - 16, by - 11, 32, 22, 11); fillStroke(ctx, '#fff', '#f1d4dc', 1.5);
  if (kind === 'dots') {
    for (let i = 0; i < 3; i++) {
      circle(ctx, bx - 7 + i * 7, by - Math.max(0, Math.sin(t * 8 - i)) * 2.5, 2.3);
      ctx.fillStyle = INK; ctx.fill();
    }
  } else if (kind === 'heart') drawHeart(ctx, bx, by + 1, 11);
  else if (kind === 'note') {
    if (canvasIcons.icon) canvasIcons.icon(ctx, 'note', bx, by, 20);
    else { ctx.font = `400 15px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#8a5cc7'; ctx.fillText('♪♫', bx, by + 1); }
  } else drawFoodIcon(ctx, kind, bx, by + 1, 0.5);
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

/** Numbered rings on the stops the cat will walk to, in order. */
export function drawTapQueue(ctx, stops) {
  if (stops.length < 2) return; // a single stop needs no numbers
  ctx.save();
  ctx.font = `400 13px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  stops.forEach((s, i) => {
    ellipse(ctx, s.x, s.y, 14, 6.5); ctx.strokeStyle = 'rgba(255,143,171,0.8)'; ctx.lineWidth = 2.5; ctx.stroke();
    circle(ctx, s.x, s.y - 14, 9); fillStroke(ctx, '#ff8fab', '#fff', 2);
    ctx.fillStyle = '#fff'; ctx.fillText(i + 1, s.x, s.y - 13.5);
  });
  ctx.restore();
}

/** Effects: layer 'under' = tap markers, 'over' = text and particles. */
export function drawFx(ctx, fx, layer) {
  for (const f of fx) {
    if (f.t < 0) continue; // delayed effect, not started yet
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
      ctx.font = `400 ${Math.max(1, f.size * pop)}px ${FONT}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const y = f.y - easeOutCubic(k) * 50;
      ctx.lineWidth = 5; ctx.strokeStyle = '#fff'; ctx.lineJoin = 'round';
      ctx.fillStyle = f.color;
      if (canvasIcons.text) canvasIcons.text(ctx, f.text, f.x, y, f.size * pop, true);
      else { ctx.strokeText(f.text, f.x, y); ctx.fillText(f.text, f.x, y); }
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

export const hexRgb = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));

/**
 * Desaturated copy of a cat look (for customers who gave up). Cheaper than ctx.filter,
 * which forces a slow path on phones: cache the result per cat.
 */
export function greyLook(look) {
  const grey = hex => {
    if (typeof hex !== 'string' || hex[0] !== '#') return hex;
    const [r, g, b] = hexRgb(hex), v = 0.3 * r + 0.59 * g + 0.11 * b;
    return '#' + [r, g, b].map(c => Math.round(v * 0.85 + c * 0.15).toString(16).padStart(2, '0')).join('');
  };
  const out = { ...look };
  for (const k of ['fur', 'light', 'dark', 'acc', 'eye', 'patch', 'headPatch', 'ear', 'tail']) out[k] = grey(look[k]);
  return out;
}

function drawSparkle(ctx, x, y, r, color) {
  ctx.beginPath();
  for (let i = 0; i < 8; i++) { const rr = i % 2 ? r * 0.35 : r, a = (i / 8) * TAU; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  ctx.closePath(); ctx.fillStyle = color; ctx.fill();
}

/** Red broken-heart badge over a customer who gave up. */
export function drawMissBadge(ctx, x, y, t) {
  const by = y + Math.sin(t * 5) * 2.5, s = 1 + Math.sin(t * 9) * 0.06;
  ctx.save(); ctx.translate(x, by); ctx.scale(s, s);
  circle(ctx, 0, 0, 19); ctx.fillStyle = 'rgba(255,93,115,0.22)'; ctx.fill();
  circle(ctx, 0, 0, 15); fillStroke(ctx, '#ff5d73', '#fff', 2.5);
  drawHeart(ctx, 0, 1, 15, '#fff');
  ctx.beginPath(); ctx.moveTo(0, -5); ctx.lineTo(-2.5, -1); ctx.lineTo(1.5, 2); ctx.lineTo(-1, 6);
  ctx.strokeStyle = '#ff5d73'; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  ctx.restore();
}

