// Inventory: every food on the menu is tracked independently, each capped by maxCarry.

import { FOODS } from './config.js';

export const FOOD = { MILK: 'milk', CATFOOD: 'catfood' }; // ids used by debug tools
export const FOOD_IDS = FOODS.map(f => f.id);
export const FOOD_LABEL = Object.fromEntries(FOODS.map(f => [f.id, f.label]));

export class Inventory {
  constructor(max = 1) {
    this.max = max;
    this.items = Object.fromEntries(FOOD_IDS.map(id => [id, 0]));
  }

  setMax(max) { this.max = max; }
  count(type) { return this.items[type]; }
  has(type) { return this.items[type] > 0; }
  isFull(type) { return this.items[type] >= this.max; }

  /** Top up ONE food type to max. Never touches other types. Returns amount added. */
  fill(type) {
    const add = Math.max(0, this.max - this.items[type]);
    this.items[type] += add;
    return add;
  }

  /** Remove one item of `type`. Returns false (and changes nothing) if none carried. */
  take(type) {
    if (!this.has(type)) return false;
    this.items[type]--;
    return true;
  }

  clear() { for (const id in this.items) this.items[id] = 0; }
}
