---
name: Open Source ($OS)
description: A shared pixel canvas in the r/place tradition, where every accepted contribution paints a plot and empty plots are open invitations, free to take.
colors:
  signal-yellow: "#FFD635"
  signal-yellow-press: "#F5C800"
  ink: "#141516"
  ink-2: "#4A4B4C"
  ink-3: "#6B6E70"
  canvas-white: "#FFFFFF"
  ground-2: "#F3F4F5"
  line: "#D4D7D9"
  code-blue: "#3690EA"
  art-pink: "#FF3881"
  game-green: "#00A368"
  words-amber: "#FFA800"
  night-ground: "#121314"
  night-ground-2: "#1A1B1D"
  night-panel: "#1D1E20"
  night-line: "#2E3033"
  night-ink: "#ECEEEF"
  night-ink-2: "#B9BCBE"
  night-ink-3: "#9A9DA0"
typography:
  display:
    fontFamily: "'Jersey 10', 'Familjen Grotesk', system-ui, sans-serif"
    fontSize: "clamp(3.25rem, 5.2vw, 4.75rem)"
    fontWeight: 400
    lineHeight: 0.86
    letterSpacing: "0"
  display-closing:
    fontFamily: "'Jersey 10', 'Familjen Grotesk', system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 9vw, 6rem)"
    fontWeight: 400
    lineHeight: 0.84
    letterSpacing: "0"
  headline:
    fontFamily: "'Jersey 10', 'Familjen Grotesk', system-ui, sans-serif"
    fontSize: "clamp(2.75rem, 5.5vw, 4.5rem)"
    fontWeight: 400
    lineHeight: 0.9
    letterSpacing: "0"
  headline-sm:
    fontFamily: "'Jersey 10', 'Familjen Grotesk', system-ui, sans-serif"
    fontSize: "clamp(2.25rem, 4vw, 3.25rem)"
    fontWeight: 400
    lineHeight: 0.9
  title:
    fontFamily: "'Familjen Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.2
  title-sm:
    fontFamily: "'Familjen Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "'Familjen Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  lede:
    fontFamily: "'Familjen Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "1.0625rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "'Familjen Grotesk', system-ui, -apple-system, 'Segoe UI', sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 600
    lineHeight: 1
  figure:
    fontFamily: "'Martian Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.875rem"
    fontWeight: 500
    lineHeight: 1.4
    fontFeature: "'tnum' 1"
  tag:
    fontFamily: "'Martian Mono', ui-monospace, 'Cascadia Mono', Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: 1
    fontFeature: "'tnum' 1"
rounded:
  pixel: "0px"
  swatch: "3px"
  code: "6px"
  thumb: "10px"
  toast: "12px"
  panel: "16px"
  pill: "999px"
spacing:
  hairline: "3px"
  xs: "6px"
  sm: "8px"
  inset: "12px"
  md: "16px"
  lg: "24px"
  panel: "28px"
  gutter: "clamp(16px, 4vw, 48px)"
  section: "clamp(64px, 9vw, 112px)"
  section-lg: "clamp(80px, 11vw, 140px)"
components:
  button-primary:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-primary-hover:
    backgroundColor: "{colors.signal-yellow-press}"
    textColor: "{colors.ink}"
  button-quiet:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 22px"
    height: "48px"
  button-disabled:
    backgroundColor: "transparent"
    textColor: "{colors.ink-3}"
    rounded: "{rounded.pill}"
  pill-control:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  pill-buy:
    backgroundColor: "{colors.signal-yellow}"
    textColor: "{colors.ink}"
    rounded: "{rounded.pill}"
    padding: "0 16px"
    height: "40px"
  pill-toggle-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.pill}"
    height: "40px"
  chip-filter:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "38px"
  chip-filter-on:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.pill}"
    height: "38px"
  panel:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "28px"
  popover:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "18px"
    width: "min(320px, calc(100% - 24px))"
  plot-card:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.panel}"
    padding: "18px"
  price-tag:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.ink}"
    typography: "{typography.tag}"
    rounded: "{rounded.pill}"
    padding: "0 9px 0 8px"
    height: "22px"
  swatch:
    rounded: "{rounded.swatch}"
    size: "1fr of a 32-column strip (28px when the strip scrolls)"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.toast}"
    padding: "12px 16px"
---

# Design System: Open Source ($OS)

## Overview

**Creative North Star: "The Shared Canvas"**

The website is a board everyone paints. A white field with a faint one-tile grid fills the first screen edge to edge; painted plots sit on it as real pixel art, and every unpainted plot is a hatched rectangle with a marching dashed edge and a price tag saying what it pays. The interface floats over the board the way r/place's controls do: white pills and rounded panels with soft shadows, never a header bar or a sidebar. Nothing on the page is a picture of the product; the page is the product, and it is meant to visibly change as people merge work into it.

The system is spare on purpose. Colour carries meaning and nothing else: one 32-colour palette feeds every pixel, one yellow means "do this", four category colours mean "this kind of plot". Type is a trio with strict jobs: a chunky pixel display face for the few loud statements, a plain grotesque for everything you read, and a mono for every coordinate and SOL figure. Pixels are square, panels are softly rounded, controls are pills, and the three shapes never trade places.

Density is low and confident: one headline per section, short paragraphs capped around 34 to 62 characters, and generous section padding. Explanations are drawn as small canvases of the same world (a 16 by 10 plot shown waiting, claimed, in review, merged) rather than as illustrations or icons in boxes.

**Key Characteristics:**
- Full-bleed white canvas with a 1-tile grid whose strength scales with zoom.
- Every painted pixel and every meaning colour comes from the 32-colour r/place palette.
- Yellow plus ink is the action signal; category colours mark kind of plot.
- Floating white pill controls and 16px panels with soft, tinted shadows.
- Jersey 10 / Familjen Grotesk / Martian Mono, each with one job.
- Square pixels, 16px panels, 999px pills.
- Motion is the canvas behaving like a canvas: paint-in timelapse, pixel ring, marching ants, camera flights.

## Colors

A white board, an ink voice, one yellow for action and four palette colours that each name a kind of work.

### Primary
- **Signal Yellow** (#FFD635): the action colour, always with ink text. Fills the primary button ("Claim a plot", "Claim on GitHub"), the Buy pill, the skip link and text selection. It is palette colour 5 of the r/place set, so the action colour is literally a paint you can place.
- **Signal Yellow Pressed** (#F5C800): hover state of yellow controls on fine pointers only. Not a palette colour, so it never appears on the canvas.

### Secondary: the four plot kinds
Each category colour appears only as a small square (8 to 10px, unrounded) beside a label, as the hatch of an open plot on the canvas, and as the flash ring when a plot card is found. Values come from `data/config.json` and must stay members of the palette.
- **Code Blue** (#3690EA): code plots.
- **Art Pink** (#FF3881): art plots.
- **Game Green** (#00A368): mini-game plots.
- **Words Amber** (#FFA800): writing and translation plots.

### Neutral
- **Ink** (#141516): text, the dashed edges of open plots, solid frames of painted plots, the branch line, pressed toggles and chips, toasts. Near-black with a hair of blue-green so it sits with the palette's greys.
- **Ink 2** (#4A4B4C): secondary copy, ledes, card descriptions.
- **Ink 3** (#6B6E70): tertiary text, counts, timestamps, disabled labels.
- **Canvas White** (#FFFFFF): the board itself, panels, pills, popovers, cards and tags in light mode.
- **Ground 2** (#F3F4F5): the alternate section ground (Open plots, Built by) and hover fill inside the zoom pill.
- **Line** (#D4D7D9): hairlines, chip and quiet-button borders, open avatar slots. Also palette colour 31.

### Night (dark theme, `prefers-color-scheme: dark`)
- **Night Ground** (#121314) and **Night Ground 2** (#1A1B1D): page grounds.
- **Night Panel** (#1D1E20): pills, panels, popovers and cards.
- **Night Line** (#2E3033): hairlines.
- **Night Ink** (#ECEEEF), **Night Ink 2** (#B9BCBE), **Night Ink 3** (#9A9DA0): text tiers.
Yellow, the category colours and the canvas stay the same in both themes.

### The palette
The 32 colours in `data/config.json` (`palette`) are the r/place set, from #6D001A to #FFFFFF. They are the only colours a pixel can take: visitor pixels, plot PNGs, the genesis art, the how-it-works heart and the identicons are all drawn from them. Contributors' plot PNGs are checked against the palette by `tools/check_plots.py`.

### Named Rules
**The Palette Rule.** Every pixel painted on the canvas, and every colour that carries meaning in the interface at rest (action yellow, the four kinds), is one of the 32 palette colours. Interface chrome (ink, greys, white, shadows, the pressed-yellow hover shade) is the only thing allowed outside it, and chrome is never painted into the board's pixels.

**The One Meaning Rule.** Each colour means one thing. Yellow with ink means "act". A category colour means "this kind of plot". Never use a colour because it looks nice somewhere.

**The Paper Rule.** The canvas, the plot thumbnails and the closing "open plot" panel stay white with an ink grid in both themes. Dark mode darkens the interface around the board, never the board.

## Typography

**Display Font:** Jersey 10 (with Familjen Grotesk, system-ui)
**Body Font:** Familjen Grotesk (with system-ui, -apple-system, Segoe UI)
**Label/Mono Font:** Martian Mono (with ui-monospace, Cascadia Mono, Consolas)

**Character:** Jersey 10 is a blocky bitmap face that reads as pixels at headline size, so the loudest words on the page look painted on the board. Familjen Grotesk is a sturdy, slightly quirky grotesque that keeps reading calm; Martian Mono makes every number look like a coordinate or a ledger entry.

### Hierarchy
- **Display** (400, clamp(3.25rem, 5.2vw, 4.75rem), 0.86): the hero headline in the floating panel only. Drops to 3.25rem under 560px.
- **Display Closing** (400, clamp(3.5rem, 9vw, 6rem), 0.84): the closing line inside the open-plot panel.
- **Headline** (400, clamp(2.75rem, 5.5vw, 4.5rem), 0.9): section titles and the dev key statement. Max 20 to 22ch.
- **Headline Small** (400, clamp(2.25rem, 4vw, 3.25rem), 0.9): the secondary column title (Versions).
- **Title** (Familjen 700, 1.25rem, 1.2) and **Title Small** (700, 1.125rem, 1.25): step names, flow nodes, card and popover titles.
- **Body** (400, 1rem, 1.55): running text, capped at 26 to 62ch depending on column. **Lede** (1.0625rem) under the hero headline, max 42ch.
- **Label** (600, 0.9375rem): pills, buttons and chips.
- **Figure** (Martian Mono 500 to 600, 0.75 to 0.9375rem, tabular numerals): coordinates, zoom level, SOL amounts, sizes, positions, versions, dates, the contract address.
- **Tag** (Martian Mono 600, 0.6875rem, tabular numerals): price tags on plots and thumbnails; 11px on the canvas.

### Named Rules
**The Three Jobs Rule.** Jersey 10 shouts (one headline per section, never body or labels), Familjen Grotesk explains, Martian Mono counts. A number that a visitor might compare, copy or locate is set in mono with tabular figures.

**The No Tracking Rule.** Jersey 10 is set at letter-spacing 0 and line-height 0.84 to 0.9; it is already a grid, so do not space it out or loosen it.

## Layout

The first viewport is the board: a stage of 100svh (min 560px) on wide screens, with the floating controls pinned 12px from the viewport edges. On screens 900px and wider the home view shows the whole 200 by 120 tile world edge to edge; narrower screens frame the genesis plot and its neighbours instead. The top bar is a row of independent pills (brand, centred coordinates, then PR count, "Who built this?", X and Buy on the right), not a bar. The hero panel sits bottom left (24px in, up to 500px wide), the palette strip runs along the bottom to its right, and the zoom pill sits above the strip at the right.

Below the board, content lives in a 1200px max container with a fluid gutter of clamp(16px, 4vw, 48px). Sections alternate White and Ground 2 and breathe with clamp(64px, 9vw, 112px) to clamp(96px, 13vw, 168px) of block padding. Grids: the how-it-works branch is four equal columns hanging from one 4px ink line; open plots use auto-fill columns of at least 270px with 16px gaps, and the two biggest open plots span two columns as a split card; fees run as three nodes joined by dashed pixel arrows; Built by and Versions sit side by side at 1.4fr / 1fr.

Breakpoints: at 1280px the palette wraps to two rows of 16; at 960px the coordinates pill hides, the stage shrinks to 64svh, the hero panel drops below the board, the palette strip spans the width and scrolls sideways with 28px swatches, and the branch, flow and people grids stack into vertical timelines with dashed connectors; at 640px split cards collapse; at 600px the plot popover centres under the top pills; at 560px the brand collapses to its ticker and hero buttons stretch.

### Named Rules
**The Floating Controls Rule.** Controls float over the canvas as separate pills and panels with gaps between them. Never join them into a solid header, toolbar or sidebar that hides the board.

## Elevation & Depth

Depth comes from two soft, ink-tinted shadows on floating white surfaces; the page itself is flat. Panels, pills, the zoom pill and the palette strip carry the float shadow; the popover and toast carry the lifted shadow, and pills rise to it on hover. Plot cards on Ground 2 sit on an almost invisible 1px rest shadow. In dark mode the same shadows switch to black at higher opacity.

### Shadow Vocabulary
- **Float** (`box-shadow: 0 1px 2px rgb(20 21 22 / 0.10), 0 6px 18px rgb(20 21 22 / 0.10)`): every floating control and panel over the canvas.
- **Lifted** (`box-shadow: 0 2px 4px rgb(20 21 22 / 0.08), 0 16px 40px rgb(20 21 22 / 0.16)`): popover, toast, pill hover.
- **Rest** (`box-shadow: 0 1px 2px rgb(20 21 22 / 0.06)`): plot cards.
- **Swatch edge** (`box-shadow: inset 0 0 0 1px rgb(20 21 22 / 0.18)`): keeps white and pale swatches visible.
- **Swatch selected** (`box-shadow: 0 0 0 2px <panel>, 0 0 0 4px <ink>` with scale 1.06): the chosen colour.

### Named Rules
**The Float Only Rule.** The float and lifted shadows belong only to things that hover above the board. Content cards get at most the 1px rest shadow; sections, the canvas and anything drawn in it stay flat.

## Shapes

Three shapes, three meanings. Pixels and everything that stands for a pixel are square with no rounding: canvas tiles, plot frames, category squares, the branch step nodes, the reticle, the pixel ring. Panels (hero panel, palette strip, popover, plot cards) round at 16px. Controls (pills, buttons, chips, price tags, the zoom group) are full pills at 999px. Small in-between radii serve contained content only: 10px for plot thumbnails and avatars, 12px for the toast, 6px for version code labels and the focus ring, 3px for palette swatches.

Dashes are a structural material, not decoration: a dashed frame means "open, waiting for someone". Open plots have dashed ink frames, the closing panel has a 3px dashed ink border over a 16px grid, and empty avatar slots are dashed. Dashed lines also act as pixel connectors: the 4px arrows between fee nodes and, on stacked layouts, the branch and flow timelines. Painted, finished things get solid edges.

### Named Rules
**The Square Pixel Rule.** Anything drawn on the board, and every category square, is square. Never round a pixel, a category square, the reticle or a plot frame. (Palette swatches are buttons, not pixels, and keep their 3px corners.)

**The Dashed Frame Rule.** A dashed frame around an area means it is unclaimed or waiting; a finished plot gets a solid frame. Dashed lines otherwise appear only as pixel connectors (the fee flow, stacked timelines) and as the temporary "Who built this?" overlay. Never use dashes as ornament.

## Components

### Buttons
Tactile, rounded and plain, pressing down to 97% on tap.
- **Shape:** full pill (999px), 48px tall, 22px side padding, 1.5px border.
- **Primary:** Signal Yellow with ink text; hover to Signal Yellow Pressed on fine pointers.
- **Quiet:** transparent with a Line border and ink text; hover darkens the border to Ink 3.
- **Disabled ("at launch"):** transparent, Ink 3 text, Line border, no press scale. Before launch, every action that needs the repo or contract reads "... at launch" rather than pretending to work.
- **Compact sizes:** 40px in the popover, 38px inside plot cards.

### Pill controls
- **Style:** Canvas White (Night Panel in dark), 40px tall, 16px padding, label type, float shadow; hover lifts to the lifted shadow; press scales to 0.97 over 140ms.
- **Variants:** brand pill (pixel favicon, name, mono ticker), coordinates pill (mono, tabular, current tile plus zoom), toggle pill ("Who built this?", fills ink when pressed), icon pill (40px square), Buy pill (yellow).
- **Zoom pill:** one pill holding four 38 by 34px icon buttons (zoom in, zoom out, reset, full screen) split by 1px Line dividers; hover fill Ground 2; press 0.94.

### Chips
- **Style:** 38px pill, 1.5px Line border, Canvas White fill, a 10px category square before the label and a mono count after it.
- **State:** selected chip fills ink with white text; the count dims to 70%.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** Canvas White on Ground 2 sections.
- **Shadow Strategy:** rest shadow (see Elevation).
- **Internal Padding:** 18px cards, 28px hero panel, 18px popover.
- **Plot card:** a 132px thumbnail (10px radius, inset Line edge) holding a live crop of the real board around the plot, then title, brief, a size line ("Code 30×16 at (8, 8)") and two compact buttons. When a card is found from the canvas it flashes a 3px ring in its category colour for 1200ms.

### Navigation
There is no navigation bar. Page navigation is the brand pill (back to the canvas), in-page anchors from the hero buttons, and a skip link ("Skip the canvas") that appears as a yellow pill on focus.

### The canvas (signature component)
- **Board:** white, 200 by 120 tiles, rendered from a cols-by-rows bitmap scaled with smoothing off. The 1-tile grid only appears from 4px per tile and strengthens with zoom (ink at 3.5%, 5.5%, 9%). Tiles outside the board are shaded 3.5% ink so the edge is findable without a border.
- **Open plot frame:** diagonal hatch in the category colour at 14% opacity (26% on hover or selection), then a 2px dashed ink edge (3px in the category colour when hot) whose dash length follows zoom (3 to 8px) and marches continuously while the plot waits.
- **Price tag:** a 20px pill at the plot's top-left corner: white, a category square, mono "0.4 SOL"; drops "SOL" or hides when the plot is too small. Painted plots show an ink tag with "@author" and a yellow square on hover or selection, plus a solid 3px ink frame.
- **Palette strip:** a 16px panel along the bottom holding a status line (instructions, cooldown timer in mono "0:05", count of your pixels with "Clear them") and the 32 swatches (3px corners) in one row. During cooldown the swatches drop to 50% opacity.
- **Placing:** with a colour chosen, the cursor becomes a crosshair and the hovered tile previews the colour at 60% inside a 2px ink reticle. On touch at overview scale the first tap flies the camera to 16px tiles and the next tap places. Visitor pixels persist only in that browser (up to 400).
- **Popover:** a 320px panel with the lifted shadow, anchored beside the plot (or centred under the top pills on screens under 600px), with a round close button, title, brief, a mono meta row (kind, size) and Claim plus Details actions.
- **Minimaps:** plot-card thumbnails and the how-it-works steps are drawn with the same grid, hatch, dashed frame and tag vocabulary, so every explanation is a crop of the same world.
- **Explore mode:** the stage takes the full screen (100dvh), one finger pans, the wheel zooms; Escape closes the popover first, then leaves explore.

### "Who built this?" mode (signature component)
Toggling the pill outlines every section with a 2px dashed Code Blue line inset 8px and pins a blue mono badge "@author  version" to each section's top-right corner, then toasts who built the page. It reads the `data-built-by` and `data-version` attributes on each section, so every new section must carry both.

### Toast
Ink rounded rectangle (12px radius) with white text, bottom centre above the safe area, lifted shadow; slides up from 120% and fades in over 220ms.

### Motion

Motion is the board behaving like a shared canvas, never decoration. Easing: `cubic-bezier(0.23, 1, 0.32, 1)` (out) for interface responses, `cubic-bezier(0.77, 0, 0.175, 1)` (in-out) for the branch line, cubic in-out for camera flights.
- **Genesis paint-in:** each painted plot fills as a timelapse: its pixels land in a rough upward wave with random jitter over 1500ms (ease-out quad), starting 250ms after load and staggered 300ms per plot.
- **Ring plop:** a placed pixel throws a square ring in its colour (ink for white) that grows to about 3.6 tiles and fades over 420ms (ease-out cubic).
- **Marching ants:** open-plot edges march at about 14px per second, only while the board is on screen and the tab is visible.
- **Camera flight:** zoom-to-plot, reset and tap-to-zoom fly over 520ms.
- **Branch reveal:** on first scroll into view the ink branch line wipes in left to right over 900ms and the four steps rise 12px and fade in, staggered 140ms.
- **Popover:** fades from 0 and scales from 0.96 at its anchor corner (160 to 180ms). **Press:** 0.97 scale over 140ms on pills, buttons and chips; 0.94 on zoom buttons; 0.9 on swatches. **Copy:** idle and done labels cross-fade with a 2px blur over 180ms.

**Reduced motion** (`prefers-reduced-motion: reduce`): plots appear fully painted, ants stand still, no ring plop, camera jumps instead of flying, the branch is shown complete, the popover appears without scaling and scrolling is instant.

**The Canvas Moves, The Page Doesn't Rule.** Animate things that happen on the board (paint, place, wait, fly). Page chrome only responds to touch; there are no scroll-triggered fades beyond the single branch reveal.

## Do's and Don'ts

### Do:
- **Do** take every pixel and every meaning colour from the 32-colour palette in `data/config.json` (The Palette Rule).
- **Do** reserve Signal Yellow (#FFD635) with ink text for the thing the visitor should do next.
- **Do** mark a plot's kind with an unrounded 8 to 10px square in its category colour next to a text label.
- **Do** set every SOL amount, coordinate, size, version and address in Martian Mono with tabular figures.
- **Do** keep controls as separate floating pills (40px) and panels (16px radius) over the board, with the float shadow.
- **Do** draw explanations as crops of the canvas using the same grid, hatch, dashed frame and price tag.
- **Do** show unfinished or pre-launch states honestly ("Buy at launch", "Claim at launch", "Published at launch").
- **Do** give every new section `data-built-by` and `data-version` so "Who built this?" can tag it.
- **Do** honour reduced motion by showing the end state of every canvas animation.

### Don't:
- **Don't** paint the canvas, a plot or an identicon with a colour outside the palette.
- **Don't** use yellow, or any category colour, as decoration, a background wash or a gradient.
- **Don't** round a pixel, a category square or a plot frame (The Square Pixel Rule).
- **Don't** use Jersey 10 for body copy, labels or numbers, and don't add letter-spacing to it.
- **Don't** put the board in dark mode; only the interface around it darkens (The Paper Rule).
- **Don't** put a dashed frame around a finished plot or finished content (The Dashed Frame Rule).
- **Don't** fake activity: no invented contributors, payouts, holders or counts. Empty slots read as open invitations.
