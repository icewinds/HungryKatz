// Entry point: wires managers together, owns the canvas, input, render loop,
// PWA install/offline hooks and the debug panel.

import {
  WORLD, LAYOUT, MAX_MISSED, FOODS, DIFFICULTY, DECOR_STAGES, levelProgress, foodUnlockLevel,
  foodsForLevel, tablesForLevel, decorStage, GHOST_LINES, PETS, OUTFITS,
} from './config.js';
import { STICKERS, awardStickers, recordServe } from './achievements.js';
import { watchIcons, fillRichText, drawIcon } from './icons.js';
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
  drawHeart, drawFx, drawChatBubble, drawMissBadge, drawDish, greyLook, drawTapQueue, canvasIcons, PLAYER_LOOKS, playerLook, dressUp, FONT,
} from './art.js';
import { THEMES, makeScene, drawBackground, drawTable, drawWallLive, sceneTables, drawPets, drawDoor, seasonFor, EGG_POT, GNOME_SPOT, gnome } from './scene.js';

// Drawn icons everywhere: canvas text in the café, and emoji in any on-screen copy.
canvasIcons.text = fillRichText;
canvasIcons.icon = drawIcon;
watchIcons();

// ---------------------------------------------------------------- managers
const save = Storage.load();
const persist = () => Storage.save(save);
const upgrades = new UpgradeManager(save, persist);
const highScores = new HighScoreManager(save, persist);
const chars = new CharacterManager(save, highScores, persist);
const daily = new DailyBonus(save, persist);

/** Pop the daily bonus over the menu if today's reward hasn't been claimed. */
/** Award newly earned stickers with a banner + sound. Call after anything that could earn one. */
function checkStickers() {
  const fresh = awardStickers(save, highScores.best());
  if (!fresh.length) return;
  persist();
  setTimeout(() => audio.play('buy'), 350);
  ui.banners(fresh.map(st => `🏅 New sticker: ${st.icon} ${st.name}!`));
}
/** The player cat in their wardrobe outfit. */
const playerOutfit = () => dressUp(playerLook(chars.current()), save.outfit, OUTFITS);
/** Your cat trying on a hat (wardrobe previews). */
const hatLook = hat => dressUp(playerLook(chars.current() === 'ghost' ? 'mango' : chars.current()), { ...save.outfit, hat }, OUTFITS);

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
      recordServe(save.stats, d);
      checkStickers();
      ghostQuip();
      if (d.combo >= 3) setTimeout(() => audio.play('pickup'), 220); // extra jingle on a hot streak
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
      checkStickers();
      break;
    case 'gameOver':
      lastScore = d.score;
      audio.play('gameOver');
      ui.showHud(false);
      ui.showGameOver(d, save.playerName, save.settings.difficulty !== 'relaxed' && d.fed < 15);
      drawClosedCat();
      ui.setUnlockNote(chars.unlocked().filter(id => !unlockedAtStart.includes(id)).map(id => playerLook(id).name));
      ui.show('gameover');
      checkStickers();
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
  openCharacters: () => {
    ui.renderCharacters(PLAYER_LOOKS, chars, save.coins, drawCatPortrait);
    ui.renderOutfits(OUTFITS, save.outfit, save.ownedOutfits, save.coins, hatLook);
    showCharTab('cats');
    ui.show('characters');
  },
  charTab: btn => showCharTab(btn.dataset.tab),
  askQuit: () => { document.getElementById('quit-confirm').classList.remove('hidden'); document.querySelector('#quit-confirm [data-action="quit"]').focus(); },
  cancelQuit: () => document.getElementById('quit-confirm').classList.add('hidden'),
  playRelaxed: () => { save.settings.difficulty = 'relaxed'; persist(); syncToggles(); startGame(lastRunLevel); },
  openStickers: () => { checkStickers(); ui.renderStickers(STICKERS, save.stickers); ui.show('stickers'); },
  closeStickers: () => ui.show('menu'),
  pickOutfit: btn => {
    const kind = btn.dataset.kind, item = OUTFITS[kind]?.find(o => o.id === btn.dataset.id);
    if (!item) return;
    const owned = item.cost === 0 || save.ownedOutfits.includes(item.id);
    if (!owned) {
      if (save.coins < item.cost) { audio.play('wrong'); ui.banner(`Need 🪙 ${item.cost - save.coins} more coins`); return; }
      save.coins -= item.cost;
      save.ownedOutfits.push(item.id);
      audio.play('buy');
      ui.banner(`${item.icon} ${item.name} added to your wardrobe!`);
    } else audio.play('pickup');
    save.outfit[kind === 'hats' ? 'hat' : 'apron'] = item.id;
    persist();
    ui.renderOutfits(OUTFITS, save.outfit, save.ownedOutfits, save.coins, hatLook);
    ui.renderCharacters(PLAYER_LOOKS, chars, save.coins, drawCatPortrait); // coin counts update
  },
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
    checkStickers();
  },
  share: () => shareGame('Come run the cutest cat café with me! 🐱'),
  shareScore: () => shareGame(`I scored ${lastScore} in HungryKatz! 🐾 Can you beat me?`),
  openHelp: () => ui.show('help'),
  closeHelp: () => ui.show('menu'),
  setDifficulty: btn => { save.settings.difficulty = btn.dataset.value; persist(); syncToggles(); },
  setScene: btn => { save.settings.scene = btn.dataset.value; persist(); refreshScene(); syncToggles(); },
  openSettings: () => ui.show('settings'),
  closeSettings: () => ui.show('menu'),
  pause: () => {
    if (gm.state !== 'playing') return;
    gm.paused = true;
    document.getElementById('quit-confirm').classList.add('hidden');
    ui.show('pause');
  },
  resume: () => { gm.paused = false; ui.show(null); },
  openUpgrades: () => {
    if (gm.state !== 'playing') return;
    gm.paused = true; // stops timers, movement and spawning
    ui.renderUpgrades(upgrades, save.coins, save.pets, save.petsAway);
    ui.show('upgrades');
  },
  closeUpgrades: () => { gm.applyUpgrades(); gm.paused = false; ui.show(null); },
  buy: btn => {
    const id = btn.dataset.id;
    if (upgrades.buy(id)) {
      audio.play('buy');
      gm.applyUpgrades();
      ui.renderUpgrades(upgrades, save.coins, save.pets, save.petsAway);
      ui.cardEffect(id, 'bought');
    } else {
      audio.play('wrong');
      ui.cardEffect(id, 'poor');
    }
  },
  buyPet: btn => {
    const id = btn.dataset.id, pet = PETS[id];
    if (!pet || save.pets.includes(id)) return;
    if (save.coins < pet.cost) {
      audio.play('wrong'); ui.cardEffect(id, 'poor');
      ui.banner(`Need 🪙 ${pet.cost - save.coins} more coins`);
      return;
    }
    save.coins -= pet.cost;
    save.pets.push(id);
    persist();
    audio.play('buy');
    ui.renderUpgrades(upgrades, save.coins, save.pets, save.petsAway);
    ui.cardEffect(id, 'bought');
    ui.banner(`${pet.icon} ${pet.name} moved into your café!`);
    checkStickers();
  },
  togglePet: btn => { // owned pets can go home (no bonus) and come back for free
    const id = btn.dataset.id, pet = PETS[id];
    if (!pet) return;
    if (save.pets.includes(id)) {
      save.pets = save.pets.filter(p => p !== id);
      save.petsAway.push(id);
      audio.play('click');
      ui.banner(`${pet.icon} ${pet.name} went home for a nap`);
    } else if (save.petsAway.includes(id)) {
      save.petsAway = save.petsAway.filter(p => p !== id);
      save.pets.push(id);
      audio.play('pickup');
      ui.banner(`${pet.icon} ${pet.name} is back in your café!`);
    } else return;
    persist();
    ui.renderUpgrades(upgrades, save.coins, save.pets, save.petsAway);
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

/** Choose cat: switch between the Cats and Wardrobe tabs. */
function showCharTab(tab) {
  for (const t of ['cats', 'wardrobe']) {
    document.getElementById(`tab-${t}`).hidden = t !== tab;
    document.getElementById(`tab-btn-${t}`).setAttribute('aria-selected', t === tab);
  }
}

/** Game over art: your chef cat by a "See you soon!" sign. */
function drawClosedCat() {
  const c = document.getElementById('go-cat'), x = c.getContext('2d');
  x.setTransform(2, 0, 0, 2, 0, 0); // 360x240 backing for a 180x120 box
  x.clearRect(0, 0, 180, 120);
  drawCat(x, 64, 112, playerOutfit(), { t: 1, facing: 1, mood: 'happy' });
  x.strokeStyle = '#a8703f'; x.lineWidth = 2;
  x.beginPath(); x.moveTo(118, 22); x.lineTo(131, 8); x.lineTo(144, 22); x.stroke();          // string
  x.fillStyle = '#c98b55'; x.strokeStyle = '#8a5a3c';
  x.beginPath(); x.roundRect(100, 22, 62, 34, 6); x.fill(); x.stroke();                       // board
  x.fillStyle = '#fff7e8'; x.font = `400 11px ${FONT}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText('See you', 131, 33); x.fillText('soon!', 131, 46);
}

let lastRunLevel = save.level;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
let lastScore = 0;

// ---------------------------------------------------------------- sharing
const GAME_URL = 'https://hungrykatz.solutioncloud.tech/';
/** Phone share sheet when available; otherwise copy the link. */
async function shareGame(text) {
  try {
    if (navigator.share) { await navigator.share({ title: 'HungryKatz', text, url: GAME_URL }); return; }
    await navigator.clipboard.writeText(`${text} ${GAME_URL}`);
    ui.banner('🔗 Link copied! Paste it to a friend');
  } catch (e) {
    if (e?.name !== 'AbortError') ui.banner(`🔗 ${GAME_URL}`); // share/copy unavailable: show the link
  }
}
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
  const startMsg = chars.current() === 'ghost' ? `🎖️ ${ghostLine()}` : 'Feed the hungry katz! 🐾';
  const msgs = [startMsg];
  if (gm.difficulty.relaxed) msgs.push('🌸 Relaxed mode: take your time, nobody leaves sad');
  if (gm.specialDay && gm.foods.length >= 2) msgs.push('🍽️ Weekend specials! Some cats order two dishes for extra coins');
  ui.banners(msgs);
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
// Seasonal decorations by date; preview with ?season=winter|halloween|valentine|none
const seasonParam = new URLSearchParams(location.search).get('season');
const season = seasonParam ? (seasonParam === 'none' ? null : seasonParam) : seasonFor();
let scene = makeScene(save.settings.scene, gm.level, season);
/** Re-read theme/level and redraw the static café (after level up or a scene change). */
function refreshScene() {
  scene = makeScene(save.settings.scene, gm.level, season);
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
let dragging = false, downAt = null;
canvas.addEventListener('pointerdown', e => {
  audio.unlock();
  dragging = true;
  downAt = { x: e.clientX, y: e.clientY };
  const p = toWorld(e.clientX, e.clientY);
  if (gm.state === 'playing' && !gm.paused && inEggPot(p)) return eggTap();
  if (gm.state === 'playing' && !gm.paused && scene.theme === 'seaside' && inRect(p, GNOME_SPOT)) return gnomeScream();
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

const inRect = (p, r) => p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h;
/** Seaside Diner gnome: one tap = one scream (with a short cooldown so it can't be spammed into noise). */
function gnomeScream() {
  const t = performance.now() / 1000;
  if (t - gnome.screamAt < 0.6) return;
  gnome.screamAt = t;
  audio.unlock();
  audio.play('gnome');
  if (!save.stats.gnome) { save.stats.gnome = true; persist(); checkStickers(); }
  gm.fx.push({ kind: 'text', x: gnome.x - 40, y: gnome.y + 30, text: 'HOOO!', color: '#e8504f', size: 24, t: 0, life: 1 });
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
  checkStickers();
}
document.addEventListener('keydown', e => {
  if (e.target.closest?.('input, textarea')) return;
  const open = document.querySelector('.screen.active');
  if (e.key === 'Escape') {
    if (!open) { if (gm.state === 'playing') ui.handlers.pause(); return; }
    open.querySelector('[data-action="resume"], [data-action="closeUpgrades"], .close-x')?.click();
  } else if ((e.key === ' ' || e.key === 'p') && !open && gm.state === 'playing') {
    e.preventDefault();
    ui.handlers.pause();
  }
});
canvas.addEventListener('pointermove', e => {
  if (!dragging || e.buttons === 0) return;
  if (downAt && Math.hypot(e.clientX - downAt.x, e.clientY - downAt.y) < 20) return; // finger wobble is still a tap
  downAt = null;
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
  ctx.save();
  ctx.beginPath(); ctx.rect(0, -200, WORLD.W, WORLD.H + 400); ctx.clip(); // cats outside the walls stay hidden until they reach the door
  drawWallLive(ctx, time, scene);
  const door = doorOpenness(npcs);
  if (door > 0.08 && lastDoor <= 0.08) audio.play('bell'); // ding-ding as the door starts to open
  lastDoor = door;
  drawDoor(ctx, scene, door);
  drawPets(ctx, save.pets, time);

  const menu = gm.foods;
  for (const s of gm.stations) {
    const locked = menu.includes(s.type) ? 0 : foodUnlockLevel(s.type);
    drawPad(ctx, s.zone, s.type, !inv.isFull(s.type), time, s.flash, locked);
  }
  drawFx(ctx, gm.fx, 'under');
  if (gm.target) drawTapQueue(ctx, [gm.target, ...gm.queue]);

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
      drawCat(ctx, p.x, p.y, playerOutfit(), { state: p.state, t: time, facing: p.facing, squash: p.squash });
    } else {
      const shake = a.state === 'waiting' && a.frac < 0.3 && !reduceMotion.matches ? Math.sin(time * 40) * 1.2 : 0;
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
  drawFirstGameHint(time);

  ctx.restore();
  if (debug.on) drawDebug();
}

let lastDoor = 0;
/** How far the front door is open: wide while a cat is walking through it, eased shut as they pass. */
function doorOpenness(npcs) {
  let open = 0;
  for (const n of npcs) {
    if (n.state !== 'entering' && n.state !== 'leaving') continue;
    const d = Math.hypot(n.x - LAYOUT.door.x, n.y - LAYOUT.door.y);
    open = Math.max(open, 1 - Math.min(1, Math.max(0, (d - 35) / 70)));
  }
  return open * open * (3 - 2 * open); // smoothstep
}

/** First game only: point at the milk pad, then at a hungry cat, until the first serve. */
function drawFirstGameHint(time) {
  if (save.stats.served > 0 || gm.state !== 'playing') return;
  const hasMilk = gm.inventory.count('milk') > 0;
  const cat = hasMilk && gm.npcs.find(n => n.state === 'waiting');
  const pad = LAYOUT.pads.milk;
  if (hasMilk && !cat) return;
  const [x, y, label] = hasMilk ? [cat.x, cat.y - 150, 'Bring it here!'] : [pad.x, pad.y - 58, 'Grab milk!'];
  const by = y - (reduceMotion.matches ? 0 : Math.abs(Math.sin(time * 4)) * 8);
  ctx.save();
  ctx.lineJoin = 'round';
  ctx.beginPath(); ctx.moveTo(x - 15, by - 22); ctx.lineTo(x + 15, by - 22); ctx.lineTo(x, by); ctx.closePath();
  ctx.fillStyle = '#ec5f89'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke(); ctx.fill();
  ctx.font = `400 21px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const lx = Math.min(Math.max(x, 70), WORLD.W - 70);
  ctx.lineWidth = 5; ctx.strokeText(label, lx, by - 38); ctx.fillStyle = '#c43d5c'; ctx.fillText(label, lx, by - 38);
  ctx.restore();
}

function drawDebug() {
  ctx.lineWidth = 2;
  ctx.font = `400 11px ${FONT}`; ctx.textAlign = 'center';
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
// After a minute with no taps, keys or mouse movement the menu cat stretches and yawns (then every minute).
const IDLE_MS = 60000, YAWN_S = 4.2;
const menuIdle = { since: performance.now(), tapAt: -Infinity };
/** Tap (or Enter/Space on) the menu cat: it yawns right away, unless it is already mid-yawn. */
function yawnNow() {
  const now = performance.now();
  if ((now - menuIdle.tapAt) / 1000 >= YAWN_S) menuIdle.tapAt = now;
}
menuCanvas.addEventListener('click', yawnNow);
menuCanvas.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); yawnNow(); } });
for (const ev of ['pointerdown', 'pointermove', 'keydown', 'wheel']) addEventListener(ev, () => { menuIdle.since = performance.now(); }, { passive: true });
const ease = k => 1 - (1 - Math.min(1, Math.max(0, k))) ** 3;
/** Stretch-and-yawn pose at T seconds into the routine: squash < 0 stretches tall, yawn opens the mouth. */
function yawnPose(T) {
  const stretch = T < 1 ? ease(T) : T < 2.6 ? 1 : 1 - ease((T - 2.6) / 0.4);
  const bounce = T > 3 && T < 3.6 ? Math.sin(((T - 3) / 0.6) * Math.PI) * 0.35 * (1 - (T - 3) / 0.6) : 0;
  const yawn = T < 0.6 ? 0 : T < 1.6 ? ease(T - 0.6) : T < 2.4 ? 1 : 1 - ease((T - 2.4) / 0.6);
  return { squash: -0.85 * stretch + bounce, yawn };
}

function drawMenuCat(time) {
  if (ui.current !== 'menu') return;
  mctx.setTransform(1, 0, 0, 1, 0, 0);
  mctx.clearRect(0, 0, menuCanvas.width, menuCanvas.height);
  mctx.setTransform(2.2, 0, 0, 2.2, 126, menuCanvas.height - 17); // room for the tail swing (122px left) and a tall hat mid-stretch (246px up)
  const idle = performance.now() - menuIdle.since;
  const tapT = (performance.now() - menuIdle.tapAt) / 1000;
  const T = tapT < YAWN_S ? tapT : idle >= IDLE_MS ? ((idle - IDLE_MS) % IDLE_MS) / 1000 : Infinity;
  const pose = T < YAWN_S ? yawnPose(T) : null;
  drawCat(mctx, 0, 0, playerOutfit(), {
    t: time, facing: 1,
    mood: !pose && Math.sin(time) > 0.6 ? 'happy' : null,
    squash: pose?.squash ?? 0, yawn: pose?.yawn ?? 0,
  });
}

/** Static portrait for the character-select grid. */
function drawCatPortrait(canvas, look) {
  const c = canvas.getContext('2d');
  c.setTransform(1.5, 0, 0, 1.5, canvas.width / 2 - 8, canvas.height - 8);
  drawCat(c, 0, 0, dressUp(look, save.outfit, OUTFITS), { t: 1, facing: 1 });
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
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
ui.installTip = isIOS || /Android/i.test(navigator.userAgent);
ui.setInstall({ available: false, standalone: isStandalone() });
if (isIOS) {
  // iPhone/iPad: no install button; explain Safari's Add to Home Screen instead
  const hint = document.getElementById('install-hint');
  hint.replaceChildren('Tip: on iPhone, open this in Safari, tap ', Object.assign(document.createElement('b'), { textContent: 'Share ⬆️' }),
    ' then ', Object.assign(document.createElement('b'), { textContent: 'Add to Home Screen' }), ' to play full-screen, even offline.');
}
ui.setMenuBest(highScores.best());
ui.show('menu');
maybeShowDaily();
requestAnimationFrame(frame);

if (debugAllowed) window.hungryKatz = { gm, save, upgrades, highScores, menuIdle }; // console access for testing (?debug only)
