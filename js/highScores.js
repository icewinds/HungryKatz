// High Score Manager: permanent top-5 table of run scores (coins earned per run) with player names.
// save.highScores = [{ score: number, name: string }, ...] sorted high -> low.

export const NAME_MAX = 12;
/** Trim, collapse spaces, strip control chars, cap length. */
export const cleanName = name => String(name ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, NAME_MAX);

export class HighScoreManager {
  constructor(save, persist = () => {}, size = 5) {
    this.save = save;
    this.persist = persist;
    this.size = size;
  }

  list() { return this.save.highScores; }
  best() { return this.save.highScores[0]?.score || 0; }

  /** Insert a score; returns its 0-based rank, or -1 if it didn't make the table. */
  submit(score, name = '') {
    if (!(score > 0)) return -1;
    const entry = { score, name: cleanName(name) };
    const table = [...this.save.highScores, entry].sort((a, b) => b.score - a.score).slice(0, this.size);
    this.save.highScores = table;
    this.persist();
    return table.indexOf(entry);
  }

  /** Name (or rename) the entry at `rank`, e.g. after the player types it on Game Over. */
  setName(rank, name) {
    const entry = this.save.highScores[rank];
    if (!entry) return false;
    entry.name = cleanName(name);
    this.persist();
    return true;
  }
}
