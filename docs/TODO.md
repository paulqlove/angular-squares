# Angular Squares - TODO

**Based on:** [Enhancement Plan](../ENHANCEMENT_PLAN.md)
**Last Updated:** November 4, 2026

---

## Status Legend
- [ ] Not started
- [x] Completed
- [~] In progress
- [!] Blocked

---

## Phase 1: Foundation (COMPLETE)

Implemented features:
- [x] Multi-game support with 6-character shareable codes
- [x] Route-based game access (`/game/:gameId`)
- [x] Firebase Auth (Google OAuth, Email/Password, Guest mode)
- [x] Welcome/onboarding page with sign-in options
- [x] User dashboard (create, view, share, delete games)
- [x] Game ownership and permissions system
- [x] Guest mode with cookie-based names (30 days)

---

## Security Implementation
**Priority:** Critical | **Status:** Complete

- [x] Fix XSS vulnerability in DialogComponent (removed bypassSecurityTrustHtml)
- [x] Create SanitizationService for input validation
- [x] Apply sanitization to all user inputs (player names, game names, team names, venmo, scores, prices)
- [x] Create Firebase security rules (database.rules.json)
- [x] Deploy Firebase security rules
- [x] Add server-side validation for string lengths and number ranges

---

## Phase 2: Live Score API Integration
**Priority:** Medium | **Status:** Complete

- [x] Build EspnService in Angular (direct API, no proxy needed)
- [x] Add NFL game selection UI (dropdown with available games)
- [x] Link game to ESPN event (stores `espnEventId` in Firebase)
- [x] Compact scoreboard UI with quarter-by-quarter scores
- [x] Add "Live" indicator with pulse animation
- [x] Move ESPN selection to game creation flow (dashboard)
- [x] Move ESPN settings to header settings panel
- [x] Implement auto-polling mechanism (30s when game in progress)
- [x] Move ESPN score writes to a scheduled Cloud Function (`functions/`, see [FUNCTIONS.md](./FUNCTIONS.md)). Browser polling remains only when `serverScoring` is false.
- [x] Show last update timestamp ("Last synced: Xm ago")
- [ ] Add manual score override for discrepancies

---

## Phase 3: Design Improvements
**Priority:** Medium | **Status:** Not started

### Accessibility
- [ ] Audit and fix color contrast (WCAG AA - 4.5:1 minimum)
- [ ] Add focus indicators to all interactive elements
- [ ] Ensure 44x44px minimum touch targets
- [ ] Add ARIA labels for screen readers

### UI Polish
- [x] Add ripple grid animation to welcome page hero
- [x] Consolidate 3 headers into shared AppHeaderComponent with ng-content projection
- [ ] Create loading skeleton components
- [ ] Implement button variants (primary, secondary, ghost, danger)
- [ ] Add micro-interactions (square select, score update)
- [ ] Create empty state illustrations

### Dark Mode
- [x] Create ThemeService with system/light/dark modes
- [x] Define dark color palette
- [x] Add dark mode toggle in settings
- [x] Test all components in dark mode

---

## Metrics Tracking

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Accessibility | ~78 | > 95 |
| Test Coverage | Low | > 60% |
| Dark Mode | Yes | Yes |
| Page Load Time | ~2.5s | < 1.5s |

---

## Notes

_Session notes and decisions go here_

---

## Completed Items Log

| Task | Completed | Notes |
|------|-----------|-------|
| Phase 1 implementation | Feb 2026 | Multi-game, auth, dashboard, ownership |
| ESPN live scores integration | Feb 2026 | EspnService, game linking, scoreboard UI |
| ESPN game selection in creation | Feb 2026 | Dropdown during game creation, auto-populates team names |
| ESPN settings in header | Feb 2026 | Moved from main content to settings panel |
| Auto-polling for live scores | Feb 2026 | 30s interval when game in progress, stops when final |
| Last sync timestamp | Feb 2026 | Shows "Xm ago" format in settings panel |
| Dark mode support | Feb 2026 | ThemeService with system/light/dark toggle, semantic color tokens |
| Ripple grid animation | Feb 2026 | Canvas-based expanding ring effect on welcome hero, gradient title |
| Fix dashboard refresh flash | Feb 2026 | App-level loading screen while auth initializes, prevents welcome page flash |
| Duplicate player name prevention | Feb 2026 | Warns and blocks when entering a name already in use |
| Unique player names per game | Feb 2026 | playerUserIds mapping, forced name change modal, dashboard name propagation |
| Security implementation | Feb 2026 | XSS fix, SanitizationService, Firebase security rules deployed |
| Shared header component | Feb 2026 | Consolidated 3 page headers into AppHeaderComponent, extracted SettingsPanelComponent |
| Box Score tab | Feb 2026 | ESPN-linked box score with quarter-by-quarter breakdown |
| Venmo Pay dropdown | Feb 2026 | Replaced dialog with dropdown popover — copy username, open Venmo link |
| Presentation mode | Nov 2026 | `/present` and `/present/:gameId`: TV board, score, winners, stats, QR; rotation through hosted boards |
| Arrow-key board switching | Nov 2026 | Left/right between hosted boards on the game page and in presentation mode, slide-in animation |
| Fix game-not-found on board switch | Nov 2026 | Old board's subscription now removed on route change; leaked state reset |
| Wrap names on wider boards | Nov 2026 | Square names wrap up to three lines at 640px and up |
| Docs: Firebase Hosting | Nov 2026 | CLAUDE.md deployment section updated; GitHub Pages is retired |
| Free-tier design and Season Pass plan | Nov 2026 | Board 4-0: Free keeps TV mode and heat map; one $5.99 Season Pass (live scoring, more boards, custom splits); fixed date; refund-until-used; US only. Upgrade dialog now shows one Season Pass. Live-scoring gate waits for checkout. |
| Upgrade dialog view count | Nov 2026 | `upgradeViews/{uid}` for the Jan 15 fake-door read; needs a database rules deploy |
| Thanksgiving theme (timeboxed) | Nov 2026 | On Mon Nov 23 to Sat Nov 28 by the visitor's date (script in `src/index.html`, tokens in `src/styles.scss`); self-expires. **Remove both after Nov 30 2026.** `?season=thanksgiving` previews it. Judge by boards created Nov 25-27. |
| Blog hidden, TV mode page | Nov 2026 | Blog link removed and /blog out of the sitemap while there are no posts; Drive plan marked superseded. New page /football-squares-on-tv. Content ships as pages; the blog returns only for anonymous data stories (see FUTURE.md, Content: pages, not a blog). |
