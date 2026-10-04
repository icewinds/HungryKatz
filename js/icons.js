// Drawn icon set: every UI icon is painted in the café's own style (same ink outline,
// palette and food/pet/hat art as the game), replacing OS emoji, which look different
// on every phone and clash with the hand-drawn world.
//
// Icons are canvas draw functions in a 48x48 box centred on (0, 0). The DOM side swaps any
// known emoji in visible text for a small <canvas> (see watchIcons), so copy can keep
// writing "🪙 50" and it renders drawn. The canvas side draws them inline in floating text.

import { ellipse, circle, rrect, tri, fillStroke, drawFoodIcon, drawHeart, drawCat, accessory, INK } from './art.js';
import { drawPets } from './scene.js';

const OL = 'rgba(90,61,74,0.85)'; // shared ink outline
const LW = 2.4;
const TAU = Math.PI * 2;

function star(ctx, R, r, n = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i * Math.PI) / n, d = i % 2 ? r : R;
    ctx.lineTo(Math.cos(a) * d, Math.sin(a) * d);
  }
  ctx.closePath();
}
function sparkle(ctx, x, y, s, fill = '#ffd34d', stroke = '#e3a400') {
  ctx.beginPath();
  ctx.moveTo(x, y - s);
  ctx.quadraticCurveTo(x, y, x + s, y); ctx.quadraticCurveTo(x, y, x, y + s);
  ctx.quadraticCurveTo(x, y, x - s, y); ctx.quadraticCurveTo(x, y, x, y - s);
  fillStroke(ctx, fill, stroke, 1.4);
}
function arrow(ctx, x1, y1, x2, y2, color, lw = 3.6) {
  const a = Math.atan2(y2 - y1, x2 - x1), h = lw * 2;
  ctx.strokeStyle = color; ctx.lineWidth = lw; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
  ctx.moveTo(x2 - Math.cos(a - 0.6) * h, y2 - Math.sin(a - 0.6) * h); ctx.lineTo(x2, y2);
  ctx.lineTo(x2 - Math.cos(a + 0.6) * h, y2 - Math.sin(a + 0.6) * h);
  ctx.stroke();
}
function catFace(ctx, mood) {
  const fur = '#f4a259', dark = '#c0702c';
  for (const d of [-1, 1]) { // ears
    tri(ctx, [d * 15, -4], [d * 13, -21], [d * 3, -13]); fillStroke(ctx, fur, dark, LW);
    tri(ctx, [d * 12, -8], [d * 11.5, -16], [d * 6, -12]); ctx.fillStyle = '#ffb3c6'; ctx.fill();
  }
  ellipse(ctx, 0, 3, 17, 15); fillStroke(ctx, fur, dark, LW);
  ellipse(ctx, 0, 9, 8, 5.5); ctx.fillStyle = '#fff1dc'; ctx.fill(); // muzzle
  ctx.strokeStyle = INK; ctx.fillStyle = INK; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
  if (mood === 'happy') { // ^ ^ eyes
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 6.5, 1, 3.4, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }
  } else if (mood === 'smirk') { // determined: brows + narrowed eyes
    for (const d of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(d * 10, -5); ctx.lineTo(d * 3.5, -2.5); ctx.stroke();
      ellipse(ctx, d * 6.5, 1.5, 2.4, 1.7); ctx.fill();
    }
  } else {
    for (const d of [-1, 1]) { circle(ctx, d * 6.5, 0.5, 2.6); ctx.fill(); }
  }
  ctx.fillStyle = '#ff6b8a'; tri(ctx, [-2, 6], [2, 6], [0, 8.2]); ctx.fill(); // nose
  ctx.lineWidth = 1.6; ctx.beginPath();
  if (mood === 'smirk') { ctx.moveTo(-3, 11); ctx.quadraticCurveTo(2, 13, 5, 9.5); }
  else { ctx.arc(-2, 9, 2, 0, Math.PI); ctx.arc(2, 9, 2, 0, Math.PI); }
  ctx.stroke();
  if (mood === 'happy') { ctx.fillStyle = 'rgba(255,107,138,0.35)'; ellipse(ctx, -11, 7, 3, 2); ctx.fill(); ellipse(ctx, 11, 7, 3, 2); ctx.fill(); }
}
function apron(color) {
  return ctx => {
    ctx.strokeStyle = OL; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -14, 7, Math.PI, 0); ctx.stroke(); // neck strap
    rrect(ctx, -8, -15, 16, 13, 3); fillStroke(ctx, color, OL, LW);
    ctx.beginPath(); ctx.moveTo(-14, -4); ctx.lineTo(14, -4); ctx.lineTo(16, 17); ctx.quadraticCurveTo(0, 21, -16, 17); ctx.closePath();
    fillStroke(ctx, color, OL, LW);
    rrect(ctx, -6, 4, 12, 7, 2); fillStroke(ctx, 'rgba(255,255,255,0.55)', OL, 1.4); // pocket
    rrect(ctx, -18, -6, 36, 4, 2); fillStroke(ctx, '#fff7f9', OL, 1.4);          // waist tie
  };
}
// Wardrobe hats: reuse the exact hat drawn on the cat; [x, y, scale] puts each in the box.
const HAT_FIT = { party: [-1, 30, 1.2], crown: [0, 25, 1.55], chef: [-3, 32, 1.3], beret: [-2, 17, 1.5], hat: [-1, 29, 1.35], beanie: [-1, 20, 1.45] };
function hat(id, color) {
  return ctx => {
    const [x, y, s] = HAT_FIT[id];
    ctx.save(); ctx.scale(s, s);
    accessory(ctx, { accessory: id, acc: color }, x, y);
    ctx.restore();
  };
}
function pet(id, cx, cy, s) {
  return ctx => { ctx.save(); ctx.scale(s, s); ctx.translate(-cx, -cy); drawPets(ctx, [id], 0.4); ctx.restore(); };
}

export const ICONS = {
  coin(ctx) {
    circle(ctx, 0, 0, 17); fillStroke(ctx, '#ffc94d', '#e3a400', 3);
    circle(ctx, 0, 0, 11); ctx.strokeStyle = 'rgba(227,164,0,0.6)'; ctx.lineWidth = 1.8; ctx.stroke();
    ellipse(ctx, -6, -7, 4.5, 2.6); ctx.fillStyle = '#fff3c4'; ctx.fill();
  },
  paw(ctx) {
    ellipse(ctx, 0, 7, 11, 9); fillStroke(ctx, '#ff8fab', OL, LW);
    for (const [x, y, r] of [[-12, -4, 4.4], [-4.5, -12, 4.6], [4.5, -12, 4.6], [12, -4, 4.4]]) { circle(ctx, x, y, r); fillStroke(ctx, '#ff8fab', OL, LW); }
  },
  trophy(ctx) {
    ctx.strokeStyle = '#c99a00'; ctx.lineWidth = 3;
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.arc(d * 12, -8, 6, d > 0 ? -Math.PI / 2 : Math.PI / 2, d > 0 ? Math.PI / 2 : Math.PI * 1.5); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-13, -17); ctx.lineTo(13, -17); ctx.quadraticCurveTo(13, 4, 0, 6); ctx.quadraticCurveTo(-13, 4, -13, -17);
    fillStroke(ctx, '#ffcf3a', '#c99a00', LW);
    rrect(ctx, -3, 5, 6, 8, 1); fillStroke(ctx, '#ffcf3a', '#c99a00', 1.6);
    rrect(ctx, -11, 12, 22, 7, 2); fillStroke(ctx, '#c98b55', OL, LW);
    ctx.save(); ctx.translate(0, -7); ctx.scale(0.42, 0.42); star(ctx, 14, 6); ctx.fillStyle = '#fff3c4'; ctx.fill(); ctx.restore();
  },
  crown(ctx) {
    ctx.beginPath();
    ctx.moveTo(-16, 11); ctx.lineTo(-19, -11); ctx.lineTo(-8, -1); ctx.lineTo(0, -16); ctx.lineTo(8, -1); ctx.lineTo(19, -11); ctx.lineTo(16, 11); ctx.closePath();
    fillStroke(ctx, '#ffcf3a', '#c99a00', LW);
    for (const [x, y] of [[-19, -11], [0, -16], [19, -11]]) { circle(ctx, x, y, 2.8); fillStroke(ctx, '#ffcf3a', '#c99a00', 1.4); }
    circle(ctx, 0, 4, 3.4); fillStroke(ctx, '#ff5d73', null);
    circle(ctx, -9, 5, 2.2); fillStroke(ctx, '#5aa9e6', null);
    circle(ctx, 9, 5, 2.2); fillStroke(ctx, '#5aa9e6', null);
  },
  medal(ctx) { // Ghost's service medal
    tri(ctx, [-12, -21], [-2, -21], [4, -2]); fillStroke(ctx, '#5b6b4a', OL, 1.6);
    tri(ctx, [12, -21], [2, -21], [-4, -2]); fillStroke(ctx, '#c9b48a', OL, 1.6);
    circle(ctx, 0, 8, 12); fillStroke(ctx, '#ffcf3a', '#c99a00', LW);
    ctx.save(); ctx.translate(0, 8); star(ctx, 7.5, 3.2); fillStroke(ctx, '#fff3c4', '#c99a00', 1.2); ctx.restore();
  },
  party(ctx) {
    tri(ctx, [-18, 18], [-8, -7], [7, 8]); fillStroke(ctx, '#a07be0', OL, LW);
    ctx.strokeStyle = '#ffd34d'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-13, 6); ctx.lineTo(-5, 12); ctx.stroke();
    for (const [x, y, c, r] of [[5, -13, '#ffd34d', 0.4], [14, -5, '#6fcf9f', -0.3], [13, -18, '#ff8fab', 0.9], [-1, -19, '#5aa9e6', -0.6], [19, -14, '#ff5d73', 0.2]]) {
      ctx.save(); ctx.translate(x, y); ctx.rotate(r); rrect(ctx, -3, -1.6, 6, 3.2, 1); ctx.fillStyle = c; ctx.fill(); ctx.restore();
    }
    ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-2, -4); ctx.bezierCurveTo(4, -12, 6, 0, 12, -8); ctx.stroke();
  },
  catHappy: ctx => catFace(ctx, 'happy'),
  catCalm: ctx => catFace(ctx, 'calm'),
  catSmirk: ctx => catFace(ctx, 'smirk'),
  rosette(ctx) {
    for (const d of [-1, 1]) { ctx.beginPath(); ctx.moveTo(d * 3, 4); ctx.lineTo(d * 12, 21); ctx.lineTo(d * 6, 18); ctx.lineTo(d * 2, 22); ctx.lineTo(d * -3, 6); fillStroke(ctx, d < 0 ? '#ec5f89' : '#ff8fab', OL, 1.6); }
    ctx.beginPath();
    for (let i = 0; i <= 28; i++) { const a = (i / 28) * TAU, r = i % 2 ? 13 : 15.5; ctx.lineTo(Math.cos(a) * r, -4 + Math.sin(a) * r); }
    fillStroke(ctx, '#ff8fab', OL, LW);
    circle(ctx, 0, -4, 8.5); fillStroke(ctx, '#fff7f9', OL, 1.6);
    ctx.save(); ctx.translate(0, -4); star(ctx, 5.5, 2.4); ctx.fillStyle = '#ffc94d'; ctx.fill(); ctx.restore();
  },
  house(ctx) {
    rrect(ctx, -14, -3, 28, 20, 2); fillStroke(ctx, '#fff7f9', OL, LW);
    tri(ctx, [-19, 0], [0, -18], [19, 0]); fillStroke(ctx, '#ec5f89', OL, LW);
    rrect(ctx, -4, 5, 9, 12, 2); fillStroke(ctx, '#c98b55', OL, 1.6);
    rrect(ctx, 7, 2, 5, 5, 1); fillStroke(ctx, '#bfe3ff', OL, 1.2);
  },
  plate(ctx) {
    circle(ctx, 0, 0, 14); fillStroke(ctx, '#fff', OL, LW);
    circle(ctx, 0, 0, 8.5); ctx.strokeStyle = '#f0d0dc'; ctx.lineWidth = 2; ctx.stroke();
    ctx.strokeStyle = '#9a8590'; ctx.lineWidth = 2.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-20, -6); ctx.lineTo(-20, 16); for (const x of [-22.5, -20, -17.5]) { ctx.moveTo(x, -14); ctx.lineTo(x, -6); } ctx.stroke();
    rrect(ctx, 18, -14, 4.5, 30, 2.2); fillStroke(ctx, '#d9d0d4', '#9a8590', 1.4);
  },
  flower(ctx) {
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate((i / 5) * TAU); ellipse(ctx, 0, -10, 7, 10); fillStroke(ctx, '#ffb3c6', '#ec5f89', 1.6); ctx.restore();
    }
    circle(ctx, 0, 0, 5); fillStroke(ctx, '#ffd166', '#e3a400', 1.4);
  },
  fire(ctx) {
    const flame = () => {
      ctx.beginPath(); ctx.moveTo(0, 18);
      ctx.bezierCurveTo(-16, 18, -16, 0, -8, -8); ctx.bezierCurveTo(-8, -2, -4, 0, -2, -2);
      ctx.bezierCurveTo(-4, -12, 2, -18, 4, -21); ctx.bezierCurveTo(6, -10, 16, -6, 14, 6);
      ctx.bezierCurveTo(13, 14, 8, 18, 0, 18);
    };
    flame(); fillStroke(ctx, '#ff8a2a', '#d9550a', LW);
    ctx.save(); ctx.translate(0, 7); ctx.scale(0.5, 0.55); flame(); ctx.fillStyle = '#ffd34d'; ctx.fill(); ctx.restore();
  },
  gift(ctx) {
    rrect(ctx, -15, -3, 30, 20, 3); fillStroke(ctx, '#ff8fab', OL, LW);
    rrect(ctx, -17, -10, 34, 8, 3); fillStroke(ctx, '#ff6b8a', OL, LW);
    rrect(ctx, -3, -10, 6, 27, 1); fillStroke(ctx, '#ffd34d', null);
    for (const d of [-1, 1]) { ctx.save(); ctx.translate(d * 6, -14); ctx.rotate(d * 0.5); ellipse(ctx, 0, 0, 7, 4.5); fillStroke(ctx, '#ffd34d', OL, 1.6); ctx.restore(); }
  },
  note(ctx) {
    ctx.fillStyle = '#8a5cc7'; ctx.strokeStyle = '#8a5cc7';
    for (const [x, y] of [[-9, 13], [10, 9]]) { ctx.save(); ctx.translate(x, y); ctx.rotate(-0.35); ellipse(ctx, 0, 0, 6.5, 4.8); ctx.fill(); ctx.restore(); }
    ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-3.5, 12); ctx.lineTo(-3.5, -14); ctx.moveTo(15.5, 8); ctx.lineTo(15.5, -18); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(-3.5, -13); ctx.lineTo(15.5, -17); ctx.stroke();
  },
  speaker(ctx) {
    ctx.beginPath(); ctx.moveTo(-17, -6); ctx.lineTo(-9, -6); ctx.lineTo(1, -15); ctx.lineTo(1, 15); ctx.lineTo(-9, 6); ctx.lineTo(-17, 6); ctx.closePath();
    fillStroke(ctx, '#7fb3ff', OL, LW);
    ctx.strokeStyle = OL; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    for (const r of [7, 13]) { ctx.beginPath(); ctx.arc(4, 0, r, -0.8, 0.8); ctx.stroke(); }
  },
  bug(ctx) {
    circle(ctx, 0, -12, 7); ctx.fillStyle = INK; ctx.fill();
    circle(ctx, 0, 3, 15); fillStroke(ctx, '#ff5d73', OL, LW);
    ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(0, 18); ctx.stroke();
    ctx.fillStyle = INK; for (const [x, y] of [[-7, -2], [7, -2], [-8, 9], [8, 9]]) { circle(ctx, x, y, 2.8); ctx.fill(); }
  },
  star(ctx) {
    star(ctx, 19, 8.5); fillStroke(ctx, '#ffd34d', '#e3a400', LW);
    ellipse(ctx, -4, -6, 3, 1.8); ctx.fillStyle = '#fff3c4'; ctx.fill();
  },
  lock(ctx) {
    ctx.strokeStyle = '#9a8590'; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(0, -5, 8, Math.PI, 0); ctx.lineTo(8, 0); ctx.moveTo(-8, -5); ctx.lineTo(-8, 0); ctx.stroke();
    rrect(ctx, -12, -2, 24, 19, 4); fillStroke(ctx, '#ffc94d', '#c99a00', LW);
    circle(ctx, 0, 5, 2.8); ctx.fillStyle = INK; ctx.fill(); rrect(ctx, -1.2, 5, 2.4, 6, 1); ctx.fill();
  },
  play(ctx, fg) { // takes the button's text colour
    tri(ctx, [-10, -15], [-10, 15], [15, 0]); ctx.fillStyle = fg; ctx.strokeStyle = fg; ctx.lineWidth = 5; ctx.fill(); ctx.stroke();
  },
  share(ctx) {
    rrect(ctx, -15, -1, 30, 18, 4); fillStroke(ctx, '#6fcf9f', OL, LW);
    arrow(ctx, 0, 8, 0, -18, INK);
  },
  install(ctx) {
    rrect(ctx, -11, -19, 22, 38, 5); fillStroke(ctx, '#fff7f9', OL, LW);
    rrect(ctx, -7, -13, 14, 24, 2); fillStroke(ctx, '#d6f4e8', null);
    arrow(ctx, 0, -10, 0, 6, '#24865b', 3.2);
  },
  up(ctx) {
    circle(ctx, 0, 0, 17); fillStroke(ctx, '#6fcf9f', OL, LW);
    arrow(ctx, 0, 10, 0, -10, '#fff', 4);
  },
  help(ctx) {
    rrect(ctx, -18, -17, 36, 28, 11); fillStroke(ctx, '#7fb3ff', OL, LW);
    tri(ctx, [-8, 10], [-12, 19], [1, 10]); fillStroke(ctx, '#7fb3ff', null);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3.4; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -6, 5.5, Math.PI * 1.1, Math.PI * 0.45); ctx.lineTo(0, 2); ctx.stroke();
    circle(ctx, 0, 7, 2); ctx.fillStyle = '#fff'; ctx.fill();
  },
  gear(ctx) {
    for (let i = 0; i < 8; i++) { ctx.save(); ctx.rotate((i / 8) * TAU); rrect(ctx, -4, -19, 8, 9, 2); fillStroke(ctx, '#c9b7c0', OL, 1.8); ctx.restore(); }
    circle(ctx, 0, 0, 13); fillStroke(ctx, '#c9b7c0', OL, LW);
    circle(ctx, 0, 0, 5.5); fillStroke(ctx, '#fff', OL, 1.8);
  },
  tap(ctx) {
    ctx.strokeStyle = '#ff8fab'; ctx.lineWidth = 2.2; ctx.lineCap = 'round';
    for (const r of [15, 20]) { ctx.beginPath(); ctx.arc(0, 6, r, Math.PI * 1.2, Math.PI * 1.8); ctx.stroke(); }
    ctx.save(); ctx.translate(0, 8); ctx.scale(0.68, 0.68); ICONS.paw(ctx); ctx.restore();
  },
  milk: ctx => drawFoodIcon(ctx, 'milk', 0, 0, 1.6),
  sushi: ctx => drawFoodIcon(ctx, 'sushi', 0, 0, 1.6),
  cupcake: ctx => drawFoodIcon(ctx, 'cupcake', 0, 0, 1.6),
  sunhat(ctx) {
    ellipse(ctx, 0, 6, 21, 7); fillStroke(ctx, '#ffd98a', OL, LW);
    ctx.beginPath(); ctx.ellipse(0, 4, 11, 12, 0, Math.PI, 0); fillStroke(ctx, '#ffd98a', OL, LW);
    rrect(ctx, -11, -1, 22, 5, 2); fillStroke(ctx, '#ff8fab', null);
    circle(ctx, 9, -1, 3.6); fillStroke(ctx, '#fff', OL, 1.2);
  },
  broom(ctx) {
    ctx.strokeStyle = '#c98b55'; ctx.lineWidth = 4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-15, -19); ctx.lineTo(3, 3); ctx.stroke();
    ctx.save(); ctx.translate(7, 9); ctx.rotate(-0.7);
    ctx.beginPath(); ctx.moveTo(-6, -4); ctx.lineTo(6, -4); ctx.lineTo(11, 14); ctx.lineTo(-11, 14); ctx.closePath(); fillStroke(ctx, '#ffd34d', OL, LW);
    ctx.strokeStyle = '#e3a400'; ctx.lineWidth = 1.4; ctx.beginPath(); for (const x of [-4, 0, 4]) { ctx.moveTo(x, 0); ctx.lineTo(x * 1.6, 13); } ctx.stroke();
    ctx.restore();
    sparkle(ctx, -12, 10, 5);
  },
  gnome(ctx) {
    tri(ctx, [-12, -4], [12, -4], [3, -23]); fillStroke(ctx, '#e8504f', OL, LW);
    circle(ctx, 0, 2, 8); fillStroke(ctx, '#ffd7c2', '#e8b9a2', 1.6);
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.quadraticCurveTo(-8, 21, 0, 22); ctx.quadraticCurveTo(8, 21, 9, 2); ctx.quadraticCurveTo(0, 9, -9, 2);
    fillStroke(ctx, '#fff', '#ddd7cf', 1.6);
    circle(ctx, 0, 5, 3); ctx.fillStyle = '#ff9c8a'; ctx.fill();
    ctx.fillStyle = INK; circle(ctx, -3.5, 0, 1.4); ctx.fill(); circle(ctx, 3.5, 0, 1.4); ctx.fill();
  },
  goldfish: pet('goldfish', 98, 176, 1.35),
  puppy: pet('puppy', 487, 293, 0.95),
  parrot: pet('parrot', 453, 155, 1.15),
  chefhat: hat('chef'),
  beanie: hat('beanie', '#5aa9e6'),
  partyhat: hat('party', '#a07be0'),
  beret: hat('beret', '#e8504f'),
  tophat: hat('hat', '#ffc94d'),
  bolt(ctx) {
    ctx.beginPath(); ctx.moveTo(5, -21); ctx.lineTo(-12, 4); ctx.lineTo(-1, 4); ctx.lineTo(-6, 21); ctx.lineTo(13, -5); ctx.lineTo(2, -5); ctx.lineTo(7, -21); ctx.closePath();
    fillStroke(ctx, '#ffd34d', '#e3a400', LW);
  },
  timer(ctx) {
    rrect(ctx, -4, -21, 8, 6, 2); fillStroke(ctx, '#7fb3ff', OL, 1.6);
    circle(ctx, 0, 3, 16); fillStroke(ctx, '#fff', '#7fb3ff', 3.4);
    ctx.strokeStyle = INK; ctx.lineWidth = 2.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 3); ctx.lineTo(0, -6); ctx.moveTo(0, 3); ctx.lineTo(7, 6); ctx.stroke();
    circle(ctx, 0, 3, 2); ctx.fillStyle = INK; ctx.fill();
  },
  clover(ctx) {
    ctx.strokeStyle = '#3f9e6f'; ctx.lineWidth = 3; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(2, 4); ctx.quadraticCurveTo(6, 14, 14, 20); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      ctx.save(); ctx.rotate(i * Math.PI / 2 + Math.PI / 4); ctx.translate(0, -9);
      ctx.beginPath(); ctx.moveTo(0, 8); ctx.bezierCurveTo(-13, -1, -7, -12, 0, -5); ctx.bezierCurveTo(7, -12, 13, -1, 0, 8);
      fillStroke(ctx, '#6fcf9f', '#3f9e6f', 1.8); ctx.restore();
    }
  },
  table(ctx) {
    rrect(ctx, -2.5, -4, 5, 18, 2); fillStroke(ctx, '#a8703f', null);
    ellipse(ctx, 0, 15, 10, 3.5); fillStroke(ctx, '#a8703f', null);
    ellipse(ctx, 0, -7, 19, 8); fillStroke(ctx, '#c98b55', OL, LW);
    ellipse(ctx, 0, -8, 13, 4.5); ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1.6; ctx.stroke();
  },
  bag(ctx) {
    ellipse(ctx, 0, 7, 16, 13); fillStroke(ctx, '#ffc94d', '#c99a00', LW);
    ctx.beginPath(); ctx.moveTo(-7, -6); ctx.lineTo(-11, -17); ctx.quadraticCurveTo(0, -12, 11, -17); ctx.lineTo(7, -6); fillStroke(ctx, '#ffc94d', '#c99a00', LW);
    rrect(ctx, -8, -8, 16, 4, 2); fillStroke(ctx, '#c98b55', null);
    circle(ctx, 0, 8, 6); ctx.strokeStyle = '#c99a00'; ctx.lineWidth = 2; ctx.stroke();
  },
  heart(ctx) {
    drawHeart(ctx, 0, 2, 26, '#ff6b8a');
    ellipse(ctx, -7, -5, 3.5, 2.2); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill();
    sparkle(ctx, 14, -14, 5, '#fff', '#ffb3c6');
  },
  sparkles(ctx) { sparkle(ctx, -6, 4, 14); sparkle(ctx, 11, -10, 8); sparkle(ctx, 13, 12, 6); },
  link(ctx) {
    ctx.strokeStyle = '#5aa9e6'; ctx.lineWidth = 4.5;
    for (const d of [-1, 1]) { ctx.save(); ctx.translate(d * 6, -d * 6); ctx.rotate(-Math.PI / 4); rrect(ctx, -11, -6, 22, 12, 6); ctx.stroke(); ctx.restore(); }
  },
  clipboard(ctx) {
    rrect(ctx, -14, -16, 28, 36, 4); fillStroke(ctx, '#c98b55', OL, LW);
    rrect(ctx, -10, -10, 20, 26, 2); fillStroke(ctx, '#fff', null);
    rrect(ctx, -7, -20, 14, 8, 3); fillStroke(ctx, '#c9b7c0', OL, 1.8);
    ctx.strokeStyle = '#b7a4ad'; ctx.lineWidth = 2; ctx.beginPath();
    for (const y of [-3, 3, 9]) { ctx.moveTo(-6, y); ctx.lineTo(6, y); } ctx.stroke();
  },
  restore(ctx) {
    ctx.beginPath(); ctx.moveTo(-18, 2); ctx.lineTo(-12, 18); ctx.lineTo(12, 18); ctx.lineTo(18, 2); ctx.lineTo(8, 2); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.lineTo(-8, 2); ctx.closePath();
    fillStroke(ctx, '#7fb3ff', OL, LW);
    arrow(ctx, 0, -20, 0, 2, '#24865b', 3.6);
  },
  question(ctx) { // a locked sticker slot
    ctx.strokeStyle = '#b7a4ad'; ctx.lineWidth = 3.6; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.arc(0, -6, 7, Math.PI * 1.1, Math.PI * 0.45); ctx.lineTo(0, 4); ctx.stroke();
    circle(ctx, 0, 11, 2.4); ctx.fillStyle = '#b7a4ad'; ctx.fill();
  },
};
for (const [id, color] of [['apronPink', '#ff8fab'], ['apronMint', '#6fcf9f'], ['apronSky', '#7fb3ff'], ['apronSunny', '#ffc94d'], ['apronGrape', '#a07be0'], ['apronCherry', '#ff5d73']]) ICONS[id] = apron(color);

// Emoji (as written in copy) -> drawn icon. Variation selectors are ignored.
const EMOJI = {
  '🪙': 'coin', '🐾': 'paw', '🏆': 'trophy', '👑': 'crown', '🎖': 'medal', '🎉': 'party', '😺': 'catHappy', '🐱': 'catCalm', '😼': 'catSmirk',
  '🏅': 'rosette', '🏠': 'house', '🍽': 'plate', '🌸': 'flower', '🔥': 'fire', '🎁': 'gift', '🎵': 'note', '♪': 'note', '♫': 'note',
  '🔊': 'speaker', '🐞': 'bug', '⭐': 'star', '🔒': 'lock', '▶': 'play', '📤': 'share', '🥛': 'milk', '🍼': 'milk', '⬆': 'up',
  '🐶': 'puppy', '💰': 'bag', '💖': 'heart', '✨': 'sparkles', '🔗': 'link', '❓': 'help', '⚙': 'gear', '📲': 'install', '👆': 'tap',
  '🍣': 'sushi', '🧁': 'cupcake', '👒': 'sunhat', '🧹': 'broom', '🧙': 'gnome', '🐟': 'goldfish', '🦜': 'parrot', '🧑‍🍳': 'chefhat',
  '🧶': 'beanie', '🥳': 'partyhat', '🎨': 'beret', '🎩': 'tophat', '🩷': 'apronPink', '🟢': 'apronMint', '🔵': 'apronSky', '🟡': 'apronSunny',
  '🟣': 'apronGrape', '🔴': 'apronCherry', '⚡': 'bolt', '⏱': 'timer', '🍀': 'clover', '🪑': 'table', '❔': 'question', '📋': 'clipboard', '📥': 'restore',
};
const EMOJI_RE = /\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*/gu;
export const iconFor = emoji => EMOJI[emoji.replace(/️/g, '')];

/** Draw icon `id` centred at (x, y), `size` px across. */
export function drawIcon(ctx, id, x, y, size, fg = INK) {
  const draw = ICONS[id];
  if (!draw) return;
  ctx.save();
  ctx.translate(x, y); ctx.scale(size / 48, size / 48);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  draw(ctx, fg);
  ctx.restore();
}

/** Split text into [{text}|{icon}] runs. Unknown emoji stay as text. */
export function richRuns(text) {
  const runs = [];
  let last = 0;
  for (const m of text.matchAll(EMOJI_RE)) {
    const id = iconFor(m[0]);
    if (!id) continue;
    if (m.index > last) runs.push({ text: text.slice(last, m.index) });
    runs.push({ icon: id });
    last = m.index + m[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last) });
  return runs;
}

/** Canvas text with drawn icons in place of emoji (floating score text). Uses the current font, fill and stroke. */
export function fillRichText(ctx, text, x, y, size, stroke = false) {
  const runs = richRuns(text);
  if (runs.every(r => r.text !== undefined)) { if (stroke) ctx.strokeText(text, x, y); ctx.fillText(text, x, y); return; }
  const isz = size * 1.15, align = ctx.textAlign;
  const width = runs.reduce((w, r) => w + (r.icon ? isz : ctx.measureText(r.text).width), 0);
  let cx = align === 'center' ? x - width / 2 : align === 'right' ? x - width : x;
  ctx.textAlign = 'left';
  for (const r of runs) {
    if (r.icon) {
      drawIcon(ctx, r.icon, cx + isz / 2, y, isz * 0.92); cx += isz;
    } else {
      if (stroke) ctx.strokeText(r.text, cx, y);
      ctx.fillText(r.text, cx, y); cx += ctx.measureText(r.text).width;
    }
  }
  ctx.textAlign = align;
}

// ---------------------------------------------------------------- DOM
const RES = 96; // backing pixels; CSS sizes the canvas (1.25em by default)

/** A <canvas> showing a drawn icon (or any `draw(ctx)` in the 48 box). Decorative: hidden from screen readers. */
export function iconCanvas(idOrDraw, cls = 'ico', fg = INK) {
  const c = document.createElement('canvas');
  c.width = c.height = RES;
  c.className = cls;
  c.setAttribute('aria-hidden', 'true');
  const ctx = c.getContext('2d');
  ctx.translate(RES / 2, RES / 2); ctx.scale(RES / 48, RES / 48);
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  (typeof idOrDraw === 'function' ? idOrDraw : ICONS[idOrDraw])?.(ctx, fg);
  return c;
}

/** A small chef cat wearing an outfit look, for wardrobe tiles. */
export function outfitCanvas(look) {
  return iconCanvas(ctx => { ctx.translate(0, 21); ctx.scale(0.4, 0.4); drawCat(ctx, 0, 0, look, { t: 1, facing: 1 }); }, 'ico outfit-cat');
}

const BADGE_TINTS = ['#ffd3df', '#d6f4e8', '#dbe9ff', '#fff1c2', '#eadcff'];
/** Sticker-book badge: scalloped sticker with the drawn icon, or a dashed empty slot while locked. */
export function stickerBadge(emoji, index, earned) {
  return iconCanvas(ctx => {
    ctx.beginPath();
    for (let k = 0; k <= 40; k++) { const a = (k / 40) * TAU, r = k % 2 ? 21 : 23; ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
    if (!earned) {
      ctx.setLineDash([3.5, 3.5]); fillStroke(ctx, '#f6f1f3', '#cdbdc5', 2); ctx.setLineDash([]);
      ICONS.question(ctx);
      return;
    }
    fillStroke(ctx, BADGE_TINTS[index % BADGE_TINTS.length], OL, LW);
    circle(ctx, 0, 0, 16.5); fillStroke(ctx, '#fff', 'rgba(90,61,74,0.25)', 1.4);
    ctx.save(); ctx.scale(0.62, 0.62); ICONS[iconFor(emoji)]?.(ctx, INK); ctx.restore();
    ellipse(ctx, -9, -13, 5, 2.4); ctx.fillStyle = 'rgba(255,255,255,0.7)'; ctx.fill(); // sticker shine
  }, 'sticker-badge');
}

const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CANVAS', 'TITLE']);
function iconifyTextNode(node) {
  const text = node.nodeValue;
  if (!text) return;
  const runs = richRuns(text);
  if (runs.every(r => r.text !== undefined)) return;
  const fg = getComputedStyle(node.parentElement).color;
  const frag = document.createDocumentFragment();
  for (const r of runs) frag.append(r.icon ? iconCanvas(r.icon, 'ico', fg) : document.createTextNode(r.text));
  node.replaceWith(frag);
}
/** Replace known emoji under `root` with drawn icons. */
export function iconify(root) {
  if (root.nodeType === Node.TEXT_NODE) { if (root.parentElement && !SKIP.has(root.parentElement.tagName)) iconifyTextNode(root); return; }
  if (root.nodeType !== Node.ELEMENT_NODE || SKIP.has(root.tagName)) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: n => (SKIP.has(n.parentElement?.tagName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT),
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach(iconifyTextNode);
}
/** Iconify the page now and whenever text changes (banners, re-rendered screens, toggles). */
export function watchIcons(root = document.body) {
  iconify(root);
  new MutationObserver(muts => {
    for (const m of muts) {
      if (m.type === 'characterData') iconify(m.target);
      else m.addedNodes.forEach(n => iconify(n));
    }
  }).observe(root, { childList: true, characterData: true, subtree: true });
}
