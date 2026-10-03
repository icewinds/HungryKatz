// Food Station: walking into its zone refills that one food type.

export class FoodStation {
  constructor(type, zone) {
    this.type = type;
    this.zone = zone; // { x, y, r }
    this.flash = 0;   // pickup glow timer
  }

  contains(x, y) {
    return Math.hypot(x - this.zone.x, y - this.zone.y) <= this.zone.r;
  }

  update(dt) { this.flash = Math.max(0, this.flash - dt); }

  /** Fill the inventory with this station's food. Returns amount added (0 = already full). */
  tryPickup(inventory) {
    const n = inventory.fill(this.type);
    if (n > 0) this.flash = 0.4;
    return n;
  }
}
