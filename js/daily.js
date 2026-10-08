// Daily Bonus: one claim per local calendar day, rewards grow over a 7-day streak.
// save.daily = { last: 'YYYY-MM-DD' | null, streak: 0..7 }
// ponytail: trusts the device clock; a server timestamp would stop clock-change cheating.

import { DAILY_REWARDS, CHALLENGES, CHALLENGES_PER_DAY } from './config.js';

/** Local calendar day as 'YYYY-MM-DD'. */
export const dayKey = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const yesterdayKey = d => dayKey(new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1));

export class DailyBonus {
  constructor(save, persist = () => {}) {
    this.save = save;
    this.persist = persist;
  }

  /** { available, day (1-based streak day to claim/claimed), reward, rewards } for `now`. */
  status(now = new Date()) {
    const { last, streak } = this.save.daily;
    const available = last !== dayKey(now);
    const continues = last === yesterdayKey(now) && streak < DAILY_REWARDS.length;
    const day = available ? (continues ? streak + 1 : 1) : streak;
    return { available, day, reward: DAILY_REWARDS[day - 1], rewards: DAILY_REWARDS };
  }

  /** Claim today's bonus. Returns coins added (0 if already claimed today). */
  claim(now = new Date()) {
    const s = this.status(now);
    if (!s.available) return 0;
    this.save.daily = { last: dayKey(now), streak: s.day };
    this.save.coins += s.reward;
    this.persist();
    return s.reward;
  }
}

/**
 * Today's challenges, rolled fresh on a new day from the dishes on the menu.
 * save.challenges = { day: 'YYYY-MM-DD', list: [{ kind, food, goal, reward, n, done }] }
 */
export function todaysChallenges(save, foods, now = new Date(), rng = Math.random) {
  const day = dayKey(now);
  if (save.challenges?.day === day) return save.challenges.list;
  const kinds = Object.keys(CHALLENGES), list = [];
  while (list.length < CHALLENGES_PER_DAY) {
    const kind = kinds.splice(Math.floor(rng() * kinds.length), 1)[0], c = CHALLENGES[kind];
    const i = Math.floor(rng() * c.goals.length);
    list.push({ kind, food: kind === 'food' ? foods[Math.floor(rng() * foods.length)] : null, goal: c.goals[i], reward: c.rewards[i], n: 0, done: false });
  }
  save.challenges = { day, list };
  return list;
}

/** Count `amount` towards today's `kind` challenges; pays out and returns the ones just finished. */
export function progressChallenges(save, list, kind, amount = 1, food = null) {
  const done = [];
  for (const c of list) {
    if (c.done || c.kind !== kind || (c.food && c.food !== food)) continue;
    c.n = Math.min(c.goal, CHALLENGES[kind].best ? Math.max(c.n, amount) : c.n + amount);
    if (c.n < c.goal) continue;
    c.done = true;
    save.coins += c.reward;
    save.stats.challenges = (save.stats.challenges ?? 0) + 1;
    done.push(c);
  }
  return done;
}
