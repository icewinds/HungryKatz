// Player cat: tap-to-move, walking smoothly through a list of waypoints.

export class Player {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.path = [];
    this.speed = 170;
    this.facing = 1;      // 1 = right, -1 = left (only the sprite flips)
    this.state = 'idle';  // 'idle' | 'walk'
    this.squash = 0;      // 0..1 bounce used for pickup/feed feedback
    this.stuck = 0;
  }

  /** Walk through waypoints [{x, y}, ...]; the last one is the destination. */
  moveTo(path) { this.path = path; this.stuck = 0; }
  stop() { this.path = []; this.state = 'idle'; }

  /** `constrain(p)` keeps the cat inside the walkable area / out of furniture. */
  update(dt, constrain) {
    this.squash = Math.max(0, this.squash - dt * 3);
    const target = this.path[0];
    if (!target) { this.state = 'idle'; return; }

    const dx = target.x - this.x, dy = target.y - this.y;
    const d = Math.hypot(dx, dy), step = this.speed * dt;
    if (d <= step) {
      this.x = target.x;
      this.y = target.y;
      this.path.shift();
      if (!this.path.length) this.stop();
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
