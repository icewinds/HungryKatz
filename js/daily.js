// Daily Bonus: one claim per local calendar day, rewards grow over a 7-day streak.
// save.daily = { last: 'YYYY-MM-DD' | null, streak: 0..7 }
// ponytail: trusts the device clock; a server timestamp would stop clock-change cheating.

import { DAILY_REWARDS } from './config.js';

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
