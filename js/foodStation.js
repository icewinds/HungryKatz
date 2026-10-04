// Food Station: walking into its zone refills that one food type.

export class FoodStation {
  constructor(type, zone) {
    this.type = type;
    this.zone = zone; // { x, y, r }
    this.flash = 0;   // pickup glow timer
    this.hintCd = 0;  // "unlocks at level X" message cooldown
  }

  contains(x, y) {
    return Math.hypot(x - this.zone.x, y - this.zone.y) <= this.zone.r;
  }

  update(dt) {
    this.flash = Math.max(0, this.flash - dt);
    this.hintCd = Math.max(0, this.hintCd - dt);
  }

  /** Fill the inventory with this station's food. Returns amount added (0 = already full). */
  tryPickup(inventory) {
    const n = inventory.fill(this.type);
    if (n > 0) this.flash = 0.4;
    return n;
  }
}
