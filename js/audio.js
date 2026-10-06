// Audio Manager. Placeholder sounds are synthesised with WebAudio.
// TO USE REAL AUDIO: drop files in /assets/audio and set paths below, e.g.
//   click: 'assets/audio/click.mp3'
// Any non-null entry replaces the synth sound. Also add the files to
// ASSETS in service-worker.js so they work offline.
export const SOUND_FILES = {
  music: null, click: null, pickup: null, feed: null, coin: null,
  arrive: null, sad: null, wrong: null, levelUp: null, gameOver: null, buy: null, tip: null,
  bell: null, plate: null, gnome: null, // e.g. 'assets/audio/gnome.mp3' to use your own clip
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
  plate:    [[1320, 0.06, 'triangle'], [1760, 0.12, 'triangle', 0.05]], // plates set on the counter
  // café door bell: two bright "ding-ding" chimes
  bell:     [[1568, 0.5, 'sine'], [3136, 0.25, 'sine', 0.01], [2093, 0.7, 'sine', 0.14], [4186, 0.3, 'sine', 0.15]],
  gameOver: [[523, 0.18, 'triangle'], [440, 0.18, 'triangle', 0.2], [349, 0.18, 'triangle', 0.4], [262, 0.45, 'triangle', 0.6]],
};

// Background music: one 16-step loop per restaurant level (cycles after the last).
// melody/bass = MIDI notes per eighth-note step (0 = rest), step = seconds per step,
// lead = oscillator type, hat = soft hi-hat tick on off-beats.
export const TRACKS = [
  { name: 'Morning Milk', step: 0.24, lead: 'triangle', hat: false,
    melody: [72, 0, 76, 79, 76, 0, 74, 72, 74, 0, 77, 81, 79, 77, 76, 74],
    bass:   [48, 0, 0, 0, 53, 0, 0, 0, 55, 0, 0, 0, 48, 0, 55, 0] },
  { name: 'Bouncy Biscuits', step: 0.21, lead: 'square', hat: true,
    melody: [67, 71, 74, 71, 72, 0, 71, 69, 67, 0, 69, 71, 72, 74, 71, 0],
    bass:   [43, 0, 50, 0, 48, 0, 50, 0, 43, 0, 50, 0, 45, 0, 50, 0] },
  { name: 'Dreamy Dozing', step: 0.29, lead: 'sine', hat: false,
    melody: [77, 0, 76, 72, 74, 0, 72, 69, 70, 0, 72, 74, 72, 0, 69, 0],
    bass:   [41, 0, 0, 48, 46, 0, 0, 48, 41, 0, 0, 48, 43, 0, 48, 0] },
  { name: 'Jazzy Whiskers', step: 0.23, lead: 'triangle', hat: true,
    melody: [69, 72, 76, 0, 74, 72, 71, 0, 72, 76, 79, 77, 76, 0, 72, 0],
    bass:   [45, 0, 52, 0, 50, 0, 52, 0, 45, 0, 52, 0, 47, 0, 52, 0] },
  { name: 'Zoomies', step: 0.19, lead: 'square', hat: true,
    melody: [74, 74, 78, 81, 78, 0, 76, 74, 76, 0, 79, 78, 76, 0, 73, 0],
    bass:   [50, 0, 57, 0, 55, 0, 57, 0, 50, 0, 57, 0, 45, 0, 57, 0] },
  { name: 'Sweet Treats', step: 0.25, lead: 'triangle', hat: false,
    melody: [75, 79, 82, 79, 80, 0, 79, 77, 75, 0, 77, 79, 80, 82, 79, 0],
    bass:   [51, 0, 58, 0, 56, 0, 58, 0, 51, 0, 58, 0, 53, 0, 58, 0] },
];
/** Track index for a restaurant level (level 1 -> track 0, cycling). */
export const trackForLevel = level => (Math.max(1, level) - 1) % TRACKS.length;
const FADE = 0.7; // seconds to fade between tracks
const midi = m => 440 * 2 ** ((m - 69) / 12);

export class AudioManager {
  constructor(settings) {
    this.settings = settings; // shared with the save object: { music, sfx }
    this.ctx = null;
    this.musicOn = false;
    this.trackIndex = 0;
    this.track = TRACKS[0];
    this.pending = null; // track waiting for the fade-out to finish
  }

  /** Switch background music (e.g. on level up); crossfades if music is playing. */
  setTrack(i) {
    if (i === this.trackIndex) return;
    this.trackIndex = i;
    if (!this.ctx || !this.musicOn || SOUND_FILES.music) { this.track = TRACKS[i]; return; }
    const g = this.musicGain.gain, now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0, now + FADE);
    this.pending = { track: TRACKS[i], at: now + FADE };
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
    if (name === 'gnome') { this.gnomeVoice(now); return; }
    for (const [f, d, type, delay = 0, slide] of SYNTH[name] || []) {
      this.note(f, d, type, 0.12, now + delay, this.sfxGain, slide);
    }
  }

  /** Squeaky garden-gnome "HOOO!": sawtooth voice through "oo" formants, pitch whoop + vibrato, breathy h. */
  gnomeVoice(when) {
    const ctx = this.ctx, out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, when);
    out.gain.exponentialRampToValueAtTime(0.5, when + 0.06);
    out.gain.setValueAtTime(0.5, when + 0.5);
    out.gain.exponentialRampToValueAtTime(0.0001, when + 0.85);
    out.connect(this.sfxGain);
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(520, when);
    o.frequency.exponentialRampToValueAtTime(780, when + 0.14);
    o.frequency.exponentialRampToValueAtTime(640, when + 0.85);
    const lfo = ctx.createOscillator(), wobble = ctx.createGain();
    lfo.frequency.value = 7; wobble.gain.value = 20;
    lfo.connect(wobble); wobble.connect(o.frequency);
    for (const [f, q, g] of [[520, 4, 1], [1050, 6, 0.45], [2600, 8, 0.12]]) { // "oo" vowel formants
      const bp = ctx.createBiquadFilter(), gg = ctx.createGain();
      bp.type = 'bandpass'; bp.frequency.value = f; bp.Q.value = q; gg.gain.value = g;
      o.connect(bp); bp.connect(gg); gg.connect(out);
    }
    const len = 0.1, buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const h = ctx.createBufferSource(), hp = ctx.createBiquadFilter(), hg = ctx.createGain();
    h.buffer = buf; hp.type = 'highpass'; hp.frequency.value = 1400;
    hg.gain.setValueAtTime(0.3, when); hg.gain.exponentialRampToValueAtTime(0.0001, when + len);
    h.connect(hp); hp.connect(hg); hg.connect(this.sfxGain);
    h.start(when);
    o.start(when + 0.04); lfo.start(when + 0.04);
    o.stop(when + 0.9); lfo.stop(when + 0.9);
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
    if (this.pending) { this.track = this.pending.track; this.pending = null; }
    const g = this.musicGain.gain;
    g.cancelScheduledValues(this.ctx.currentTime);
    g.setValueAtTime(1, this.ctx.currentTime);
    this.nextTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.schedule(), 60);
  }

  schedule() {
    while (this.nextTime < this.ctx.currentTime + 0.3) {
      if (this.pending && this.nextTime >= this.pending.at) { // fade-out done: start the new tune
        this.track = this.pending.track;
        this.pending = null;
        this.step = 0;
        const g = this.musicGain.gain;
        g.setValueAtTime(0, this.nextTime);
        g.linearRampToValueAtTime(1, this.nextTime + FADE);
      }
      const { melody, bass, step, lead, hat } = this.track, i = this.step % 16;
      const leadVol = lead === 'square' ? 0.03 : lead === 'sine' ? 0.06 : 0.05; // square is louder
      if (melody[i]) this.note(midi(melody[i]), step * 0.9, lead, leadVol, this.nextTime, this.musicGain);
      if (bass[i]) this.note(midi(bass[i]), step * 1.8, 'sine', 0.08, this.nextTime, this.musicGain);
      if (hat && i % 2) this.note(7000, 0.03, 'square', 0.006, this.nextTime, this.musicGain);
      this.step++;
      this.nextTime += step;
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
