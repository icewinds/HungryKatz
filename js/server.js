// Waffles the server (hired from café level 7): picks up ready plates at the counter and carries them
// to cats waiting for that dish. Training (levels 1..5) gives a bigger tray and quicker paws.
// Reuses the waiter's movement and path-finding. Pure logic, no DOM, so it runs in the tests;
// game.js draws Waffles from this state.

import { Player } from './player.js';
import { SERVER } from './config.js';
import { route, constrain } from './pathing.js';

const REACH = 50; // close enough to hand a cat its plate

export class Server {
  constructor(level = 1, home = SERVER.homes.server) {
    this.home = home;
    this.body = new Player(home.x, home.y);
    this.items = {};     // plates on the tray: food -> count
    this.jobs = [];      // [{ npc, food, held }] cats this round of plates is for
    this.task = null;    // { kind: 'pickup', food } | { kind: 'serve', job } | { kind: 'return' } | { kind: 'home' }
    this.setLevel(level);
  }

  setLevel(level) {
    this.level = Math.max(1, Math.min(SERVER.tray.length, level));
    this.tray = SERVER.tray[this.level - 1];
    this.body.speed = SERVER.speed[this.level - 1];
  }

  get carrying() { return Object.values(this.items).reduce((a, b) => a + b, 0); }

  /**
   * One step. `ctx` = { kitchen, npcs, blockers, pads, serve(npc) } from the game manager.
   * `serve` pays out exactly like the waiter's serve; the plate is already off Waffles' tray.
   */
  update(dt, { kitchen, npcs, blockers, pads, serve }) {
    const b = this.body;
    b.update(dt, q => constrain(q, blockers));
    // Cats served by someone else, or who left, are dropped from the round.
    for (const j of this.jobs) if (!j.npc.canBeFed()) j.npc.claimedBy = null;
    this.jobs = this.jobs.filter(j => j.npc.canBeFed());
    if (b.path.length) return;

    const t = this.task;
    if (t?.kind === 'pickup') {
      for (const j of this.jobs.filter(j => j.food === t.food && !j.held)) {
        if (kitchen.take(t.food, 1)) { this.items[t.food] = (this.items[t.food] ?? 0) + 1; j.held = true; }
      }
      for (const j of this.jobs.filter(j => !j.held)) j.npc.claimedBy = null; // the plate went to someone else
      this.jobs = this.jobs.filter(j => j.held);
    } else if (t?.kind === 'serve') {
      const { npc, food } = t.job;
      if (npc.canBeFed() && this.items[food] > 0 && Math.hypot(npc.x - b.x, npc.y - b.y) <= REACH) {
        this.items[food]--;
        npc.claimedBy = null;
        this.jobs = this.jobs.filter(j => j !== t.job);
        serve(npc);
      }
    } else if (t?.kind === 'return') {
      for (const [food, n] of Object.entries(this.items)) if (n) kitchen.giveBack(food, n);
      this.items = {};
    }

    this.task = this.next(kitchen, npcs, pads);
    const goal = this.goal(pads);
    if (Math.hypot(goal.x - b.x, goal.y - b.y) > 2) b.moveTo(route(b, goal, blockers));
  }

  /** Plates on the tray: serve the nearest cat. Spare plates: back to the counter. Otherwise plan a new round. */
  next(kitchen, npcs, pads) {
    const b = this.body, near = (a, c) => Math.hypot(a.x - b.x, a.y - b.y) - Math.hypot(c.x - b.x, c.y - b.y);
    const held = this.jobs.filter(j => j.held && this.items[j.food] > 0).sort((a, c) => near(a.npc, c.npc));
    if (held.length) return { kind: 'serve', job: held[0] };
    if (this.carrying) return { kind: 'return' };
    // A new round: one dish at a time, for cats nobody is serving yet (one-dish orders only).
    const waiting = npcs.filter(n => n.canBeFed() && !n.claimedBy && !(n.requests?.length > 1));
    const foods = [...new Set(waiting.map(n => n.request))].filter(f => kitchen.readyCount(f) > 0)
      .sort((x, y) => near(pads[x], pads[y]));
    if (!foods.length) return { kind: 'home' };
    const food = foods[0];
    const cats = waiting.filter(n => n.request === food).sort(near).slice(0, Math.min(this.tray, kitchen.readyCount(food)));
    this.jobs = cats.map(npc => { npc.claimedBy = this; return { npc, food, held: false }; });
    return { kind: 'pickup', food };
  }

  goal(pads) {
    const t = this.task;
    if (t.kind === 'pickup') return { x: pads[t.food].x, y: pads[t.food].y };
    if (t.kind === 'serve') return { x: t.job.npc.spot.x, y: t.job.npc.spot.y };
    if (t.kind === 'return') { const f = Object.keys(this.items).find(k => this.items[k]); return f ? { x: pads[f].x, y: pads[f].y } : this.home; }
    return this.home;
  }
}
