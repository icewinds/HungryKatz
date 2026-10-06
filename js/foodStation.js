// Food Station: the spot in front of the counter where the waiter collects ready plates of one food.

export class FoodStation {
  constructor(type, zone) {
    this.type = type;
    this.zone = zone; // { x, y, r }
    this.flash = 0;   // pickup glow timer
    this.hintCd = 0;  // "unlocks at level X" message cooldown
  }

  /** `extra` widens the pickup zone (Quick Paws upgrade). */
  contains(x, y, extra = 0) {
    return Math.hypot(x - this.zone.x, y - this.zone.y) <= this.zone.r + extra;
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    this.hintCd = Math.max(0, this.hintCd - dt);
  }
}
