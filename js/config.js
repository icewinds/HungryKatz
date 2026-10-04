// Central tuning knobs. All positions are in WORLD units: a fixed 540x960
// portrait world that game.js scales to fit any screen.

export const WORLD = { W: 540, H: 960 };

// The menu. Food i unlocks at restaurant level 1 + i * FOOD_UNLOCK_EVERY
// (milk L1, cat food L3, fish L5, ...). `bonus` = extra coins per serve.
export const FOOD_UNLOCK_EVERY = 2;
export const FOODS = [
  { id: 'milk', label: 'Milk', bonus: 0 },
  { id: 'catfood', label: 'Cat Food', bonus: 2 },
  { id: 'fish', label: 'Fish', bonus: 4 },
  { id: 'sushi', label: 'Sushi', bonus: 6 },
  { id: 'cupcake', label: 'Cupcake', bonus: 8 },
];
export const foodUnlockLevel = id => 1 + FOODS.findIndex(f => f.id === id) * FOOD_UNLOCK_EVERY;
/** Food ids on the menu at a restaurant level, in unlock order. */
export const foodsForLevel = level => FOODS.filter(f => foodUnlockLevel(f.id) <= level).map(f => f.id);

// Café floor plan: back wall + window bar (top), up to five round tables (middle),
// kitchen counter with one pickup pad per food (bottom). Door on the left wall.
// The café starts small and gains a table at the levels listed below.
const BAR_Y = 258;                       // feet of cats sitting at the window bar
export const TABLES = [
  { x: 270, y: 520, level: 1 },          // the first, slightly wobbly table
  { x: 130, y: 420, level: 3 },
  { x: 410, y: 420, level: 5 },
  { x: 130, y: 615, level: 7 },
  { x: 410, y: 615, level: 9 },
];
const SEAT_DX = 66;                      // seats sit either side of each table
const blockerOf = t => ({ x: t.x - 44, y: t.y - 32, w: 88, h: 40 });

export const LAYOUT = {
  walk: { minX: 26, maxX: 514, minY: 248, maxY: 790 }, // where the player may stand
  playerStart: { x: 270, y: 700 },
  entry: { x: -70, y: 330 },  // NPCs spawn here, off-screen left
  door: { x: 40, y: 330 },    // first waypoint just inside the door
  exit: { x: -80, y: 330 },   // NPCs are removed after reaching this
  windowBar: { x: 90, y: 168, w: 360, h: 54 },
  tables: TABLES,
  kitchenY: 800,              // top of the kitchen counter
  // Solid furniture for ALL tables (feet can't enter); see blockersForLevel for the active ones
  blockers: TABLES.map(blockerOf),
  // One pickup pad per food, evenly spaced in front of the kitchen counter
  pads: Object.fromEntries(FOODS.map((f, i) => [f.id, { x: 70 + i * 100, y: 752, r: 44 }])),
  // Waiting spots; NPCs stand at (x, y) = feet position, `face` = sprite direction.
  // Spots come in side-by-side pairs (linked via `partner` below) that face each other.
  spots: [
    ...[150, 230, 310, 390].map((x, i) => ({ id: `W${i + 1}`, row: 'bar', x, y: BAR_Y, face: i % 2 ? -1 : 1, level: 1 })),
    ...TABLES.flatMap((t, i) => [
      { id: `T${i + 1}a`, row: 'table', table: t, x: t.x - SEAT_DX, y: t.y, face: 1, level: t.level },
      { id: `T${i + 1}b`, row: 'table', table: t, x: t.x + SEAT_DX, y: t.y, face: -1, level: t.level },
    ]),
  ],
};
for (let i = 0; i < LAYOUT.spots.length; i += 2) {
  const [a, b] = [LAYOUT.spots[i], LAYOUT.spots[i + 1]];
  a.partner = b;
  b.partner = a;
}
// Where a served dish sits for each spot. `z` = depth-sort key (bar dishes sit on the
// back counter, table dishes on top of their table).
for (const s of LAYOUT.spots) {
  s.plate = s.row === 'bar'
    ? { x: s.x + s.face * 26, y: LAYOUT.windowBar.y + 14, z: 0 }
    : { x: s.table.x - s.face * 20, y: s.table.y - 28, z: s.table.y + 9 };
}

// What's open at a restaurant level (memoised so callers get stable arrays).
const memo = (fn, cache = new Map()) => level => cache.get(level) ?? cache.set(level, fn(level)).get(level);
export const tablesForLevel = memo(level => TABLES.filter(t => t.level <= level));
export const blockersForLevel = memo(level => tablesForLevel(level).map(t => LAYOUT.blockers[TABLES.indexOf(t)]));
export const spotsForLevel = memo(level => LAYOUT.spots.filter(s => s.level <= level));

// Café makeover: the restaurant starts shabby and gets nicer as it levels up.
export const DECOR_STAGES = [
  { level: 1, name: 'Shabby' },
  { level: 3, name: 'Tidy' },
  { level: 5, name: 'Cosy' },
  { level: 8, name: 'Fancy' },
];
export const decorStage = level => DECOR_STAGES.reduce((st, d, i) => (level >= d.level ? i : st), 0);

// Busier café at higher levels: extra customers allowed at once (on top of the run stage).
export const levelCrowdBonus = level => Math.floor((level - 1) / 4);

// Player-chosen difficulty (Settings). patience/interval multiply, maxNpcs adds.
export const DIFFICULTY = {
  easy:   { label: 'Easy',   patience: 1.4,  interval: 1.3, maxNpcs: -1 },
  normal: { label: 'Normal', patience: 1,    interval: 1,   maxNpcs: 0 },
  hard:   { label: 'Hard',   patience: 0.75, interval: 0.8, maxNpcs: 1 },
};

// Social seating: chance two friends arrive together (when the stage allows 2+),
// and chance a lone cat picks a seat next to someone already waiting.
export const SOCIAL = { duoChance: 0.35, neighborChance: 0.6 };

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
  { at: 380, maxNpcs: 7, interval: [1.0, 2.2], patience: 10 },
];

// Tips: a fed customer may add a random tip (coins) on top of the payment.
// The chance comes from the Lucky Tips upgrade (25% at level 1).
export const TIPS = { min: 2, max: 6 };

// Daily bonus coins for streak days 1..7 (missing a day restarts at day 1; after day 7 it loops).
export const DAILY_REWARDS = [20, 30, 40, 50, 60, 80, 120];

export const MAX_MISSED = 10;
export const FEED_RADIUS = 46;   // player<->NPC contact distance
export const NPC_SPEED = 140;    // px per second
export const MAX_UPGRADE_LEVEL = 10;

// Each upgrade: `values` = effect at levels 1..10, `costs` = coins to go from level i to i+1.
export const UPGRADES = {
  carry: {
    icon: '🥛', name: 'Carry Capacity',
    desc: 'Carry more of every food at the same time.',
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    costs: [40, 90, 160, 260, 380, 520, 700, 900, 1150],
    fmt: v => `${v} each`,
  },
  speed: {
    icon: '⚡', name: 'Movement Speed',
    desc: 'Your cat zooms around the café faster.',
    values: [170, 205, 240, 275, 310, 335, 360, 385, 410, 435],
    costs: [30, 70, 130, 220, 320, 440, 580, 750, 950],
    fmt: v => `${Math.round((v / 170) * 100)}%`,
  },
  npcTime: {
    icon: '⏱️', name: 'NPC Time',
    desc: 'Hungry customers wait longer before leaving.',
    values: [0, 3, 6, 9, 12, 14, 16, 18, 20, 22],
    costs: [30, 70, 130, 220, 320, 440, 580, 750, 950],
    fmt: v => `+${v}s`,
  },
  luckyTips: {
    icon: '🍀', name: 'Lucky Tips',
    desc: 'Happy customers leave tips more often.',
    values: [0.25, 0.3, 0.35, 0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7],
    costs: [50, 100, 170, 260, 370, 500, 650, 820, 1000],
    fmt: v => `${Math.round(v * 100)}%`,
  },
  plates: {
    icon: '🍽️', name: 'Bigger Plates',
    desc: 'Extra coins every time you serve a customer.',
    values: [0, 1, 2, 3, 4, 5, 6, 8, 10, 12],
    costs: [60, 120, 200, 300, 420, 560, 720, 900, 1100],
    fmt: v => `+${v}`,
  },
  reach: {
    icon: '🐾', name: 'Quick Paws',
    desc: 'Serve cats and grab food from further away.',
    values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
    costs: [40, 80, 140, 220, 310, 420, 550, 700, 880],
    fmt: v => `+${v}`,
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
  ghost: { secret: true }, // easter egg: tap the top-left window plant 5 times
};

// Ghost (secret cat) says these, cat-café riffs on his catchphrases (kept kid-friendly).
export const GHOST_LINES = [
  'Stay frosty, kitten.',
  'Be careful who you feed, Sergeant.',
  'You wanna be better than me? Serve faster.',
  "Afraid of the dark? Milk's in the fridge.",
  "Friendship's not in the café manual.",
  'Eyes on the bowls, chef.',
  'Mission complete. Next table.',
  'Quiet as a ghost. Hungry as a cat.',
];

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
