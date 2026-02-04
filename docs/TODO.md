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

## Phase 2: Supabase Migration (Optional)
**Priority:** Low | **Status:** Not started

- [ ] Create Supabase project
- [ ] Design PostgreSQL schema (profiles, games, squares, scores, winners)
- [ ] Configure Row Level Security policies
- [ ] Create SupabaseService
- [ ] Migrate FirebaseService methods
- [ ] Set up Realtime subscriptions
- [ ] Data migration script for existing Firebase data

---

## Phase 3: Live Score API Integration
**Priority:** Medium | **Status:** Partial

- [x] Build EspnService in Angular (direct API, no proxy needed)
- [x] Add NFL game selection UI (dropdown with available games)
- [x] Link game to ESPN event (stores `espnEventId` in Firebase)
- [x] Compact scoreboard UI with quarter-by-quarter scores
- [x] Add "Live" indicator with pulse animation
- [ ] Implement auto-polling mechanism (currently manual sync)
- [ ] Show last update timestamp
- [ ] Add manual score override for discrepancies

---

## Phase 4: Design Improvements
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
