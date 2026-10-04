// Local Storage Manager: one JSON blob holds all permanent player data.

const KEY = 'hungrykatz.save.v1';
const mem = {}; // fallback when localStorage is unavailable (private mode, Node tests)

export const DEFAULT_SAVE = () => ({
  coins: 0,
  level: 1,
  totalEarned: 0,
  upgrades: { carry: 1, speed: 1, npcTime: 1, luckyTips: 1, plates: 1, reach: 1 },
  highScores: [],
  character: 'mango', // chosen player cat (art.js PLAYER_LOOKS id)
  ownedCats: [],      // cats bought with coins
  daily: { last: null, streak: 0 }, // daily bonus: last claim day 'YYYY-MM-DD' + streak length
  settings: { music: true, sfx: true, debug: false },
});

function read() {
  try {
    const v = globalThis.localStorage.getItem(KEY);
    if (v != null) return v;
  } catch { /* fall through to memory */ }
  return mem[KEY] ?? null;
}

export const Storage = {
  load() {
    const d = DEFAULT_SAVE();
    let data;
    try { data = JSON.parse(read()); } catch { data = null; }
    if (!data || typeof data !== 'object') return d;
    const num = (v, def) => (Number.isFinite(v) ? v : def);
    return {
      coins: num(data.coins, 0),
      level: num(data.level, 1),
      totalEarned: num(data.totalEarned, 0),
      upgrades: { ...d.upgrades, ...data.upgrades },
      highScores: Array.isArray(data.highScores) ? data.highScores.filter(Number.isFinite).slice(0, 5) : [],
      character: typeof data.character === 'string' ? data.character : d.character,
      ownedCats: Array.isArray(data.ownedCats) ? data.ownedCats.filter(s => typeof s === 'string') : [],
      daily: {
        last: typeof data.daily?.last === 'string' ? data.daily.last : null,
        streak: Number.isInteger(data.daily?.streak) ? data.daily.streak : 0,
      },
      settings: { ...d.settings, ...data.settings },
    };
  },
  save(data) {
    const raw = JSON.stringify(data);
    mem[KEY] = raw;
    try { globalThis.localStorage.setItem(KEY, raw); } catch { /* memory only */ }
  },
  reset() {
    delete mem[KEY];
    try { globalThis.localStorage.removeItem(KEY); } catch { /* ignore */ }
  },
};
