# QuarterScore brand

Use these tokens for product UI. The navy and slate base carries the screen. Emerald is a small accent. Amber is only for something happening live.

## Tagline

Every square, every score, live on one board.™

Write it that way, trademark included, wherever it appears: the home hero, the default meta description, Open Graph, Twitter, and the web manifest.

## Color

Tokens live in `src/styles.scss` and are exposed through `tailwind.config.js`.

| Token | Hex | Use |
| --- | --- | --- |
| `--color-action` | `#047857` | Filled primary actions. Class `bg-button`. |
| `--color-action-hover` | `#065f46` | Hover for those actions. Class `bg-button-hover`. |
| `--color-action-foreground` | `#ffffff` | Label on an action fill. Class `text-button`. |
| `--color-focus` | `#047857` | Focus rings and focus borders. Classes `ring-focus`, `border-focus`. |
| `--color-live` | `#fbbf24` | Live moments only: in-progress badges and the current winning square. Class `bg-live`. |
| `--color-live-foreground` | `#0f172a` | Text on a live badge. Class `text-live`. |
| Page, card, header, text | slate scale | The base. `bg-page`, `bg-card`, `bg-header`, `text-heading`, `text-default`, `text-muted`. |

`#047857` is the action color. It replaces the old sky action color `#075985`.

### Contrast

Measured as WCAG contrast ratio:

- White `#ffffff` on `#047857` is **5.48:1**. That passes AA for normal text, so action labels stay white.
- White on the hover fill `#065f46` is **7.68:1**.
- White on `#059669` is **3.77:1**. Do not use `#059669` for text or for a button fill.
- `#047857` on white is **5.48:1**. On the page background `#f1f5f9` it is **5.01:1**. That is the header treatment: a white control with emerald text, sitting on navy.
- Yellow `#eab308` on `#f1f5f9` is **1.75:1**. Do not use yellow for type.
- Slate `#0f172a` on amber `#fbbf24` is **10.69:1**. Live badges use that pair, not white on amber or yellow.

### Where emerald is allowed

Emerald is for primary actions and focus rings. A primary action is a filled button that commits the next step: create, join, save, copy, confirm. A focus ring is the keyboard outline on the control that has focus.

Keep emerald to roughly a tenth of any screen. Do not paint backgrounds, feature icons, step numbers, progress bars, tabs, or selection chrome with it. Those stay navy or slate (`bg-header`, `bg-control`, `bg-progress`, `border-heading`, `text-heading`).

Do not reintroduce sky (`secondary-*`) or the blue accent scale for actions.

### Amber

Amber is for live moments: a game currently in progress, and the square that is winning right now. Guest notices, locked badges, warnings, and marketing headlines are not live moments. Use slate for those.

### Do not recolor

- The probability heatmap (`bg-yellow-200`, `bg-green-200`, `bg-green-300`, and the rest of that scale) stays on the historical NFL colors.
- Player square pastels (`bg-red-200`, `bg-amber-200`, and the other claimed-square colors) are assignments, not brand colors.

## Logo

Logo v2 files are in `src/assets/brand/`. The wordmark is drawn as outlines, so the logo does not need a font. The emerald piece is a quarter wedge in the top-right cell.

| File | Where |
| --- | --- |
| `lockup-horizontal.svg` | Mixed-case lockup for light backgrounds. Navy wordmark, emerald wedge `#047857`. This is the header lockup. |
| `lockup-horizontal-reversed.svg` | The same lockup on navy (`bg-header`, the home backdrop). White wordmark, wedge `#34d399`. |
| `lockup-horizontal-caps.svg` / `lockup-horizontal-caps-reversed.svg` | All-caps lockup. Not used in the app header. |
| `lockup-stacked.svg` / `lockup-stacked-reversed.svg` | Stacked lockup, same light and navy pairing. |
| `lockup-tagline.svg` / `lockup-tagline-reversed.svg` | Lockup plus the tagline. Not used in the app chrome. |
| `mark.svg` / `mark-reversed.svg` / `mark-mono-light.svg` / `mark-mono-dark.svg` | The mark alone. Do not put these in the product UI. |

The header, the not-found page, and the static 404 always show the mixed-case horizontal lockup, name included. `transparent` and `solid` headers sit on navy, so they use the reversed file. The `fixed` game header follows the page background and swaps with the `dark` class.

Do not pair the mark with lime or grey. Do not recolor the reversed wedge: `#34d399` belongs to the reversed files only. It is not a text color and it is not an action fill.

Icons, from `public/`:

- `favicon.svg` follows `prefers-color-scheme`.
- `favicon.ico`
- `apple-touch-icon.png`
- `icon-192.png` and `icon-512.png`, listed in `site.webmanifest`.

Social image: `src/assets/og-image.png` (1200×630), also used for `twitter:image`. Source SVG: `src/assets/og-image.svg`.

## Type

| Role | Family | Files |
| --- | --- | --- |
| UI and body | Inter | `src/assets/fonts/inter-latin.woff2` |
| Display and headings (`h1`–`h6`, `font-display`) | Archivo | `src/assets/fonts/archivo-latin.woff2` |

Both are latin variable fonts, self-hosted, licensed under the SIL Open Font License (`src/assets/fonts/LICENSE`). `@font-face` uses `font-display: swap`. `src/index.html` preloads both.

Scores and grid numbers use `tabular-nums` so digits stay the same width as they change. That includes the board axis, the sample board, score inputs, the box score, winner lines, and payout figures.
