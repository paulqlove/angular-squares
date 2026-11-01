# QuarterScore Design Guidelines v2

Status: current, Nov 1 2026. Supersedes the token, type and logo sections of the Brand Brief (v1, Oct 31). The Brand Brief still owns positioning, voice, audience and the do-not-say list.

Who this is for: an LLM (Copilot, Claude Code) or a developer working in `paulqlove/angular-squares`, and anyone making marketing art, printables or the TV view. Follow it for every screen. Where it and a user story disagree about behavior, the story wins. Where they disagree about appearance, this guide wins.

This guide is self-contained. Nothing in it depends on an outside link.

Author's note: written Nov 1 2026 by Claude (Anthropic), working as an outside design consultant at Paul's request. The same text lives in Drive > Ventures > QuarterScore > Design as "QuarterScore Design Guidelines v2", alongside `quarterscore-tokens.css` and `team-board-mockup-v2.html`. Keep the two copies in sync; the Drive doc is where design discussion happens, this file is what the coding tools read.

---

## 0. What changed and why

QuarterScore now uses Paul's general UI design language (the "Field" look: warm paper, one accent, grotesque headlines, mono labels, tight corners, dark panels as accents) with QuarterScore's own tokens swapped in.

| | Brand Brief v1 | This guide (v2) |
|---|---|---|
| Neutrals | Cool slate (`#f1f5f9` page, white cards) | Warm paper (`#f6f3ee` page, `#fffefc` cards) |
| Ink | Slate 900 `#0f172a` | Same navy `#0f172a` (it is the logo color) |
| Accent | Emerald 700 `#047857` | Same. Still the only accent. |
| Live accent | Amber | Same, text-safe `#b45309`, fill `#fbbf24` |
| Display font | Archivo (never shipped) | Space Grotesk |
| UI font | Inter (never shipped; site uses Roboto) | Space Grotesk |
| Numbers and labels | Archivo tabular / JetBrains Mono | JetBrains Mono everywhere a label, code, digit or counter appears |
| Dark mode | Navy | Navy (unchanged) |
| Logo | v2 lockup | v2 lockup, unchanged |

The logo is unchanged: navy board with the emerald clock-sweep quarter. It sits well on warm paper because paper is a neutral, not a competing hue. Everything in the Logo usage rules section of the Brand Brief still applies.

---

## 1. Principles

1. **One accent.** Emerald marks the thing to look at: the primary button, the winning square's ring, the key word in a headline. Everything else is warm neutral or navy.
2. **Team colors are the loudest thing on a board.** The host's two colors own the axis bands and axis cells. Brand colors never fill squares.
3. **Mono for labels, grotesque for meaning.** Small uppercase JetBrains Mono names things (eyebrows, counters, buttons, tabs, game codes, digits). Space Grotesk 600 carries headlines and card titles.
4. **Tight corners.** Cards 10px, inner boxes 8px, buttons 6px. Pills only for badges, dots and switches.
5. **Dark panels are accents, not the page.** Score tiles, the header and the TV frame are navy on a light page. Do not make the whole light page dark.
6. **Give the board a stage.** The grid sits on a sand canvas with a faint dot grid, so squares read as objects on top.
7. **Amber means live.** The live badge, a score that just changed, the quarter clock. Nowhere else.
8. **Phone first.** The board must be readable at 375px with no pinch. Tap targets are 44px.
9. **Plain words.** Short sentences, second person, no em dashes. The Brand Brief's voice and do-not-say list apply.

---

## 2. Color

Define every color as a CSS variable prefixed `--qs-`. Host team colors use `--home` and `--away` and are never mixed into the `--qs-` set. All pairs below were checked with the WCAG 2.1 relative-luminance formula.

### Light (default)

| Token | Value | Use | Contrast |
|---|---|---|---|
| `--qs-bg` | `#f6f3ee` | Page (optional gradient `#f9f7f3` to `#f3f0ea`) | ink 16.1:1 |
| `--qs-panel` | `#fffefc` | Cards, dialogs, empty squares | |
| `--qs-panel-2` | `#f8f5f0` | Inner boxes, inputs, hover fills, the corner cell | ink 16.4:1 |
| `--qs-canvas` | `#ebe6da` | Board stage, with dot grid `rgba(15,23,42,.16)` at 22px | ink 14.3:1, muted 5.0:1 |
| `--qs-ink` | `#0f172a` | Text, primary button, logo navy | |
| `--qs-muted` | `#5b6070` | Secondary text, legends, help | 5.7:1 on panel-2, 5.0:1 on canvas |
| `--qs-line` | `#e4dfd6` | Decorative borders, grid lines | |
| `--qs-line-strong` | `#8b909d` | Input borders (UI needs 3:1) | 3.2:1 on panel |
| `--qs-accent` | `#047857` | Primary button, links, winner ring, headline key word | white on it 5.5:1; on bg 4.95:1 |
| `--qs-accent-hover` | `#065f46` | Button hover | white 7.7:1 |
| `--qs-accent-soft` | `#d6efe3` | Square hover, selected chips | accent on it 4.5:1, ink 14.7:1 |
| `--qs-live` | `#b45309` | Live text, "just changed" text | 4.5:1 on bg |
| `--qs-live-fill` | `#fbbf24` | Live badge fill, navy text | 10.7:1 |
| `--qs-ok` / `-soft` | `#1f7a4d` / `#dcf1e5` | Numbers locked, paid, confirmed | 4.5:1 |
| `--qs-warn` / `-soft` | `#8a5410` / `#f6e8c8` | Needs attention | 5.2:1 |
| `--qs-bad` / `-soft` | `#b3261e` / `#fadcd8` | Error, blocked | 5.1:1 |
| `--qs-tile` / `--qs-tile-ink` | `#0f172a` / `#f3efe8` | Score tiles, header, TV frame | 15.6:1 |
| `--qs-tile-ok` / `--qs-tile-bad` | `#1f3d2e` / `#5c1f1a` | Won quarter tile, blocked tile | |

### Dark (navy)

Dark mode is navy, not warm black, so it matches the TV view and the reversed logo.

| Token | Value | Contrast |
|---|---|---|
| `--qs-bg` | `#0f172a` | ink 15.6:1 |
| `--qs-panel` | `#1e293b` | ink 12.8:1 |
| `--qs-panel-2` | `#263244` | |
| `--qs-canvas` | `#0b1220`, dots `rgba(243,239,232,.12)` | |
| `--qs-ink` | `#f3efe8` | |
| `--qs-muted` | `#94a3b8` | 5.7:1 on panel |
| `--qs-line` / `--qs-line-strong` | `#334155` / `#64748b` | input border 3.1:1 |
| `--qs-accent` / `-hover` | `#34d399` / `#6ee7b7` | navy text on it 9.3:1; as text on panel 7.6:1 |
| `--qs-accent-soft` | `#123b2c` | |
| `--qs-live` / `--qs-live-fill` | `#fbbf24` | 8.8:1 on panel |
| ok / warn / bad | `#6fd3a0` on `#173a2a`, `#f0bd6a` on `#3a2d12`, `#ff9a90` on `#40201c` | 6.9 / 7.8 / 7.1 |
| `--qs-tile` | `#020617` | |

### Host team colors

- The host picks two colors. Derive text color automatically: white or `#0f172a`, whichever is 4.5:1 or better.
- Derive a `strong` variant for the axis cells by darkening until white text passes 4.5:1 and the cell passes 3:1 against the card.
- If the two colors are within a small distance of each other, or both are near white, stripe the home band so the two sides stay distinct.
- Claimed squares keep the existing pastel player palette (`player.*` in `tailwind.config.js`) with navy text. All of those pairs pass 12:1 or better.

### Color rules

- Status colors always mean what they say. Never decorative, never recolored to emerald.
- Never rely on color alone. The winning square gets a 3px emerald ring, a "Q1" mono label at 640px and up, and a `role="status"` announcement. On phones the ring alone is fine because the legend names it.
- Never use lime or yellow-green. Never pair navy + green + grey in the logo (Seahawks adjacency). The mark is navy + emerald only, or one color.
- Dark mode panels get no light outline and no inset highlight. Use the quiet black shadow.
- Proportion on any screen: about 70% paper/panel, 20% navy, 10% or less emerald. Team colors are extra and sit only inside the board.

### Starter CSS

The complete token file is `quarterscore-tokens.css` next to this guide. Drop it into `src/styles.scss` after the Tailwind directives and delete the old `--color-*` variables once nothing references them.

### Tailwind mapping (`tailwind.config.js`)

Replace the `primary` / `secondary` / `accent` numeric ramps (slate, sky and blue) with role names that read as roles:

```js
theme: { extend: {
  colors: {
    qs: {
      bg: 'var(--qs-bg)', panel: 'var(--qs-panel)', 'panel-2': 'var(--qs-panel-2)', canvas: 'var(--qs-canvas)',
      ink: 'var(--qs-ink)', muted: 'var(--qs-muted)', line: 'var(--qs-line)', 'line-strong': 'var(--qs-line-strong)',
      accent: 'var(--qs-accent)', 'accent-hover': 'var(--qs-accent-hover)', 'accent-soft': 'var(--qs-accent-soft)', 'on-accent': 'var(--qs-on-accent)',
      live: 'var(--qs-live)', 'live-fill': 'var(--qs-live-fill)',
      ok: 'var(--qs-ok)', 'ok-soft': 'var(--qs-ok-soft)', warn: 'var(--qs-warn)', 'warn-soft': 'var(--qs-warn-soft)', bad: 'var(--qs-bad)', 'bad-soft': 'var(--qs-bad-soft)',
      tile: 'var(--qs-tile)', 'tile-ink': 'var(--qs-tile-ink)', 'tile-ok': 'var(--qs-tile-ok)', 'tile-bad': 'var(--qs-tile-bad)'
    },
    player: { /* keep the existing pastel ramp */ }
  },
  fontFamily: { sans: ['var(--qs-font-sans)'], mono: ['var(--qs-font-mono)'] },
  borderRadius: { chip: '4px', btn: '6px', inner: '8px', card: '10px', bar: '12px' },
  boxShadow: { card: 'var(--qs-shadow)', pop: 'var(--qs-shadow-pop)' }
} }
```

Classes then read `bg-qs-panel text-qs-ink border-qs-line`. Keep the `player-*` safelist.

---

## 3. Typography

Fonts: **Space Grotesk** (400, 500, 600) for display and body. **JetBrains Mono** (400, 500) for labels, counters, buttons, tabs, game codes, board digits and scores. Self-host both as latin woff2 in `src/assets/fonts/` the same way Roboto is today (preload, `font-display: swap`). Remove Roboto once the swap lands.

| Role | Font | Size / line height | Weight | Notes |
|---|---|---|---|---|
| Display (hero) | Sans | clamp(36px, 4.4vw, 68px) / 1.0 | 600 | Letter spacing -0.04em. One key word in `--qs-accent`, not italic. "Your squares, **live.**" |
| H1 (page title) | Sans | 28 to 32 / 1.1 | 600 | -0.03em |
| H2 (card title) | Sans | 20 to 24 / 1.2 | 600 | -0.02em |
| H3 | Sans | 16 / 1.3 | 600 | |
| Body | Sans | 16 / 1.5 | 400 | Inputs never below 16px (iOS zoom) |
| Small | Sans | 13 / 1.4 | 400 | Legends, helper text, muted |
| Label (eyebrow, counter, button, tab, badge) | Mono | 11.5 / 1 | 500 | Uppercase, letter spacing 0.09 to 0.14em |
| Score (tile) | Sans | 34 to 48 / 1.0 | 600 | -0.04em, `font-variant-numeric: tabular-nums` |
| Board digits (axis) | Mono | 12 | 500 | Tabular. Floor 10px at 375px |
| Square text | Sans | 11 | 600 | 2-letter initials under 640px, names at 640px and up |
| TV view score | Sans | 96 to 160 / 1.0 | 600 | Tabular, read from 10 feet |

Rules:

- An eyebrow inside a panel gets a 3px by 12px accent bar before it: `| BOARD 01 / HARBOR AT RIVERSIDE`.
- Counters read `Q2 · 07:41` or `BOARD 01 / 03`.
- Game codes, branch names and anything typed are mono, uppercase, tracked.
- Never more than three type sizes in one card.

---

## 4. Shape, spacing, elevation, motion

**Spacing:** 4px base: 4, 8, 12, 16, 20, 24, 32, 48. Card padding 22px (16px under 640px). Gap between cards 16px.

**Radius:** chips 4px, buttons and inputs and tabs 6px, inner boxes and board 8px, cards and dialogs 10px, floating bars 12px, badges / dots / switches 999px. Never mix sharp and pill corners in one component.

**Borders:** 1px `--qs-line`. Prefer a border over a heavy shadow. Inputs use `--qs-line-strong`.

**Elevation:** two levels only. Cards `--qs-shadow`. Dialogs, menus, toasts, the share sheet `--qs-shadow-pop`.

**Motion:** hover and focus 120ms; state changes (toggle, tab, square claim) 200ms; score reveal and quarter winner 400 to 500ms; easing `cubic-bezier(.2,.7,.2,1)`. Animate only opacity, transform and color. Respect `prefers-reduced-motion`. The live dot may pulse; nothing else loops. No slot-machine or shuffle animation when numbers are drawn: fade the digits in over 450ms, in order.

**Icons:** one outline set (Lucide), 1.5px stroke, 20px in toolbars, 16px inline. No emoji as UI.

---

## 5. Components

### Buttons

Mono, uppercase, 11.5px, letter spacing 0.1em, radius 6px, **min height 44px** on every surface (tap target), full width under 640px when it is the main action.

| Variant | Look | Use |
|---|---|---|
| Primary | `--qs-accent` fill, white text | One per view: Join, Create a board, Claim square, Lock numbers |
| Ink | `--qs-ink` fill, `--qs-bg` text | Secondary strong action on paper (Share, Print) |
| Secondary | `--qs-panel-2` fill, 1px `--qs-line`, ink text | Default |
| Ghost | No fill, ink text (paper text on navy), `--qs-panel-2` on hover | Header and inline actions, Sign in, Light/Dark |
| Danger | `--qs-bad-soft` fill, `--qs-bad` text | Delete board, Remove player |

States: hover shifts the fill one step; focus shows the ring (section 8); disabled 45% opacity with `not-allowed` and a reason in a tooltip or helper line; loading replaces the label with a spinner and keeps the width.

### Inputs

44px high, radius 6px, `--qs-panel-2` fill, 1px `--qs-line-strong` border, 16px text. Game code field: mono, uppercase, `autocapitalize="characters"`, `autocomplete="off"`, `inputmode="text"`. Every input has a visible `<label>` in mono caps. Error: `--qs-bad` border, `--qs-bad-soft` fill, one-line message under the field. Placeholder uses `--qs-muted` at opacity 1.

### Badges and status chips

Pill, mono 10.5px caps, soft fill with matching dark text.

| Meaning | Style |
|---|---|
| Live, in progress | `--qs-live-fill` with navy text and a pulsing dot |
| Numbers locked, paid, confirmed, Q1 final | ok |
| Waiting on numbers, N squares open | warn |
| Board full, error | bad |
| Locked, read only, demo | neutral: `--qs-panel-2` fill, `--qs-muted` text, 1px line |
| Game code | mono chip on `--qs-accent-soft` with `--qs-accent` text |

### Cards

`--qs-panel` fill, 1px `--qs-line`, `--qs-shadow`, radius 10px, padding 22px. Title row (H2) then content. Dashboard board cards: title, teams line (Small, muted), a mono footer `UPDATED 3 MIN AGO · 64 / 100 CLAIMED`, and a status badge. Hover raises the border to `--qs-ink`.

### Board (the product)

- Sits inside a card on the `--qs-canvas` stage with the dot grid.
- Team bands above the grid: away left, home right, host colors with auto text color. Mono meta row under it: `10 × 10 · 100 SQUARES` left, status badge right.
- Grid: 11 by 11, 1px `--qs-line` gaps, corner cell `--qs-panel-2`, axis cells in the team `strong` color with white mono digits, empty squares `--qs-panel`, claimed squares in the player pastel with navy initials.
- Hover on an empty square: `--qs-accent-soft`. Selected while claiming: 2px `--qs-accent` inset.
- Current leader: 3px `--qs-accent` ring (outline, offset -3px), `Q2` mono label top right at 640px and up, legend line under the grid, `aria-live="polite"` announcement.
- Final quarter winners: ring stays, tile in the score panel turns `--qs-tile-ok`.
- Heatmap mode: squares tint on a sequential emerald ramp from `--qs-accent-soft` to `--qs-accent`, never team colors, never amber. Copy says "hot squares", never odds.
- 375px: board fits 343px with 30px squares, sticky axis labels, initials only, legend below. No pinch zoom needed.

### Score tiles

Navy tile (`--qs-tile`), radius 8px, big tabular sans number, mono caption under it. Two by two under the board on phones, a column beside it on desktop. A won quarter uses `--qs-tile-ok` with the winner's name in the caption: `Q1 · JESS`. A quarter that just changed flashes the number in `--qs-live` for 450ms.

### Header

Navy bar, 56px, logo lockup (white mark, emerald quarter) left; right side holds the live badge, Light/Dark ghost button and Sign in. Always a solid navy, never over the animated grid. Under 640px the right group wraps to a second row.

### Switch and toggle

44 by 26px pill, `--qs-line-strong` off, `--qs-accent` on, `--qs-panel` knob. Setting rows: label left, control right, 1px `--qs-line` dividers. Locked settings show the neutral Locked badge instead of a disabled control.

### Toasts and banners

Toast bottom center on phones, bottom right on desktop, `--qs-shadow-pop`, 5 seconds, never over a primary button. Banner inside a card: soft status fill, icon, one sentence, one action. Score announcements use the toast with the live badge style: "Q2 goes to Jess, lucky 7-3!"

### Dialogs and the share sheet

Centered, radius 10px, `--qs-shadow-pop`, dimmed navy scrim at 60%. Title, one short paragraph, actions right aligned with the primary last. Escape closes, focus moves in and returns. Share sheet rows: Copy link (ink button), QR (rendered in navy on paper), Print board, TV view.

### Printable board

Paper white, navy ink, team colors preserved, no gradients, no shadows, no dot grid. Our lockup top left at 96px wide minimum. Host logo in one fixed footer slot, capped at equal visual weight, never over the grid.

### TV view

Navy frame (`--qs-tile`), scores in 96 to 160px tabular sans, the board filling the width with team colors, amber only on the live badge and the clock. White-on-navy lockup bottom right. No hover states, no buttons, auto refresh.

### Empty, loading and error states

- Empty dashboard: "No boards yet. Create one and share the link." with one primary button.
- Loading: skeleton blocks in `--qs-panel-2` with a slow pulse. Never a blocking overlay on the board.
- Error: what happened and what to do, plus retry. "Couldn't load scores. We'll retry in a few seconds."

---

## 6. Layout

- Container max width 1600px, centered, 20px side padding (16px on phones).
- Two columns from 1280px: board left (1.3fr), score tiles and actions right (0.7fr, min 360px). Stacked below that in this order: hero, board, score, join, settings.
- Anything that changes with the game (score tiles, the quarter row) gets a fixed height measured at its tallest state so nothing jumps when a score lands.
- Panels beside each other share a height. A stretched panel is never sticky.
- If an ID selector sets `display`, add `[hidden]{display:none!important}` for that element.
- Bottom padding 110px on any page with a floating bar.

---

## 7. Logo

Unchanged from Logo v2 (Drive: Design / Logo v2). Summary:

- Primary = the lockup with the QuarterScore wordmark. Mixed-case horizontal recommended; caps lockup is an approved alternate. Bare mark only for favicon and app icons.
- Colors: navy `#0f172a`, white, emerald `#047857` (`#34d399` on navy). Never cyan or blue as the accent, never four colors, never four separate flat squares.
- Clear space one grid cell. Minimum 16px for the mark (`favicon.svg` under 32px), 96px wide for a lockup.
- On paper surfaces use the color mark. On navy use the reversed mark (white board, `#34d399` quarter). It never sits on a team-colored area.
- Tagline carries TM: "Every square, every score, live on one board.™" (`lockup-tagline.svg`).
- Don't recolor, stretch, rotate, outline, add effects, or pair with footballs, trophies, shields, league marks, money or gambling imagery, or the words "Super Bowl".

Wordmark in text: one word, camel case, QuarterScore.

---

## 8. Accessibility

- Text and meaningful icons 4.5:1 or better; large text and UI boundaries 3:1. Check every new pair in both themes (the tables above are the checked set).
- Focus ring: 3px solid `--qs-ink` with 2px offset everywhere; paper (`#f3efe8`) on navy surfaces. Never removed.
- Tap targets 44px minimum. Icon-only buttons get `aria-label` (the Join arrow must say "Join game", or better, show the word).
- One `<h1>` per page. Header title is not an `<h1>` on the welcome page.
- Board: `role="grid"` with an `aria-label` naming the teams; winner change announced with `role="status"`.
- Escape closes dialogs and sheets. Focus returns to the trigger.
- Reduced motion and 200% zoom must not break the board.

---

## 9. Voice and microcopy

The Brand Brief owns this. In short: the friend who's great at hosting; announcer energy only for score updates and quarter winners; "game day" as two words; "lucky" for celebration, never chance; "hot squares" for the heatmap. Never: pool, prize, payout, bet, odds, cash, wager, gamble, stake, pot, winnings, jackpot, entry fee, buy in, sportsbook, betting lines. No "Super Bowl" in product names or marks. Sample board teams in marketing are invented (Harbor, Riverside), never real teams.

Mono labels are lowercase fragments in data (`64 / 100 claimed`) and caps in UI (`GAME CODE`).

---

## 10. Migration plan for angular-squares

Do these in order. Each is one PR.

1. **Fonts.** Add Space Grotesk and JetBrains Mono latin woff2 to `src/assets/fonts/`, preload in `index.html`, `@font-face` in `styles.scss`, set `html { font-family: var(--qs-font-sans) }`. Remove Roboto.
2. **Tokens.** Paste `quarterscore-tokens.css` into `styles.scss`. Add the Tailwind `qs` mapping. Keep the old `--color-*` variables for one release and alias them to the new ones so nothing breaks mid-migration.
3. **Replace the sky/secondary classes.** Current counts in `src/app`: `bg-secondary-500` 24, `text-emerald-800` 20, `text-emerald-300` 20, `border-secondary-500` 18, `bg-secondary-600` 16, `ring-secondary-100` 11, `ring-secondary-500` 8, `bg-emerald-700` 8, plus a handful of `bg-blue-200`, `bg-green-*`, `text-green-*`, and three raw hex classes (`bg-[#008CFF]`, `bg-[#0074D4]`, `text-[#008CFF]`). Map: `*-secondary-500/600` → `*-qs-accent`, `secondary-700` → `qs-accent-hover`, `ring-secondary-*` → the focus ring in the token file (delete the ring classes), `text-emerald-800/300` → `text-qs-accent`, `bg-emerald-700` → `bg-qs-accent`, green status classes → `qs-ok`, raw hex → the nearest token. Grep `secondary-|accent-|emerald-|green-|sky-|\[#` afterwards and leave none.
4. **Surfaces.** `bg-page` → `bg-qs-bg`, `bg-card` → `bg-qs-panel`, `bg-input` → `bg-qs-panel-2`, `bg-header` → `bg-qs-tile`, `--color-grid-line` → `--qs-line`, square hover → `qs-accent-soft`. Put the board on `.qs-canvas`.
5. **Header.** Solid navy, remove the animated grid behind the title (audit issue 8). Logo v2 reversed lockup.
6. **Hero.** Yellow-500 accent word → `text-qs-accent` (audit issue 1). Sample board uses Harbor vs Riverside (audit issue 3). Trust line "Free · Players don't need an account".
7. **Forms.** Visible mono label on the game code input, Join button with text (audit issues 4, 5). 44px targets (issue 9).
8. **Radius and shadow.** `rounded-xl/2xl` on cards → `rounded-card` (10px); buttons `rounded-btn`; replace ad hoc shadows with `shadow-card` and `shadow-pop`.
9. **Score tiles, winner ring, heatmap** per section 5.
10. **Dark mode QA, TV view, printable** last.

After each PR: screenshot 375, 768, 1280 and 1440 in light and dark; run the contrast check on anything new; confirm no horizontal scroll and no control jumps.

---

## 11. Do and do not

**Do**

- Use emerald once per region, for the thing that matters most.
- Keep cards flat, bordered and quiet.
- Keep every size on the 4px grid.
- Fix the height of anything the game changes.
- Check both themes and 375px before calling a screen done.

**Do not**

- Use gradients on buttons or cards, glows, colored shadows, or glass effects.
- Use pure black or pure white. Use the tokens.
- Put emerald or amber on large areas. Amber is only the live signal.
- Fill squares with brand colors. Squares are paper, pastel or team colors.
- Add a second accent. Use ink, weight or size for more emphasis.
- Animate the number draw like a slot machine.
- Put the logo on a team-colored area or recolor it to team colors.

---

## 12. Pre-delivery checklist

1. Light and dark both render, no leftover hard-coded colors.
2. Only `--qs-*` tokens (plus `--home` / `--away`) are used. No raw hex outside the token file.
3. Screenshots at 375, 768, 1280 and 1440: no overlap, no horizontal scroll, no jumping controls between states.
4. Every text and fill pair passes contrast in both themes.
5. Every interactive element has hover, focus, disabled and loading states where relevant.
6. Every list and view has an empty state and an error state.
7. Winner state works without color: ring, label (640px+), announcement.
8. Copy follows the Brand Brief's voice and do-not-say list.

---

## Files in Drive > Ventures > QuarterScore > Design

- `QuarterScore Design Guidelines v2` (this document, Google Doc)
- `DESIGN.md` (this document as markdown, drop into the repo at `docs/DESIGN.md`)
- `quarterscore-tokens.css` (the token file, drop into `src/styles.scss`)
- `team-board-mockup-v2.html` (working example of the look in light and dark, phone and desktop; open in a browser)
- `Logo v2/` (unchanged)
- `QuarterScore Brand Brief` (positioning, voice, audience; its color and type sections are superseded by this guide)
- `QuarterScore UI-UX Audit & Super Bowl Punch List` (still valid; the migration plan above closes most items)
- `team-board-mockup.html` (v1, slate look, kept for reference)
