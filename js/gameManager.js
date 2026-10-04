// Game Manager: all gameplay state and rules. No DOM access, so it runs in Node tests.
// UI/audio react through onEvent(type, data):
//   pickup, arrive, feed, wrongFood, missed, levelUp, gameOver

import {
  LAYOUT, MAX_MISSED, FEED_RADIUS, FOODS, TIPS, DIFFICULTY, COMBO, VIP, SPECIALS, PET_BONUS, levelForEarned, blockersForLevel, spotsForLevel, levelCrowdBonus, rewardForLevel, foodsForLevel, foodUnlockLevel,
} from './config.js';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { NpcSpawner } from './npcSpawner.js';
import { Inventory, FOOD_LABEL } from './inventory.js';
import { FoodStation } from './foodStation.js';
import { randomLook } from './art.js';
import { constrain, route } from './pathing.js';

export class GameManager {
  constructor({ save, persist = () => {}, upgrades, highScores, rng = Math.random, onEvent = () => {} }) {
    Object.assign(this, { save, persist, upgrades, highScores, rng, onEvent });
    this.player = new Player(LAYOUT.playerStart.x, LAYOUT.playerStart.y);
    this.inventory = new Inventory(1);
    this.stations = FOODS.map(f => new FoodStation(f.id, LAYOUT.pads[f.id]));
    this.spawner = new NpcSpawner(undefined, LAYOUT.spots, rng);
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
    this.spawner.reset();
    this.applyUpgrades();
    this.combo = 0;                 // serves in a row (see COMBO)
    this.lastServeAt = -Infinity;
    this.specialDay = SPECIALS.days.includes(new Date().getDay()); // weekend specials
  }

  hasPet(id) { return this.save.pets?.includes(id); }

  applyUpgrades() {
    this.inventory.setMax(this.upgrades.value('carry'));
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

  tap(x, y, marker = true) {
    if (this.state !== 'playing' || this.paused) return;
    const p = constrain({ x, y }, this.blockers);
    this.player.moveTo(route(this.player, p, this.blockers));
    if (marker) this.fx.push({ kind: 'tap', x: p.x, y: p.y, t: 0, life: 0.45 });
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.runTime += dt;
    const p = this.player;
    const blockers = this.blockers;
    p.update(dt, q => constrain(q, blockers));

    // food stations: each only fills its own food type, and only once it's on the menu
    const foods = this.foods;
    for (const s of this.stations) {
      s.update(dt);
      if (!s.contains(p.x, p.y, this.upgrades.value('reach'))) continue;
      if (!foods.includes(s.type)) {
        if (s.hintCd <= 0) {
          s.hintCd = 2;
          this.text(s.zone.x, s.zone.y - 70, `${FOOD_LABEL[s.type]} unlocks at Lv ${foodUnlockLevel(s.type)}`, '#9a8590', 16);
        }
        continue;
      }
      const n = s.tryPickup(this.inventory);
      if (n > 0) {
        p.squash = 1;
        this.text(p.x, p.y - 150, `+${n} ${FOOD_LABEL[s.type]}`, '#e0607e', 22);
        this.burst(s.zone.x, s.zone.y - 30, 'sparkle', 6, '#ffb3c6');
        this.onEvent('pickup', { type: s.type, amount: n });
      }
    }

    const diff = this.difficulty;
    const tuning = { spots: this.spots, maxBonus: levelCrowdBonus(this.level) + diff.maxNpcs, intervalMult: diff.interval };
    for (const spawn of this.spawner.update(dt, this.runTime, this.npcs, foods, tuning)) this.spawnNpc(spawn);

    for (const npc of this.npcs) {
      const ev = npc.update(dt);
      if (ev === 'arrived') {
        if (npc.vip) this.text(npc.x, npc.y - 150, '👑 VIP!', '#c99a00', 20);
        this.onEvent('arrive', { npc });
      }
      else if (ev === 'expired') this.missNpc(npc);
      else if (ev === 'fedDone') npc.leave('happy');
    }
    this.npcs = this.npcs.filter(n => n.state !== 'gone');

    const reach = FEED_RADIUS + this.upgrades.value('reach'); // Quick Paws serves from further away
    for (const npc of this.npcs) {
      if (npc.canBeFed() && Math.hypot(p.x - npc.x, p.y - npc.y) < reach) this.tryFeed(npc);
    }

    this.updateFx(dt);
    if (this.missed >= MAX_MISSED) this.endRun();
  }

  /** Spawn a customer. Every field is optional (debug tools pass only `request`). */
  spawnNpc({ spot, request, requests, patience, trail = 0, vip } = {}) {
    spot ??= this.spawner.randomFreeSpot(this.npcs, this.spots);
    if (!spot) return null;
    const foods = this.foods, pick = list => list[Math.floor(this.rng() * list.length)];
    request ??= requests?.[0] ?? pick(foods);
    if (!requests) { // weekend special: a second, different dish
      requests = [request];
      if (this.specialDay && foods.length >= 2 && this.rng() < SPECIALS.chance) requests.push(pick(foods.filter(f => f !== request)));
    }
    vip ??= this.runTime >= VIP.after && this.rng() < VIP.chance;
    patience ??= this.spawner.stage(this.runTime).patience;
    const look = randomLook(this.rng);
    if (vip) look.accessory = 'crown';
    const npc = new NPC({
      spot, request: requests[0], look,
      patience: patience * this.difficulty.patience * (vip ? VIP.patience : 1)
        + this.upgrades.value('npcTime') + (this.hasPet('puppy') ? PET_BONUS.puppyPatience : 0),
      blockers: this.blockers,
    });
    npc.requests = requests;
    npc.vip = vip;
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
      if (playingTop) this.runLevel = lvl;
      const newFoods = this.foods.filter(f => !before.includes(f));
      this.onEvent('levelUp', { level: lvl, reward: this.reward, newFoods, cafeGrew: playingTop });
    }
    this.persist();
    this.onEvent('feed', { npc, reward: r, tip, combo: this.combo, vip: npc.vip });
    return true;
  }

  missNpc(npc) {
    npc.leave('sad');
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
