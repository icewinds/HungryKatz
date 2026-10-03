// UI Manager: HTML overlays (HUD, menus, upgrade screen, game over).
// Buttons declare data-action="name"; clicks route to handlers[name](button).

import { UPGRADES, MAX_UPGRADE_LEVEL } from './config.js';

const $ = id => document.getElementById(id);

export class UIManager {
  constructor(handlers) {
    this.handlers = handlers;
    this.screens = {};
    for (const el of document.querySelectorAll('.screen')) this.screens[el.id.replace('screen-', '')] = el;
    this.hudCache = {};
    document.addEventListener('click', e => {
      const btn = e.target.closest('[data-action]');
      if (!btn || btn.disabled) return;
      handlers.click?.();
      handlers[btn.dataset.action]?.(btn);
    });
  }

  /** Show one overlay screen by name, or none with null. */
  show(name) {
    this.current = name;
    for (const [k, el] of Object.entries(this.screens)) el.classList.toggle('active', k === name);
  }

  showHud(on) {
    $('hud').classList.toggle('hidden', !on);
    $('tray').classList.toggle('hidden', !on);
  }

  /** One paw per allowed miss; missed ones turn red. */
  setMissed(n, max) {
    const box = $('hud-paws');
    if (box.children.length !== max) {
      const paw = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5.5" cy="10" r="2.6"/><circle cx="9.5" cy="5.5" r="2.6"/><circle cx="14.5" cy="5.5" r="2.6"/><circle cx="18.5" cy="10" r="2.6"/><ellipse cx="12" cy="16" rx="5.6" ry="4.6"/></svg>';
      box.innerHTML = `<span class="paw">${paw}</span>`.repeat(max);
    }
    if (this.hudCache.missed === n) return;
    this.hudCache.missed = n;
    [...box.children].forEach((p, i) => p.classList.toggle('on', i < n));
    box.setAttribute('aria-label', `Missed ${n} of ${max}`);
  }

  setLevelProgress(p) {
    const v = Math.round(p * 100) / 100;
    if (this.hudCache.lvlp === v) return;
    this.hudCache.lvlp = v;
    $('hud-lvlring').style.setProperty('--p', v);
  }

  updateHud(values) {
    for (const [k, v] of Object.entries(values)) {
      if (this.hudCache[k] === v) continue;
      this.hudCache[k] = v;
      $(`hud-${k}`).textContent = v;
    }
  }

  bump(id) {
    const el = $(id).closest('.bumpable') || $(id);
    el.classList.remove('bump');
    void el.offsetWidth; // restart the CSS animation
    el.classList.add('bump');
  }

  banner(text) {
    const b = $('banner');
    b.textContent = text;
    b.classList.remove('show');
    void b.offsetWidth;
    b.classList.add('show');
  }

  syncToggles(settings, debugOn) {
    const set = (cls, on, label) => document.querySelectorAll(cls).forEach(b => {
      b.setAttribute('aria-pressed', on);
      b.textContent = `${label}: ${on ? 'ON' : 'OFF'}`;
    });
    set('.toggle-music', settings.music, '🎵 Music');
    set('.toggle-sfx', settings.sfx, '🔊 Sound FX');
    set('.toggle-debug', debugOn, '🐞 Debug');
  }

  /**
   * Grid of cats. `chars` = CharacterManager; locked cats show a coin price
   * or the best score needed. `draw(canvas, look)` paints each portrait.
   */
  renderCharacters(looks, chars, coins, draw) {
    $('char-coins').textContent = coins;
    const list = $('char-list');
    list.innerHTML = looks.map(l => {
      const r = chars.rule(l.id), open = chars.isUnlocked(l.id);
      const tag = open ? '' : r.coins
        ? `<span class="char-tag ${coins < r.coins ? 'poor' : ''}">🪙 ${r.coins}</span>`
        : `<span class="char-tag score">🏆 ${r.score}</span>`;
      const label = open ? l.name : r.coins ? `${l.name}, costs ${r.coins} coins` : `${l.name}, unlocks at best score ${r.score}`;
      return `<button class="char ${open ? '' : r.coins ? 'locked' : 'locked score'}" data-action="pickCat" data-id="${l.id}" aria-label="${label}">
          <canvas width="140" height="140"></canvas>
          <span class="char-name">${l.name}</span>${tag}
        </button>`;
    }).join('');
    looks.forEach((l, i) => draw(list.children[i].querySelector('canvas'), l));
    this.selectCharacter(chars.current());
  }

  /** Feedback on one character card: 'bought' or 'poor' (same CSS as upgrade cards). */
  charEffect(id, kind) {
    const el = document.querySelector(`.char[data-id="${id}"]`);
    if (!el) return;
    el.classList.remove(kind);
    void el.offsetWidth;
    el.classList.add(kind);
  }

  /** Game-over line announcing cats unlocked by this run's score. */
  setUnlockNote(names) {
    const el = $('go-unlock');
    el.textContent = names.length ? `🎉 New cat unlocked: ${names.join(' & ')}!` : '';
    el.classList.toggle('hidden', !names.length);
  }

  selectCharacter(id) {
    for (const b of document.querySelectorAll('.char')) {
      const on = b.dataset.id === id;
      b.classList.toggle('selected', on);
      b.setAttribute('aria-pressed', on);
    }
  }

  setMenuBest(best) { $('menu-best').textContent = best; }

  renderUpgrades(upg, coins) {
    $('upg-coins').textContent = coins;
    $('upg-list').innerHTML = Object.entries(UPGRADES).map(([id, u]) => {
      const lvl = upg.level(id), max = upg.isMax(id), cost = upg.cost(id);
      const segs = Array.from({ length: MAX_UPGRADE_LEVEL }, (_, i) => `<span class="seg ${i < lvl ? 'on' : ''}"></span>`).join('');
      const next = max ? '' : ` → ${u.fmt(u.values[lvl])}`;
      return `<div class="upg" data-id="${id}">
        <div class="upg-ico">${u.icon}</div>
        <div class="upg-body">
          <div class="upg-name">${u.name}</div>
          <div class="upg-desc">${u.desc}</div>
          <div class="upg-lvl">Lv ${lvl}/${MAX_UPGRADE_LEVEL} · <b>${u.fmt(upg.value(id))}</b>${next}</div>
          <div class="bar">${segs}</div>
        </div>
        <button class="btn buy ${max ? 'max' : coins < cost ? 'poor' : ''}" data-action="buy" data-id="${id}" ${max ? 'disabled' : ''}>
          ${max ? 'MAX' : `🪙 ${cost}`}
        </button>
      </div>`;
    }).join('');
  }

  /** Purchase feedback on an upgrade card: 'bought' pops + confetti, 'poor' shakes. */
  cardEffect(id, kind) {
    const card = document.querySelector(`.upg[data-id="${id}"]`);
    if (!card) return;
    card.classList.add(kind);
    if (kind === 'bought') {
      for (let i = 0; i < 12; i++) {
        const s = document.createElement('span');
        s.className = 'confetti';
        s.style.setProperty('--dx', `${(Math.random() - 0.5) * 220}px`);
        s.style.setProperty('--dy', `${-40 - Math.random() * 90}px`);
        s.style.background = ['#ff8fab', '#ffd166', '#8fd9b6', '#9fd3ff', '#c8b6ff'][i % 5];
        card.appendChild(s);
      }
    }
  }

  showGameOver({ score, rank, scores }) {
    $('go-score').textContent = score;
    $('go-coins').textContent = score;
    $('go-best').classList.toggle('hidden', rank !== 0);
    $('go-scores').innerHTML = scores.length
      ? scores.map((s, i) => `<li class="${i === rank ? 'me' : ''}"><span>${i + 1}.</span><b>${s}</b></li>`).join('')
      : '<li><span>No scores yet</span></li>';
  }

  setInstall({ available, standalone }) {
    $('btn-install').classList.toggle('hidden', !available);
    $('install-hint').classList.toggle('hidden', standalone);
  }
}
