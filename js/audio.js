// Audio Manager. Placeholder sounds are synthesised with WebAudio.
// TO USE REAL AUDIO: drop files in /assets/audio and set paths below, e.g.
//   click: 'assets/audio/click.mp3'
// Any non-null entry replaces the synth sound. Also add the files to
// ASSETS in service-worker.js so they work offline.
export const SOUND_FILES = {
  music: null, click: null, pickup: null, feed: null, coin: null,
  arrive: null, sad: null, wrong: null, levelUp: null, gameOver: null, buy: null, tip: null,
};

// note = [freqHz, durationSec, waveType, delaySec = 0, slideToHz = freq]
const SYNTH = {
  click:    [[660, 0.06, 'triangle']],
  pickup:   [[520, 0.08, 'sine'], [780, 0.1, 'sine', 0.07]],
  feed:     [[300, 0.08, 'square', 0, 200], [280, 0.08, 'square', 0.1, 180]],
  coin:     [[988, 0.07, 'square'], [1319, 0.18, 'square', 0.07]],
  arrive:   [[500, 0.12, 'sine', 0, 820], [820, 0.12, 'sine', 0.12, 600]],
  sad:      [[440, 0.18, 'triangle', 0, 320], [330, 0.3, 'triangle', 0.16, 200]],
  wrong:    [[200, 0.12, 'square', 0, 160]],
  buy:      [[660, 0.08, 'square'], [880, 0.08, 'square', 0.08], [1320, 0.16, 'square', 0.16]],
  // cash-register "ka-ching": click, bell, sparkle
  tip:      [[1800, 0.03, 'square', 0, 1200], [1568, 0.08, 'triangle', 0.04], [2093, 0.3, 'sine', 0.09],
             [2637, 0.35, 'sine', 0.13], [3136, 0.4, 'sine', 0.18]],
  // fanfare: rising arpeggio, held major chord, sparkle on top
  levelUp:  [[523, 0.1, 'square'], [659, 0.1, 'square', 0.1], [784, 0.1, 'square', 0.2],
             [1047, 0.6, 'triangle', 0.32], [1319, 0.6, 'triangle', 0.32], [1568, 0.6, 'triangle', 0.32],
             [523, 0.6, 'sine', 0.32], [2093, 0.2, 'sine', 0.5], [2637, 0.3, 'sine', 0.6]],
  gameOver: [[523, 0.18, 'triangle'], [440, 0.18, 'triangle', 0.2], [349, 0.18, 'triangle', 0.4], [262, 0.45, 'triangle', 0.6]],
};

// 16-step loop of eighth notes (MIDI numbers, 0 = rest)
const MELODY = [72, 0, 76, 79, 76, 0, 74, 72, 74, 0, 77, 81, 79, 77, 76, 74];
const BASS   = [48, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 55, 0];
const STEP = 0.24;
const midi = m => 440 * 2 ** ((m - 69) / 12);

export class AudioManager {
  constructor(settings) {
    this.settings = settings; // shared with the save object: { music, sfx }
    this.ctx = null;
    this.musicOn = false;
  }

  /** Must be called from a user gesture (browser autoplay rules). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain(); this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain(); this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain(); this.musicGain.connect(this.master);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  play(name) {
    if (!this.settings.sfx) return;
    const file = SOUND_FILES[name];
    if (file) { const a = new Audio(file); a.volume = 0.7; a.play().catch(() => {}); return; }
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    for (const [f, d, type, delay = 0, slide] of SYNTH[name] || []) {
      this.note(f, d, type, 0.12, now + delay, this.sfxGain, slide);
    }
  }

  note(freq, dur, type, vol, when, dest, slideTo) {
    const o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, when);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, when + dur);
    g.gain.setValueAtTime(0.0001, when);
    g.gain.exponentialRampToValueAtTime(vol, when + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
    o.connect(g); g.connect(dest);
    o.start(when); o.stop(when + dur + 0.02);
  }

  startMusic() {
    if (!this.settings.music || this.musicOn) return;
    if (SOUND_FILES.music) {
      this.musicEl ??= Object.assign(new Audio(SOUND_FILES.music), { loop: true, volume: 0.4 });
      this.musicEl.play().catch(() => {});
      this.musicOn = true;
      return;
    }
    if (!this.ctx) return;
    this.musicOn = true;
    this.step = 0;
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  schedule() {
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      const m = MELODY[this.step % 16], b = BASS[this.step % 16];
      if (m) this.note(midi(m), STEP * 0.9, 'triangle', 0.05, this.nextTime, this.musicGain);
      if (b) this.note(midi(b), STEP * 1.8, 'sine', 0.08, this.nextTime, this.musicGain);
      this.step++;
      this.nextTime += STEP;
    }
  }

  stopMusic() {
    clearInterval(this.timer);
    this.musicEl?.pause();
    this.musicOn = false;
  }

  /** App hidden / shown (phone screen off, app switch). */
  suspend() { this.ctx?.suspend(); this.musicEl?.pause(); }
  resume() {
    this.ctx?.resume();
    if (this.musicOn && this.musicEl) this.musicEl.play().catch(() => {});
  }
}
