---
name: HungryKatz
description: A cosy, hand-stitched cat café game, played in landscape on phones.
colors:
  strawberry-felt: "#ec5f89"
  berry-ink: "#c43d5c"
  berry-lip: "#9c2f49"
  strawberry-lip: "#c94a72"
  marmalade: "#f6a53b"
  cocoa-ink: "#5a3d4a"
  cocoa-soft: "#76626c"
  paper: "#fffaf1"
  card-paper: "#fffdf8"
  card-edge: "#f0e0c8"
  cream-felt: "#fff6e6"
  cream-felt-edge: "#e6cfaa"
  biscuit-tan: "#ecd3b4"
  toasted-tan: "#c9a37a"
  page-oat: "#fbefdf"
  mint-ink: "#24865b"
  mint-wash: "#d6f4e8"
  honey-ink: "#7f6100"
  butter: "#fff1c2"
typography:
  display:
    fontFamily: "Lilita One, Fredoka, ui-rounded, sans-serif"
    fontSize: "clamp(38px, 12.5vh, 110px)"
    fontWeight: 400
    lineHeight: 0.92
  headline:
    fontFamily: "Lilita One, Fredoka, ui-rounded, sans-serif"
    fontSize: "26px"
    fontWeight: 400
  title:
    fontFamily: "Lilita One, Fredoka, ui-rounded, sans-serif"
    fontSize: "16px"
    fontWeight: 400
  body:
    fontFamily: "Lilita One, Fredoka, ui-rounded, sans-serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: 1.3
  label:
    fontFamily: "Lilita One, Fredoka, ui-rounded, sans-serif"
    fontSize: "12.5px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "9px"
  panel: "14px"
  frame: "18px"
  round: "50%"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "22px"
components:
  button-primary:
    backgroundColor: "{colors.berry-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "12px 22px"
    height: "48px"
  button-play:
    backgroundColor: "{colors.strawberry-felt}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
    padding: "14px 20px"
  button-felt:
    backgroundColor: "{colors.cream-felt}"
    textColor: "{colors.cocoa-ink}"
    rounded: "{rounded.lg}"
    padding: "6px 4px"
    height: "42px"
  button-mint:
    backgroundColor: "{colors.mint-ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.lg}"
  panel:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.panel}"
    padding: "16px 22px"
  card:
    backgroundColor: "{colors.card-paper}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  chip-count:
    backgroundColor: "{colors.butter}"
    textColor: "{colors.honey-ink}"
    rounded: "{rounded.sm}"
    padding: "1px 8px"
---

# Design System: HungryKatz

## Overview

**Creative North Star: "The Felt Cat Lounge"**

HungryKatz looks like a café sewn from felt and paper by hand. Every surface has a material: cream paper panels with a faint grain, felt buttons with a stitched seam just inside the edge and a darker lip underneath, a paw-print wallpaper around the frame. The café itself is the stage. The home screen is the live café seen through a cream frame, and menus sit over it as paper cards, never as opaque pages.

Density is low and the type is big because the players are children holding a phone sideways with both thumbs. One typeface does all the talking, warm and chunky, in strawberry pink, marmalade orange and cocoa brown on oat and cream. The cats are drawn fluffy (cheek tufts, chest ruff, a puffed tail tip), and the décor (cat trees, cushion beds, lanterns, plants) keeps the room cosy rather than busy.

Things should feel soft and squishy: a tap presses a button down onto its lip, panels pop gently into place, and nothing is sharp, glossy or glassy.

**Key Characteristics:**
- The live café is always the backdrop; UI is paper and felt laid over it.
- One typeface (Lilita One, weight 400 only), with size and colour for hierarchy.
- Felt buttons: stitched inner seam, coloured lip below, press-down on tap.
- Warm pastels on oat, with berry ink for anything that must be read small.
- Landscape only: café in the middle, small HUD cards floating over its corners.

## Colors

Warm bakery pastels: strawberry and marmalade for joy, cocoa for words, oat and cream for every surface.

### Primary
- **Strawberry Felt**: the Play and Resume buttons and the "Hungry" in the logo. White text on it is only allowed at 24px and up.
- **Berry Ink**: headings, small emphasised text, focus rings and every pink button smaller than 24px. It is the pink you can read.

### Secondary
- **Marmalade**: the "Katz" half of the logo and warm highlights. Decorative only, never for text that must be read.
- **Mint Ink**: green buttons (Upgrade, Buy, Share) and good news ("Done", "In the café"). Paired with **Mint Wash** for completed rows and shown decorations.

### Tertiary
- **Honey Ink** on **Butter**: coin amounts, challenge counts and rewards.

### Neutral
- **Cocoa Ink**: all body text and labels on light surfaces.
- **Cocoa Soft**: secondary text such as descriptions and hints.
- **Paper**: panel surfaces. **Card Paper** with **Card Edge** for rows and shop cards inside a panel.
- **Cream Felt** with **Cream Felt Edge**: everyday felt buttons and their lip.
- **Biscuit Tan** and **Toasted Tan**: panel borders, ribbons and the frame around the home screen.
- **Page Oat**: the page behind everything, with the paw-print and fish-bone wallpaper.

### Named Rules
**The Readable Pink Rule.** Small text never sits on Strawberry Felt. Lilita One has no bold, so "bold" 19px is still regular small text that needs 4.5:1: use Berry Ink (5:1) below 24px.

**The Pastel Button Rule.** The home screen's bottom row gives each button its own pastel (butter, cream, peach, pink, mint) with a matching darker edge. Text on them is always Cocoa Ink.

## Typography

**Display Font:** Lilita One (with Fredoka for characters it lacks, then ui-rounded)
**Body Font:** Lilita One
**Label Font:** Lilita One

**Character:** a single chunky, friendly rounded face that reads like a café chalkboard or a sweet wrapper. It has exactly one weight, so hierarchy comes from size, colour and the felt surfaces, never from bold.

### Hierarchy
- **Display**: the two-line logo, tilted a few degrees each way with stacked coloured shadows like stitched felt letters.
- **Headline**: every screen title ("Café book", "Decorate your café") in Berry Ink.
- **Title**: card and row names (a dish, a decoration, a regular).
- **Body**: descriptions and hints, in Cocoa Soft when secondary.
- **Label**: small captions on cards and stickers.

### Named Rules
**The One Voice Rule.** Lilita One everywhere: in-game text, buttons, the canvas world and the photo captions. Fredoka is only a fallback for missing glyphs, such as accented letters in a player's typed name.

## Layout

Landscape only. Held upright, a "Turn your phone sideways" card covers the game.

- **Café (play):** the world scales to fit the important rows, top of the windows to just below the stoves. The HUD floats over the corners: score card bottom-left (coins, level ring, score, missed paws), pause top-right, Upgrade bottom-right where the right thumb rests. There are no side columns; what the waiter carries shows on its tray and the badge above it.
- **Home:** the café fills the screen behind a cream frame with a paw-print border. The logo and your cat on a wooden ledge sit on the left; Play, the high score ribbon and the tagline on the right; one row of pastel buttons along the bottom. The camera sits in the top-right corner.
- **Screens:** wide paper cards (up to 820px) centred over the café, with content in columns: three-across help steps, two-column settings and game over, multi-column grids for cats, stickers, friends, levels, upgrades and decorations. Tall content scrolls inside the card.
- **Rhythm:** 4 / 8 / 12 / 16 / 22px; cards in a grid sit 8–10px apart.

## Elevation & Depth

Depth is physical, like stacked felt and paper. Panels float with a soft warm shadow and a faint inner seam. Buttons rest on a solid coloured lip 3–4px below them (a darker shade of the button) plus a soft drop, and press down onto it when tapped. Nothing glows and nothing is made of glass. In-game overlays tint the paused café rather than blurring it.

### Shadow Vocabulary
- **Paper float** (`0 10px 28px rgba(120, 80, 50, 0.18)` + inner seam): panels and cards over the café.
- **Felt lip** (`0 4px 0 <darker shade>, 0 8px 14px rgba(120, 80, 50, 0.16)`): pink, mint and green buttons.
- **Cream lip** (`0 3px 0 <felt edge>`): cream and pastel felt buttons.
- **Ribbon drop** (`drop-shadow(0 2px 0 toasted tan)`): the tagline ribbon.

### Named Rules
**The Press-Down Rule.** A tappable thing has a lip under it, and tapping moves it down onto the lip (about 3px). If it has no lip, it isn't a button.

## Shapes

Gently rounded and handmade. Buttons and rows use 8–9px corners, panels 14px, and the home frame 18px. Round things are truly round (the camera, the level ring, the pause button). Ribbons have notched ends (clip-path), and felt buttons carry a dashed stitched seam 6px inside their edge. There are no hard corners and no hairline strokes: borders are 2–3px and tan-coloured.

## Components

### Buttons
- **Shape:** gently rounded (9px), at least 46–48px tall.
- **Primary (Berry):** Berry Ink felt, white text, Berry Lip edge, white stitched seam. Used for "Let's play!", Save, Restore and Quit.
- **Play / Resume:** Strawberry Felt at 24px and up, the one place the bright pink carries text.
- **Felt (secondary):** Cream Felt with a Cream Felt Edge lip and a cocoa stitch; the home row uses per-button pastels.
- **Mint:** Mint Ink for buy, upgrade and share actions.
- **Focus:** a 3px Berry Ink ring 3px outside the button, over the stitching. The stitching is decoration and must never replace the focus ring.
- **Pressed:** moves down 3px onto its lip.

### Chips
- **Style:** small rounded tags such as the challenge count (Butter with Honey Ink), and difficulty and scene chips with a pink border when selected.

### Cards / Containers
- **Panels:** Paper with felt grain, a 3px Biscuit Tan border, an inner seam and the paper-float shadow.
- **Rows and shop cards:** Card Paper with a 2px Card Edge, 8px corners. Completed or shown items switch to Mint Wash with a mint edge; best friends turn soft pink.
- **Stickers:** scalloped drawn badges with bronze, silver and gold tints.

### Navigation
- **Tabs:** a soft tan track holding equal-width tabs; the selected tab is a raised white pill. Used by the Café book (Stickers, Recipes, Friends) and Choose cat (Cats, Wardrobe).

### Signature: the Home Frame
The café rendered live behind a cream frame with a paw-print border masked around it, the tilted felt logo, your cat on a wooden ledge, and the notched tagline ribbon. It is the game's first impression and its photo backdrop.

## Do's and Don'ts

### Do:
- **Do** show the live café behind every menu; menus are paper laid over it.
- **Do** use Berry Ink (#c43d5c) for any pink text or pink button under 24px.
- **Do** give every button a lip and a press-down, and keep tap targets at 44px or more.
- **Do** keep the 3px Berry Ink focus ring visible on every control.
- **Do** draw icons in the game's own canvas icon set, not as OS emoji.
- **Do** give reduced-motion players a calm fade for messages instead of removing them.

### Don't:
- **Don't** use bold weights for hierarchy; Lilita One has none.
- **Don't** add glass, blur or glows; depth is felt and paper.
- **Don't** put white text on Strawberry Felt below 24px.
- **Don't** add side columns to the café view; the HUD floats over the corners.
- **Don't** reuse generic class names like `.best` for two different things (it once restyled the best-friend card as the high score pill).
