# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Football Squares (Super Bowl Squares) - A real-time multiplayer game for managing squares pools. Built with Angular 17 (standalone components), Firebase (Auth + Realtime Database), and Tailwind CSS.

## Commands

```bash
npm start          # Dev server at localhost:4200
npm run build      # Production build to dist/angular-squares/
npm test           # Run Karma + Jasmine tests
```

## Architecture

### Directory Structure
- `src/app/core/` - Singleton services (AuthService, GameService) and route guards
- `src/app/features/` - Feature pages (welcome, dashboard, super-bowl-squares)
- `src/app/components/ui/` - Reusable UI components (toggle, dialog)
- `src/app/shared/` - Shared directives and utilities

### Key Services
- **AuthService** (`core/services/auth.service.ts`) - Firebase Auth + cookie-based guest mode. Uses Angular Signals for state.
- **GameService** (`core/services/game.service.ts`) - Multi-game CRUD with Firebase Realtime DB. Games stored at `games/{gameId}`, user index at `users/{userId}/games/`.
- **EspnService** (`core/services/espn.service.ts`) - Fetches live NFL scores from ESPN public API. No auth required.

### SSR Hydration Pattern (Critical)
Services use **lazy initialization** for Firebase objects to handle Angular SSR hydration:

```typescript
// DON'T: Constructor-based init breaks on hydration
private db!: Database;
constructor() {
  if (this.isBrowser) this.db = getDatabase(...); // Only runs during SSR, not client hydration
}

// DO: Lazy getter ensures init happens on first client-side use
private _db: Database | null = null;
private get db(): Database {
  if (!this._db && this.isBrowser) {
    this._db = getDatabase(...);
  }
  return this._db!;
}
```

**Why**: During SSR, `isBrowser` is `false` so Firebase isn't initialized. When Angular hydrates on the client, it reuses the same service instance without re-running the constructor, leaving Firebase undefined.

### State Management
- **Signals** for auth state and UI state (modern Angular approach)
- **RxJS BehaviorSubject** for game state subscriptions
- Local class properties for component state

### Routing (`app.routes.ts`)
- `/` - WelcomeComponent (redirects authenticated users via guestGuard)
- `/dashboard` - DashboardComponent (requires auth via authGuard)
- `/game/:gameId` - SuperBowlSquaresComponent (public access)

### Route Guards (`core/guards/auth.guard.ts`)
- `authGuard` - Requires authentication
- `guestGuard` - Redirects logged-in users away from welcome page
- `gameCreatorGuard` - Only authenticated non-guests can create games

## Code Organization

Follow the section-based structure in `instuctions.md`:
1. Constructors
2. Public Properties (alphabetical)
3. Public Functions (alphabetical)
4. Protected Properties/Functions
5. Private Properties/Functions (alphabetical)

Use access modifiers and type declarations on all properties/functions.

## Styling

Tailwind CSS with custom design tokens in `tailwind.config.js`:
- Semantic colors: `bg-page`, `bg-card`, `text-default`, `text-muted`, `border-default`
- Player colors: 31 color variants (bg-red-200, bg-blue-200, etc.) safelisted for dynamic assignment

## Firebase Structure

```
games/{gameId}/
  name, ownerId, ownerName, createdAt
  selectedSquares: { "row-col": "playerName" }
  homeNumbers/awayNumbers: number[]
  scores: { q1, q2, q3, q4 }
  playerColors, winners, paidPlayers
  homeTeam, awayTeam, venmoUsername
  isLocked, isRandomized, pricePerSquare
  espnEventId: string (optional - links to ESPN game for live scores)

users/{userId}/games/{gameId}/
  createdAt, name
```

## Game Logic

- **Square selection**: Key format is `"row-col"` (e.g., "3-7")
- **Winner calculation**: Match last digit of each team's score to row/column numbers
- **Payout distribution**: Q1: 20%, Q2: 20%, Q3: 20%, Q4: 40%
- **Probability heatmap**: Historical NFL data in `features/super-bowl-squares/utils/probability.utils.ts`

## ESPN Live Scores

Game owners can link their game to an ESPN NFL game for live score syncing.

- **API**: `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard` (public, no auth)
- **Flow**: Owner expands "ESPN Live Scores" → selects game from dropdown → clicks "Link" → clicks "Sync Scores"
- **Scoreboard UI**: Dark compact table showing quarter-by-quarter scores with live status indicator
- **Pro Bowl handling**: Maps 3 periods to Q1-Q3, uses final score for Q4

## Documentation

- [Enhancement Plan](./ENHANCEMENT_PLAN.md) - Full roadmap with technical specs
- [TODO](./docs/TODO.md) - Current task tracking

## Deployment

- **Platform**: GitHub Pages (custom domain: quarterscore.com)
- **Base href**: `/` (critical — custom domain serves from root, not a subdirectory)
- **Build command**: `npm run build` outputs to `dist/angular-squares/`
- **Deploy command**: `ng deploy` (uses angular-cli-ghpages, config in angular.json)

## Prompt Gaps

When you encounter a situation where you had to backtrack, made an incorrect assumption, or needed clarification mid-task, append an entry to `PROMPT_GAPS.md` with: what you got wrong, what assumption you made, and what instruction in CLAUDE.md would have prevented it. Write it as a suggested CLAUDE.md addition, not a bug report.
