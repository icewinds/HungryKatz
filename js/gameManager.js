// Game Manager: all gameplay state and rules. No DOM access, so it runs in Node tests.
// UI/audio react through onEvent(type, data):
//   pickup, plated, arrive, feed, friend, wrongFood, missed, cleared, plates, levelUp, gameOver

import {
  LAYOUT, MAX_MISSED, FEED_RADIUS, FOODS, TIPS, DIFFICULTY, COMBO, VIP, SPECIALS, PET_BONUS, levelForEarned, blockersForLevel, spotsForLevel, levelCrowdBonus, levelSpawnPace, rewardForLevel, foodsForLevel, foodUnlockLevel, KITCHEN, CLEARING, STAFF, REGULARS, FRIENDSHIP,
} from './config.js';
import { Kitchen } from './kitchen.js';
import { Cleaner } from './cleaner.js';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { NpcSpawner } from './npcSpawner.js';
import { Inventory, FOOD_LABEL } from './inventory.js';
import { FoodStation } from './foodStation.js';
import { randomLook } from './art.js';
import { constrain, route } from './pathing.js';

const MAX_QUEUED_TAPS = 8;

export class GameManager {
  constructor({ save, persist = () => {}, upgrades, highScores, rng = Math.random, onEvent = () => {} }) {
    Object.assign(this, { save, persist, upgrades, highScores, rng, onEvent });
    this.player = new Player(LAYOUT.playerStart.x, LAYOUT.playerStart.y);
    this.inventory = new Inventory(1);
    this.stations = FOODS.map(f => new FoodStation(f.id, LAYOUT.pads[f.id]));
    this.spawner = new NpcSpawner(undefined, LAYOUT.spots, rng);
    this.kitchen = new Kitchen(KITCHEN.stovesFor(save.level ?? 1));
    this.dirty = new Set();   // seats with an empty plate left on them
    this.dirtyCarried = 0;    // empty plates in the waiter's paws
    this.cleaner = null;      // Dusty, once hired
    this.npcs = [];
    this.fx = [];
    this.state = 'menu';
    this.runLevel = null; // 'menu' | 'playing' | 'over'
    this.runLevel = null;  // restaurant level chosen for this run (<= best reached)
    this.paused = false;
    this.score = 0;
    this.missed = 0;
    this.runTime = 0;
    this.fed = 0;
    this.applyUpgrades();
  }

  /** Start a run at `level` (1..best reached; defaults to the best). */
  startRun(level = this.save.level) {
    this.runLevel = Math.min(Math.max(1, Math.floor(level) || 1), this.save.level);
    this.state = 'playing';
    this.paused = false;
    this.score = 0;        // run score always starts at zero; high-score table is untouched
    this.missed = 0;
    this.runTime = 0;
    this.fed = 0;
    this.npcs = [];
    this.fx = [];
    this.inventory.clear();
    Object.assign(this.player, { x: LAYOUT.playerStart.x, y: LAYOUT.playerStart.y, facing: 1 });
    this.player.stop();
    this.target = null;   // stop the cat is walking to
    this.queue = [];      // further tapped stops, in order
    this.spawner.reset();
    this.kitchen.reset(KITCHEN.stovesFor(this.level));
    this.dirty = new Set();
    this.dirtyCarried = 0;
    this.updateStaff(true);
    this.applyUpgrades();
    this.combo = 0;                 // serves in a row (see COMBO)
    this.lastServeAt = -Infinity;
    this.specialDay = SPECIALS.days.includes(new Date().getDay()); // weekend specials
  }

  hasPet(id) { return this.save.pets?.includes(id); }

  /** Hired staff join the café (`fresh`: start of a run, so they begin at their post). */
  updateStaff(fresh = false) {
    const hired = this.save.staff?.includes('cleaner');
    if (!hired) this.cleaner = null;
    else if (fresh || !this.cleaner) this.cleaner = new Cleaner();
  }

  applyUpgrades() {
    this.inventory.setMax(this.upgrades.value('carry'));
    this.kitchen?.setBatch(this.upgrades.value('carry')); // the chef cooks a full tray's worth
    this.player.speed = this.upgrades.value('speed');
  }

  /** The café level being played (chosen at the start; the best level when not in a run). */
  get level() { return this.runLevel ?? this.save.level; }
  get reward() { return rewardForLevel(this.level); }
  /** Tables (as walk blockers) and seats open at the current restaurant level. */
  get blockers() { return blockersForLevel(this.level); }
  get spots() { return spotsForLevel(this.level); }
  /** Player-chosen difficulty from Settings. */
  get difficulty() { return DIFFICULTY[this.save.settings?.difficulty] ?? DIFFICULTY.normal; }
  /** Foods on the menu right now (unlocked by restaurant level). */
  get foods() { return foodsForLevel(this.level); }
  /** Coins for serving `food`: level reward + food bonus + Bigger Plates upgrade. */
  rewardFor(food) {
    return this.reward + (FOODS.find(f => f.id === food)?.bonus ?? 0) + this.upgrades.value('plates');
  }

  /** Tap = add a stop to the walk queue (visited in order). Drag (marker=false) steers directly and clears it. */
  tap(x, y, marker = true) {
    if (this.state !== 'playing' || this.paused) return;
    const p = constrain({ x, y }, this.blockers);
    if (!marker) { this.queue.length = 0; this.walkTo(p); return; }
    if (this.target && this.queue.length >= MAX_QUEUED_TAPS) return;
    if (this.target) this.queue.push(p); else this.walkTo(p);
    this.fx.push({ kind: 'tap', x: p.x, y: p.y, t: 0, life: 0.45 });
  }
  walkTo(p) { this.target = p; this.player.moveTo(route(this.player, p, this.blockers)); }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.runTime += dt;
    const p = this.player;
    const blockers = this.blockers;
    p.update(dt, q => constrain(q, blockers));
    if (this.target && !p.path.length) { // reached (or got stuck on the way to) a stop: on to the next
      this.target = null;
      if (this.queue.length) this.walkTo(this.queue.shift());
    }

    // kitchen: the chef cooks orders and puts the plates on the counter
    for (const d of this.kitchen.update(dt, this.upgrades.value('chef'))) {
      this.burst(LAYOUT.pads[d.food].x, LAYOUT.kitchenY + 4, 'sparkle', 5, '#ffe08a');
      this.onEvent('plated', d);
    }

    // counter: the waiter collects ready plates of each food (only foods on the menu)
    const foods = this.foods;
    for (const s of this.stations) {
      s.update(dt);
      if (!s.contains(p.x, p.y, this.upgrades.value('reach'))) continue;
      if (this.dirtyCarried) this.returnPlates(); // any counter spot takes empty plates back
      if (!foods.includes(s.type)) {
        if (s.hintCd <= 0) {
          s.hintCd = 2;
          this.text(s.zone.x, s.zone.y - 70, `${FOOD_LABEL[s.type]} unlocks at Lv ${foodUnlockLevel(s.type)}`, '#9a8590', 16);
        }
        continue;
      }
      const n = this.inventory.add(s.type, this.kitchen.take(s.type, this.inventory.room(s.type)));
      if (n === 0 && this.inventory.room(s.type) > 0 && s.hintCd <= 0 && this.kitchen.busyWith(s.type)) {
        s.hintCd = 2.5;
        this.text(s.zone.x, s.zone.y - 70, 'Cooking...', '#9a8590', 16);
      }
      if (n > 0) {
        s.flash = 0.4;
        p.squash = 1;
        this.text(p.x, p.y - 150, `+${n} ${FOOD_LABEL[s.type]}`, '#e0607e', 22);
        this.burst(s.zone.x, s.zone.y - 30, 'sparkle', 6, '#ffb3c6');
        this.onEvent('pickup', { type: s.type, amount: n });
      }
    }

    const diff = this.difficulty;
    const tuning = { spots: this.spots.filter(s => !this.dirty.has(s)), maxBonus: levelCrowdBonus(this.level) + diff.maxNpcs, intervalMult: diff.interval * levelSpawnPace(this.level) };
    for (const spawn of this.spawner.update(dt, this.runTime, this.npcs, foods, tuning)) this.spawnNpc(spawn);

    for (const npc of this.npcs) {
      const ev = npc.update(dt);
      if (ev === 'arrived') {
        if (npc.vip) this.text(npc.x, npc.y - 150, '👑 VIP!', '#c99a00', 20);
        this.kitchen.order(npc); // their dishes go to the chef
        this.onEvent('arrive', { npc });
      }
      else if (ev === 'expired') this.missNpc(npc);
      else if (ev === 'fedDone') { npc.leave('happy'); this.dirty.add(npc.spot); } // their empty plate stays behind
    }
    this.npcs = this.npcs.filter(n => n.state !== 'gone');

    const reach = FEED_RADIUS + this.upgrades.value('reach'); // Quick Paws serves from further away
    for (const npc of this.npcs) {
      if (npc.canBeFed() && Math.hypot(p.x - npc.x, p.y - npc.y) < reach) this.tryFeed(npc);
    }

    // empty plates: the waiter picks them up from vacated seats (as many as they can carry)
    for (const s of this.dirty) {
      if (this.dirtyCarried >= this.inventory.max) break;
      if (Math.hypot(p.x - s.x, p.y - s.y) < reach) { this.dirty.delete(s); this.dirtyCarried++; this.onEvent('cleared', { spot: s }); }
    }
    if (this.cleaner) {
      const n = this.cleaner.update(dt, this.dirty, this.blockers);
      if (n) this.onEvent('plates', { n, cleaner: true });
    }

    this.updateFx(dt);
    if (this.missed >= MAX_MISSED) this.endRun();
  }

  /** Spawn a customer. Every field is optional (debug tools pass only `request`). */
  spawnNpc({ spot, request, requests, patience, trail = 0, vip } = {}) {
    spot ??= this.spawner.randomFreeSpot(this.npcs, this.spots);
    if (!spot) return null;
    const foods = this.foods, pick = list => list[Math.floor(this.rng() * list.length)];
    let regular = null;
    if (!request && !requests && this.rng() < FRIENDSHIP.chance) { // now and then a regular drops in
      const here = new Set(this.npcs.map(n => n.regular));
      const pool = REGULARS.filter(r => foods.includes(r.fav) && !here.has(r.id));
      if (pool.length) { regular = pick(pool); request = regular.fav; vip = false; }
    }
    request ??= requests?.[0] ?? pick(foods);
    if (!requests) { // weekend special: a second, different dish
      requests = [request];
      if (this.specialDay && foods.length >= 2 && this.rng() < SPECIALS.chance) requests.push(pick(foods.filter(f => f !== request)));
    }
    vip ??= this.runTime >= VIP.after && this.rng() < VIP.chance;
    patience ??= this.spawner.stage(this.runTime).patience;
    const look = regular ? { ...regular.look } : randomLook(this.rng);
    if (vip) look.accessory = 'crown';
    const npc = new NPC({
      spot, request: requests[0], look,
      patience: patience * this.difficulty.patience * (vip ? VIP.patience : 1)
        + this.upgrades.value('npcTime') + (this.hasPet('puppy') ? PET_BONUS.puppyPatience : 0),
      blockers: this.blockers,
    });
    npc.requests = requests;
    npc.vip = vip;
    npc.regular = regular?.id ?? null;
    if (regular) this.save.friends[regular.id] ??= 0; // met
    npc.relaxed = !!this.difficulty.relaxed;
    npc.x -= 50 * trail; // the second friend follows a step behind
    npc.phase += trail * 0.3;
    this.npcs.push(npc);
    return npc;
  }

  /** Feed if the cat is waiting AND the player carries what it asked for. Wrong food changes nothing. */
  tryFeed(npc) {
    if (!npc.canBeFed()) return false;
    const need = npc.requests ?? [npc.request];
    if (!need.every(f => this.inventory.has(f))) { // wrong or missing food: nothing is used up
      if (npc.hintCd <= 0) {
        npc.hintCd = 1.8;
        this.text(npc.x, npc.y - 140, `Wants ${need.map(f => FOOD_LABEL[f]).join(' + ')}!`, '#e05570', 17);
        this.onEvent('wrongFood', { npc });
      }
      return false;
    }
    for (const f of need) this.inventory.take(f);
    // Happy customers sometimes leave a little tip on top (VIPs always do).
    const tipChance = this.upgrades.value('luckyTips') + (this.hasPet('parrot') ? PET_BONUS.parrotTips : 0);
    const tip = npc.vip || this.rng() < tipChance ? TIPS.min + Math.floor(this.rng() * (TIPS.max - TIPS.min + 1)) : 0;
    let base = need.reduce((sum, f) => sum + this.rewardFor(f), 0);
    if (need.length > 1) base = Math.round(base * SPECIALS.bonus); // weekend special
    if (npc.vip) base *= VIP.pay;
    if (this.hasPet('goldfish')) base += PET_BONUS.goldfishCoins;
    // Combo: serving again soon after the last serve grows the streak
    this.combo = this.runTime - this.lastServeAt <= COMBO.window ? this.combo + 1 : 1;
    this.lastServeAt = this.runTime;
    const comboBonus = Math.min((this.combo - 1) * COMBO.bonusPerStep, COMBO.maxBonus);
    base += comboBonus;
    const r = base + tip;
    this.save.coins += r;
    this.save.totalEarned += r;
    this.score += r; // score only ever goes up; spending coins never lowers it
    this.fed++;
    npc.feed();
    this.player.squash = 1;
    this.text(npc.x, npc.y - 140, `+${r - tip}`, '#e0a000', 28);
    if (this.combo >= 2) this.fx.push({ kind: 'text', x: npc.x, y: npc.y - 178, text: `🔥 Combo ×${this.combo}!`, color: '#ff7a00', size: 21, t: -0.15, life: 1.3 });
    if (npc.vip) this.fx.push({ kind: 'text', x: npc.x - 34, y: npc.y - 112, text: `👑 ×${VIP.pay}`, color: '#c99a00', size: 18, t: -0.1, life: 1.3 });
    if (tip) this.fx.push({ kind: 'text', x: npc.x + 34, y: npc.y - 112, text: `+${tip} tip!`, color: '#2f9e6e', size: 18, t: -0.25, life: 1.3 });
    this.burst(npc.x, npc.y - 60, 'heart', 6, '#ff6b8a');
    this.burst(npc.x, npc.y - 60, 'coin', tip ? 10 : 5);
    const lvl = levelForEarned(this.save.totalEarned);
    if (lvl > this.save.level) {
      // A new best level. The café itself grows only if we're playing at our top level;
      // otherwise the new level is simply unlocked for next time.
      const before = this.foods, playingTop = this.runLevel === this.save.level;
      this.save.level = lvl;
      if (playingTop) { this.runLevel = lvl; this.kitchen.setStoves(KITCHEN.stovesFor(lvl)); }
      const newFoods = this.foods.filter(f => !before.includes(f));
      this.onEvent('levelUp', { level: lvl, reward: this.reward, newFoods, cafeGrew: playingTop });
    }
    if (npc.regular) this.befriend(npc);
    this.kitchen.cancel(npc); // served: anything still queued for them is not needed
    this.persist();
    this.onEvent('feed', { npc, reward: r, tip, combo: this.combo, vip: npc.vip });
    return true;
  }

  /** A regular was served: their friendship grows; reaching best friends brings a gift of coins. */
  befriend(npc) {
    const f = this.save.friends, id = npc.regular, now = Math.min(FRIENDSHIP.max, (f[id] ?? 0) + 1);
    if (now === f[id]) return; // already best friends
    f[id] = now;
    this.text(npc.x, npc.y - 178, `💖 ${now}/${FRIENDSHIP.max}`, '#ec5f89', 18);
    const gift = now === FRIENDSHIP.max ? REGULARS.find(r => r.id === id).gift : 0;
    if (gift) { this.save.coins += gift; this.burst(npc.x, npc.y - 80, 'heart', 10, '#ff6b8a'); }
    this.onEvent('friend', { id, level: now, gift });
  }

  /** The waiter hands their empty plates in at the counter: a coin each, and the score goes up too. */
  returnPlates() {
    const n = this.dirtyCarried, r = n * CLEARING.coinPerPlate;
    this.dirtyCarried = 0;
    this.save.coins += r;
    this.save.totalEarned += r;
    this.score += r;
    this.text(this.player.x, this.player.y - 150, `+${r} tidy!`, '#24865b', 20);
    this.onEvent('plates', { n });
  }

  missNpc(npc) {
    npc.leave('sad');
    this.kitchen.cancel(npc);
    this.missed++;
    this.combo = 0; // a miss breaks the streak
    this.text(npc.x, npc.y - 150, 'Missed!', '#ff5d73', 26);
    this.burst(npc.x, npc.y - 70, 'heart', 4, '#b9aab1');
    this.onEvent('missed', { npc, missed: this.missed });
  }

  /** Game over: submit score, then reset everything that belongs to the run. */
  endRun() {
    const score = this.score, fed = this.fed;
    const rank = this.highScores.submit(score, this.save.playerName); // named on Game Over
    this.state = 'over';
    this.runLevel = null;
    this.score = 0;
    this.missed = 0;
    this.npcs = [];
    this.inventory.clear();
    this.kitchen.reset(KITCHEN.stovesFor(this.level));
    this.dirty = new Set();
    this.dirtyCarried = 0;
    this.player.stop();
    this.persist();
    this.onEvent('gameOver', { score, fed, rank, scores: this.highScores.list() });
  }

  /** Leave mid-run from the pause menu: still records the score. */
  quitRun() {
    if (this.state === 'playing') this.highScores.submit(this.score, this.save.playerName);
    this.state = 'menu';
    this.score = 0;
    this.missed = 0;
    this.npcs = [];
    this.fx = [];
    this.inventory.clear();
    this.kitchen.reset(KITCHEN.stovesFor(this.level));
    this.dirty = new Set();
    this.dirtyCarried = 0;
    this.player.stop();
    this.persist();
  }

  // ---- effects (pure data; art.drawFx renders them)
  text(x, y, text, color, size = 22) {
    this.fx.push({ kind: 'text', x, y, text, color, size, t: 0, life: 1.1 });
  }
  burst(x, y, shape, n, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.PI + Math.random() * Math.PI, sp = 60 + Math.random() * 90;
      this.fx.push({
        kind: 'p', shape, color, x, y,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 80,
        t: 0, life: 0.7 + Math.random() * 0.4,
      });
    }
  }
  updateFx(dt) {
    for (const f of this.fx) {
      f.t += dt;
      if (f.kind === 'p') { f.vy += 380 * dt; f.x += f.vx * dt; f.y += f.vy * dt; }
    }
    this.fx = this.fx.filter(f => f.t < f.life);
  }
}
