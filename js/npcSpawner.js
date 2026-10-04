// NPC Spawner: decides when a new customer arrives and which free spot they get.

import { SPAWN_STAGES, LAYOUT, SOCIAL } from './config.js';
import { FOOD } from './inventory.js';

const present = n => n.state !== 'leaving' && n.state !== 'gone';

export class NpcSpawner {
  constructor(stages = SPAWN_STAGES, spots = LAYOUT.spots, rng = Math.random) {
    this.stages = stages;
    this.spots = spots;
    this.rng = rng;
    this.reset();
  }

  reset() { this.timer = 1.5; this.stageIndex = 0; }

  stage(runTime) {
    let i = 0;
    for (let k = 0; k < this.stages.length; k++) if (runTime >= this.stages[k].at) i = k;
    this.stageIndex = i;
    return this.stages[i];
  }

  /** Spots nobody is standing at or walking towards. Leaving cats free their spot. */
  freeSpots(npcs, spots = this.spots) {
    const taken = new Set(npcs.filter(present).map(n => n.spot));
    return spots.filter(s => !taken.has(s));
  }

  activeCount(npcs) { return npcs.filter(present).length; }

  randomFreeSpot(npcs, spots = this.spots) {
    const free = this.freeSpots(npcs, spots);
    return free.length ? free[Math.floor(this.rng() * free.length)] : null;
  }

  /**
   * Returns a list of spawn requests { spot, request, patience, trail? } (usually 0 or 1, 2 for friends).
   * `tuning` (optional): { spots: open seats, maxBonus: extra customers allowed, intervalMult: spawn-gap multiplier }.
   */
  update(dt, runTime, npcs, foods = [FOOD.MILK, FOOD.CATFOOD], tuning = {}) {
    const st = this.stage(runTime);
    this.timer -= dt;
    if (this.timer > 0) return [];
    const free = this.freeSpots(npcs, tuning.spots), maxNpcs = Math.max(1, st.maxNpcs + (tuning.maxBonus || 0));
    const room = maxNpcs - this.activeCount(npcs);
    if (!free.length || room <= 0) {
      this.timer = 0.6; // restaurant full, check again shortly
      return [];
    }
    const [lo, hi] = st.interval;
    this.timer = (lo + this.rng() * (hi - lo)) * (tuning.intervalMult || 1);
    const pick = list => list[Math.floor(this.rng() * list.length)];
    const req = spot => ({ spot, request: pick(foods), patience: st.patience }); // only foods on the menu

    // Two friends walk in together and take a pair of seats.
    if (room >= 2 && this.rng() < SOCIAL.duoChance) {
      const pairs = free.filter(s => free.includes(s.partner) && s.id < s.partner.id);
      if (pairs.length) {
        const s = pick(pairs);
        return [req(s), { ...req(s.partner), trail: 1 }];
      }
    }
    // A lone cat often sits next to someone already waiting.
    const besideSomeone = free.filter(s => s.partner && !free.includes(s.partner));
    const pool = besideSomeone.length && this.rng() < SOCIAL.neighborChance ? besideSomeone : free;
    return [req(pick(pool))];
  }
}
