// Entry point: wires managers together, owns the canvas, input, render loop,
// PWA install/offline hooks and the debug panel.

import {
  WORLD, LAYOUT, MAX_MISSED, FOODS, DIFFICULTY, DECOR_STAGES, levelProgress, foodUnlockLevel,
  foodsForLevel, tablesForLevel, decorStage, GHOST_LINES,
} from './config.js';
import { Storage } from './storage.js';
import { UpgradeManager } from './upgrades.js';
import { HighScoreManager, cleanName } from './highScores.js';
import { AudioManager, trackForLevel } from './audio.js';
import { UIManager } from './ui.js';
import { GameManager } from './gameManager.js';
import { EAT_TIME } from './npc.js';
import { CharacterManager } from './characters.js';
import { DailyBonus } from './daily.js';
import { FOOD, FOOD_LABEL } from './inventory.js';
import {
  drawCat, drawFoodIcon, drawCarryBadge, drawRequest, drawPad,
  drawHeart, drawFx, drawChatBubble, drawMissBadge, drawDish, greyLook, PLAYER_LOOKS, playerLook, FONT,
} from './art.js';
import { THEMES, makeScene, drawBackground, drawTable, drawWallLive, sceneTables, EGG_POT } from './scene.js';

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
// Debug tools (cheats like +500 coins) only exist when the page is opened with ?debug.
const debugAllowed = new URLSearchParams(location.search).has('debug');
const debug = { on: debugAllowed };
if (debugAllowed) document.querySelector('.toggle-debug').classList.remove('hidden');
const gm = new GameManager({ save, persist, upgrades, highScores, onEvent });

function onEvent(type, d) {
  switch (type) {
    case 'pickup': audio.play('pickup'); break;
    case 'arrive': audio.play('arrive'); break;
    case 'wrongFood': audio.play('wrong'); break;
    case 'feed':
      ghostQuip();
      audio.play('feed');
      setTimeout(() => audio.play('coin'), 120);
      ui.bump('hud-coins'); ui.bump('hud-score');
      if (d.tip) setTimeout(() => audio.play('tip'), 300); // ka-ching as the tip pops up
      break;
    case 'missed': audio.play('sad'); ui.bump('hud-paws'); ui.flashMiss(); break;
    case 'levelUp':
      audio.play('levelUp');
      if (!d.cafeGrew) { // playing a lower level: the new level is just unlocked for later
        ui.banner(`🏆 Level ${d.level} unlocked! Pick it next time you play`);
        break;
      }
      audio.setTrack(trackForLevel(d.level)); // new level, new tune
      {
        const before = scene, msgs = [];
        refreshScene();
        msgs.push(d.newFoods.length
          ? `🎉 Level ${d.level}! New on the menu: ${d.newFoods.map(f => FOOD_LABEL[f]).join(', ')}`
          : `🎉 Restaurant Level ${d.level}! Customers now pay ${d.reward}`);
        if (sceneTables(scene).length > sceneTables(before).length) msgs.push('🪑 A new table! More hungry katz can visit');
        if (scene.stage > before.stage) msgs.push(`✨ Café makeover! Your café is now ${DECOR_STAGES[scene.stage].name.toLowerCase()}`);
        ui.banners(msgs);
      }
      ui.bump('hud-level');
      break;
    case 'gameOver':
      audio.play('gameOver');
      ui.showHud(false);
      ui.showGameOver(d, save.playerName);
      ui.setUnlockNote(chars.unlocked().filter(id => !unlockedAtStart.includes(id)).map(id => playerLook(id).name));
      ui.show('gameover');
      break;
  }
}

// ---------------------------------------------------------------- UI handlers
const ui = new UIManager({
  click: () => audio.play('click'),
  play: () => {
    ui.renderLevels(save.level, describeLevel, Math.max(PREVIEW_LEVELS, save.level));
    ui.show('levels');
  },
  startLevel: btn => {
    const lvl = +btn.dataset.level;
    if (lvl > save.level) { audio.play('wrong'); ui.banner(`🔒 Reach level ${lvl} to start here`); return; }
    startGame(lvl);
  },
  closeLevels: () => ui.show('menu'),
  restart: () => startGame(lastRunLevel),
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
  setDifficulty: btn => { save.settings.difficulty = btn.dataset.value; persist(); syncToggles(); },
  setScene: btn => { save.settings.scene = btn.dataset.value; persist(); refreshScene(); syncToggles(); },
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
  toggleDebug: () => { if (!debugAllowed) return; debug.on = !debug.on; syncToggles(); },
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

let lastRunLevel = save.level;
const PREVIEW_LEVELS = 9; // picker previews locked levels up to here (all tables/foods unlocked by 9)
/** What a level's café looks like, for the level picker. */
function describeLevel(level) {
  return {
    foods: foodsForLevel(level).map(id => ({ id, icon: foodIcons[id], label: FOOD_LABEL[id] })),
    tables: tablesForLevel(level).length,
    style: DECOR_STAGES[decorStage(level)].name,
  };
}

function startGame(level = save.level) {
  audio.unlock();
  unlockedAtStart = chars.unlocked(); // to announce score unlocks at game over
  gm.startRun(level);
  lastRunLevel = gm.level;
  refreshScene();                      // café matches the chosen level
  audio.setTrack(trackForLevel(gm.level));
  audio.startMusic();
  ui.show(null);
  ui.showHud(true);
  ui.banner(chars.current() === 'ghost' ? `🎖️ ${ghostLine()}` : 'Feed the hungry katz! 🐾');
}

function goToMenu() {
  gm.quitRun();
  refreshScene(); // back to the best-level café behind the menu
  ui.showHud(false);
  ui.setMenuBest(highScores.best());
  ui.show('menu');
  maybeShowDaily();
}

// ---------------------------------------------------------------- high-score name entry
document.getElementById('go-name').addEventListener('submit', e => {
  e.preventDefault();
  const input = document.getElementById('go-name-input');
  const name = cleanName(input.value);
  if (!name) { ui.nameMessage('Type a name first', true); input.focus(); return; }
  highScores.setName(ui.goRank, name);
  save.playerName = name; // remembered for next time
  persist();
  input.value = name;
  input.blur(); // close the phone keyboard
  ui.renderScores(highScores.list(), ui.goRank);
  ui.nameMessage(`Saved! Well done, ${name} 🎉`);
  audio.play('pickup');
});
document.getElementById('go-name-input').addEventListener('input', () => ui.nameMessage(''));

// ---------------------------------------------------------------- scenery (theme + makeover stage)
let scene = makeScene(save.settings.scene, gm.level);
/** Re-read theme/level and redraw the static café (after level up or a scene change). */
function refreshScene() {
  scene = makeScene(save.settings.scene, gm.level);
  if (bg.width > 1) buildBackground();
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
  drawBackground(b, scene);
}

const toWorld = (cx, cy) => ({ x: (cx - view.ox) / view.scale, y: (cy - view.oy) / view.scale });

// ---------------------------------------------------------------- input (touch + mouse via pointer events)
let dragging = false;
canvas.addEventListener('pointerdown', e => {
  audio.unlock();
  dragging = true;
  const p = toWorld(e.clientX, e.clientY);
  if (gm.state === 'playing' && !gm.paused && inEggPot(p)) return eggTap();
  gm.tap(p.x, p.y);
});

// Ghost's catchphrases: a random line (never the same twice in a row)
let lastGhostLine = -1, lastQuipAt = -1e9;
function ghostLine() {
  let i;
  do i = Math.floor(Math.random() * GHOST_LINES.length); while (i === lastGhostLine && GHOST_LINES.length > 1);
  lastGhostLine = i;
  return GHOST_LINES[i];
}
/** Now and then, when Ghost serves a customer, he says a line above his head. */
function ghostQuip() {
  if (chars.current() !== 'ghost') return;
  const now = performance.now();
  if (now - lastQuipAt < 10000 || Math.random() > 0.4) return;
  lastQuipAt = now;
  const p = gm.player, x = Math.min(Math.max(p.x, 150), WORLD.W - 150); // keep long lines on screen
  gm.fx.push({ kind: 'text', x, y: p.y - 150, text: ghostLine(), color: '#3a3936', size: 17, t: -0.4, life: 2.6 });
}

const inEggPot = p => p.x >= EGG_POT.x && p.x <= EGG_POT.x + EGG_POT.w && p.y >= EGG_POT.y && p.y <= EGG_POT.y + EGG_POT.h;
let eggTaps = 0, eggLast = 0, preGhostCat = null;
function eggTap() {
  const now = performance.now();
  eggTaps = now - eggLast < 1500 ? eggTaps + 1 : 1; // taps must be quick
  eggLast = now;
  audio.play('click');
  if (eggTaps < 5) return;
  eggTaps = 0;
  if (chars.current() === 'ghost') { // tap again to change back
    chars.select(preGhostCat && preGhostCat !== 'ghost' ? preGhostCat : 'mango');
    ui.banner('😺 Back to the café, chef!');
    return;
  }
  preGhostCat = chars.current();
  const first = chars.unlockSecret('ghost');
  chars.select('ghost');
  audio.play('levelUp');
  gm.burst(gm.player.x, gm.player.y - 60, 'sparkle', 14, '#c9b48a');
  ui.banners(first ? ['🎖️ Secret cat unlocked: Ghost!', `🎖️ ${ghostLine()}`] : [`🎖️ ${ghostLine()}`]);
}
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
  ctx.fillStyle = scene.pal.counterFront; ctx.fillRect(0, 0, w, h);          // letterbox: kitchen counter
  ctx.fillStyle = scene.pal.wall; ctx.fillRect(0, 0, w, oy + 172 * scale); // letterbox: wall
  ctx.drawImage(bg, ox, oy, WORLD.W * scale, WORLD.H * scale);
  ctx.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * ox, dpr * oy);

  const { player: p, npcs, inventory: inv } = gm;
  drawWallLive(ctx, time, scene);

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

  const tables = sceneTables(scene).map(t => ({ table: t, y: t.y + 8 }));
  // Served dishes sit on the table/bar while the cat eats, then an empty plate fades out.
  const DISH_FADE = 1.5;
  const dishes = npcs
    .filter(n => n.state === 'eating' || (n.mood === 'happy' && n.leaveT < DISH_FADE))
    .map(n => ({ dish: n, y: n.spot.plate.z }));
  const actors = [...npcs, p, ...tables, ...dishes].sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.dish) {
      const n = a.dish, pl = n.spot.plate, eating = n.state === 'eating';
      drawDish(ctx, pl.x, pl.y, n.request, eating ? Math.min(1, n.eatT / EAT_TIME) : 0, eating ? 1 : 1 - n.leaveT / DISH_FADE);
    } else if (a.table) {
      drawTable(ctx, a.table, scene, time);
    } else if (a === p) {
      drawCat(ctx, p.x, p.y, playerLook(chars.current()), { state: p.state, t: time, facing: p.facing, squash: p.squash });
    } else {
      const shake = a.state === 'waiting' && a.frac < 0.3 ? Math.sin(time * 40) * 1.2 : 0;
      const anim = speaking.has(a) ? 'talk' : a.anim;
      // missed customers fade to grey (cached palette; ctx.filter is very slow on phones)
      const look = a.mood === 'sad' ? (a.greyLook ??= greyLook(a.look)) : a.look;
      drawCat(ctx, a.x + shake, a.y, look, { state: anim, t: time + a.phase, facing: a.facing, squash: a.squash, mood: a.mood, back: a.fromBehind });
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
    level: gm.level,
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

if (debugAllowed) window.hungryKatz = { gm, save, upgrades, highScores }; // console access for testing (?debug only)
