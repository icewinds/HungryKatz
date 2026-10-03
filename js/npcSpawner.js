// NPC Spawner: decides when a new customer arrives and which free spot they get.

import { SPAWN_STAGES, LAYOUT } from './config.js';
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
  freeSpots(npcs) {
    const taken = new Set(npcs.filter(present).map(n => n.spot));
    return this.spots.filter(s => !taken.has(s));
  }

  activeCount(npcs) { return npcs.filter(present).length; }

  randomFreeSpot(npcs) {
    const free = this.freeSpots(npcs);
    return free.length ? free[Math.floor(this.rng() * free.length)] : null;
  }

  /** Returns a spawn request { spot, request, patience } or null. */
  update(dt, runTime, npcs) {
    const st = this.stage(runTime);
    this.timer -= dt;
    if (this.timer > 0) return null;
    const spot = this.randomFreeSpot(npcs);
    if (!spot || this.activeCount(npcs) >= st.maxNpcs) {
      this.timer = 0.6; // restaurant full, check again shortly
      return null;
    }
    const [lo, hi] = st.interval;
    this.timer = lo + this.rng() * (hi - lo);
    return {
      spot,
      request: this.rng() < 0.5 ? FOOD.MILK : FOOD.CATFOOD,
      patience: st.patience,
    };
  }
}
