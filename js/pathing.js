// Walkable-area rules + tiny waypoint pathfinding around furniture.
// Nodes are the (padded) corners of every blocker; Dijkstra over straight
// segments that don't cut through furniture. ponytail: O(n²) per route, fine for a dozen corners.

import { LAYOUT } from './config.js';

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const inside = (p, r) => p.x > r.x && p.x < r.x + r.w && p.y > r.y && p.y < r.y + r.h;

/** Keep a point inside the walkable area and outside furniture (pushed out via the nearest edge). */
export function constrain(p, blockers = LAYOUT.blockers) {
  const w = LAYOUT.walk;
  p.x = clamp(p.x, w.minX, w.maxX);
  p.y = clamp(p.y, w.minY, w.maxY);
  for (const b of blockers) {
    if (!inside(p, b)) continue;
    const d = [p.x - b.x, b.x + b.w - p.x, p.y - b.y, b.y + b.h - p.y];
    const m = Math.min(...d);
    if (m === d[0]) p.x = b.x;
    else if (m === d[1]) p.x = b.x + b.w;
    else if (m === d[2]) p.y = b.y;
    else p.y = b.y + b.h;
  }
  return p;
}

/** Does segment a->b pass through the inside of rect r? (slab test) */
function hits(a, b, r) {
  const dx = b.x - a.x, dy = b.y - a.y;
  let t0 = 0, t1 = 1;
  for (const [p, q] of [[-dx, a.x - r.x], [dx, r.x + r.w - a.x], [-dy, a.y - r.y], [dy, r.y + r.h - a.y]]) {
    if (p === 0) { if (q <= 0) return false; continue; }
    const t = q / p;
    if (p < 0) { if (t > t1) return false; t0 = Math.max(t0, t); }
    else { if (t < t0) return false; t1 = Math.min(t1, t); }
  }
  return t0 < t1;
}
const blocked = (a, b, blockers) => blockers.some(r => hits(a, b, r));

const M = 10; // clearance around furniture corners
const cornerCache = new WeakMap(); // blockers array -> padded corner nodes
function cornersOf(blockers) {
  if (!cornerCache.has(blockers)) {
    cornerCache.set(blockers, blockers.flatMap(r => [
      { x: r.x - M, y: r.y - M }, { x: r.x + r.w + M, y: r.y - M },
      { x: r.x - M, y: r.y + r.h + M }, { x: r.x + r.w + M, y: r.y + r.h + M },
    ]).filter(p => !blockers.some(r => inside(p, r))));
  }
  return cornerCache.get(blockers);
}

/** Shortest waypoint list from `from` to `to` (excluding `from`) that avoids furniture. */
export function route(from, to, blockers = LAYOUT.blockers) {
  const goal = { x: to.x, y: to.y };
  if (!blocked(from, goal, blockers)) return [goal];
  const nodes = [from, ...cornersOf(blockers), goal], n = nodes.length;
  const dist = Array(n).fill(Infinity), prev = Array(n).fill(-1), done = Array(n).fill(false);
  dist[0] = 0;
  for (;;) {
    let u = -1;
    for (let i = 0; i < n; i++) if (!done[i] && (u < 0 || dist[i] < dist[u])) u = i;
    if (u < 0 || dist[u] === Infinity || u === n - 1) break;
    done[u] = true;
    for (let v = 0; v < n; v++) {
      if (done[v] || blocked(nodes[u], nodes[v], blockers)) continue;
      const d = dist[u] + Math.hypot(nodes[u].x - nodes[v].x, nodes[u].y - nodes[v].y);
      if (d < dist[v]) { dist[v] = d; prev[v] = u; }
    }
  }
  if (prev[n - 1] < 0) return [goal]; // unreachable: fall back to a straight line
  const path = [];
  for (let v = n - 1; v > 0; v = prev[v]) path.unshift({ x: nodes[v].x, y: nodes[v].y });
  return path;
}
