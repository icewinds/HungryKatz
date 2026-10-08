// Sticker book: collectable achievements. Each sticker checks a snapshot of the save.
// save.stats = { served, vips, specials, tips, bestCombo, gnome, byFood }, save.stickers = [earned ids].
// `tier` (bronze / silver / gold) marks stickers that come in a series.

import { REGULARS, FRIENDSHIP, FOODS, RECIPE_TIERS } from './config.js';

export const STICKERS = [
  { id: 'first', icon: '🍼', name: 'First customer', desc: 'Serve your very first cat.', done: s => s.stats.served >= 1 },
  { id: 'serve100', icon: '😺', name: 'Busy café', desc: 'Serve 100 cats.', tier: 'bronze', done: s => s.stats.served >= 100 },
  { id: 'serve500', icon: '🏆', name: 'Café legend', desc: 'Serve 500 cats.', tier: 'silver', done: s => s.stats.served >= 500 },
  { id: 'serve1000', icon: '🎉', name: 'Café superstar', desc: 'Serve 1,000 cats.', tier: 'gold', done: s => s.stats.served >= 1000 },
  { id: 'combo5', icon: '🔥', name: 'On fire', desc: 'Reach a Combo ×5.', done: s => s.stats.bestCombo >= 5 },
  { id: 'vip', icon: '👑', name: 'Royal service', desc: 'Serve a VIP cat.', done: s => s.stats.vips >= 1 },
  { id: 'special', icon: '🍽️', name: 'Weekend chef', desc: 'Serve a two-dish special.', done: s => s.stats.specials >= 1 },
  { id: 'tips25', icon: '💰', name: 'Tip jar', desc: 'Get 25 tips.', done: s => s.stats.tips >= 25 },
  { id: 'score500', icon: '⭐', name: 'Superstar', desc: 'Score 500 in one game.', done: s => s.best >= 500 },
  { id: 'tidy', icon: '🧹', name: 'Spring clean', desc: 'Fix up your shabby café (level 3).', done: s => s.level >= 3 },
  { id: 'fancy', icon: '✨', name: 'Fancy café', desc: 'Reach a fancy café (level 8).', done: s => s.level >= 8 },
  { id: 'cupcake', icon: '🧁', name: 'Full menu', desc: 'Unlock every food (level 9).', done: s => s.level >= 9 },
  { id: 'pets', icon: '🐾', name: 'Pet lover', desc: 'Adopt all three café pets.', done: s => s.pets >= 3 },
  { id: 'streak7', icon: '🎁', name: 'Loyal regular', desc: 'Claim a 7-day daily bonus streak.', done: s => s.streak >= 7 },
  { id: 'gnome', icon: '🧙', name: 'Hoo goes there?', desc: 'Find the gnome in the Seaside Diner.', done: s => s.stats.gnome },
  { id: 'friend', icon: '💖', name: 'Best friends', desc: 'Become best friends with a regular.', tier: 'bronze', done: s => s.bestFriends >= 1 },
  { id: 'friendsAll', icon: '🥳', name: 'Everybody\'s friend', desc: 'Become best friends with every regular.', tier: 'gold', done: s => s.bestFriends >= REGULARS.length },
  { id: 'recipesGold', icon: '📖', name: 'Master menu', desc: 'Earn a gold star for every dish.', tier: 'gold', done: s => s.goldRecipes >= FOODS.length },
  { id: 'challenges10', icon: '🎯', name: 'Go-getter', desc: 'Finish 10 daily challenges.', tier: 'silver', done: s => (s.stats.challenges ?? 0) >= 10 },
  { id: 'ghost', icon: '🎖️', name: 'Secret agent', desc: 'Discover the secret cat.', done: s => s.ghost },
];

/** Award any newly earned stickers (mutates save.stickers). Returns the new STICKERS entries. */
export function awardStickers(save, bestScore) {
  const snap = {
    stats: save.stats, level: save.level, best: bestScore,
    pets: save.pets.length, streak: save.daily?.streak ?? 0, ghost: save.ownedCats.includes('ghost'),
    bestFriends: Object.values(save.friends ?? {}).filter(v => v >= FRIENDSHIP.max).length,
    goldRecipes: FOODS.filter(f => (save.stats.byFood?.[f.id] ?? 0) >= RECIPE_TIERS.at(-1)).length,
  };
  const fresh = STICKERS.filter(st => !save.stickers.includes(st.id) && st.done(snap));
  for (const st of fresh) save.stickers.push(st.id);
  return fresh;
}

/** Update lifetime stats from a 'feed' event. */
export function recordServe(stats, { npc, tip, combo, vip }) {
  stats.served++;
  stats.byFood ??= {};
  for (const f of npc?.requests ?? []) stats.byFood[f] = (stats.byFood[f] ?? 0) + 1;
  if (vip) stats.vips++;
  if (npc?.requests?.length > 1) stats.specials++;
  if (tip) stats.tips++;
  stats.bestCombo = Math.max(stats.bestCombo, combo || 0);
}
