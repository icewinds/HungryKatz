// Entry point: wires managers together, owns the canvas, input, render loop,
// PWA install/offline hooks and the debug panel.

import { WORLD, LAYOUT, MAX_MISSED, FOODS, levelProgress, foodUnlockLevel } from './config.js';
import { Storage } from './storage.js';
import { UpgradeManager } from './upgrades.js';
import { HighScoreManager } from './highScores.js';
import { AudioManager, trackForLevel } from './audio.js';
import { UIManager } from './ui.js';
import { GameManager } from './gameManager.js';
import { CharacterManager } from './characters.js';
import { DailyBonus } from './daily.js';
import { FOOD, FOOD_LABEL } from './inventory.js';
import {
  drawBackground, drawCat, drawFoodIcon, drawCarryBadge, drawRequest, drawPad, drawTable,
  drawHeart, drawFx, drawChatBubble, drawWallLive, drawMissBadge, PLAYER_LOOKS, playerLook, FONT,
} from './art.js';

// ---------------------------------------------------------------- managers
const save = Storage.load();
const persist = () => Storage.save(save);
const upgrades = new UpgradeManager(save, persist);
const highScores = new HighScoreManager(save, persist);
const chars = new CharacterManager(save, highScores, persist);
const daily = new DailyBonus(save, persist);

/** Pop the daily bonus over the menu if today's reward hasn't been claimed. */
function maybeShowDaily() {
  const s = daily.status();
  if (s.available) ui.showDaily(s);
}
let unlockedAtStart = [];
const audio = new AudioManager(save.settings);
audio.setTrack(trackForLevel(save.level)); // music matches the restaurant level
const debug = { on: new URLSearchParams(location.search).has('debug') || save.settings.debug };
const gm = new GameManager({ save, persist, upgrades, highScores, onEvent });

function onEvent(type, d) {
  switch (type) {
    case 'pickup': audio.play('pickup'); break;
    case 'arrive': audio.play('arrive'); break;
    case 'wrongFood': audio.play('wrong'); break;
    case 'feed':
      audio.play('feed');
      setTimeout(() => audio.play('coin'), 120);
      ui.bump('hud-coins'); ui.bump('hud-score');
      if (d.tip) setTimeout(() => audio.play('tip'), 300); // ka-ching as the tip pops up
      break;
    case 'missed': audio.play('sad'); ui.bump('hud-paws'); ui.flashMiss(); break;
    case 'levelUp':
      audio.play('levelUp');
      audio.setTrack(trackForLevel(d.level)); // new level, new tune
      ui.banner(d.newFoods.length
        ? `🎉 Level ${d.level}! New on the menu: ${d.newFoods.map(f => FOOD_LABEL[f]).join(', ')}`
        : `🎉 Restaurant Level ${d.level}! Customers now pay ${d.reward}`);
      ui.bump('hud-level');
      break;
    case 'gameOver':
      audio.play('gameOver');
      ui.showHud(false);
      ui.showGameOver(d);
      ui.setUnlockNote(chars.unlocked().filter(id => !unlockedAtStart.includes(id)).map(id => playerLook(id).name));
      ui.show('gameover');
      break;
  }
}

// ---------------------------------------------------------------- UI handlers
const ui = new UIManager({
  click: () => audio.play('click'),
  play: startGame,
  restart: startGame,
  menu: goToMenu,
  quit: goToMenu,
  openCharacters: () => { ui.renderCharacters(PLAYER_LOOKS, chars, save.coins, drawCatPortrait); ui.show('characters'); },
  closeCharacters: () => ui.show('menu'),
  pickCat: btn => {
    const id = btn.dataset.id, rule = chars.rule(id);
    if (chars.isUnlocked(id)) {
      chars.select(id);
      ui.selectCharacter(id);
      audio.play('pickup');
    } else if (chars.buy(id)) {
      chars.select(id);
      audio.play('buy');
      ui.renderCharacters(PLAYER_LOOKS, chars, save.coins, drawCatPortrait);
      ui.charEffect(id, 'bought');
      ui.banner(`${playerLook(id).name} joined your café! 🎉`);
    } else {
      audio.play('wrong');
      ui.charEffect(id, 'poor');
      ui.banner(rule.coins ? `Need 🪙 ${rule.coins - save.coins} more coins` : `Reach a best score of ${rule.score} 🏆`);
    }
  },
  claimDaily: () => {
    const s = daily.status(), coins = daily.claim();
    if (coins) {
      audio.unlock();
      audio.play('tip'); // coins ka-ching; the fanfare is saved for level ups
      ui.banner(`🎁 Day ${s.day} bonus: +${coins} coins!`);
    }
    ui.show('menu');
  },
  openHelp: () => ui.show('help'),
  closeHelp: () => ui.show('menu'),
  openSettings: () => ui.show('settings'),
  closeSettings: () => ui.show('menu'),
  pause: () => { if (gm.state !== 'playing') return; gm.paused = true; ui.show('pause'); },
  resume: () => { gm.paused = false; ui.show(null); },
  openUpgrades: () => {
    if (gm.state !== 'playing') return;
    gm.paused = true; // stops timers, movement and spawning
    ui.renderUpgrades(upgrades, save.coins);
    ui.show('upgrades');
  },
  closeUpgrades: () => { gm.applyUpgrades(); gm.paused = false; ui.show(null); },
  buy: btn => {
    const id = btn.dataset.id;
    if (upgrades.buy(id)) {
      audio.play('buy');
      gm.applyUpgrades();
      ui.renderUpgrades(upgrades, save.coins);
      ui.cardEffect(id, 'bought');
    } else {
      audio.play('wrong');
      ui.cardEffect(id, 'poor');
    }
  },
  toggleMusic: () => {
    save.settings.music = !save.settings.music; persist();
    if (save.settings.music) { audio.unlock(); audio.startMusic(); } else audio.stopMusic();
    syncToggles();
  },
  toggleSfx: () => { save.settings.sfx = !save.settings.sfx; persist(); syncToggles(); },
  toggleDebug: () => { debug.on = !debug.on; save.settings.debug = debug.on; persist(); syncToggles(); },
  install: async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    ui.setInstall({ available: false, standalone: isStandalone() });
  },
  // debug tools
  dbgCoins: () => { save.coins += 500; persist(); },
  dbgMilkNpc: () => gm.spawnNpc({ request: FOOD.MILK }),
  dbgFoodNpc: () => gm.spawnNpc({ request: FOOD.CATFOOD }),
  dbgExpire: () => gm.npcs.forEach(n => { if (n.state === 'waiting') n.timeLeft = 0.01; }),
  dbgMaxCarry: () => { save.upgrades.carry = 5; persist(); gm.applyUpgrades(); },
  dbgMiss9: () => { if (gm.state === 'playing') gm.missed = MAX_MISSED - 1; },
  dbgReset: () => { if (confirm('Erase ALL HungryKatz progress?')) { Storage.reset(); location.reload(); } },
});

function syncToggles() {
  ui.syncToggles(save.settings, debug.on);
  document.getElementById('debug-panel').hidden = !debug.on;
}

function startGame() {
  audio.unlock();
  audio.startMusic();
  unlockedAtStart = chars.unlocked(); // to announce score unlocks at game over
  gm.startRun();
  ui.show(null);
  ui.showHud(true);
  ui.banner('Feed the hungry katz! 🐾');
}

function goToMenu() {
  gm.quitRun();
  ui.showHud(false);
  ui.setMenuBest(highScores.best());
  ui.show('menu');
  maybeShowDaily();
}

// ---------------------------------------------------------------- canvas + scaling
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const bg = document.createElement('canvas');
const view = { w: 0, h: 0, dpr: 1, scale: 1, ox: 0, oy: 0 };

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = window.innerWidth, h = window.innerHeight;
  Object.assign(view, { w, h, dpr });
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  // "contain": whole world visible, proportions preserved
  view.scale = Math.min(w / WORLD.W, h / WORLD.H);
  view.ox = (w - WORLD.W * view.scale) / 2;
  view.oy = (h - WORLD.H * view.scale) / 2;
  buildBackground();
}

function buildBackground() {
  const k = view.scale * view.dpr;
  bg.width = Math.max(1, Math.ceil(WORLD.W * k)); // 0-size canvas makes drawImage throw
  bg.height = Math.max(1, Math.ceil(WORLD.H * k));
  const b = bg.getContext('2d');
  b.setTransform(k, 0, 0, k, 0, 0);
  drawBackground(b);
}

const toWorld = (cx, cy) => ({ x: (cx - view.ox) / view.scale, y: (cy - view.oy) / view.scale });

// ---------------------------------------------------------------- input (touch + mouse via pointer events)
let dragging = false;
canvas.addEventListener('pointerdown', e => {
  audio.unlock();
  dragging = true;
  const p = toWorld(e.clientX, e.clientY);
  gm.tap(p.x, p.y);
});
canvas.addEventListener('pointermove', e => {
  if (!dragging || e.buttons === 0) return;
  const p = toWorld(e.clientX, e.clientY);
  gm.tap(p.x, p.y, false); // hold-and-drag steers the cat
});
for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) canvas.addEventListener(ev, () => { dragging = false; });
document.addEventListener('pointerdown', () => { audio.unlock(); audio.startMusic(); }, { once: true });

// ---------------------------------------------------------------- render
function render(time) {
  const { dpr, scale, ox, oy, w, h } = view;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#efd5bb'; ctx.fillRect(0, 0, w, h);                // letterbox: kitchen counter
  ctx.fillStyle = '#fde7ed'; ctx.fillRect(0, 0, w, oy + 172 * scale); // letterbox: wall
  ctx.drawImage(bg, ox, oy, WORLD.W * scale, WORLD.H * scale);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

  const { player: p, npcs, inventory: inv } = gm;
  drawWallLive(ctx, time);

  const menu = gm.foods;
  for (const s of gm.stations) {
    const locked = menu.includes(s.type) ? 0 : foodUnlockLevel(s.type);
    drawPad(ctx, s.zone, s.type, !inv.isFull(s.type), time, s.flash, locked);
  }
  drawFx(ctx, gm.fx, 'under');

  // depth-sorted cats + tables (a table sorts by its front edge)
  // Seated neighbours chat: whoever's turn it is talks, the other listens.
  const seated = new Map(npcs.filter(n => n.state === 'waiting' || n.state === 'eating').map(n => [n.spot, n]));
  const speaking = new Set();
  for (const n of npcs) {
    const mate = n.state === 'waiting' && seated.get(n.spot.partner);
    if (!mate) continue;
    const turn = Math.floor(time / 1.8 + Math.min(n.id, mate.id) * 0.37) % 2;
    if ((n.id < mate.id) === (turn === 0) || mate.state !== 'waiting') speaking.add(n);
  }

  const tables = LAYOUT.tables.map(t => ({ table: t, y: t.y + 8 }));
  const actors = [...npcs, p, ...tables].sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.table) {
      drawTable(ctx, a.table);
    } else if (a === p) {
      drawCat(ctx, p.x, p.y, playerLook(chars.current()), { state: p.state, t: time, facing: p.facing, squash: p.squash });
    } else {
      const shake = a.state === 'waiting' && a.frac < 0.3 ? Math.sin(time * 40) * 1.2 : 0;
      const anim = speaking.has(a) ? 'talk' : a.anim;
      if (a.mood === 'sad') ctx.filter = 'grayscale(0.85) brightness(0.92)'; // missed customers fade to grey
      drawCat(ctx, a.x + shake, a.y, a.look, { state: anim, t: time + a.phase, facing: a.facing, squash: a.squash, mood: a.mood });
      ctx.filter = 'none';
      if (a.state === 'eating') drawFoodIcon(ctx, a.request, a.x + a.facing * 26, a.y - 18, 0.8);
    }
  }

  // overlays: drawn after all cats, never flipped
  for (const n of npcs) {
    const top = n.y - 96 * n.look.size;
    if (speaking.has(n)) drawChatBubble(ctx, n.x, n.y, n.facing, Math.floor(time / 1.8) + n.id, time);
    if (n.state === 'waiting') drawRequest(ctx, n, time);
    else if (n.mood === 'sad') drawMissBadge(ctx, n.x, top - 6, time);
    else if (n.mood === 'happy' || n.state === 'eating') drawHeart(ctx, n.x, top + Math.sin(time * 6) * 3, 16);
  }
  if (gm.state === 'playing') drawCarryBadge(ctx, p.x, p.y, inv);
  drawFx(ctx, gm.fx, 'over');

  if (debug.on) drawDebug();
}

function drawDebug() {
  ctx.lineWidth = 2;
  ctx.font = `600 11px ${FONT}`; ctx.textAlign = 'center';
  const free = new Set(gm.spawner.freeSpots(gm.npcs));
  for (const s of LAYOUT.spots) {
    ctx.strokeStyle = free.has(s) ? '#2a2' : '#d22';
    ctx.beginPath(); ctx.arc(s.x, s.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = ctx.strokeStyle; ctx.fillText(s.id, s.x, s.y + 22);
  }
  for (const z of Object.values(LAYOUT.pads)) {
    ctx.strokeStyle = '#06c'; ctx.beginPath(); ctx.arc(z.x, z.y, z.r, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.strokeStyle = '#c0c';
  for (const b of LAYOUT.blockers) ctx.strokeRect(b.x, b.y, b.w, b.h);
  ctx.fillStyle = '#000';
  for (const n of gm.npcs) ctx.fillText(`#${n.id} ${n.state} ${n.request} ${n.timeLeft.toFixed(1)}s`, n.x, n.y + 14);
  ctx.fillText(`(${gm.player.x | 0}, ${gm.player.y | 0})`, gm.player.x, gm.player.y + 14);
}

let debugT = 0;
function updateDebugPanel(now) {
  if (!debug.on || now - debugT < 200) return;
  debugT = now;
  const st = gm.spawner.stage(gm.runTime), inv = gm.inventory;
  document.getElementById('debug-text').textContent = [
    `state ${gm.state}${gm.paused ? ' (paused)' : ''}  run ${gm.runTime.toFixed(1)}s`,
    `player (${gm.player.x | 0}, ${gm.player.y | 0}) ${gm.player.state} speed ${gm.player.speed}`,
    `inventory milk ${inv.items.milk}/${inv.max}  catfood ${inv.items.catfood}/${inv.max}`,
    `stage ${gm.spawner.stageIndex}  maxNpcs ${st.maxNpcs}  active ${gm.spawner.activeCount(gm.npcs)}  next spawn ${Math.max(0, gm.spawner.timer).toFixed(1)}s`,
    `free spots: ${gm.spawner.freeSpots(gm.npcs).map(s => s.id).join(' ') || 'none'}`,
    `missed ${gm.missed}/${MAX_MISSED}  score ${gm.score}  coins ${save.coins}`,
    ...gm.npcs.map(n => `#${n.id} ${n.spot.id} ${n.state} wants ${n.request} ${n.timeLeft.toFixed(1)}/${n.patience}s`),
  ].join('\n');
}

// ---------------------------------------------------------------- menu mascot
const menuCanvas = document.getElementById('menu-cat');
const mctx = menuCanvas.getContext('2d');
function drawMenuCat(time) {
  if (ui.current !== 'menu') return;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
  mctx.setTransform(2.2, 0, 0, 2.2, menuCanvas.width / 2 - 8, menuCanvas.height - 12);
  drawCat(mctx, 0, 0, playerLook(chars.current()), { t: time, facing: 1, mood: Math.sin(time) > 0.6 ? 'happy' : null });
}

/** Static portrait for the character-select grid. */
function drawCatPortrait(canvas, look) {
  const c = canvas.getContext('2d');
  c.setTransform(1.7, 0, 0, 1.7, canvas.width / 2 - 8, canvas.height - 8);
  drawCat(c, 0, 0, look, { t: 1, facing: 1 });
}

// ---------------------------------------------------------------- loop
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); // clamp big gaps (tab switches)
  last = now;
  gm.update(dt);
  render(now / 1000);
  drawMenuCat(now / 1000);
  const inv = gm.inventory;
  ui.updateHud({
    coins: save.coins,
    level: save.level,
    score: gm.score,
    best: Math.max(highScores.best(), gm.score),
  });
  ui.updateTray(gm.foods, inv, foodIcons);
  ui.setMissed(gm.missed, MAX_MISSED);
  ui.setLevelProgress(levelProgress(save.totalEarned));
  updateDebugPanel(now);
  requestAnimationFrame(frame);
}

// ---------------------------------------------------------------- lifecycle
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    audio.suspend();
    if (gm.state === 'playing' && !gm.paused) { gm.paused = true; ui.show('pause'); }
  } else {
    audio.resume();
    if (ui.current === 'menu') maybeShowDaily(); // app left open overnight
  }
});

// ---------------------------------------------------------------- PWA
let installPrompt = null;
const isStandalone = () => matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
window.addEventListener('beforeinstallprompt', e => {
  e.preventDefault();
  installPrompt = e;
  ui.setInstall({ available: true, standalone: isStandalone() });
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  ui.setInstall({ available: false, standalone: true });
});
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('./service-worker.js').catch(err => console.warn('SW failed', err)));
}

// ---------------------------------------------------------------- boot
// Tray icons rendered with the same art as the canvas.
const foodIcons = Object.fromEntries(FOODS.map(({ id }) => {
  const c = Object.assign(document.createElement('canvas'), { width: 56, height: 56 });
  drawFoodIcon(c.getContext('2d'), id, 28, 30, 1.9);
  return [id, c.toDataURL()];
}));
window.addEventListener('resize', resize);
resize();
document.fonts?.ready.then(buildBackground); // redraw the sign once Fredoka loads
syncToggles();
ui.setInstall({ available: false, standalone: isStandalone() });
ui.setMenuBest(highScores.best());
ui.show('menu');
maybeShowDaily();
requestAnimationFrame(frame);

window.hungryKatz = { gm, save, upgrades, highScores }; // console access for testing
