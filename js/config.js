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
const SEAT_DX = 66;                      // side seats sit either side of each table
const SEAT_BACK = -34, SEAT_FRONT = 30;  // seat behind the table (faces us) and in front (back to us)
const blockerOf = t => ({ x: t.x - 44, y: t.y - 32, w: 88, h: 40 });

export const LAYOUT = {
  walk: { minX: 26, maxX: 514, minY: 248, maxY: 742 }, // where the player may stand (up to the kitchen counter)
  playerStart: { x: 270, y: 700 },
  entry: { x: -70, y: 330 },  // NPCs spawn here, off-screen left
  door: { x: 40, y: 330 },    // first waypoint just inside the door
  exit: { x: -80, y: 330 },   // NPCs are removed after reaching this
  windowBar: { x: 90, y: 168, w: 360, h: 54 },
  tables: TABLES,
  kitchenY: 770,              // top of the counter where the chef puts ready plates
  // Solid furniture for ALL tables (feet can't enter); see blockersForLevel for the active ones
  blockers: TABLES.map(blockerOf),
  // One spot per food along the counter: plates appear on the counter, the waiter collects them standing here
  pads: Object.fromEntries(FOODS.map((f, i) => [f.id, { x: 70 + i * 100, y: 744, r: 42 }])),
  // Waiting spots; NPCs stand at (x, y) = feet position, `face` = sprite direction.
  // Spots come in pairs (linked via `partner` below) that chat: bar neighbours, the two side seats
  // of a table, and its back + front seats. `back` = seated with their back to us.
  spots: [
    ...[150, 230, 310, 390].map((x, i) => ({ id: `W${i + 1}`, row: 'bar', x, y: BAR_Y, face: i % 2 ? -1 : 1, level: 1, back: true })),
    ...TABLES.flatMap((t, i) => [
      { id: `T${i + 1}a`, row: 'table', table: t, x: t.x - SEAT_DX, y: t.y, face: 1, level: t.level },
      { id: `T${i + 1}b`, row: 'table', table: t, x: t.x + SEAT_DX, y: t.y, face: -1, level: t.level },
      { id: `T${i + 1}c`, row: 'table', table: t, x: t.x, y: t.y + SEAT_BACK, face: 1, level: t.level },
      { id: `T${i + 1}d`, row: 'table', table: t, x: t.x, y: t.y + SEAT_FRONT, face: 1, level: t.level, back: true },
    ]),
  ],
};
for (let i = 0; i < LAYOUT.spots.length; i += 2) {
  const [a, b] = [LAYOUT.spots[i], LAYOUT.spots[i + 1]];
  a.partner = b;
  b.partner = a;
}
// Dish offsets on a table top per seat letter (the front seat's dish peeks out beside its back).
const TABLE_PLATES = { a: { x: -28, y: -34 }, b: { x: 28, y: -34 }, c: { x: 0, y: -44 }, d: { x: 16, y: -24 } };
// Where a served dish sits for each spot. `z` = depth-sort key (bar dishes sit on the
// back counter, table dishes on top of their table).
for (const s of LAYOUT.spots) {
  s.plate = s.row === 'bar'
    ? { x: s.x + s.face * 26, y: LAYOUT.windowBar.y + 14, z: 0 }
    : { ...TABLE_PLATES[s.id.at(-1)], z: s.table.y + 9 };
  if (s.row === 'table') { s.plate.x += s.table.x; s.plate.y += s.table.y; }
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

// Busier café at higher levels: extra customers allowed at once (on top of the run stage),
// +1 every 2 levels up to +6 (seats still cap it), and they arrive faster (spawn gap down to 60%).
export const levelCrowdBonus = level => Math.min(6, Math.floor((level - 1) / 2));
export const levelSpawnPace = level => Math.max(0.6, 1 - (level - 1) * 0.05);

// Player-chosen difficulty (Settings). patience/interval multiply, maxNpcs adds.
export const DIFFICULTY = {
  relaxed: { label: 'Relaxed', patience: 1, interval: 1.4, maxNpcs: -1, relaxed: true }, // nobody leaves sad, no game over
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

// Combo: serve again within `window` seconds to grow the streak; each step adds coins (capped). A miss resets it.
export const COMBO = { window: 12, bonusPerStep: 2, maxBonus: 10 };

// VIP customers (crown + gold ring): appear after `after` seconds of a run, less patient, pay `pay`x and always tip.
export const VIP = { chance: 0.12, after: 30, patience: 0.6, pay: 3 };

// Weekend specials: on these weekdays (0 = Sunday) some customers order two different dishes; pays both x bonus.
export const SPECIALS = { days: [0, 6], chance: 0.25, bonus: 1.5 };

// Café pets (bought once in the Upgrades screen; bonuses stack).
export const PETS = {
  goldfish: { icon: '🐟', name: 'Goldfish', cost: 300, desc: '+1 coin every time you serve.' },
  puppy: { icon: '🐶', name: 'Puppy', cost: 500, desc: 'Cosy company: customers wait 2s longer.' },
  parrot: { icon: '🦜', name: 'Parrot', cost: 800, desc: 'Chats up customers: +10% tip chance.' },
};
export const PET_BONUS = { goldfishCoins: 1, puppyPatience: 2, parrotTips: 0.1 };

// Regular customers: named cats who keep coming back for their favourite dish. Each serve fills their
// friendship meter; at full friendship they become best friends and bring a gift of coins.
export const FRIENDSHIP = { max: 5, chance: 0.15 }; // serves to best friends; chance a new customer is a regular
export const REGULARS = [
  { id: 'whiskers', name: 'Mrs Whiskers', fav: 'milk', gift: 120,
    look: { fur: '#c7c2d0', light: '#f4f1f8', dark: '#857f92', pattern: 'socks', acc: '#a07be0', eye: '#5a8fd6', patch: '#fff', accessory: 'glasses', size: 1, seed: 0.11 } },
  { id: 'pip', name: 'Little Pip', fav: 'milk', gift: 100,
    look: { fur: '#fdf6ef', light: '#ffffff', dark: '#d8c8b8', pattern: 'none', acc: '#ff8fab', eye: '#3b2a33', patch: '#fff', accessory: 'bow', size: 0.85, seed: 0.42 } },
  { id: 'biscotti', name: 'Biscotti', fav: 'catfood', gift: 150,
    look: { fur: '#c98b55', light: '#f6dcc0', dark: '#8a5a33', pattern: 'spots', acc: '#ff6b8a', eye: '#5cb85c', patch: '#fff', accessory: 'bell', size: 1.05, seed: 0.63 } },
  { id: 'captain', name: 'Captain Fluff', fav: 'fish', gift: 180,
    look: { fur: '#f0a55a', light: '#fff1dc', dark: '#b8702c', pattern: 'stripes', acc: '#5aa9e6', eye: '#3b2a33', patch: '#fff', accessory: 'hat', size: 1.1, seed: 0.27 } },
  { id: 'sakura', name: 'Sakura', fav: 'sushi', gift: 220,
    look: { fur: '#e8d3e8', light: '#fbf3fb', dark: '#a98aa9', pattern: 'spots', acc: '#ff8fab', eye: '#8a5cc7', patch: '#fff', accessory: 'flower', size: 1, seed: 0.81 } },
  { id: 'duke', name: 'The Duke', fav: 'cupcake', gift: 300,
    look: { fur: '#3f3846', light: '#f6f2f6', dark: '#221d27', pattern: 'tuxedo', acc: '#ffc94d', eye: '#e8b33a', patch: '#fff', accessory: 'scarf', size: 1.12, seed: 0.55 } },
];
// Recipe book: bronze, silver and gold stars for serving a dish this many times.
export const RECIPE_TIERS = [10, 50, 100];

// Clearing tables: happy customers leave their empty plate behind, and that seat can't be used until
// someone takes the plate back to the counter. Staff can be hired in the Upgrades screen.
export const CLEARING = {
  coinPerPlate: 1,               // the waiter earns this for each plate returned
  cleanerSpeed: 130,
  cleanerStack: 4,               // plates Dusty carries before heading to the counter
  cleanerHome: { x: 470, y: 700 },
  dropOff: { x: 270, y: 730 },   // where Dusty hands plates in
};
export const STAFF = {
  cleaner: { icon: '🧹', name: 'Dusty the cleaner', cost: 500, level: 5, desc: 'Clears empty plates from the tables for you.' },
};

// Wardrobe for your waiter cat (Choose cat screen). Hats reuse cat accessories; aprons recolour the apron.
export const OUTFITS = {
  hats: [
    { id: 'none', name: 'No hat', icon: '🐱', cost: 0 },
    { id: 'chef', name: 'Chef hat', icon: '🧑‍🍳', cost: 0 },
    { id: 'beanie', name: 'Beanie', icon: '🧶', cost: 60, color: '#5aa9e6' },
    { id: 'flower', name: 'Flower', icon: '🌸', cost: 80, color: '#ff8fab' },
    { id: 'party', name: 'Party hat', icon: '🥳', cost: 120, color: '#a07be0' },
    { id: 'beret', name: 'Beret', icon: '🎨', cost: 150, color: '#e8504f' },
    { id: 'hat', name: 'Top hat', icon: '🎩', cost: 200, color: '#ffc94d' },
    { id: 'crown', name: 'Crown', icon: '👑', cost: 400 },
  ],
  aprons: [
    { id: 'classic', name: 'Classic', icon: '🩷', cost: 0, color: null },
    { id: 'mint', name: 'Mint', icon: '🟢', cost: 40, color: '#6fcf9f' },
    { id: 'sky', name: 'Sky', icon: '🔵', cost: 40, color: '#7fb3ff' },
    { id: 'sunny', name: 'Sunny', icon: '🟡', cost: 40, color: '#ffc94d' },
    { id: 'grape', name: 'Grape', icon: '🟣', cost: 60, color: '#a07be0' },
    { id: 'cherry', name: 'Cherry', icon: '🔴', cost: 60, color: '#ff5d73' },
  ],
};

export const MAX_MISSED = 10;

// The kitchen behind the counter (kitchen.js): where each food is made, seconds per batch, chef positions and pace.
export const FOOD_SOURCE = { milk: 'fridge', cupcake: 'oven' }; // everything else cooks on a stove
export const COOK_TIME = { milk: 1.0, catfood: 1.8, fish: 2.4, sushi: 2.8, cupcake: 3.4 };
export const KITCHEN = {
  passY: 836,      // chef's feet while putting plates on the counter (back to us)
  stoveY: 902,     // chef's feet while cooking (facing us, behind the stove top)
  stoveTop: 890,   // top edge of the stove counter
  home: { x: 270, y: 902 },
  fridge: { x: 30, stand: { x: 80, y: 866 } },  // left end, next to the milk spot on the counter
  oven: { x: 510, stand: { x: 460, y: 866 } },   // right end, next to the cupcakes
  chefSpeed: 260,  // world px per second
  plateTime: 0.3,  // seconds to set plates down
  /** Stove x positions: 2 stoves, 3 once the café is cosy (L5), 4 when it is fancy (L9). */
  stovesFor: level => {
    const n = level >= 9 ? 4 : level >= 5 ? 3 : 2;
    return Array.from({ length: n }, (_, i) => 270 + (i - (n - 1) / 2) * 104);
  },
};
export const FEED_RADIUS = 46;   // player<->NPC contact distance
export const NPC_SPEED = 140;    // px per second
export const MAX_UPGRADE_LEVEL = 10;

// Each upgrade: `values` = effect at levels 1..10, `costs` = coins to go from level i to i+1.
export const UPGRADES = {
  carry: {
    icon: '🥛', name: 'Carry Capacity',
    desc: 'Carry more plates of every food; the chef cooks enough to fill your tray.',
    values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    costs: [40, 90, 160, 260, 380, 520, 700, 900, 1150],
    fmt: v => `${v} each`,
  },
  chef: {
    icon: '🧑‍🍳', name: 'Faster Chef',
    desc: 'Chef Biscuit cooks and plates every order faster.',
    values: [1, 1.12, 1.24, 1.36, 1.5, 1.64, 1.8, 1.96, 2.14, 2.35],
    costs: [50, 100, 170, 260, 380, 520, 700, 900, 1150],
    fmt: v => (v > 1 ? `+${Math.round((v - 1) * 100)}%` : 'normal'),
  },
  speed: {
    icon: '⚡', name: 'Movement Speed',
    desc: 'Your cat zooms around the café faster.',
    values: [170, 205, 240, 275, 310, 335, 360, 385, 410, 435],
    costs: [30, 70, 130, 220, 320, 440, 580, 750, 950],
    fmt: v => (v > 170 ? `+${Math.round((v / 170 - 1) * 100)}%` : 'normal'),
  },
  npcTime: {
    icon: '⏱️', name: 'Patience',
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
    fmt: v => `+${v} coin${v === 1 ? '' : 's'}`,
  },
  reach: {
    icon: '🐾', name: 'Quick Paws',
    desc: 'Serve cats and grab food from further away.',
    values: [0, 5, 10, 15, 20, 25, 30, 35, 40, 45],
    costs: [40, 80, 140, 220, 310, 420, 550, 700, 880],
    fmt: v => `+${Math.round((v / FEED_RADIUS) * 100)}%`,
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
  'Eat it and shut up.',
  "It's on the house, Johnny.",
];
// When Ghost serves a cupcake: [who, line] played out in turn ('cat' = the customer).
export const GHOST_CUPCAKE_SCENE = [
  ['cat', 'One black coffee, please.'],
  ['ghost', 'Eat it and shut up.'],
  ['cat', 'Is this... a threat?'],
  ['ghost', "It's on the house, Johnny."],
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
