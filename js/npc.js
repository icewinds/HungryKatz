// NPC customer cat: enters from the left, waits at a spot, eats or gives up, leaves left.

import { LAYOUT, NPC_SPEED, WORLD } from './config.js';
import { route } from './pathing.js';

let nextId = 1;
export const EAT_TIME = 1.6; // seconds a fed cat spends eating its dish

export class NPC {
  constructor({ spot, request, look, patience, blockers = LAYOUT.blockers }) {
    this.blockers = blockers;   // tables currently in the café (for walking around them)
    this.id = nextId++;
    this.spot = spot;
    this.request = request;      // 'milk' | 'catfood'
    this.look = look;
    this.patience = patience;
    this.timeLeft = patience;
    // First a stroll along the street outside (seen through the windows), then in through the front door
    const st = LAYOUT.street;
    this.outside = true;
    this.x = st.ends[Math.random() < 0.5 ? 0 : 1];
    this.y = st.y;
    this.path = [{ x: LAYOUT.entry.x, y: st.y }];
    this.indoorPath = [{ ...LAYOUT.door }, ...route(LAYOUT.door, spot, blockers)]; // walks around tables
    // 'entering' -> 'waiting' -> ('eating' ->) 'leaving' -> 'gone'
    this.state = 'entering';
    this.mood = null;            // 'happy' | 'sad' while leaving
    this.facing = 1;
    this.phase = Math.random() * 10; // animation offset so cats don't move in sync
    this.arriveT = 0;
    this.eatT = 0;
    this.leaveT = 0;   // seconds since starting to leave (empty plate fades out)
    this.hintCd = 0;
    this.squash = 0;
  }

  get frac() { return Math.max(0, this.timeLeft / this.patience); }
  get anim() {
    if (this.state === 'entering' || this.state === 'leaving') return 'walk';
    return this.state === 'eating' ? 'eat' : 'idle';
  }
  /** Only a cat that has arrived and is idling at its spot can be fed. */
  canBeFed() { return this.state === 'waiting'; }

  feed() { this.state = 'eating'; this.eatT = EAT_TIME; this.squash = 1; }
  /** Seated with their back to us (window bar, front of a table): drawn from behind. */
  get fromBehind() { return !!this.spot.back && (this.state === 'waiting' || this.state === 'eating'); }

  leave(mood) {
    this.state = 'leaving';
    this.mood = mood;
    this.path = [...route(this, LAYOUT.door, this.blockers), { ...LAYOUT.exit }];
  }

  /** Returns an event name ('arrived' | 'expired' | 'fedDone' | 'gone') or null. */
  update(dt) {
    this.squash = Math.max(0, this.squash - dt * 3);
    this.hintCd = Math.max(0, this.hintCd - dt);
    switch (this.state) {
      case 'entering':
        if (this.walk(dt) && this.outside) { // reached the front door: step inside
          this.outside = false;
          Object.assign(this, { ...LAYOUT.entry, path: this.indoorPath });
        } else if (!this.path.length) {
          this.state = 'waiting';
          this.arriveT = 0;
          this.squash = 1;
          this.facing = this.spot.face ?? (this.x < WORLD.W / 2 ? 1 : -1);
          return 'arrived';
        }
        break;
      case 'waiting':
        this.arriveT += dt;
        if (!this.relaxed) this.timeLeft -= dt; // Relaxed difficulty: they wait happily
        if (this.timeLeft <= 0) { this.timeLeft = 0; return 'expired'; }
        break;
      case 'eating':
        this.eatT -= dt;
        if (this.eatT <= 0) return 'fedDone';
        break;
      case 'leaving':
        this.leaveT += dt;
        if (this.walk(dt)) {
          if (this.outside) { this.state = 'gone'; return 'gone'; }
          // out of the front door: stroll off along the street
          const st = LAYOUT.street;
          Object.assign(this, { outside: true, x: LAYOUT.entry.x, y: st.y, path: [{ x: st.ends[Math.random() < 0.5 ? 0 : 1], y: st.y }] });
        }
        break;
    }
    return null;
  }

  /** Follow waypoints. Returns true once the last one is reached. */
  walk(dt) {
    let step = NPC_SPEED * (this.outside ? LAYOUT.street.pace : 1) * dt; // a brisk stroll outside
    while (step > 0 && this.path.length) {
      const p = this.path[0];
      const dx = p.x - this.x, dy = p.y - this.y, d = Math.hypot(dx, dy);
      if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
      if (d <= step) {
        this.x = p.x; this.y = p.y;
        this.path.shift();
        step -= d;
      } else {
        this.x += (dx / d) * step;
        this.y += (dy / d) * step;
        step = 0;
      }
    }
    return this.path.length === 0;
  }
}
