// Dusty the cleaner (hired from café level 5): walks to tables with empty plates, collects them
// (up to a stack of 4) and drops them off at the counter. Reuses the waiter's movement and
// path-finding. Pure logic, no DOM, so it runs in the tests; game.js draws Dusty from this state.

import { Player } from './player.js';
import { CLEARING } from './config.js';
import { route, constrain } from './pathing.js';

export class Cleaner {
  constructor() {
    this.body = new Player(CLEARING.cleanerHome.x, CLEARING.cleanerHome.y);
    this.body.speed = CLEARING.cleanerSpeed;
    this.carrying = 0;   // empty plates in hand
    this.task = null;    // { kind: 'clear', spot } | { kind: 'drop' } | { kind: 'home' }
  }

  /** `dirty` = Set of seats with an empty plate (shared with the waiter). Returns plates dropped off this frame. */
  update(dt, dirty, blockers) {
    const b = this.body;
    b.update(dt, q => constrain(q, blockers));
    if (b.path.length) return 0;
    let dropped = 0;
    if (this.task?.kind === 'clear' && dirty.has(this.task.spot)) { dirty.delete(this.task.spot); this.carrying++; }
    else if (this.task?.kind === 'drop') { dropped = this.carrying; this.carrying = 0; }
    this.task = this.next(dirty);
    const goal = this.task.kind === 'clear' ? this.task.spot : this.task.kind === 'drop' ? CLEARING.dropOff : CLEARING.cleanerHome;
    if (Math.hypot(goal.x - b.x, goal.y - b.y) > 2) b.moveTo(route(b, { x: goal.x, y: goal.y }, blockers));
    return dropped;
  }

  /** Full hands or nothing left to clear: take the plates to the counter; otherwise the nearest empty plate. */
  next(dirty) {
    const b = this.body;
    if (this.carrying >= CLEARING.cleanerStack || (this.carrying && !dirty.size)) return { kind: 'drop' };
    let best = null, bestD = Infinity;
    for (const s of dirty) { const d = Math.hypot(s.x - b.x, s.y - b.y); if (d < bestD) { best = s; bestD = d; } }
    return best ? { kind: 'clear', spot: best } : { kind: 'home' };
  }
}
