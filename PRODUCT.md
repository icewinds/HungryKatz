# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

All ages, casual players, on phones first. The design floor is a reader of about 10+, so short sentences are fine, but icons and sound still carry the moment-to-moment game. Calleigh, the developer's daughter, was the first player and remains a regular one; the game is now shared publicly with friends and family.

## Product Purpose

HungryKatz is a cosy cat-café game: tap to walk your chef cat, pick up food at the kitchen pads, and serve hungry cat customers before they leave sad. Success is a short, happy play session that makes people want to come back (daily bonus, stickers, unlocks), not grinding or pressure.

## Positioning

A hand-made, family game: built for one child, grown feature by feature from her requests (the screaming seaside gnome, the Ghost easter egg, Snowy and Frankie as characters). Everything is drawn in code, so it has no stock assets and no store-game monetisation.

## Operating Context

- Played mostly in portrait on phones, installed to the home screen or in a mobile browser. Desktop works too.
- Sessions are short: one run, a game over (or none in Relaxed mode), then upgrades, outfits and stickers.
- Shared by link (Share buttons, OG preview) from https://hungrykatz.solutioncloud.tech/.

## Capabilities and Constraints

- **Stack:** vanilla ES modules, Canvas 2D world (540×960, scaled to "contain"), HTML overlays for HUD and screens, no build step. Hosted on GitHub Pages.
- **Hard rule: works offline on phones.** Installable PWA with a service worker; `CACHE` is bumped on every deploy.
- **Security:** a strict CSP (`default-src 'self'`, no inline styles), self-hosted font, and DOM APIs for dynamic text.
- **Saves:** localStorage only (`hungrykatz.save.v1`), sanitised on load.
- **Features:**
  - Levels with food unlocks and a café that grows from shabby to fancy.
  - Difficulty (Relaxed, Easy, Normal, Hard) and four scenes.
  - Character select, plus an outfit wardrobe.
  - Upgrades and café pets (send home or bring back).
  - Combos, VIPs and weekend specials.
  - Daily bonus, sticker book, seasonal decorations, high scores with names, and tap-queue movement.
- **Debug:** tools exist only behind `?debug`.
- **Open decisions (not yet committed either way):**
  - Ads or in-app purchases. There are none today.
  - Accounts or cloud saves. Google login via Firebase was discussed but not chosen, and a save-backup code was suggested as the alternative.
  - A license.

## Brand Commitments

- Name: **HungryKatz**.
- The help screen carries a dedication to Calleigh. It is an existing personal touch, not marked as binding.
- Character names in use: Mango, Smokey, Frankie (id `oreo`), Snowy (id `mochi`), Lilac, Cocoa, and the secret Ghost. Ids stay stable so saves keep working when names change.

## Evidence on Hand

- The live game and its source in this repo, plus the app icons in `assets/ui` and the Fredoka and Lilita One fonts (both OFL) in `assets/fonts`.
- There are no player testimonials, reviews, download counts or press. Do not invent any.

## Product Principles

1. **Phone in hand, offline is fine.** Every feature must work on a phone without a connection.
2. **Cosy over punishing.** Challenge scales with level and difficulty, and there is always a gentle way to play.
3. **Personal and hand-made.** Small surprises and named characters matter more than generic polish.
4. **Never lose progress.** Saves are sanitised and ids stay stable across renames.

## Accessibility & Inclusion

- Readable by about 10+ readers.
- Large tap targets, because play is touch-first.
- Sound is never the only signal, since sound effects and music can each be switched off.
- An earlier Lighthouse accessibility audit scored 100. Keep it there.
