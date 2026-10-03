// High Score Manager: permanent top-5 table of run scores (coins earned per run).

export class HighScoreManager {
  constructor(save, persist = () => {}, size = 5) {
    this.save = save;
    this.persist = persist;
    this.size = size;
  }

  list() { return this.save.highScores; }
  best() { return this.save.highScores[0] || 0; }

  /** Insert a score; returns its 0-based rank, or -1 if it didn't make the table. */
  submit(score) {
    if (!(score > 0)) return -1;
    const table = [...this.save.highScores, score].sort((a, b) => b - a).slice(0, this.size);
    this.save.highScores = table;
    this.persist();
    return table.indexOf(score);
  }
}
