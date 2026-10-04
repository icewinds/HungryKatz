# HungryKatz 🐱🍼

A cute cat-café game built as a mobile-first Progressive Web App (PWA). It uses plain HTML, CSS and JavaScript with Canvas 2D, and needs no build step and no dependencies.

Tap to walk. Grab milk from the fridge and cat food from the bowl, then walk into the waiting cats that want them before their timer ring runs out. If you miss 10 cats, the game is over.

## 1. Install dependencies

There aren't any. You only need **Node.js 18+** (`node -v`).

## 2. Start the local server

```bash
npm start
```

This prints `http://localhost:8080` plus a LAN address for your phone. To use a different port: `PORT=3000 npm start`.

Python works too: `python -m http.server 8080`.

## 3. Open in Chrome

Go to http://localhost:8080. For the debug overlay and test buttons, use http://localhost:8080/?debug (or Settings → Debug).

To simulate a phone in desktop Chrome, press F12, then Ctrl+Shift+M for the device toolbar.

## 4. Play on an Android phone (same Wi-Fi)

1. Run `npm start` and note the `http://192.168.x.x:8080` line.
2. Open that address in Chrome on the phone. If it doesn't load, allow Node through Windows Firewall (Private networks).

The game plays fine over plain `http://192.168…`. **Installing the app and offline play need HTTPS or `localhost`**, so use one of these:
- **USB port forwarding (recommended):** turn on USB debugging on the phone and connect it. On the PC open `chrome://inspect/#devices` → *Port forwarding* → `8080` → `localhost:8080`. On the phone, open `http://localhost:8080`. It counts as secure, so install and offline both work.
- Or on the phone open `chrome://flags/#unsafely-treat-insecure-origin-as-secure`, add `http://192.168.x.x:8080`, and relaunch Chrome.
- Or deploy to HTTPS (step 6).

## 5. Install as a PWA on Android

Open the game in Chrome over HTTPS or localhost. Then either:
- tap **📲 Install** on the main menu (it appears once Chrome decides the app can be installed), or
- tap **⋮ → Install app / Add to Home screen**.

The installed app launches full-screen in portrait, with no browser bar.

## 6. Deploy to a public HTTPS URL

It's a static folder, so any static host works. Upload the whole project; `tests/`, `tools/` and `server.js` are optional.
- **Netlify Drop:** drag the folder onto https://app.netlify.com/drop.
- **GitHub Pages:** push to a repo, then Settings → Pages → deploy from the `main` branch, root folder.
- **Cloudflare Pages / Vercel:** framework "None", no build command, output directory `/`.

Every time you deploy changes, **bump `CACHE` in `service-worker.js`** (e.g. `hungrykatz-v2`) so installed players get the new files.

## 7. Test offline

1. Load the game once over HTTPS or localhost. The service worker caches everything.
2. In Chrome DevTools → Application → Service Workers, tick **Offline**, then reload. On a phone, turn on airplane mode and open the installed app.
3. The game should launch and play normally. Saves are in localStorage, so they survive offline.

## Tests

```bash
npm test
```

These are Node tests of the gameplay rules: picking up milk and cat food separately, carrying 5 + 5, feeding the right food vs the wrong one, no feeding while a cat is still walking in, countdown and missed cats, game over at 10 misses, high-score saving, upgrade limits, and two cats never sharing a spot.

To test in the browser with `?debug`, use the panel buttons: **+500 coins** (upgrades), **Carry 5**, **Milk NPC / Food NPC** (spawn a specific request), **Expire NPCs** (countdown and leaving), **Missed=9** (then let one expire to reach Game Over) and **Reset save**. The panel shows player coordinates, inventory, NPC states, requests and timers, free spots and the current spawn stage. From the console, `window.hungryKatz` exposes the game state.

## Project structure

```
index.html            HUD + menu/upgrade/game-over overlays
manifest.json         PWA manifest
service-worker.js     offline cache (bump CACHE on deploy)
server.js             zero-dependency dev server
css/styles.css
js/
  game.js             entry: canvas scaling, input, render loop, PWA, debug
  gameManager.js      rules: feeding, scoring, missed, game over (no DOM)
  player.js npc.js npcSpawner.js inventory.js foodStation.js
  upgrades.js highScores.js storage.js audio.js ui.js
  achievements.js     sticker book (achievements + lifetime stats)
  icons.js            drawn icon set: replaces emoji in all UI text (add new emoji to its EMOJI map)
  art.js              procedural placeholder art (cats, food, café)
  config.js           ALL tuning: layout, spawn stages, upgrades, rewards
assets/ui             app icons (regenerate: npm run icons)
assets/fonts          Lilita One (all text) + Fredoka (fallback for rare characters), self-hosted (SIL Open Font License: OFL-LilitaOne.txt, OFL.txt)
assets/cats|food|backgrounds|audio   drop real art/audio here
tests/run.js
```

## Customising

- **Difficulty:** edit `SPAWN_STAGES` in `js/config.js`. Each stage sets the time it starts, the max cats at once, the spawn interval and patience.
- **Upgrades and costs:** `UPGRADES` in `js/config.js`.
- **Menu:** `FOODS` and `FOOD_UNLOCK_EVERY` in `js/config.js`. Milk is on the menu from level 1, and each following food unlocks every N restaurant levels. `bonus` is extra coins per serve.
- **Tips:** `TIPS` in `js/config.js` sets the chance of a tip and its minimum and maximum amount.
- **Café growth:** `TABLES` (unlock level per table), `DECOR_STAGES` (shabby/tidy/cosy/fancy levels) and `levelCrowdBonus` in `js/config.js`.
- **Difficulty:** `DIFFICULTY` in `js/config.js` (patience and spawn-gap multipliers, extra customers at once).
- **Scenes:** `THEMES` in `js/scene.js`. Each scene is a colour palette, and the makeover stages apply to every scene.
- **Stickers:** `STICKERS` in `js/achievements.js` (each has a `done(snapshot)` check).
- **Outfits:** `OUTFITS` in `js/config.js` (hats reuse cat accessories; aprons are colours).
- **Seasons:** `seasonFor` in `js/scene.js` picks Halloween (Oct), winter (1 Dec to 6 Jan) and Valentine's (1 to 14 Feb). Preview one with `?season=winter`, `halloween`, `valentine` or `none`.
- **Save backup:** Settings > Save backup copies a one-line code (`HK1.<checksum>.<base64 save>`, see `Storage.toCode` / `fromCode` in `js/storage.js`); Restore checks it and asks before replacing the café.
- **Relaxed mode:** the `relaxed` entry in `DIFFICULTY`. Customers wait forever, so there are no misses and no game over.
- **Combos, VIPs, specials, pets:** `COMBO`, `VIP`, `SPECIALS` (which weekdays), `PETS` and `PET_BONUS` in `js/config.js`.
- **Daily bonus:** `DAILY_REWARDS` in `js/config.js` sets the coins for each day of the 7-day streak.
- **Secret:** during play, tap the plant on the top-left window sill 5 times quickly to unlock the Ghost cat (5 more taps switches back).
- **Gnome:** in the Seaside Diner scene, tap the gnome on the right window sill to hear him scream (synthesised; set `SOUND_FILES.gnome` in `js/audio.js` to use your own clip).
- **Characters:** `CHARACTER_UNLOCKS` in `js/config.js` holds coin prices and high-score targets.
- **Real sprites:** each function in `js/art.js` (`drawCat`, `drawFoodIcon`, `drawBackground`) only takes a position and animation state (`idle`/`walk`/`eat`, mood `happy`/`sad`, `facing`). Replace its body with `ctx.drawImage(spriteSheet, …)`. The rest of the game won't need changes.
- **Music:** `TRACKS` in `js/audio.js` holds one 16-step loop per restaurant level (cycling). Set `SOUND_FILES.music` to use a single recorded track instead.
- **Real audio:** set paths in `SOUND_FILES` in `js/audio.js` (e.g. `click: 'assets/audio/click.mp3'`) and add the files to `ASSETS` in `service-worker.js`.
