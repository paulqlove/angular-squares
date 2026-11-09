# Site audit: inconsistencies, UX and UI issues

Date: 2026-11-08. Four reviewers audited the site in parallel: three UI designers (public and marketing pages; dashboard, Create and sign-in; the game page and TV views) and the Chief Creative Officer (the design system, from the code).

**How far to trust this.** The first pass was code-only. A second, visual pass then checked it in a real browser: public pages with Playwright (17 routes, 1440x900 and 375x812, light and dark) and signed-in pages with Playwright against a local sandbox (fake account, local Firebase emulators, never production). The results are in "Visual verification" below, and the items that changed are corrected inline. Items marked "not checked" were still not seen on screen.

## Verified before writing this up

| Claim | Result |
| --- | --- |
| Marketing CTAs go to `/dashboard` and signed-out visitors land on the home page | True. 16 `/dashboard` references in `features/content`; `authGuard` runs `router.navigate(['/'], { queryParams: { returnUrl } })` |
| The fixed header (z-100) sits above z-50 modals | True. `app-header.component.ts:34` is `z-[100]`; the dashboard Create modal at `dashboard.component.ts:456` is `z-50` |
| `components/ui/dialog` is the shared dialog | **False.** `app-dialog` is not used anywhere. It is dead code. One reviewer's claim that it is the shell for the upgrade, Share, Create and Auth dialogs was wrong |
| 31 em dashes are rule violations | Not confirmed. The ones sampled are browser page titles, and no rule was found. Left off the backlog |
| No banned money words in visible copy | True per two reviewers. Internal names (`winners-and-payouts`, `quarterPayouts`) are code only |

## Visual verification (second pass)

Public pages: 68 screenshots plus metrics. Signed-in pages: Playwright against a local sandbox. Hosts seen in the sandbox run: `localhost:4201`, the local auth emulator and the public ESPN scoreboard API only; no production Firebase. The sandbox was stopped afterwards. Screenshots are in the scratchpad (`pw/shots/` and `pw/shots-signed-in/`), outside the repo.

### Confirmed

| Finding | Evidence |
| --- | --- |
| Every marketing and team-page CTA points at `/dashboard` | Rendered DOM on every marketing page, team pages (2 each) and the footer |
| Team page CTA fails contrast | White on team color: Steelers 1.76:1, Saints 1.85:1, Dolphins 3.95:1, Chargers 4.28:1 |
| White button in the CTA band fails in dark mode | 1.92:1 (light mode 5.48:1) on Super Bowl, Teams, Printable; the 404 button too |
| Mobile marketing header hides the CTA | At 375px only the logo and Menu show |
| Blog index has no conversion path | Only header (desktop) and footer links |
| Create draft is wiped by Esc or a desktop backdrop click | Typed a team name, closed, reopened: empty. At 375px the modal is full-bleed so there is no backdrop, but Esc still wipes it |
| Players cannot see board state | A signed-out guest sees no Open/Locked/Drawn chip; owners at 375px do not either. The chip appears only in the host bar at 1440px |
| Name-edit modal has no dialog semantics | No `role=dialog`, no `aria-modal`, Esc leaves it open, close X has no `aria-label` |
| Board names are 8px on phones | Computed 8px on 25 and 100 boards at 375px, cells 36x24 and 24x24. Contrast is fine (7.1 to 9.2:1); the problem is size. Truncation was not seen with the short seed names |
| Guest name input is 14px | 14px and 34px tall (the modal inputs are 16px) |
| Players list defaults open on phones | Pushes "03 / Winners" below the fold for guests and hosts |
| Host bar labels are 10px on phones | 11.5px at 1440. The bar has 4 buttons (not 5), each 81x52, so tap size is fine |
| About 40 text spots under 12px | Dashboard: 11.5px (15), 10.5px (11), 10px (18). Game page 375px: 8px names, 10px, 11.5px. TV: 11.5px labels |
| Winners explainer is two permanent paragraphs | 375px and 1440px |
| Delete uses the native `confirm()` | Text: "Are you sure you want to delete this game? This cannot be undone." with no board name |
| Joined cards lose status | "Host · name" where hosted cards show Open or Locked |
| TV has no state when numbers are not drawn | Empty navy axis bar, winners as dashes with no label |
| TV labels are small | 11.5px "Winners", "Claimed", "Players verified" (contrast 5.7:1, passes); "Board full" 10.5px |
| "Players verified" (TV) versus "Confirmed" (elsewhere) | Both visible |
| Sign-in and name-edit modals sit under the fixed header (game page) | z-50 modal under the z-100 header; the Sign in button stays bright over the overlay |

### Wrong or changed

| First-pass claim | What was found |
| --- | --- |
| Dark-mode band text is white on emerald | Band text is fine (9.29:1); the button inside it is the failure |
| Header paints over the dashboard Create modal | Wrong on the dashboard: header is sticky z-40, under the z-50 overlay |
| Multiple h1s on team and blog-post pages | Every public page checked has one h1 |
| Native confirm on Reset and Unlock | Wrong: Lock, Unlock and Draw show no native confirm. Lock opens a styled "Only 18 of 50 picked" dialog |
| Dashboard filter chips are under 44px | Not shown in the sandbox (no chips visible); unverified |
| Dashboard card icon buttons are unlabeled and small | Partly wrong: all four are 44x44 and have `aria-label`s ("Share game", "Edit game", "Delete game"). Edit still shows a cog |
| Host bar has 5 buttons on phones | It has 4 |
| The sign-in modal uses old styling | Partly wrong: the sign-in modal looks in-system. The guest name prompt is plain but consistent |
| Present on a TV is missing from the profile menu | Not found in the sandbox, but this may be a seed artifact (the sandbox host may not count as the owner); it showed on the real build earlier. Unverified |

### Partly confirmed

- **Tap targets under 44px:** Players Hide 52x16, name-edit pencil 26x36, profile-menu theme buttons 89x36, tour Skip 53x36. Toast dismiss, auto-lock Cancel and "Add your name" were not triggered.
- **Welcome team grid:** 4 columns of bare gradient tiles at 375px (about 80px each) with no visible team names at all, not just hover-only names.
- **404:** bare page, no header, footer or second action; button contrast fails in dark mode.
- **Footer:** missing on `/create` and the 404; the "Start a free game" link goes to `/dashboard`.

### New issues the visual pass found

1. **Tour step 1 ("Enter your name") fires for the signed-in host** and highlights the page title, because the name input does not exist for them.
2. **Signed-in `/create`** shows only "Home" in the header, with no profile or Your games link.
3. **A guest tapping an empty square** opens "Join This Game" with no name hint, and the 14px name field never gets focus.
4. **Team page on phones:** upcoming-game rows are cramped. "PIT @ CIN" stacks, the date wraps onto four lines and two buttons are squeezed beside it. The printable board preview is tall and the team header is cropped.
5. **Home page footer** sits in a narrower, indented column that does not line up with the page gutter above it (desktop light).
6. **Home step 1 copy** ("Sign in and create a new game board") disagrees with the hero button and the "No sign-in needed" line.
7. **Eyebrow style differs by page:** the home page uses "Section 01 /" mono eyebrows; marketing and team pages use plain headings.
8. **Same `/dashboard` destination is labelled four ways** across the footer and page CTAs.
9. **Marketing "Keep going" cards in dark mode** use emerald underlined text on slate, inconsistent with the buttons.
10. **Game page h1 is empty** (see corrections above).

### Looks good

- **No horizontal overflow** on any page, at 375px or 1440px, in either theme.
- **Contrast on the signed-in pages is good:** nothing under 4.5:1 except aria-hidden "/" separators (3.1:1). The 10.5px Open badge is exactly 4.5:1 in light mode.
- **No broken images** on the public pages. Dashboard icon buttons are 44x44.

### Not checked

Google sign-in failure (no Google provider in the emulator), the live score strip (ESPN board not visible), toast versus host bar overlap on short screens (the toast sits 18px above the bar at 812px high), the "More" tab shifting, tablist ARIA, the upgrade dialog, a real blog post (the dev server has none locally), the sign-in modal on the public pages, the guest banner, email-link, focus trap, the TV winners status chip, toast wording, light theme on the game page beyond one board, and touch hover behavior.

---

## Priority 1: fix first (bugs and lost conversions)

1. **Dead-end CTAs.** Every marketing "Start a free game" goes to `/dashboard`. A signed-out visitor is bounced to the home page with no sign-in prompt. `/create` works signed out and is what the welcome hero uses. Locations: `content/marketing-pages.ts` (lines about 222, 289, 339, 392, 433, 470, 507, 589), `content-shell.component.ts:61`, `printable-board.component.ts:203`, `best-numbers.component.ts:148`, `teams-index.component.ts:70`, the footer, and `team-page.component.ts` `createBoard()` (sends signed-out users to `/dashboard?create=true`). Fix: point them at `/create`; keep "Dashboard" for signed-in users. Quick win.
2. **Dark-mode CTA bands fail contrast (corrected by the visual check: the band text is fine at 9.29:1; the failure is the white button inside the band, emerald on white, 1.92:1 in dark; same on the 404 button).** `bg-qs-accent text-white` and `bg-white text-qs-accent` hard-code white. In dark mode the accent is `#34d399` and `--qs-on-accent` is `#0f172a`, so white on emerald is about 1.7:1. This is the main conversion band on every marketing page. Locations: `marketing-page.component.ts` (about line 96), `printable-board.component.ts:202`, `teams-index.component.ts:69`. Fix: use `text-qs-on-accent` on the band and `qs-btn qs-btn-ink` for the button. Quick win.
3. **Team page CTA contrast.** `team-page.component.ts` (about line 54) uses an inline team color with `text-white`, so light teams (Steelers, Saints, Chargers, Dolphins) fail AA. The header already uses `getContrastColor`; reuse it. Quick win.
4. **A stray tap wipes the Create draft.** A backdrop tap or Esc on the dashboard Create modal calls `closeCreateModal()` and then `clearCreateDraft()` with no confirmation (`dashboard.component.ts:456-458, 846-849, 1173`). Fix: ignore backdrop clicks on Create (keep Esc and the X), or confirm only when the form has content. Quick win.
5. **Players cannot see the board state.** The Open, Locked and Drawn badge lives only in the host bar (`super-bowl-squares.component.html` about line 63), is hidden below `sm`, and only owners and co-hosts see it. Everyone else gets a small "Live" label. Fix: one status chip in the "01 / Board" header for everyone: Open for picks, Locked, Numbers drawn, Live, Final. Quick win.
6. **Z-index conflicts (partly wrong per the visual check: on the dashboard the header is sticky z-40, under the z-50 modal overlay, so there is no conflict there. Confirmed on the game page for the sign-in and name-edit modals, which paint under the fixed z-100 header).** Header z-100 shows over z-50 modals (auth modal, dashboard modals, game name-edit and kicked modals). The host bar (z-90) shows over them. `content-shell` (z-200) ties the toast. The upgrade dialog (z-400) hides toasts and the tour (z-300). Current values: 10 / 30 / 40 / 50 / 90 / 100 / 150 / 200 / 300 / 400. Proposed scale: 40 header, 50 host bar and menus, 100 modals, 150 toast, 200 tour. Quick win.
7. **Silent Google sign-in failures.** `auth-modal.component.ts:152-171`: `signInWithGoogle` has an empty catch. A blocked popup or a cancel shows nothing. Fix: inline error "Sign-in didn't finish. Try again or use email." Quick win.
8. **Two game-page modals lack dialog semantics.** The name-edit and kicked modals (`super-bowl-squares.component.html` about lines 354 and 411) have no `role="dialog"`, no `aria-modal`, no Esc, and unlabelled close buttons. `board-keys.ts` relies on `[role=dialog]` to know a dialog is open, so keyboard shortcuts may fire underneath. They also use the old styling. Fix: add the roles and Esc now; move to the shared modal shell later. Quick win.

## Priority 2: high-impact polish

### Phones (game page and dashboard)
- **Board names are 8px** on pastel colors (`game-board.component.scss:56`), truncated. Phone players cannot tell whose square is whose. Fix: initials on phones, with the full name in `aria-label` and in a tap-to-reveal line. Bigger.
- **Tap targets under 44px:** Players Hide/Show (about 12px, `super-bowl-squares.component.html` ~337), edit-name pencil (about 26px, ~121), auto-lock Cancel and Add your name (36px), tour Skip (about 36px), dashboard filter chips (`min-h-9`, 36px), profile theme buttons, toast dismiss (about 24px). Fix: `min-h-11 min-w-11`. Quick win.
- **The guest name input is 14px** (`text-sm`, ~130), so iOS zooms on focus. Edit-name dialogs already use 16px. Fix: `text-base min-h-11`. Quick win.
- **The Players list defaults open** on phones and pushes "03 / Winners" far down. Fix: collapse below `lg` with a summary row ("12 players · 9 confirmed"). Quick win.
- **Host bar labels are 10px** with five buttons across 375px. Toast offset sits close to the bar on short screens. Fix: 11px minimum, move Edit into a More item on phones, derive the toast offset from the bar height. Quick win.
- **About 40 text spots under 12px** (9, 10 and 11px), including `.qs-label` at 11.5px and `.qs-badge` at 10.5px, which are the root cause. Worst files: `marketing-pages.ts` (9), `edit-game-dialog` (5), `game-status` (4), `dashboard` (3). Fix: raise the two classes to 12px and clamp the rest. One edit fixes most of it.

### Game page content
- **No live score on the page.** It appears only on the Box score tab and the TV view. Fix: when `espnLive` exists, add a one-line strip under the title ("BAL 14 - 10 CIN · Q3 4:12"). Bigger.
- **Winners explainer is two permanent paragraphs** (`winners-and-payouts` lines 47-50), which breaks the one-line helper rule. Keep one line; put the empty-quarter rule behind a "?".
- **Tabs are not a real tablist.** No `tabpanel`, no `aria-controls`, no arrow-key roving. Non-Board panels sit absolutely over the board with their own scroll (`~226`), which makes a scroll area inside a scrolling page on phones. Bigger.
- **Empty states are thin.** The heatmap shows "appears once numbers are drawn" with no time or host cue. Guests see no hint that auto-lock exists, because `autoManageNote` returns null for non-owners (`super-bowl-squares.component.ts:1194`). Fix: show everyone "Locks and draws at 7:25 PM".

- **"Highlight their squares" in the Players list is tooltip-only** (`players-list.html ~11`). Add one muted line: "Tap a name to see their squares".

### Dashboard
- **Native `confirm()` for destructive actions** (`dashboard.component.ts:204, 330, 614`, flows at 188-204). Delete exists twice with different wording. The browser box is unstyled and sometimes suppressed on mobile, and the trash icon sits one tap from "Open game". Fix: one styled confirm with the board name, "Cancel" and "Delete game". Bigger. The design-system review counted 5 `alert(` or `confirm(` calls in total.
- **Card footer has 3 to 4 icon-only buttons** (Share, Remove, Edit, Delete) relying on `title` tooltips (`431-448`). Edit is a cog while the dialog is "Edit game". Fix: keep Open game and Share; put Edit and Delete in a More menu with a labelled Edit. Bigger.
- **Card information hierarchy** (`410-428`): "Confirmed" duplicates "Players"; the code badge outranks the board name; joined cards say "Host · name" where hosted cards show Open or Locked, so joined cards lose status. Fix: show "Needs confirm: N" only when N > 0, and show Open or Locked on joined cards. Bigger.
- **Guest banner says "Sign in with Google to host"** but the button calls `signOut()` (`142-150`), and sign-in also supports email. Label it "Sign in" and show the choice.

### Sign-in and email link
- **Auth modal** (`auth-modal.component.ts:15-17, 30-45, 80-100`) uses old styling; the guest-name input has a placeholder and no label; the title is "Join This Game"; the email form forces a name before it sends a link. Fix: `qs-card`, `qs-input`, a visible label, "Join this game". Making the name optional is a product decision (see below).
- **No focus trap** (`174-176`). Focus lands on the close X, not the first field. Share-dialog already has `trapTab`; reuse it.
- **`email-link.component.ts:21-22, 43`**: "Signing you in…" has no spinner or `aria-busy`, and the error's "Send a new link" goes to `/`, which does not open the sign-in dialog. Route to `/create` or open the modal.

### Dialogs and feedback
- **Eight live dialog patterns, three overlay styles, mixed phone behavior.** Overlays: `bg-black/60` with blur (7), `bg-black/50` (dead dialog), `bg-slate-950/75` with no blur (upgrade-pass line 32). Widths: `max-w-md` (3), `lg` (2), `2xl` (1). Only the Share dialog is a bottom sheet on phones. Only 7 dialogs have `role="dialog"`. Fix: one `<app-modal>` shell (z-150, black/60 plus blur, centered on desktop, bottom sheet on phones), then move auth, share, payment, shrink, edit-game, upgrade-pass and the dashboard and game modals onto it. Bigger. Also: only the upgrade dialog sets `inert` on the page behind it; Create and Edit do not, so focus can leave them.
- **Toasts** (`toast.component.ts:10-17, 25-27`): bottom-right at 280px min width and can overlap the mobile bar; `role="alert"` conflicts with `aria-live="polite"`; warnings with advice last 5s (too short). Wording is inconsistent: "Failed to load games / create game / save changes / assign co-host" versus "Could not remove it. Try again." (`dashboard.component.ts:136, 291, 335, 434, 546` versus `322`). Pick "Could not X. Try again."
- **Upgrade dialog** (`upgrade-pass-dialog.component.ts:44, 77-78`): the eyebrow says "Season Pass / Coming soon" but the dialog shows a hard "$5.99 One time" with a Notify me form. It reads like a store. See decisions below.
- **Co-host email has no validation** in the Create form (`create-game-form.component.ts:270-283`).

### Public pages
- **Mobile header hides the CTA** behind the Menu button (`content-shell.component.ts:27-60`). Show the CTA beside Menu at all widths.
- **Blog has no conversion path.** Neither `blog-index` nor `blog-post` has a CTA. Add the same accent band as the marketing pages.
- **h1s (corrected by the visual check):** every public page checked has exactly one h1, including team pages. The game page has one h1 element but it is empty; the visible title is not an h1. Present and email-link were not checked. Fix: make the game title the h1.
- **Welcome page:** step 1 says "Sign in and create a new game board", but the hero's Create works without signing in. Suggested: "Pick your teams, then create a board in seconds. No sign-in to start." The team grid (`welcome.component.ts` ~213) shows 9-10px names only on hover, so touch users never see them, and the 4-column grid on 375px gives tiles of about 80px.
- **The 404 page** is a bare block with a hand-rolled `<a>` (`bg-qs-accent text-white`, same dark-mode contrast problem), no header or footer, and no second action. Use `qs-btn` and link to `/create`.

## Priority 3: system cleanup

### Legacy island
The app is about 88% migrated (197 legacy token uses against about 1,440 current). Legacy tokens (`bg-card`, `text-muted`, `text-default`, `border-default`, `bg-page`, `bg-input`) are aliased in `styles.scss` ("Legacy aliases, remove after migration"), so they render correctly today. The risk is drift, not breakage. The island is the content and blog area:

| File | Legacy hits |
| --- | --- |
| content/marketing-page.component.ts | 26 |
| super-bowl-squares.component.html (name-edit and kicked modals, lines 354 and 411) | 25 |
| content/team-page | 24 |
| content/best-numbers | 24 |
| content/teams-index | 21 |
| content/printable-board | 21 |
| auth-modal | 8 |
| blog-index | 7 |
| walkthrough | 7 |
| blog-post | 4 |

- `content/marketing-pages.ts` has 76 Tailwind palette classes and 38 `dark:` variants, and is the only file that uses `dark:`; the rest of the app uses the data-theme tokens.
- Legacy radius: `rounded-xl` 22, `rounded-2xl` 10, `rounded-lg` 15, `rounded-md` 11, bare `rounded` 18, plus 8 arbitrary radii, against 90 token radii.
- Hard-coded white or black text: `box-score` 16, `team-page` 5, game page 4, `marketing-pages` 4.
- Printable board hex values are fine in print styles; check them on screen in dark mode.

### Components and patterns
- **Buttons:** 132 `<button>`s, 19 with no `qs-btn` or `qs-tab` (mostly icon and menu buttons). Worst: `box-score` (3) and the game page (3).
- **Inputs:** 46 fields; `box-score` has 8 with one-off classes.
- **Labels:** four spacing variants (`mb-2`, `mb-1.5`, none, `block`) and one `qs-label text-[10px]`. Add a `.qs-field-label` helper.
- **Empty states:** no shared pattern (dashboard uses `qs-title`; payment-dialog and players-list use plain muted paragraphs).
- **Dropdowns and menus:** one `app-dropdown` (dashboard only) plus profile-menu and help-menu as separate z-50 popovers.
- **Typography:** bold and semibold both used on headings; tracking is mixed (`tracking-wider` 5, `wide` 2, `[0.3em]` 2, `[0.2em]` 1) against `qs-label`'s 0.1em; `h4`s under dialogs and forms have no consistent size.

### Copy
- **Game versus Board:** copy says both. "Join This Game" and "Game Not Found" are user-facing; "Create game" (welcome), "Start a free game" (shell and footer), "Create a free board" (team), "Create board" (team games). Pick "Create a board" for the action, and use "game" only for the real-world game. The team page says "squares contest"; use "squares board".
- **Title Case outliers:** "Game Not Found", "Edit Name", "Name Already Taken", "Join This Game", "Screen Mirroring", "Update Scores", and tour titles "Create a New Game", "Join with a Code". The system is sentence case.
- **"Players verified"** on the TV (`present.html ~118`) versus "Confirmed" everywhere else.
- **Random "shame" labels** (`players-list.ts:100`) are visible to all players. Next to "Confirmed" they read as a penalty.
- **The tour says "Click"** on a touch product (`super-bowl-squares.component.ts:186, 192`).
- **Host bar and dialog naming:** "Lock board" and "Edit game" in the bar, "Manage players" versus "Players" on phones.
- **Other:** "Copy TV link" versus "Copy office link" (pick one noun); footer "Made with love for sports ball fans" is off-voice; footer label "Donation squares" differs from the linked page "Football squares fundraiser"; the blog post says "Posts stay free of logos", which reads oddly; "Section 04" eyebrows on the welcome page appear nowhere else (brand-voice call).
- **Money words:** none in visible copy. Not-yet-checked: a user-facing "Payouts" heading may exist in `winners-and-payouts.component.html`.

### TV and Present views
- No state when numbers are not drawn (empty navy bar, no "Numbers draw at kickoff").
- "Winners" and "Claimed" labels are 11.5px mono muted, hard to read at a distance; the QR caption is muted (`present.html ~120, ~129`). Use a 1.25rem minimum and the ink color.
- The winners row shows scores with no live status chip.
- Box score badge and tour dots use color alone; add text. The tour has no `role="dialog"` and does not move focus.

### Dead code
- Unused components: `components/ui/dialog` (the only dialog with a different overlay), `components/ui/ripple-grid` (18 hex colors), `features/super-bowl-squares/components/score-input` (6 legacy hits). Verify before deleting.
- Unused classes (low value, keep in the kit): `qs-badge-bad` (0 uses), `qs-display`, `qs-fade-rise`, `qs-input-error`, `qs-badge-code` (1 use each), `qs-btn-danger` (2).
- Legacy aliases and color ramps in `styles.scss` and `tailwind.config.js` can be pruned after the migration.
- Reduced motion has a global rule; 4 explicit `motion-reduce` classes are redundant. Two `outline-none` uses should be checked for a replacement focus ring.

---

## Decisions needed from Paul

1. **Fundraiser page wording** (`marketing-pages.ts` ~531): "the funds go to the charity" and "does not receive the money" describe money flow on a site whose rule is that it never handles money. Confirm or reword.
2. **Upgrade dialog price:** show "$5.99 planned", drop the price until the pass is live, or leave it.
3. **Sign-in name:** make the name optional on email sign-in, or ask after sign-in.
4. **Random "shame" labels:** keep, or replace with one neutral "Not confirmed".
5. **Em dashes:** the audit counted 31, mostly page titles. Is there a rule against them? If yes, say so and they join the copy pass.

## Suggested order

- **Batch 1 (about a day):** everything in Priority 1, plus the readability and tap-target fixes (raise `qs-label` and `qs-badge` to 12px, 44px targets, 16px guest input, collapse Players on phones, host bar label size).
- **Batch 2:** the shared modal shell and the styled delete confirm, then the dashboard card actions and toasts.
- **Batch 3:** the content and blog migration to current tokens, the h1 and copy pass, removing the legacy aliases and dead code.

## Top five changes by leverage (design-system review)

1. One z-index scale.
2. One shared modal shell.
3. Raise `qs-label` and `qs-badge` to 12px.
4. Migrate the content and blog legacy island.
5. Copy pass: sentence case, "Board" not "Game", one h1 per page.

## Paul's decisions (Nov 9)

- **Fundraiser wording:** reword, no description of where money goes. Keep the $5.99 price display.
- **Sign-in name:** not optional (it is how a player picks a square).
- **"Shame" labels:** replace with Confirmed / Not confirmed.
- **Em dashes:** allowed, used sparingly; avoid them in messages to people.
- **Working order:** I change a chunk, Paul tests locally, then we push and merge.

## Completed

Update this list as each chunk ships (change, Paul tests locally, push, merge).

| Item | Status | PR |
|---|---|---|
| Fundraiser page: no description of where money goes | Done | this batch |
| Random "shame" labels and emojis replaced with Confirmed / Not confirmed | Done | this batch |
| Sign-in name optional? | Decided: stays required, no change | n/a |
| Em dash rule | Decided: allowed, used sparingly, none in messages to people | n/a |
| P1 #1 Dead-end CTAs now go to /create | Done | this batch |
| P1 #2 Dark-mode CTA band and button contrast | Done | this batch |
| P1 #3 Team page CTA contrast | Done | this batch |
| P1 #4 Create draft survives backdrop tap and Esc | Done | this batch |
| P1 #5 Board status chip (Open / Locked / Drawn) for everyone | Done (no Final state yet) | this batch |
| Everything else in Priority 1 to 3 | Not started | |

