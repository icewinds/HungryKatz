// Central tuning knobs. All positions are in WORLD units: a fixed 540x960
// portrait world that game.js scales to fit any screen.

export const WORLD = { W: 540, H: 960 };

const TOP_ROW_Y = 280;
const BOTTOM_ROW_Y = 786;
const SPOT_XS = [80, 162, 244, 326, 404];

export const LAYOUT = {
  walk: { minX: 26, maxX: 514, minY: 272, maxY: 790 }, // where the player may stand
  playerStart: { x: 260, y: 540 },
  entry: { x: -70, y: 500 },  // NPCs spawn here, off-screen left
  door: { x: 40, y: 500 },    // first waypoint just inside the door
  exit: { x: -80, y: 500 },   // NPCs are removed after reaching this
  // Solid furniture the player is pushed out of (feet position)
  blockers: [
    { x: 440, y: 318, w: 120, h: 212 }, // fridge
    { x: 448, y: 662, w: 120, h: 78 },  // cat food bowl
  ],
  milkZone: { x: 468, y: 432, r: 64 },
  foodZone: { x: 488, y: 702, r: 66 },
  fridge: { x: 452, y: 288, w: 80, h: 232 },
  bowl: { x: 490, y: 702 },
  topCounter: { x: 18, y: 172, w: 420, h: 74 },
  bottomCounter: { x: 18, y: 806, w: 420, h: 74 },
  // Waiting spots; NPCs stand at (x, y) = feet position
  spots: [
    ...SPOT_XS.map((x, i) => ({ id: `T${i + 1}`, row: 'top', x, y: TOP_ROW_Y })),
    ...SPOT_XS.map((x, i) => ({ id: `B${i + 1}`, row: 'bottom', x, y: BOTTOM_ROW_Y })),
  ],
};

// Difficulty over a run. `at` = seconds of (unpaused) play time.
// maxNpcs = customers allowed in the restaurant at once,
// interval = [min,max] seconds between spawns, patience = base wait seconds.
export const SPAWN_STAGES = [
  { at: 0,   maxNpcs: 1, interval: [2.0, 3.5], patience: 16 },
  { at: 25,  maxNpcs: 2, interval: [3.0, 5.0], patience: 15 },
  { at: 70,  maxNpcs: 3, interval: [2.5, 4.0], patience: 14 },
  { at: 130, maxNpcs: 4, interval: [2.0, 3.5], patience: 13 },
  { at: 200, maxNpcs: 5, interval: [1.6, 3.0], patience: 12 },
  { at: 280, maxNpcs: 6, interval: [1.2, 2.5], patience: 11 },
];

export const MAX_MISSED = 10;
export const FEED_RADIUS = 46;   // player<->NPC contact distance
export const NPC_SPEED = 140;    // px per second
export const MAX_UPGRADE_LEVEL = 5;

export const UPGRADES = {
  carry: {
    icon: '🥛', name: 'Carry Capacity',
    desc: 'Carry more milk AND more cat food at the same time.',
    values: [1, 2, 3, 4, 5], costs: [40, 90, 160, 260],
    fmt: v => `${v} + ${v}`,
  },
  speed: {
    icon: '⚡', name: 'Movement Speed',
    desc: 'Your cat zooms around the café faster.',
    values: [170, 205, 240, 275, 310], costs: [30, 70, 130, 220],
    fmt: v => `${Math.round((v / 170) * 100)}%`,
  },
  npcTime: {
    icon: '⏱️', name: 'NPC Time',
    desc: 'Hungry customers wait longer before leaving.',
    values: [0, 3, 6, 9, 12], costs: [30, 70, 130, 220],
    fmt: v => `+${v}s`,
  },
};

// Restaurant level comes from lifetime coins earned: L2 at 150, L3 at 450, L4 at 900...
const LEVEL_STEP = 150;
export function levelForEarned(earned) {
  let lvl = 1;
  while (lvl < 99 && earned >= (LEVEL_STEP * lvl * (lvl + 1)) / 2) lvl++;
  return lvl;
}
export const rewardForLevel = level => 10 + 2 * (level - 1);
