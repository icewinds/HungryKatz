// Inventory: milk and cat food are tracked independently, both capped by maxCarry.

export const FOOD = { MILK: 'milk', CATFOOD: 'catfood' };
export const FOOD_LABEL = { milk: 'Milk', catfood: 'Cat Food' };

export class Inventory {
  constructor(max = 1) {
    this.max = max;
    this.items = { milk: 0, catfood: 0 };
  }

  setMax(max) { this.max = max; }
  count(type) { return this.items[type]; }
  has(type) { return this.items[type] > 0; }
  isFull(type) { return this.items[type] >= this.max; }

  /** Top up ONE food type to max. Never touches the other type. Returns amount added. */
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

  clear() { this.items.milk = 0; this.items.catfood = 0; }
}
