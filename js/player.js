// Player cat: tap-to-move with smooth straight-line walking.

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.target = null;
    this.speed = 170;
    this.facing = 1;      // 1 = right, -1 = left (only the sprite flips)
    this.state = 'idle';  // 'idle' | 'walk'
    this.squash = 0;      // 0..1 bounce used for pickup/feed feedback
    this.stuck = 0;
  }

  moveTo(x, y) { this.target = { x, y }; this.stuck = 0; }
  stop() { this.target = null; this.state = 'idle'; }

  /** `constrain(p)` keeps the cat inside the walkable area / out of furniture. */
  update(dt, constrain) {
    this.squash = Math.max(0, this.squash - dt * 3);
    if (!this.target) { this.state = 'idle'; return; }

    const dx = this.target.x - this.x, dy = this.target.y - this.y;
    const d = Math.hypot(dx, dy), step = this.speed * dt;
    if (d <= step) {
      this.x = this.target.x;
      this.y = this.target.y;
      this.stop();
      return;
    }
    if (Math.abs(dx) > 1) this.facing = dx > 0 ? 1 : -1;
    const px = this.x, py = this.y;
    this.x += (dx / d) * step;
    this.y += (dy / d) * step;
    constrain?.(this);
    this.state = 'walk';

    // Pressing into furniture: give up instead of moonwalking forever.
    this.stuck = Math.hypot(this.x - px, this.y - py) < step * 0.3 ? this.stuck + dt : 0;
    if (this.stuck > 0.25) this.stop();
  }
}
