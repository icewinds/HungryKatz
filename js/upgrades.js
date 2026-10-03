// Upgrade Manager: levels live in the save object, bought with spendable coins.

import { UPGRADES, MAX_UPGRADE_LEVEL } from './config.js';

export class UpgradeManager {
  constructor(save, persist = () => {}) {
    this.save = save;
    this.persist = persist;
  }

  level(id) {
    const l = Math.floor(this.save.upgrades[id]) || 1;
    return Math.min(MAX_UPGRADE_LEVEL, Math.max(1, l));
  }
  value(id) { return UPGRADES[id].values[this.level(id) - 1]; }
  isMax(id) { return this.level(id) >= MAX_UPGRADE_LEVEL; }
  cost(id) { return this.isMax(id) ? null : UPGRADES[id].costs[this.level(id) - 1]; }
  canBuy(id) { const c = this.cost(id); return c !== null && this.save.coins >= c; }

  /** Spend coins on the next level. Only touches coins, never the run score. */
  buy(id) {
    if (!this.canBuy(id)) return false;
    this.save.coins -= this.cost(id);
    this.save.upgrades[id] = this.level(id) + 1;
    this.persist();
    return true;
  }
}
