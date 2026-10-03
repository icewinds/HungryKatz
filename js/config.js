// Central tuning knobs. All positions are in WORLD units: a fixed 540x960
// portrait world that game.js scales to fit any screen.

export const WORLD = { W: 540, H: 960 };

// Café floor plan: back wall + window bar (top), three round tables (middle),
// kitchen counter with two flat pickup pads (bottom). Door on the left wall.
const BAR_Y = 258;                       // feet of cats sitting at the window bar
const TABLES = [{ x: 150, y: 440 }, { x: 390, y: 440 }, { x: 270, y: 615 }];
const SEAT_DX = 66;                      // seats sit either side of each table

export const LAYOUT = {
  walk: { minX: 26, maxX: 514, minY: 248, maxY: 790 }, // where the player may stand
  playerStart: { x: 270, y: 700 },
  entry: { x: -70, y: 330 },  // NPCs spawn here, off-screen left
  door: { x: 40, y: 330 },    // first waypoint just inside the door
  exit: { x: -80, y: 330 },   // NPCs are removed after reaching this
  windowBar: { x: 90, y: 168, w: 360, h: 54 },
  tables: TABLES,
  kitchenY: 800,              // top of the kitchen counter
  // Solid furniture (feet can't enter); pathing.js routes around these
  blockers: TABLES.map(t => ({ x: t.x - 44, y: t.y - 32, w: 88, h: 40 })),
  milkZone: { x: 170, y: 752, r: 50 },
  foodZone: { x: 370, y: 752, r: 50 },
  // Waiting spots; NPCs stand at (x, y) = feet position, `face` = sprite direction
  spots: [
    ...[150, 230, 310, 390].map((x, i) => ({ id: `W${i + 1}`, row: 'bar', x, y: BAR_Y, face: x < 270 ? 1 : -1 })),
    ...TABLES.flatMap((t, i) => [
      { id: `T${i + 1}a`, row: 'table', x: t.x - SEAT_DX, y: t.y, face: 1 },
      { id: `T${i + 1}b`, row: 'table', x: t.x + SEAT_DX, y: t.y, face: -1 },
    ]),
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

// How each playable cat (art.js PLAYER_LOOKS id) unlocks:
// null = free, { coins } = buy with coins, { score } = reach that best score.
export const CHARACTER_UNLOCKS = {
  mango: null,
  smokey: { coins: 80 },
  oreo: { coins: 150 },
  mochi: { coins: 250 },
  lilac: { score: 300 },
  cocoa: { score: 600 },
};

// Restaurant level comes from lifetime coins earned: L2 at 150, L3 at 450, L4 at 900...
const LEVEL_STEP = 150;
export function levelForEarned(earned) {
  let lvl = 1;
  while (lvl < 99 && earned >= (LEVEL_STEP * lvl * (lvl + 1)) / 2) lvl++;
  return lvl;
}
export const rewardForLevel = level => 10 + 2 * (level - 1);
/** 0..1 progress from the current level's threshold to the next (for the HUD ring). */
export function levelProgress(earned) {
  const l = levelForEarned(earned);
  const lo = (LEVEL_STEP * (l - 1) * l) / 2, hi = (LEVEL_STEP * l * (l + 1)) / 2;
  return Math.min(1, (earned - lo) / (hi - lo));
}
