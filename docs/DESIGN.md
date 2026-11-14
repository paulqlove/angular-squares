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
| Logo | v2 lockup | v2.1 lockup (filled quarter) |

The logo is a navy 2×2 board with the top-right quarter filled emerald (Nov 1 2026: the clock-sweep wedge was replaced with a full fill because it read as a broken image at small sizes). It sits well on warm paper because paper is a neutral, not a competing hue. Everything in the Logo usage rules section of the Brand Brief still applies.

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

## Hick's law (standing design principle)

Source: Laws of UX, lawsofux.com/hicks-law. Added Nov 12, 2026 at Paul's request. All QuarterScore design work follows it.

**The law:** The time it takes to make a decision increases with the number and complexity of choices.

### Takeaways (Laws of UX)

1. Minimize choices when response times are critical to decrease decision time.
2. Break complex tasks into smaller steps in order to decrease cognitive load.
3. Avoid overwhelming users by highlighting recommended options.
4. Use progressive onboarding to minimize cognitive load for new users.
5. Be careful not to simplify to the point of abstraction.

### How we apply it in QuarterScore

1. **Fewer choices at time-critical moments.** During a live game the screen answers "who's winning this quarter" first. Picking squares and joining games show one main action per screen.
2. **Small steps for complex tasks.** Setting up a board is a short sequence of steps (game, price, players, lock), each with only what that step needs, never one long form.
3. **Highlight the recommended option.** When there's a choice, one option is the default and visually leads (for example, the green New board, or Join when a code matches). Other options stay quiet.
4. **Progressive onboarding.** A new host or player sees only what they need now. Extras like Grid/Compact or Season Pass show up once they host or need them.
5. **Don't simplify into abstraction.** Keep clear labels and real words over icon-only or vague controls. If removing something makes a screen harder to understand, keep it.

Scope: applies to future work. It is not a reason to redesign screens Paul has already approved.

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
| `--qs-muted` | `#b4bfcc` | 7.9:1 on panel, 6.9:1 on panel-2. Brightened from `#94a3b8`: small mono labels and team names read faint at 5.7:1 |
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
| Label (eyebrow, counter, button, tab, badge) | Mono | 13 / 1 (`.qs-label`); never under 11.5 | 500 | Uppercase, letter spacing 0.09 to 0.14em |
| Score (tile) | Sans | 34 to 48 / 1.0 | 600 | -0.04em, `font-variant-numeric: tabular-nums` |
| Board digits (axis) | Mono | 12 | 500 | Tabular. Floor 10px at 375px |
| Square text | Sans | 11 | 600 | 2-letter initials under 640px, names at 640px and up |
| TV view score | Sans | 96 to 160 / 1.0 | 600 | Tabular, read from 10 feet |

Rules:

- An eyebrow inside a panel gets a 3px by 12px accent bar before it: `| BOARD 01 / HARBOR AT RIVERSIDE`.
- Counters read `Q2 · 07:41` or `BOARD 01 / 03`.
- Section heads (`.qs-section-title`: Board, Players and Winners on the game page, Hosting and Joined on the dashboard) have no numbers. A 3px by 18px emerald vertical bar sits before the word (15px tall under 640px). The word is Sans 22px, weight 600 (20px under 640px).
- Hosting and Joined show the game count after the word in a muted mono label, and sit on a thin `--qs-line` underline. The game page heads have no line.
- Section heads that sit side by side (the game page's Board and Players) are at least 44px tall with their contents centered, so a badge on one side never makes it taller than the other and the cards below start and end level.
- Game codes, branch names and anything typed are mono, uppercase, tracked.
- Never more than three type sizes in one card.

---

## 4. Shape, spacing, elevation, motion

**Spacing:** 4px base: 4, 8, 12, 16, 20, 24, 32, 48. Card padding 22px (16px under 640px). Gap between cards 16px.

**Radius:** chips 4px, buttons and inputs and tabs 6px, inner boxes and board 8px, cards and dialogs 10px, floating bars 12px, badges / dots / switches 999px. Never mix sharp and pill corners in one component.

**Borders:** 1px `--qs-line`. Prefer a border over a heavy shadow. Inputs use `--qs-line-strong`.

**Elevation:** two levels only. Cards `--qs-shadow`. Dialogs, menus, toasts, the share sheet `--qs-shadow-pop`.

**Icons:** one outline set (Lucide), 1.5px stroke, 20px in toolbars, 16px inline. No emoji as UI.

### Motion

Motion is feedback, never decoration. It says "that worked", "that changed" or "this is new", then gets out of the way. Nothing waits on an animation: a leaving element stops taking clicks at once.

**Approved standard (Nov 11, 2026).** The menu, phone sheet and board switch motion below is what shipped in #257 and #258, and Paul signed it off as the standard. New menus, sheets and switches copy it as written, using the shared classes and tokens rather than new values.

**Tokens** (all in `:root` in `src/styles.scss`)

| Token | Value | Use |
| --- | --- | --- |
| `--qs-t-press` | 80ms | press down (`:active`) |
| `--qs-t-fast` | 120ms | hover, focus, exits, menus closing |
| `--qs-t-menu` | 150ms | menus and popovers opening |
| `--qs-t-state` | 200ms | enters, state changes, square claims, toasts, digit swaps, a phone sheet's dim, a phone sheet sliding down |
| `--qs-t-sheet` | 240ms | phone bottom sheets sliding up |
| `--qs-t-reveal` | 450ms | quarter winner, number draw (whole digit) |
| `--qs-ease` | `cubic-bezier(.2,.7,.2,1)` | enters and state changes on the page: claims, toasts, tabs, dialogs from 640px up |
| `--qs-ease-in` | `cubic-bezier(.4,0,1,1)` | exits on the page: squares let go, toasts, dialogs from 640px up |
| `--qs-ease-decel` | `cubic-bezier(.2,0,0,1)` | menus, phone sheets, their dim and the board switch coming in |
| `--qs-ease-exit` | `cubic-bezier(.3,0,1,1)` | menus and the Your games chevron closing |
| `--qs-ease-sheet-out` | `cubic-bezier(.3,0,.8,.15)` | phone sheets and their dim leaving, on the same curve so the page never undims before the sheet is gone |
| `--qs-ease-spring` | `cubic-bezier(.34,1.56,.64,1)` | small flips only: lock icon, copy tick, your own square claim |

Staggers are plain values, not tokens: 20ms between Your games rows (from the fifth row on they come in together), 40ms between digits in a number draw. The board switch runs from TypeScript (`slideInBoard` in the game page), so it repeats the `--qs-ease-decel` curve as a literal; change both together.

**Rules**

- Movement uses only `transform` and `opacity`. Hover, focus and selected states may also fade color (background, border, text) over 120ms; that is the only non-transform change, and it never moves anything.
- Enters ease out over 200ms; exits ease in over 120ms. Menus, sheets and the board switch use their own faster set: `--qs-ease-decel` coming in, `--qs-ease-exit` or `--qs-ease-sheet-out` going out, and a close is always quicker and plainer than the open. Travel is small: 4 to 8px for a rise, 24px at most for a slide sideways. Scale stays between .94 and 1.06.
- Nothing loops except the live dot (amber, a single dot, never a whole badge or pill). The current leader's square may breathe for about 22 seconds and then rests.
- No page-to-page transitions. Pages load in place; only content inside a page fades in.
- Every effect has a reduced-motion version. The global rule in styles.scss collapses durations, so most effects show their final state instantly; menus open and close at once. Your games and every phone sheet keep a 120ms linear fade with no slide or stagger, so they don't flash. Anything driven from TypeScript checks `prefers-reduced-motion` itself: the board switch then swaps with no movement.
- Hover effects only on devices that can hover (`@media (hover: hover)`), so nothing sticks after a tap on a phone.
- Green motion follows the green rule: only open squares tint emerald on hover, and only while the board is open.

**Patterns**

| Moment | Where | Motion |
| --- | --- | --- |
| Button and tab press | everywhere | scale .97, 80ms, ease-in |
| Square press | board, open squares on an open board | scale .94, 80ms, ease-in |
| Square hover | board, open squares only, hover devices only | emerald-soft tint, 120ms |
| Your own claim | board | initials scale .85 to 1 and fade in, 200ms, spring |
| Someone else's claim | board | initials fade in, 200ms. More than three at once (a load or refresh): no motion |
| Square let go | board | initials fade out, 120ms, ease-in |
| Number draw | board, TV | each digit fades in and rises 4px, 300ms, 40ms apart: top row left to right, then the side top to bottom (about 1.1s for 10 x 10). Plays once per viewer per draw. Never random digits |
| Quarter winner | board, Winners tiles, TV | plays for everyone watching, once per viewer per quarter. The square's emerald fades in over 450ms (an overlay's opacity), with one settle, scale 1 to 1.06 to 1 over 300ms. Its Winners tile fades to emerald over the same 450ms |
| Score change | box score, Winners tiles, TV | old number fades up 6px, new number fades in, 200ms |
| Leader moves | board axis | row and column highlight crossfade, 200ms |
| Dimming | board, when a player or winner is picked | other squares fade to 25% over 160ms, back over 120ms |
| Counters and badges | game page, dashboard (`17/100 picked`, `36 open`, Open / Locked) | number or label crossfades, 160ms |
| Lock | host bar, dashboard card | lock icon turns shut, 260ms spring; a board locked from its card shows open for a beat, then snaps shut |
| Dashboard card changes group | dashboard | Filling, Ready to lock, Locked: 200 to 300ms ease-out, cards reflow with FLIP |
| Menus | Your games, help, profile, card `…` menu, dropdowns | open: drop from the button, opacity 0 to 1 with 8px down and a 0.96 vertical scale to 1, 150ms (`--qs-t-menu`), `--qs-ease-decel`, origin at the button's corner. Close: fade with a 4px lift and no squash, 120ms (`--qs-t-fast`), `--qs-ease-exit`, and it stops taking clicks at once. Your games rows fall in 6px over 140ms, 20ms apart, starting 40ms in; its chevron turns with it (150ms open, 120ms close). Shared classes `qs-menu-enter` / `qs-menu-leave` with `animate.enter` / `animate.leave`; Your games uses `.yg-pop` |
| Phone bottom sheets | under 640px: every dialog docked to the bottom (Manage players, share, confirm and the rest), Join with a code, Your games | open: the sheet slides up from `translateY(100%)` to 0 over 240ms (`--qs-t-sheet`) while the dim fades in over 200ms, both `--qs-ease-decel`. Close: sheet slides down and the dim fades out together, 200ms, `--qs-ease-sheet-out`. Reopening mid-close turns back from where it is. Classes `qs-sheet-phone` (any docked dialog on a phone) and `qs-sheet-slide` (sheets that always slide) |
| Dialogs from 640px up | every dialog | backdrop fades in 150ms; panel rises 8px and scales .97 to 1, 200ms, `--qs-ease`. Out 120ms, `--qs-ease-in`: backdrop fades, panel drops 4px and scales to .98. Classes `qs-modal-enter` / `qs-modal-leave` |
| Toasts | bottom of the screen | target: rise 8px and fade in, 200ms; fade out and drop 4px, 120ms; the rest glide into place, 200ms. Not there yet: live toasts still slide in from the right edge over 300ms (`animate-toast-in`) and leave with no motion |
| Copy confirmations | share sheet, TV link | icon swaps to a tick with a small pop, 280ms spring; label reads Copied |
| Tabs | game page | new panel fades in and rises 6px, 160ms |
| Content after loading | game page, dashboard | fades in, 160ms, no movement (the skeleton already has the page's shape) |
| Skeletons | everywhere | `qs-skel` shimmer only, shown after a 140ms wait; never Tailwind `animate-pulse` |
| Board switch | game page arrows and arrow keys | the current board stays on screen until the next board's data arrives (no skeleton, no blank), then swaps in place and eases 12px in from the side the arrow points to, 180ms, `--qs-ease-decel`, transform only with no fade. Reduced motion: an instant swap |
| TV rotation | `/tv` kiosk | slide 4rem and fade, 350ms, from the side it rotates to |
| Form errors | Create, Edit, sign-in | message fades in and rises 4px, 160ms; scroll smoothly to the field. No shake |
| Tour (walkthrough) | dashboard and game page tours | the page dims (`--qs-tour-dim`) with a hole cut around the step's target and a 3px accent ring around the hole. The dim and card fade in over 150ms (`--qs-ease-decel`), the card rising like a dialog panel; both leave in 120ms (`--qs-ease-exit`). Between steps the card never disappears: when the next target needs a scroll, the page scrolls smoothly while the spotlight and card hold still, then the ring, hole and card glide to the new target together, 200ms (`--qs-t-state`), `--qs-ease-decel`, and the card's words crossfade (in 200ms, out 120ms). Transform only: the dim is four panels around the hole and the ring is four corners and four edges, so a move is a translate plus a one-axis scale, never a change to position or size. While the page scrolls on its own, everything tracks the target with no animation. A step with no target closes the hole to the middle and centers the card. Reduced motion: instant scroll and the final state at once, dim still shown |

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

**Search field (`.qs-search`).** Every search input (the dashboard's Search games, Search teams on Create a board and Edit game, Search players for the co-host) is the same borderless field: 44px high, 6px radius, no border, `--qs-search-fill` (ink mixed 12% into `--qs-panel`, about #e2e2e3 light and #384150 dark). A 20px muted search icon sits 12px from the left and the text starts 8px after it: 16px ink, with a muted placeholder at opacity 1 and no "..." (`Search games`, `Search teams`, `Search players`). Focus is a 2px inset ink ring (`box-shadow: inset 0 0 0 2px`) that fades in over 120ms, with no outer ring. No hover change. The clear × (dashboard only for now) is a 44px square flush right, showing only when there is text, with a 16px muted icon that turns ink on hover. Search teams inputs are `type="search"`. Every other input stays `.qs-input`.

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

`--qs-panel` fill, 1px `--qs-line`, `--qs-shadow`, radius 10px, padding 22px. Title row (H2) then content. Dashboard board cards are grouped under small eyebrow labels by what the host does next: Ready to lock (full, unlocked), Filling, Locked. Each card is one tap target to the game. Each team gets its own line, away team first: its logo (20px), its code in semibold ink, then its name in muted text. NFL logos and names come from our team table; boards linked to a game in another league (college, UFL and so on) use the logo and nickname ESPN sends with that game, the same ones the Edit game picker shows, through `TeamLogoService`, which the board caption, box score and TV view use too. A board in another league with no linked game, or before ESPN answers, shows the code alone, custom boards show the names as typed, and a board with no teams says `Teams not set`. A Grid / Compact toggle picks the card view: two borderless 44px icon buttons, 2px apart, with 6px corners and 20px icons (muted at rest, `--qs-panel-2` with an ink icon on hover, ink fill with a `--qs-bg` icon when pressed, the global focus ring) at the right end of the Hosting heading row, after the game count, from 640px up only. Players who don't host games get no toggle and always see Grid. `Grid view` and `Compact view` are their labels and tooltips, the choice is remembered on the device in `qs-card-view`, Grid until chosen, and switching fades the cards in over 160ms with no movement. Grid is the tall card from 640px up in two columns, three from 1280px, and the compact row on a phone. Compact is a row with a 56px mini board and a mono state centered under it in a 68px column (`36 open` in the accent, or `Locked` / `Full` in muted), then the name and the team lines, so names line up down a group. In Compact, groups lay cards in `repeat(auto-fill, minmax(19rem, 1fr))` from 640px up (one column on a phone), and every card stays a row at every width, so Compact never turns into tall cards when the window narrows (D-020). Each card sits in an `inline-size` container, and in Grid view a card 28rem (448px) wide or more turns tall. The `tall:` Tailwind variant covers Grid view only (a card 28rem wide, or from 640px). In the tall card the mini board (112px) sits on a navy `--qs-tile` panel with the open count beside it (a big `--qs-tile-count` number, `open`, then `of 100` in `--qs-tile-muted`; `Locked` or `Full` once nothing is left to sell), and the name and team lines sit under the panel. In the mini board, open squares carry the accent (accent mixed 38% into the panel on a phone, `--qs-tile-open` on the navy panel) and claimed squares are neutral. On full or locked boards the taken squares are filled and empty ones are left blank, with no row or column numbers. While a board is filling, a slim full-width Share invite bar (44px, neutral panel fill, ink text and icon, never green) runs across the bottom of the card; locked boards have no bar. A Ready to lock card gives the host a matching Lock now bar (asks first with "Lock and draw numbers", then locks and draws in one save, the same way the game page does, and turns Auto-lock and draw off); players see no bar. Locking a board always draws its numbers unless they are already drawn; Clear numbers and Draw numbers stay on the game page for a redraw. When Auto-lock and draw is on, the card adds `Auto-locks Sun 7:25 PM` under Full (under the team lines on a phone). A board locked from its card shows its lock open for a beat, then snapping shut; the Lock now bar previews the closed lock on hover and focus. Reduced motion skips both. A `…` menu holds Edit and Delete, in the row on a compact card and in the panel's top corner on a tall one. Hover raises the border to `--qs-ink`.

**Dashboard bottom bar (phones).** Under 640px, Join with a code and New board leave the page heading and sit in a bar fixed to the bottom of the screen, 12px from each side and above the home indicator (`env(safe-area-inset-bottom)`). The bar is a 12px-radius panel at 88% with a blur and `--qs-shadow-pop`: Join with a code is the outline secondary button on the left, New board the navy primary on the right (hosts only; guests see Join alone, full width). Join opens an edge-to-edge bottom sheet with a grab handle and the six-character code field. The page gets 128px of bottom padding so the last card clears the bar, and toasts lift above it. From 640px up the bar is gone and both actions sit top right as before. The dashboard tour points at whichever copy is showing, and on a phone its create and join steps say to look at the bottom of the screen.

**Dashboard search.** Once a host has six or more boards, a search shows; below that there is nothing to search. For now the threshold is one board (`searchMinBoards`) so it can be tried on any dashboard. The status groups (Ready to lock, Filling, Locked) are the only sorting, newest first inside each, with no filter chips or sort menu. On a phone a square search button sits first in the bottom bar and Join shortens to `Join` so New board keeps its name. Tapping search crossfades the bar in place: Join and New board step 12px left and fade out (120ms, `--qs-ease-exit`) while the field (search icon, text, clear ×) and Cancel slide 12px in from the right (200ms, `--qs-ease-decel`); Cancel reverses it and clears the search. The keyboard opens with it, and the bar rides above the keyboard. From 640px up, a floating pill at the bottom center holds only a 320px `Search games` field, styled like the game page's host tools (12px radius, 1px `--qs-line`, panel at 88%, blur, `--qs-shadow-pop`, 8px padding, 62px tall); Join and New board stay top right. Every control in the bar and the pill is 44px tall with 6px corners. The field is the shared borderless `.qs-search` (see Inputs), with its clear × and a 2px inset ink focus ring, never green. On a phone the search button is a 44px `qs-btn-secondary` square with a 20px icon, Cancel is `qs-btn-secondary`, and the bar has 6px padding and 4px gaps like host tools. Presses scale to .97 over 80ms. Cards filter live inside their groups, empty groups hide, and the count reads `3 of 10 games`. With no match, one card says `No games match “zebra”` with a Clear button. Escape clears the field (and closes it on a phone). The bar and the pill fade away under any sheet or dialog (120ms out, 200ms back), the page gets extra bottom padding while the pill shows, and toasts lift above both.

### Board (the product)

- Sits inside a card on the `--qs-canvas` stage with the dot grid.
- Team bands above the grid: away left, home right, host colors with auto text color. Mono meta row under it: `10 × 10 · 100 SQUARES` left, status badge right.
- Grid: 11 by 11, 1px `--qs-line` gaps, corner cell `--qs-panel-2`, axis cells in the team `strong` color with white mono digits, empty squares `--qs-panel`, claimed squares in the player pastel with navy initials.
- Hover on an empty square: `--qs-accent-soft`. Selected while claiming: 2px `--qs-accent` inset.
- Current leader: 3px `--qs-accent` ring (outline, offset -3px), `Q2` mono label top right at 640px and up, legend line under the grid, `aria-live="polite"` announcement.
- Quarter winners: the square fills `--qs-win` (#34d399) with navy text in both themes, replacing the player pastel (Paul, Nov 10, 2026). Its label adds "winning square" for screen readers. The tile in the score panel turns `--qs-tile-ok`.
- Heatmap mode: squares tint on a sequential emerald ramp from `--qs-accent-soft` to `--qs-accent`, never team colors, never amber. Copy says "hit rate", never odds.
- 375px: board fits 343px with 30px squares, sticky axis labels, initials only, legend below. No pinch zoom needed.

### Score tiles

Navy tile (`--qs-tile`), radius 8px, big tabular sans number, mono caption under it. Two by two under the board on phones, a column beside it on desktop. A won quarter uses `--qs-tile-ok` with the winner's name in the caption: `Q1 · JESS`. A quarter that just changed flashes the number in `--qs-live` for 450ms.

### Header

Navy bar, 60px on every page so it never shifts between pages, logo lockup (white mark, emerald quarter) left; right side holds the live badge, Light/Dark ghost button and Sign in. Always a solid navy, never over the animated grid. Under 640px the right group wraps to a second row.

One header and one footer on every page (Nov 14, 2026), except the TV view and present mode, which keep their own frame. `app-site-header` (`components/ui/site-header`): the logo is always a link home, the full lockup from 640px up and the square mark under 640px, so it sits in the same place on every page. `position` is `static` (Create), `headroom` (Home, Dashboard, reading pages) or `fixed` (Game, with a 60px spacer). `nav="guides"` adds the guide links and Create a board (Dashboard when signed in), with a Menu button on phones; reading pages, teams, blog and Page not found use it. Each page keeps its own right-side buttons. `app-site-footer` takes `width`: `reading` (68rem, lines up with the reading column) or `wide` (1600px with the 32px gutter, Home and Dashboard). No footer on Create, Game or the TV view.

**Your games (game page).** The header button opens one list for everyone signed in, hosts, players and guests: a 360px popover on desktop, the bottom sheet on phones. It shows the five most recent games, the game on screen first with a 3px ink bar and a Viewing tag, and a Host tag on games the person runs or co-hosts. Each row is one link: a 30px mini board, the name, the matchup in muted text, and the state on the right (Filling with the open count in accent mono, Ready to lock with Full, or Locked with the lock icon). Green stays for open squares only. The footer holds Join with a code (an inline six-character field), Create a game when there is only one game, and My dashboard. "Recent" mixes the account's own and joined games with boards opened on this device (`qs-recent-games` in localStorage), which is the only list a guest has. Motion: the popover drops down from under the button (opacity, 8px and a 0.96 vertical scale, 150ms, `cubic-bezier(0.2,0,0,1)`). Closing is quicker and plainer: it fades out with a 4px lift and no squash (120ms, `cubic-bezier(0.3,0,1,1)`), the way Material and Tailwind UI menus close; the chevron turns with it (150ms open, 120ms close). Its rows fall in 20ms apart, starting 40ms in, each 6px over 140ms, and from the fifth on they come in together. On phones the sheet slides up from the bottom (240ms, scrim fading in over 200ms) and back down with the scrim on the same curve (200ms, `cubic-bezier(0.3,0,0.8,0.15)`), so the page doesn't undim before the sheet is gone, with the same row stagger starting 80ms in. Reopening mid-close turns back from where it is. Focus moves to the first game on open and back to the button on close. Reduced motion: a 120ms fade only. Only transform and opacity move.

### Players view (dashboard)

Season Pass hosts with two or more games (hosted or co-hosted) get a Boards | Players switch in the Hosting heading row; Grid / Compact hides while Players is on, and the game count hides on phones to make room. Players lists everyone across the host's games in two groups, Unconfirmed then Confirmed, with a Find a player search and an All games picker.

- **Cards:** a card per player, two a row on a phone and from 640px, three from 1024px. Each card has the name, then "+2 new squares", "Same name, account 2" or "also Sammy" in small text, the points and an arrow. From 640px up it adds squares under the points and a tile per game (up to 13 to a row of 14px, so a game sits in the same spot on every card) with the game count. Tiles: Confirmed is solid ink (never green), Not yet is a 1.5px outline, New squares is a warn fill, Not playing is a faint solid `--qs-line` tile at 60%. Unconfirmed tiles are buttons that confirm that game, with a focus ring and a tooltip (name, squares, points, status, "Click to confirm"). A key sits above the groups from 640px.
- **Opening a card:** the card gets an ink border and its games open in a full-width panel right under its row (the grid flows dense, so the cards after it fill the row). Each game has its squares and points, a remove icon (a lock on locked games) and a green toggle (on is Confirmed; off puts the game back how it was, with no Undo note), then Remove… and Confirm rest. From 640px the games sit in two or three columns. On a phone they list one per row, unconfirmed first; confirmed games past five fold behind "Show N more (confirmed)". Removing one game asks under that game's row on a phone; otherwise the question sits above the buttons.
- **Remove asks first:** "Remove Dana from Playoffs? 4 squares open back up. Their other games stay." on the bad-soft fill, Cancel and Remove. Locked games keep their squares.
- **Confirm rest** shows at once with Undo in the note under the player.
- **Motion:** rows and cards fade in (`qs-row-in`, 160ms); the confirm toggle slides. Reduced motion turns both off.

### Switch and toggle

44 by 26px pill, `--qs-line-strong` off, `--qs-accent` on, `--qs-panel` knob. Setting rows: label left, control right, 1px `--qs-line` dividers. Locked settings show the neutral Locked badge instead of a disabled control.

### Toasts and banners

Toast bottom center on phones, bottom right on desktop, `--qs-shadow-pop`, 5 seconds, never over a primary button. Banner inside a card: soft status fill, icon, one sentence, one action. Score announcements use the toast with the live badge style: "Q2 goes to Jess, lucky 7-3!"

### Dialogs and the share sheet

Centered, radius 10px, `--qs-shadow-pop`, dimmed navy scrim at 60%. On phones most dialogs dock as a bottom sheet that runs edge to edge: full width, flush with the bottom, 18px top corners, no scrim showing beside or below it, whatever the dialog's size (the size caps its width from 640px up only). Title, one short paragraph, actions right aligned with the primary last. Pick the dialog size so its actions fit on one line from 640px up (Before you lock, with Lock and draw as is beside Convert to 25, lock and draw, is `xl`), and let the action row wrap (`sm:flex-wrap`) so a long label drops to a second line instead of running past the panel edge. On phones the actions stack full width, primary on top. Every dialog uses `app-modal`; a footer action row sits on the panel fill with a 1px `--qs-line` top border and no background tint of its own. Escape closes, focus moves in and returns. Share sheet rows: Copy link (ink button), QR (rendered in navy on paper), Print board, TV view.

### Printable board

Paper white, navy ink, team colors preserved, no gradients, no shadows, no dot grid. Our lockup top left at 96px wide minimum. Host logo in one fixed footer slot, capped at equal visual weight, never over the grid.

The printable page (`/printable-football-squares`) prints its grid lines as borders, since browsers drop background colors by default, and prints in light-theme ink even when the page is in dark mode.

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

### Reading pages (guides, FAQ, rules, legal, board landing pages)

These are pages people read, not tools they operate. They need their own rules. Added Nov 9, 2026 after the footer pages kept coming out "technically tidy but flat". Components (all in `features/content/`): `reading-layout.components.ts` (`app-reading-page`, `app-reading-header`, `app-reading-section` with a `wide` slot, `app-reading-end`), `app-marketing-page` (data-driven pages built from those), `boardDiagram()` in `board-diagram.ts`, `pageFacts()` in `page-facts.ts`; styles `.qs-canvas`, `.qs-body`. New reading pages use these building blocks, never their own copies of the layout.

**Process rule: study first, then build, then compare.** Before redesigning any page, capture 4 to 6 pages that look good, measure what they do (font sizes, widths, spacing, colors) and look at them next to your result. Matching a spec of numbers (line length, sizes) is not enough. The pages we studied were Tailwind's blog posts, Anthropic's news pages, Linear Method, Basecamp's Getting Real, Salesforce's what-is-CRM explainer, Josh Comeau's guides and chess.com's how-to-play.

**What every good reading page has**

1. **A display moment.** Headline 60 to 72px, tight tracking, line-height about 1.0. Ours: `clamp(2.5rem, 5.6vw, 4.25rem)`, weight 600, tracking -0.04em, line-height 1.02. A 48px headline reads as a paragraph.
2. **Rank in the text.** Headings are full ink. Body copy sits one step below (`.qs-body`, ink mixed 82% into the page color). Pure ink on every line gives nothing a rank.
3. **A structural device that carries information.** A hero visual, a metadata rail, a numbered contents list, a margin heading. A flat column of text with no device is what reads as lazy.
4. **Visuals get a stage.** Diagrams sit on the dotted canvas (`.qs-canvas`) in a bordered frame, built from tokens, never floating bare and never in a different palette (the old diagrams used slate grays and looked foreign).
5. **Real rhythm.** 80px above a section (`mt-20`), a 1px line (`border-qs-line`) at its top, 24px between heading and text, 16px between paragraphs. The rhythm does the work of dividers, so add no other rules.

**The layout we use (desktop)**

- Page width 64rem, left-aligned inside a centered page. Breadcrumb, headline and footer all share the same left edge. The footer container is `max-w-[68rem]` with `px-8` so its columns line up with the article.
- Hero: headline, one line of intro (20px, muted, max 34rem) on the left; on the right a 25rem visual that shows the thing being explained, or a facts panel (`pageFacts`: date, kickoff, venue) where there is nothing to picture. Do not repeat a fact in both the eyebrow and the panel. How to play has no hero visual: under the headline sits a full-width demo you step through (`app-how-it-works-demo`), built from the real game page's parts. A step bar on top (01 Pick, 02 Draw, 03 Win) fills with a 3px accent line. On the left are the step's words, a panel and Back and Next; on the right a `.qs-canvas` stage holds a game card with the board name and a badge (N open, Locked, Q1 final), the navy scorebug, the axis caption and a board with 1px lines and navy number bars. 1 Pick: tap any open square to claim it (your own claim springs .85 to 1 over 200ms); Next picks one for you. 2 Draw: the digits land 40ms apart over 300ms and your numbers show as two navy tiles; the demo always deals your square Chiefs 7, Cowboys 4. 3 Win: tap a quarter (Q1 17-14 is yours, then Jo, Kim, Ana); the winner's column and row headers take the accent, the winning square settles 1 to 1.06 to 1 in emerald and other squares dim to 25%. The step text is in an `aria-live` region and reduced motion shows each step at once. On phones the stage sits between the words and the panel and squares show initials. The dashboard tour's last step links here (See how it works); following it ends the tour.
- Steps: a 4-column row under the hero, mono counters `01` to `04` in accent, 18px titles, 15px text, 1px vertical hairlines between columns. Number only true sequences.
- Sections: a two-column grid, `14rem` margin column for the heading (22px, weight 600), `40rem` max for text (17px, line-height 1.7). Headings are not sticky (the shell clips overflow, so sticky never works).
- Phones: everything stacks, 16px gutters, no horizontal scroll.
- End of page: "Keep going" as a plain divided list (no cards, no orphan cells), then one sentence and the primary button. No full-width colored slab.
- Cut copy before adding structure. One sentence per idea; a diagram or a facts panel replaces a worked example. People do not read long explanations (Paul, Nov 9).
- Legal and affiliation notices go below the content, small and muted. Substantive legal cautions (for example the fundraiser page) stay near the top as a quiet note with an accent bar.

**Board diagrams**

- Build every board diagram with `boardDiagram()`. All cells are square (a grid of equal columns with `aspect-square` cells), so a 10 by 10 board looks like a board. Width is capped by column count (about 2.9rem per column).
- Navy label tiles, paper squares, pastel player colors for names, and the winning square plus its row and column labels in emerald, so the diagram teaches the rule by tracing it.
- Keep names to 3 letters or fewer (Sam, Kim, Max). Longer names clip in a 34px cell.
- Hero diagrams carry no caption. Section diagrams keep a one-line caption.

**Rejected, do not repeat**

- Filling empty page space with a sticky table of contents, side rails, illustrations, gradient heroes, per-section icons, pull quotes or drop caps. The fix for empty space is rhythm and one good visual, not more elements.
- Centering the article text. Left-aligned text in a centered column is right; narrowing the text without centering its column leaves it hugging the left edge.
- A second body typeface. Space Grotesk at 17px with 1.7 line-height is fine; the problem was line length (110 to 120 characters) and flat hierarchy.
- Cards around prose. Cards are for things you act on.

**Check before calling a reading page done:** screenshot at 1440 and 390 in both themes; headline, breadcrumb and footer share a left edge; text lines run 60 to 75 characters; nothing scrolls sideways; compare it against two of the reference pages above.

---

---

## 7. Logo

Logo v2.1: Logo v2 (Drive: Design / Logo v2) with the top-right quarter filled solid emerald instead of the clock-sweep wedge (Nov 1 2026). The wedge read as a half-loaded image at header and favicon sizes. In the one-color marks the filled quarter merges with the frame; that is expected. Summary:

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

The Brand Brief owns this. In short: the friend who's great at hosting; announcer energy only for score updates and quarter winners; "game day" as two words; "lucky" for celebration, never chance; "Hit rate" for the heatmap tab. Never: pool, prize, payout, bet, odds, cash, wager, gamble, stake, pot, winnings, jackpot, entry fee, buy in, sportsbook, betting lines. No "Super Bowl" in product names or marks. Sample board teams in marketing are invented (Harbor, Riverside), never real teams.

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

## 11. How-to videos and thumbnails

**Videos.** Simple how-tos with fake data. Bella voiceover (ElevenLabs), warm and calm, no music. Step lines on screen, tight trims, logo end card, no zoom, light box on taps. YouTube: not made for kids, comments off. Landscape 16:9 plus a vertical 9:16 Short of each. Site embeds are tap-to-load, and the poster is the video's own YouTube thumbnail (the Short's on phones), with our play button and length on it; on phones the Short plays. For search, each page with clips also lists every desktop clip once as a VideoObject in its JSON-LD (`video-structured-data.ts`), so a new clip in `howto-videos.ts` needs a description and its YouTube upload date.

**Thumbnails: style A "Board" (Paul, Nov 13).**

- Left: warm paper (`--qs-bg` #f6f3ee), a mono uppercase eyebrow `HOW TO · 0N` in muted, and a two-line Space Grotesk 600 headline (tight tracking, -0.045em) with one key word in `--qs-accent` emerald. Logo lockup bottom left.
- Right: the real product board on the canvas, showing that video's step (navy number bars, pastel and winner squares as on the board).
- Keep chips and text out of the bottom-right corner: YouTube's duration badge covers it at list size.
- Sizes: 1280x720 for landscape videos, 1080x1920 for Shorts. Shorts custom images upload only in YouTube Studio on a computer.
- Headlines: Make a board, Pick your squares, Lock & draw, Highlight a player, Check hit rate, Edit your game, Manage players.
- Files: Drive > How-to videos > Thumbnails (A). Source template: thumb.html in the Chief Creative Officer channel.

---

## 12. Do and do not

**Do**

- Use emerald once per region, for the thing that matters most.
- Keep cards flat, bordered and quiet.
- Keep every size on the 4px grid.
- Fix the height of anything the game changes.
- Check both themes and 375px before calling a screen done.
- Study and measure real reference pages before redesigning a reading page (section 6, Reading pages).

**Do not**

- Use gradients on buttons or cards, glows, colored shadows, or glass effects.
- Use pure black or pure white. Use the tokens.
- Put emerald or amber on large areas. Amber is only the live signal.
- Fill squares with brand colors. Squares are paper, pastel or team colors.
- Add a second accent. Use ink, weight or size for more emphasis.
- Animate the number draw like a slot machine.
- Fill empty space on a reading page with rails, icons, illustrations or a sticky contents list.
- Put the logo on a team-colored area or recolor it to team colors.
- Animate between pages.
- Pulse anything but the single amber live dot.
- Shake a field, bounce an icon, or play confetti.

---

## 13. Pre-delivery checklist

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
