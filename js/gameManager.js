// Game Manager: all gameplay state and rules. No DOM access, so it runs in Node tests.
// UI/audio react through onEvent(type, data):
//   pickup, arrive, feed, wrongFood, missed, levelUp, gameOver

import { LAYOUT, MAX_MISSED, FEED_RADIUS, levelForEarned, rewardForLevel } from './config.js';
import { Player } from './player.js';
import { NPC } from './npc.js';
import { NpcSpawner } from './npcSpawner.js';
import { Inventory, FOOD, FOOD_LABEL } from './inventory.js';
import { FoodStation } from './foodStation.js';
import { randomLook } from './art.js';
import { constrain, route } from './pathing.js';

export class GameManager {
  constructor({ save, persist = () => {}, upgrades, highScores, rng = Math.random, onEvent = () => {} }) {
    Object.assign(this, { save, persist, upgrades, highScores, rng, onEvent });
    this.player = new Player(LAYOUT.playerStart.x, LAYOUT.playerStart.y);
    this.inventory = new Inventory(1);
    this.stations = [
      new FoodStation(FOOD.MILK, LAYOUT.milkZone),
      new FoodStation(FOOD.CATFOOD, LAYOUT.foodZone),
    ];
    this.spawner = new NpcSpawner(undefined, LAYOUT.spots, rng);
    this.npcs = [];
    this.fx = [];
    this.state = 'menu'; // 'menu' | 'playing' | 'over'
    this.paused = false;
    this.score = 0;
    this.missed = 0;
    this.runTime = 0;
    this.fed = 0;
    this.applyUpgrades();
  }

  startRun() {
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

  get reward() { return rewardForLevel(this.save.level); }

  tap(x, y, marker = true) {
    if (this.state !== 'playing' || this.paused) return;
    const p = constrain({ x, y });
    this.player.moveTo(route(this.player, p));
    if (marker) this.fx.push({ kind: 'tap', x: p.x, y: p.y, t: 0, life: 0.45 });
  }

  update(dt) {
    if (this.state !== 'playing' || this.paused) return;
    this.runTime += dt;
    const p = this.player;
    p.update(dt, constrain);

    // food stations: each only fills its own food type
    for (const s of this.stations) {
      s.update(dt);
      if (!s.contains(p.x, p.y)) continue;
      const n = s.tryPickup(this.inventory);
      if (n > 0) {
        p.squash = 1;
        this.text(p.x, p.y - 150, `+${n} ${FOOD_LABEL[s.type]}`, s.type === FOOD.MILK ? '#4a86d9' : '#e0607e', 22);
        this.burst(s.zone.x, s.zone.y - 30, 'sparkle', 6, s.type === FOOD.MILK ? '#9fd3ff' : '#ffb3c6');
        this.onEvent('pickup', { type: s.type, amount: n });
      }
    }

    for (const spawn of this.spawner.update(dt, this.runTime, this.npcs)) this.spawnNpc(spawn);

    for (const npc of this.npcs) {
      const ev = npc.update(dt);
      if (ev === 'arrived') this.onEvent('arrive', { npc });
      else if (ev === 'expired') this.missNpc(npc);
      else if (ev === 'fedDone') npc.leave('happy');
    }
    this.npcs = this.npcs.filter(n => n.state !== 'gone');

    for (const npc of this.npcs) {
      if (npc.canBeFed() && Math.hypot(p.x - npc.x, p.y - npc.y) < FEED_RADIUS) this.tryFeed(npc);
    }

    this.updateFx(dt);
    if (this.missed >= MAX_MISSED) this.endRun();
  }

  /** Spawn a customer. Every field is optional (debug tools pass only `request`). */
  spawnNpc({ spot, request, patience, trail = 0 } = {}) {
    spot ??= this.spawner.randomFreeSpot(this.npcs);
    if (!spot) return null;
    request ??= this.rng() < 0.5 ? FOOD.MILK : FOOD.CATFOOD;
    patience ??= this.spawner.stage(this.runTime).patience;
    const npc = new NPC({
      spot, request,
      look: randomLook(this.rng),
      patience: patience + this.upgrades.value('npcTime'),
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
    const r = this.reward;
    this.save.coins += r;
    this.save.totalEarned += r;
    this.score += r; // score only ever goes up; spending coins never lowers it
    this.fed++;
    npc.feed();
    this.player.squash = 1;
    this.text(npc.x, npc.y - 140, `+${r}`, '#e0a000', 28);
    this.burst(npc.x, npc.y - 60, 'heart', 6, '#ff6b8a');
    this.burst(npc.x, npc.y - 60, 'coin', 5);
    const lvl = levelForEarned(this.save.totalEarned);
    if (lvl > this.save.level) {
      this.save.level = lvl;
      this.onEvent('levelUp', { level: lvl, reward: this.reward });
    }
    this.persist();
    this.onEvent('feed', { npc, reward: r });
    return true;
  }

  missNpc(npc) {
    npc.leave('sad');
    this.missed++;
    this.text(npc.x, npc.y - 140, 'Missed!', '#8a7f99', 18);
    this.onEvent('missed', { npc, missed: this.missed });
  }

  /** Game over: submit score, then reset everything that belongs to the run. */
  endRun() {
    const score = this.score, fed = this.fed;
    const rank = this.highScores.submit(score);
    this.state = 'over';
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
    if (this.state === 'playing') this.highScores.submit(this.score);
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
