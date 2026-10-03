// Character Manager: which chef cats are unlocked, buying them, and the current pick.
// Coin cats are bought once (save.ownedCats); score cats unlock from the best high score.

import { CHARACTER_UNLOCKS } from './config.js';

export class CharacterManager {
  constructor(save, highScores, persist = () => {}) {
    this.save = save;
    this.highScores = highScores;
    this.persist = persist;
  }

  rule(id) { return CHARACTER_UNLOCKS[id] ?? null; }

  isUnlocked(id) {
    const r = this.rule(id);
    if (!r) return id in CHARACTER_UNLOCKS;
    if (r.coins) return this.save.ownedCats.includes(id);
    return this.highScores.best() >= r.score;
  }

  /** Ids currently unlocked (used to spot new score unlocks after a run). */
  unlocked() { return Object.keys(CHARACTER_UNLOCKS).filter(id => this.isUnlocked(id)); }

  /** Spend coins on a coin cat. Returns false if not for sale, owned, or too expensive. */
  buy(id) {
    const r = this.rule(id);
    if (!r?.coins || this.isUnlocked(id) || this.save.coins < r.coins) return false;
    this.save.coins -= r.coins;
    this.save.ownedCats.push(id);
    this.persist();
    return true;
  }

  select(id) {
    if (!this.isUnlocked(id)) return false;
    this.save.character = id;
    this.persist();
    return true;
  }

  /** The cat to play as: the saved pick if still unlocked, else the free starter. */
  current() {
    return this.isUnlocked(this.save.character) ? this.save.character : Object.keys(CHARACTER_UNLOCKS)[0];
  }
}
