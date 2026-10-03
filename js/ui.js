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

  showHud(on) { $('hud').classList.toggle('hidden', !on); }

  updateHud(values) {
    for (const [k, v] of Object.entries(values)) {
      if (this.hudCache[k] === v) continue;
      this.hudCache[k] = v;
      $(`hud-${k}`).textContent = v;
    }
  }

  bump(id) {
    const el = $(id).closest('.pill') || $(id);
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
