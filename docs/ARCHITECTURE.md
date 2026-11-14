# Angular Squares - Architecture & Code Analysis

## Project Overview

Football Squares (Super Bowl Squares) - A real-time multiplayer game for managing squares pools.

- **Framework:** Angular 17 (standalone components)
- **Backend:** Firebase Auth + Realtime Database
- **Styling:** Tailwind CSS with dark mode support
- **External API:** ESPN for live NFL scores

---

## Directory Structure

```
src/app/
├── core/              # Singleton services, guards
│   ├── guards/        # Route guards (auth, guest, gameCreator)
│   └── services/      # AuthService, GameService, EspnService, ThemeService
├── features/          # Feature pages
│   ├── welcome/       # Landing/sign-in page
│   ├── dashboard/     # User's game management
│   └── super-bowl-squares/  # Main game component
├── components/ui/     # Shared UI components (toggle, dialog)
└── shared/            # Directives, utilities
```

---

## Architecture Patterns

### Standalone Components (Angular 17)

All components use `standalone: true` with direct imports:

```typescript
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule, ToggleComponent],
  // ...
})
```

### State Management

- **Angular Signals** - Sync state (auth, theme, UI toggles)
- **RxJS BehaviorSubject** - Async Firebase streams (games, real-time updates)
- **No external state library** - Appropriate for current app size

### SSR Hydration Pattern

Services use lazy initialization to handle Angular SSR hydration:

```typescript
// Lazy getter ensures init happens on first client-side use
private _db: Database | null = null;
private get db(): Database {
  if (!this._db && this.isBrowser) {
    this._db = getDatabase(...);
  }
  return this._db!;
}
```

**Why:** During SSR, `isBrowser` is `false` so Firebase isn't initialized. When Angular hydrates on the client, it reuses the same service instance without re-running the constructor.

### Service Layer

- `providedIn: 'root'` singletons for app-wide data
- Page-scoped services, provided on a page component so each visit starts fresh. The game page keeps its state in `GameStateService` and its logic in services next to it (`features/super-bowl-squares/services/`). Its section components only display that state.
- Modern `inject()` function
- Clear separation: AuthService, GameService, EspnService, ThemeService
- `GameService` is the one entry point components use for boards. It delegates to smaller services that share one lazy database handle (`GameDatabaseService`): `GameRecordService` (read, subscribe, update), `GameLifecycleService` (create, reset, resize, delete), `BoardSettingsService`, `UserGamesService`, `LiveGameIndexService`, `TvLinkService`, `EntitlementService` and `SeasonPassService`. Parsing lives in `core/utils/game-parse.ts`; the game types live in `core/utils/game-data.ts` and are re-exported from `game.service.ts`.

### Routing

- Functional route guards (`authGuard`, `guestGuard`, `gameCreatorGuard`)
- Guards await auth state before decisions
- Game routes publicly accessible for easy sharing

---

## Firebase Integration

### Data Structure

```
games/{gameId}/
  name, ownerId, ownerName, createdAt
  selectedSquares: { "row-col": "playerName" }
  homeNumbers/awayNumbers: number[]
  scores: { q1, q2, q3, q4 }
  playerColors, winners, paidPlayers
  paidSquares: number[] (by position in paidPlayers: squares that name held at the host's Confirm; more now = Unconfirmed)
  homeTeam, awayTeam, hostNote (free-text host note, max 140)
  isLocked, isRandomized, pricePerSquare
  espnEventId: string (optional - links to ESPN game)
  espnLive: status, period, clock, linescores (Cloud Functions only)

users/{userId}/games/{gameId}/
  createdAt, name

liveGames/{espnId}/{boardId}/
  sport
```

Scheduled ESPN scoring lives in `functions/` and is deployed by hand. See [FUNCTIONS.md](./FUNCTIONS.md).

### Real-time Subscriptions

- `onValue()` for live game updates
- Proper subscription cleanup in `ngOnDestroy`

---

## Security Analysis

_Updated Nov 13 2026._

### In place

- **Firebase Security Rules:** `database.rules.json` is in the repo, with notes in `database.rules.notes.md`. Rules are tested against the database emulator with `npm run test:rules` (`test/rules/database.rules.test.ts`). CI deploys hosting only, so rules are deployed separately.
- **Owner checks on writes:** game writes are checked in the rules, not only in the client.
- **Field validation:** rules validate field types and lengths (for example `hostNote`, max 140).

### Still to watch

1. **`bypassSecurityTrust*`:** used only on content the app builds itself (the YouTube embed URL, escaped marketing copy). User-typed text must never reach it.
2. **npm vulnerabilities:** run `npm audit` whenever dependencies change.
3. **Firebase API key:** public by design for web apps; keep it restricted to our domains in the GCP Console.
4. **Predictable guest user IDs:** uses timestamp only; consider adding randomness.
5. **No rate limiting:** Firebase operations have no throttling. Consider Firebase App Check.

The security checks every change must pass are in [the engineering skill](../.claude/skills/quarterscore-engineering/SKILL.md), section 5.

---

## Code Quality Analysis

### Strengths

- Modern Angular 17 patterns (standalone, signals, inject())
- Good TypeScript strict mode usage
- Proper subscription management with cleanup
- Well-defined interfaces for data models
- Semantic color tokens for theming

### Areas for Improvement

1. **Large Files**
   - The game service, game page and dashboard were split into smaller services and components in #308, #309 and #310 (decision D-019). New files keep to the limits in [the engineering skill](../.claude/skills/quarterscore-engineering/SKILL.md), section 2.

2. **Code Duplication**
   - Board parsing is now one function (`parseGameData` in `core/utils/game-parse.ts`)
   - The empty-scores object (`q1` to `q4` at 0) is still written out in ten places across six files

3. **Missing Error Feedback**
   - `console.error` calls without user-facing notifications
   - Users don't see why operations fail

4. **Magic Numbers**
   - Polling intervals, timeouts, etc. should be constants
   - Consider environment-based configuration

### Technical Debt

- Extract inline templates to separate HTML files (optional, team preference)
- Split large components into smaller features
- Create centralized error handling service
- Add more unit tests

---

## Performance Considerations

### Current Implementation

- Lazy loading implemented correctly
- Firebase real-time subscriptions (efficient for live data)

### Potential Improvements

- Consider `OnPush` change detection for presentational components
- N+1 query pattern in `getUserGames` (fetches each game individually)
- Could batch game fetches or denormalize data

---

## Testing Status

_Updated Nov 13 2026. Approach chosen by Paul: lighter tests (decision D-018)._

- **Required:** unit tests for new or changed logic in services and pure utilities (scoring, winners, quarter splits, data shaping). The spec sits next to the file.
- **Required:** rules tests (`npm run test:rules`) for any change to `database.rules.json`.
- **UI:** checked with phone and desktop screenshots, light and dark, not component tests.
- No E2E suite for now.

---

## Recommendations Priority

### Immediate (Security)

1. Keep rules tests passing on every rules change
2. Fix npm vulnerabilities (`npm audit fix`)

### Short-term (Quality)

4. Add user-facing error notifications (toast/snackbar)
5. Extract duplicated code to helper methods
6. Remove or guard console.log statements

### Medium-term (Maintainability)

7. Keep files within the size limits (the three large files were split, D-019)
8. Add tests for services and utilities as they change
9. Implement centralized logging/error service

---

## Related Documentation

- [CLAUDE.md](../CLAUDE.md) - Development guidelines
- [Engineering skill](../.claude/skills/quarterscore-engineering/SKILL.md) - Build rules and definition of done
- [Consolidator skill](../.claude/skills/consolidator/SKILL.md) - Efficiency reviewer run on every PR
- [DECISIONS.md](./DECISIONS.md) - Decision log
- [TODO.md](./TODO.md) - Task tracking
- [ENHANCEMENT_PLAN.md](../ENHANCEMENT_PLAN.md) - Feature roadmap
