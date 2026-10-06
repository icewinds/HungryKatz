// Kitchen: Chef Biscuit cooks each customer's order on a stove, then carries the plates to the
// counter, where the waiter (the player) collects them. Each batch tops the plates for that food up
// to what the waiter can carry (the Carry upgrade), so one trip to the counter fills the tray.
// Pure logic, no DOM, so it runs in the tests; scene.drawKitchen renders the chef, stoves and pans from this state.

import { LAYOUT, KITCHEN, COOK_TIME } from './config.js';

const freeStove = x => ({ x, food: null, npc: null, n: 0, t: 0, need: 0 });

export class Kitchen {
  constructor(stoves = KITCHEN.stovesFor(1)) { this.reset(stoves); }

  reset(stoves) {
    this.batch ??= 1;   // plates per batch = waiter's carry capacity (setBatch)
    this.orders = [];   // [{ food, npc }] waiting for a free stove, oldest first
    this.open = [];     // [{ food, npc }] every dish still wanted by a seated customer
    this.toPlate = [];  // cooked batches [{ food, n }] waiting for the chef to carry them out
    this.ready = {};    // food -> plates on the counter
    this.stoves = stoves.map(freeStove);
    const { x, y } = KITCHEN.home;
    this.chef = { x, y, facing: 1, carrying: null, count: 0, target: null, pause: 0, mode: 'idle' };
  }

  /** Plates the waiter can carry of one food; batches fill up to this. */
  setBatch(n) { this.batch = Math.max(1, n); }

  /** Plates of `food` ready, cooking or on the way to the counter. */
  supply(food) {
    const sum = list => list.reduce((t, d) => t + (d.food === food ? d.n : 0), 0);
    return this.readyCount(food) + sum(this.stoves) + sum(this.toPlate) + (this.chef.carrying === food ? this.chef.count : 0);
  }

  /** The café grew: more stoves (dishes already cooking keep cooking). */
  setStoves(xs) { this.stoves = xs.map((x, i) => ({ ...(this.stoves[i] ?? freeStove(x)), x })); }

  readyCount(food) { return this.ready[food] ?? 0; }

  /** A customer sat down: one order per dish they want. */
  order(npc) {
    for (const food of npc.requests ?? [npc.request]) { this.orders.push({ food, npc }); this.open.push({ food, npc }); }
  }

  /** A customer left or was served: drop their orders not yet on a stove. Cooked plates stay on the counter. */
  cancel(npc) {
    this.orders = this.orders.filter(o => o.npc !== npc);
    this.open = this.open.filter(o => o.npc !== npc);
  }

  /** Waiter collects up to `n` ready plates of `food`; returns how many were taken. */
  take(food, n) {
    const k = Math.max(0, Math.min(n, this.readyCount(food)));
    this.ready[food] = this.readyCount(food) - k;
    return k;
  }

  /** Is `food` queued, cooking or on its way to the counter? */
  busyWith(food) {
    return this.orders.some(o => o.food === food) || this.stoves.some(s => s.food === food)
      || this.toPlate.some(d => d.food === food) || this.chef.carrying === food;
  }

  /** Advance cooking and the chef. `speed` = Faster Chef multiplier. Returns [{ food, n }] plated this frame. */
  update(dt, speed = 1) {
    for (const s of this.stoves) {
      while (!s.food && this.orders.length) {
        const o = this.orders.shift(), have = this.supply(o.food);
        const wanted = this.open.filter(w => w.food === o.food).length;
        if (have >= wanted) continue; // enough plates already ready or on the way for everyone waiting
        const n = Math.max(this.batch, wanted) - have; // top up to a full tray
        Object.assign(s, { food: o.food, npc: o.npc, n, t: 0, need: COOK_TIME[o.food] });
      }
      if (!s.food) continue;
      s.t += dt * speed;
      if (s.t >= s.need) { this.toPlate.push({ food: s.food, n: s.n }); Object.assign(s, freeStove(s.x)); }
    }
    return this.moveChef(dt, speed);
  }

  /** Chef: carry finished dishes to their spot on the counter; otherwise tend the busiest stove. */
  moveChef(dt, speed) {
    const c = this.chef, plated = [];
    if (c.pause > 0) { c.pause -= dt * speed; return plated; } // putting a plate down
    if (!c.carrying && this.toPlate.length) { const d = this.toPlate.shift(); c.carrying = d.food; c.count = d.n; }
    if (c.carrying) c.target = { x: LAYOUT.pads[c.carrying].x, y: KITCHEN.passY };
    else { // stand at the stove that is closest to done, or wait in the middle
      const busy = this.stoves.filter(s => s.food).sort((a, b) => b.t / b.need - a.t / a.need)[0];
      c.target = busy ? { x: busy.x, y: KITCHEN.stoveY } : { ...KITCHEN.home };
    }
    const dx = c.target.x - c.x, dy = c.target.y - c.y, d = Math.hypot(dx, dy), step = KITCHEN.chefSpeed * speed * dt;
    if (d > step) {
      c.x += (dx / d) * step; c.y += (dy / d) * step;
      if (Math.abs(dx) > 1) c.facing = dx > 0 ? 1 : -1;
      c.mode = 'walk';
      return plated;
    }
    c.x = c.target.x; c.y = c.target.y;
    if (c.carrying) { // at the counter: put the plates down
      this.ready[c.carrying] = this.readyCount(c.carrying) + c.count;
      plated.push({ food: c.carrying, n: c.count });
      c.carrying = null; c.count = 0;
      c.pause = KITCHEN.plateTime;
      c.mode = 'plate';
    } else c.mode = this.stoves.some(s => s.food) ? 'cook' : 'idle';
    return plated;
  }
}
