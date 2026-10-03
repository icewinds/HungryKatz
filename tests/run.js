// Gameplay rule tests (no browser needed): npm test

import assert from 'node:assert/strict';
import { GameManager } from '../js/gameManager.js';
import { UpgradeManager } from '../js/upgrades.js';
import { HighScoreManager } from '../js/highScores.js';
import { DEFAULT_SAVE, Storage } from '../js/storage.js';
import { PLAYER_LOOKS, playerLook } from '../js/art.js';
import { CharacterManager } from '../js/characters.js';
import { NpcSpawner } from '../js/npcSpawner.js';
import { Inventory } from '../js/inventory.js';
import { LAYOUT, MAX_MISSED } from '../js/config.js';

let passed = 0;
function test(name, fn) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (e) { console.error(`  ✗ ${name}\n    ${e.message}`); process.exitCode = 1; }
}

function setup(over = {}) {
  const save = { ...DEFAULT_SAVE(), ...over };
  const events = [];
  const gm = new GameManager({
    save,
    upgrades: new UpgradeManager(save),
    highScores: new HighScoreManager(save),
    onEvent: (t, d) => events.push([t, d]),
  });
  gm.startRun();
  gm.spawner.timer = Infinity; // tests spawn NPCs manually
  return { gm, save, events };
}
const tick = (gm, secs, dt = 1 / 60) => { for (let t = 0; t < secs; t += dt) gm.update(dt); };
const place = (gm, x, y) => { gm.player.x = x; gm.player.y = y; gm.player.stop(); };
const park = gm => place(gm, 260, 600); // middle of the floor, away from everything
function arrive(gm, opts) {
  park(gm);
  const npc = gm.spawnNpc(opts);
  for (let i = 0; i < 1200 && npc.state === 'entering'; i++) gm.update(1 / 60);
  assert.equal(npc.state, 'waiting');
  return npc;
}
const MAX5 = { upgrades: { carry: 5, speed: 1, npcTime: 1 } };

console.log('HungryKatz tests');

test('inventory: filling one food never touches the other', () => {
  const inv = new Inventory(5);
  assert.equal(inv.fill('milk'), 5);
  assert.equal(inv.fill('catfood'), 5);
  assert.deepEqual(inv.items, { milk: 5, catfood: 5 });
  assert.equal(inv.fill('milk'), 0);
  assert.equal(inv.take('catfood'), true);
  assert.deepEqual(inv.items, { milk: 5, catfood: 4 });
});

test('stations: carry 5 milk AND 5 cat food at once', () => {
  const { gm, events } = setup(MAX5);
  place(gm, LAYOUT.milkZone.x - 30, LAYOUT.milkZone.y); tick(gm, 0.05);
  assert.deepEqual(gm.inventory.items, { milk: 5, catfood: 0 });
  place(gm, LAYOUT.foodZone.x - 45, LAYOUT.foodZone.y); tick(gm, 0.05);
  assert.deepEqual(gm.inventory.items, { milk: 5, catfood: 5 });
  place(gm, LAYOUT.milkZone.x - 30, LAYOUT.milkZone.y); tick(gm, 0.05);
  assert.equal(events.filter(e => e[0] === 'pickup').length, 2, 'no pickup when already full');
});

test('feeding: correct food consumes one and pays coins + score', () => {
  const { gm, save } = setup(MAX5);
  gm.inventory.fill('milk'); gm.inventory.fill('catfood');
  const npc = arrive(gm, { spot: LAYOUT.spots[0], request: 'milk' });
  place(gm, npc.x, npc.y); tick(gm, 1 / 60);
  assert.deepEqual(gm.inventory.items, { milk: 4, catfood: 5 });
  assert.equal(npc.state, 'eating');
  assert.equal(save.coins, 10);
  assert.equal(gm.score, 10);
  park(gm); tick(gm, 6);
  assert.equal(gm.npcs.length, 0, 'fed NPC walks off and is removed');
});

test('feeding: wrong food changes nothing', () => {
  const { gm, save } = setup(MAX5);
  gm.inventory.fill('milk');
  const npc = arrive(gm, { spot: LAYOUT.spots[1], request: 'catfood' });
  place(gm, npc.x, npc.y); tick(gm, 0.5);
  assert.deepEqual(gm.inventory.items, { milk: 5, catfood: 0 });
  assert.equal(npc.state, 'waiting');
  assert.equal(save.coins, 0);
  assert.equal(gm.score, 0);
});

test('feeding: impossible while NPC is still walking in', () => {
  const { gm } = setup(MAX5);
  gm.inventory.fill('milk');
  const npc = gm.spawnNpc({ spot: LAYOUT.spots[2], request: 'milk' });
  tick(gm, 0.3);
  place(gm, npc.x, npc.y); tick(gm, 1 / 60);
  assert.equal(npc.state, 'entering');
  assert.equal(gm.inventory.count('milk'), 5);
});

test('countdown: unfed NPC leaves sad and counts as missed', () => {
  const { gm, events } = setup();
  const npc = arrive(gm, { spot: LAYOUT.spots[3], request: 'milk', patience: 2 });
  tick(gm, 2.1);
  assert.equal(gm.missed, 1);
  assert.equal(npc.state, 'leaving');
  assert.equal(npc.mood, 'sad');
  assert.ok(events.some(e => e[0] === 'missed'));
  tick(gm, 8);
  assert.equal(gm.npcs.length, 0);
});

test(`game over after ${MAX_MISSED} misses; score saved; run reset; upgrades kept`, () => {
  const { gm, save, events } = setup(MAX5);
  gm.score = 120;
  park(gm);
  for (let i = 0; i < MAX_MISSED; i++) gm.spawnNpc({ spot: LAYOUT.spots[i], request: 'milk', patience: 0.5 });
  tick(gm, 20);
  assert.equal(gm.state, 'over');
  const over = events.find(e => e[0] === 'gameOver')[1];
  assert.equal(over.score, 120);
  assert.deepEqual(save.highScores, [120]);
  assert.equal(gm.missed, 0);
  assert.equal(save.upgrades.carry, 5);
  gm.startRun();
  assert.equal(gm.score, 0);
  assert.deepEqual(save.highScores, [120]);
});

test('upgrades: spending coins does not lower run score; max level 5', () => {
  const { gm, save } = setup();
  gm.inventory.fill('milk');
  const npc = arrive(gm, { spot: LAYOUT.spots[4], request: 'milk' });
  place(gm, npc.x, npc.y); tick(gm, 1 / 60);
  save.coins = 1000;
  const up = gm.upgrades;
  assert.equal(up.buy('carry'), true);
  assert.equal(gm.score, 10);
  while (up.buy('carry'));
  assert.equal(up.level('carry'), 5);
  assert.equal(up.cost('carry'), null);
  assert.equal(up.buy('carry'), false);
  gm.applyUpgrades();
  assert.equal(gm.inventory.max, 5);
});

test('high scores: top 5, sorted high to low', () => {
  const save = DEFAULT_SAVE();
  const hs = new HighScoreManager(save);
  for (const s of [300, 1200, 0, 500, 950, 700, 100]) hs.submit(s);
  assert.deepEqual(hs.list(), [1200, 950, 700, 500, 300]);
  assert.equal(hs.best(), 1200);
});

test('pathing: walks around tables instead of getting stuck', () => {
  const { gm } = setup();
  const [t1, , t3] = LAYOUT.tables;
  const trips = [
    [[t1.x, t1.y - 60], [t1.x, t1.y + 40]],     // straight through table 1
    [[t3.x - 120, t3.y - 10], [t3.x + 120, t3.y - 10]], // across table 3
    [[270, 700], [150, 300]],                   // pads area -> window bar
    [[60, 300], [LAYOUT.foodZone.x, LAYOUT.foodZone.y]], // door -> food pad
  ];
  for (const [[sx, sy], [tx, ty]] of trips) {
    place(gm, sx, sy);
    gm.tap(tx, ty);
    tick(gm, 8);
    assert.ok(Math.hypot(gm.player.x - tx, gm.player.y - ty) < 1,
      `(${sx},${sy})->(${tx},${ty}) ended at (${gm.player.x | 0},${gm.player.y | 0})`);
  }
});

test('pathing: customers walk around tables to every seat', () => {
  const { gm } = setup();
  park(gm);
  for (const spot of LAYOUT.spots) gm.spawnNpc({ spot, request: 'milk', patience: 999 });
  const inTable = n => LAYOUT.blockers.some(r => n.x > r.x && n.x < r.x + r.w && n.y > r.y && n.y < r.y + r.h);
  for (let i = 0; i < 60 * 15; i++) {
    gm.update(1 / 60);
    assert.ok(!gm.npcs.some(inTable), 'an NPC walked through a table');
  }
  assert.ok(gm.npcs.every(n => n.state === 'waiting'), 'every NPC reached its seat');
});

test('characters: coin cats are bought once; score cats unlock from best score', () => {
  const save = DEFAULT_SAVE();
  const hs = new HighScoreManager(save);
  const ch = new CharacterManager(save, hs);
  assert.deepEqual(ch.unlocked(), ['mango']);
  assert.equal(ch.select('smokey'), false, 'locked cat cannot be selected');
  save.coins = 50;
  assert.equal(ch.buy('smokey'), false, 'too expensive');
  assert.equal(save.coins, 50);
  save.coins = 100;
  assert.equal(ch.buy('smokey'), true);
  assert.equal(save.coins, 20);
  assert.equal(ch.buy('smokey'), false, 'already owned');
  assert.equal(ch.buy('lilac'), false, 'score cats are not for sale');
  hs.submit(299);
  assert.equal(ch.isUnlocked('lilac'), false);
  hs.submit(300);
  assert.equal(ch.isUnlocked('lilac'), true);
  assert.equal(ch.isUnlocked('cocoa'), false);
  assert.equal(ch.select('lilac'), true);
  assert.equal(ch.current(), 'lilac');
  save.character = 'cocoa'; // e.g. tampered save
  assert.equal(ch.current(), 'mango', 'locked pick falls back to the starter');
});

test('character: choice persists; unknown ids fall back to the default cat', () => {
  Storage.save({ ...DEFAULT_SAVE(), character: 'oreo' });
  assert.equal(Storage.load().character, 'oreo');
  assert.equal(playerLook('oreo').name, 'Oreo');
  assert.equal(playerLook('nope').id, PLAYER_LOOKS[0].id);
  Storage.reset();
  assert.equal(Storage.load().character, PLAYER_LOOKS[0].id);
});

test('social seating: friends take a pair; loners sit beside someone; early game stays solo', () => {
  const stage = (maxNpcs) => [{ at: 0, maxNpcs, interval: [1, 1], patience: 10 }];
  // rng 0 => duo/neighbour rolls always succeed
  const duo = new NpcSpawner(stage(4), LAYOUT.spots, () => 0);
  duo.timer = 0;
  const pair = duo.update(0.1, 0, []);
  assert.equal(pair.length, 2);
  assert.equal(pair[0].spot.partner, pair[1].spot, 'friends sit side by side');
  assert.equal(pair[1].trail, 1);

  const solo = new NpcSpawner(stage(1), LAYOUT.spots, () => 0);
  solo.timer = 0;
  assert.equal(solo.update(0.1, 0, []).length, 1, 'no duos while only 1 cat allowed');

  const someone = { spot: LAYOUT.spots[5], state: 'waiting' };
  const near = new NpcSpawner(stage(2), LAYOUT.spots, (() => { let i = 0; return () => (i++ === 0 ? 0.99 : 0); })());
  near.timer = 0;
  const [lone] = near.update(0.1, 0, [someone]);
  assert.equal(lone.spot, someone.spot.partner, 'lone cat sits next to the waiting cat');
});

test('spawner: never two NPCs on the same spot; respects stage cap', () => {
  const { gm } = setup();
  gm.spawner.timer = 0;
  gm.runTime = 1000; // hardest stage
  park(gm);
  for (let i = 0; i < 60 * 90; i++) {
    gm.update(1 / 60);
    const present = gm.npcs.filter(n => n.state !== 'leaving');
    assert.equal(new Set(present.map(n => n.spot)).size, present.length);
    assert.ok(present.length <= 6);
    if (gm.state !== 'playing') break;
  }
});

console.log(`${passed} passed`);
