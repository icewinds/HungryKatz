// Local Storage Manager: one JSON blob holds all permanent player data.

const KEY = 'hungrykatz.save.v1';
const mem = {}; // fallback when localStorage is unavailable (private mode, Node tests)

export const DEFAULT_SAVE = () => ({
  coins: 0,
  level: 1,
  totalEarned: 0,
  upgrades: { carry: 1, chef: 1, speed: 1, npcTime: 1, luckyTips: 1, plates: 1, reach: 1 },
  highScores: [],     // [{ score, name }] top 5
  playerName: '',     // last name typed on Game Over (prefills the next one)
  character: 'mango', // chosen player cat (art.js PLAYER_LOOKS id)
  ownedCats: [],      // cats bought with coins
  pets: [],           // café pets bought and at the café (PETS ids)
  petsAway: [],       // bought pets sent home (no bonus; can come back free)
  staff: [],          // hired staff (STAFF ids)
  daily: { last: null, streak: 0 }, // daily bonus: last claim day 'YYYY-MM-DD' + streak length
  stats: { served: 0, vips: 0, specials: 0, tips: 0, bestCombo: 0, gnome: false }, // lifetime, for stickers
  stickers: [],       // earned sticker ids (achievements.js)
  outfit: { hat: 'none', apron: 'classic' }, // what the waiter cat wears
  waiter: true,       // saves from before the kitchen rework still wear the old default chef hat
  ownedOutfits: [],   // bought hats/aprons ids
  settings: { music: true, sfx: true, debug: false, difficulty: 'normal', scene: 'strawberry' },
});

function read() {
  try {
    const v = globalThis.localStorage.getItem(KEY);
    if (v != null) return v;
  } catch { /* fall through to memory */ }
  return mem[KEY] ?? null;
}

/** Clean up any save-shaped object (from storage or a backup code): unknown or bad fields fall back to defaults. */
function sanitize(data) {
    const d = DEFAULT_SAVE();
    if (!data || typeof data !== 'object' || Array.isArray(data)) return d;
    const num = (v, def) => (Number.isFinite(v) ? v : def);
    return {
      coins: num(data.coins, 0),
      level: num(data.level, 1),
      totalEarned: num(data.totalEarned, 0),
      upgrades: { ...d.upgrades, ...data.upgrades },
      // old saves stored bare numbers; now { score, name }
      highScores: (Array.isArray(data.highScores) ? data.highScores : [])
        .map(e => (Number.isFinite(e) ? { score: e, name: '' } : e))
        .filter(e => e && Number.isFinite(e.score))
        .map(e => ({ score: e.score, name: typeof e.name === 'string' ? e.name.slice(0, 12) : '' }))
        .sort((a, b) => b.score - a.score)
        .slice(0, 5),
      playerName: typeof data.playerName === 'string' ? data.playerName.slice(0, 12) : '',
      character: typeof data.character === 'string' ? data.character : d.character,
      ownedCats: Array.isArray(data.ownedCats) ? data.ownedCats.filter(s => typeof s === 'string') : [],
      pets: Array.isArray(data.pets) ? data.pets.filter(s => typeof s === 'string') : [],
      petsAway: Array.isArray(data.petsAway) ? data.petsAway.filter(s => typeof s === 'string') : [],
      staff: Array.isArray(data.staff) ? data.staff.filter(s => typeof s === 'string') : [],
      stats: { ...d.stats, ...(data.stats && typeof data.stats === 'object' ? data.stats : {}) },
      stickers: Array.isArray(data.stickers) ? data.stickers.filter(x => typeof x === 'string') : [],
      outfit: (o => (data.waiter ? o : { ...o, hat: o.hat === 'chef' ? 'none' : o.hat }))( // old default chef hat -> waiter
        { ...d.outfit, ...(data.outfit && typeof data.outfit === 'object' ? data.outfit : {}) }),
      waiter: true,
      ownedOutfits: Array.isArray(data.ownedOutfits) ? data.ownedOutfits.filter(x => typeof x === 'string') : [],
      daily: {
        last: typeof data.daily?.last === 'string' ? data.daily.last : null,
        streak: Number.isInteger(data.daily?.streak) ? data.daily.streak : 0,
      },
      settings: { ...d.settings, ...data.settings },
    };
}

// Backup codes: "HK1.<checksum>.<base64url of the save JSON>". The checksum catches codes that were
// cut short or mistyped, so a broken paste never replaces a good café.
const CODE_PREFIX = 'HK1';
const checksum = str => { let h = 0x811c9dc5; for (let i = 0; i < str.length; i++) h = Math.imul(h ^ str.charCodeAt(i), 0x01000193); return (h >>> 0).toString(36); };
const toB64 = str => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64 = b64 => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0)));

export const Storage = {
  load() {
    let data;
    try { data = JSON.parse(read()); } catch { data = null; }
    return sanitize(data);
  },
  /** One-line backup code for the whole save. */
  toCode(data) {
    const json = JSON.stringify(data);
    return `${CODE_PREFIX}.${checksum(json)}.${toB64(json)}`;
  },
  /** Read a backup code back into a clean save; throws an Error with a player-friendly message. */
  fromCode(code) {
    const parts = String(code).replace(/\s+/g, '').split('.');
    if (parts[0] !== CODE_PREFIX || parts.length !== 3) throw new Error("That doesn't look like a HungryKatz backup code.");
    let json;
    try { json = fromB64(parts[2]); } catch { throw new Error('That code is damaged. Copy the whole code and try again.'); }
    if (checksum(json) !== parts[1]) throw new Error('That code is incomplete. Copy the whole code and try again.');
    let data;
    try { data = JSON.parse(json); } catch { throw new Error('That code is damaged. Copy the whole code and try again.'); }
    return sanitize(data);
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
