// Game Manager: all gameplay state and rules. No DOM access, so it runs in Node tests.
// UI/audio react through onEvent(type, data):
//   pickup, arrive, feed, wrongFood, missed, levelUp, gameOver

import {
  LAYOUT, MAX_MISSED, FEED_RADIUS, FOODS, TIPS, DIFFICULTY, levelForEarned, blockersForLevel, spotsForLevel, levelCrowdBonus, rewardForLevel, foodsForLevel, foodUnlockLevel,
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
  }

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
      if (ev === 'arrived') this.onEvent('arrive', { npc });
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
  spawnNpc({ spot, request, patience, trail = 0 } = {}) {
    spot ??= this.spawner.randomFreeSpot(this.npcs, this.spots);
    if (!spot) return null;
    if (!request) { const foods = this.foods; request = foods[Math.floor(this.rng() * foods.length)]; }
    patience ??= this.spawner.stage(this.runTime).patience;
    const npc = new NPC({
      spot, request,
      look: randomLook(this.rng),
      patience: patience * this.difficulty.patience + this.upgrades.value('npcTime'),
      blockers: this.blockers,
    });
    npc.x -= 50 * trail; // the second friend follows a step behind
    npc.phase += trail * 0.3;
    this.npcs.push(npc);
    return npc;
  }

  /** Feed if the cat is waiting AND the player carries what it asked for. Wrong food changes nothing. */
  tryFeed(npc) {
    if (!npc.canBeFed()) return false;
    if (!this.inventory.take(npc.request)) {
      if (npc.hintCd <= 0) {
        npc.hintCd = 1.8;
        this.text(npc.x, npc.y - 140, `Wants ${FOOD_LABEL[npc.request]}!`, '#e05570', 17);
        this.onEvent('wrongFood', { npc });
      }
      return false;
    }
    // Happy customers sometimes leave a little tip on top.
    const tip = this.rng() < this.upgrades.value('luckyTips') ? TIPS.min + Math.floor(this.rng() * (TIPS.max - TIPS.min + 1)) : 0;
    const r = this.rewardFor(npc.request) + tip;
    this.save.coins += r;
    this.save.totalEarned += r;
    this.score += r; // score only ever goes up; spending coins never lowers it
    this.fed++;
    npc.feed();
    this.player.squash = 1;
    this.text(npc.x, npc.y - 140, `+${r - tip}`, '#e0a000', 28);
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
    this.onEvent('feed', { npc, reward: r, tip });
    return true;
  }

  missNpc(npc) {
    npc.leave('sad');
    this.missed++;
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
