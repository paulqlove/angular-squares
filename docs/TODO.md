# Angular Squares - TODO

**Based on:** [Enhancement Plan](../ENHANCEMENT_PLAN.md)
**Last Updated:** February 2026

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
- [ ] Create loading skeleton components
- [ ] Implement button variants (primary, secondary, ghost, danger)
- [ ] Add micro-interactions (square select, score update)
- [ ] Create empty state illustrations

### Dark Mode
- [ ] Create ThemeService with system/light/dark modes
- [ ] Define dark color palette
- [ ] Add dark mode toggle in settings
- [ ] Test all components in dark mode

---

## Metrics Tracking

| Metric | Current | Target |
|--------|---------|--------|
| Lighthouse Accessibility | ~78 | > 95 |
| Test Coverage | Low | > 60% |
| Dark Mode | No | Yes |
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
