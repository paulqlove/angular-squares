# Running the app on local emulators

Use this to see owner screens (Edit game, Season Pass features) with made-up data, without touching the real project.

```bash
npm run emulators:start     # Auth + Database emulators on 127.0.0.1 (needs Java: brew install openjdk@21)
npm run emulators:seed      # a fake owner (Admin, so every Season Pass feature is on) and three boards
npm run start:emulators     # the app on http://localhost:4201 pointed at the emulators
```

Then open `http://localhost:4201/game/OWN001` and, in the browser console, run `await qsDevSignIn()` (it signs in as `owner@example.test`; pass another email and name for another made-up person). After that the host tools and **Edit game** work as for a real owner. `OWN001` is open with a squares limit, `OWN002` is locked and drawn, `OWN003` has auto-lock on. For the dashboard, go to a board first and use **Your games** (a full reload of `/dashboard` redirects in this mode).

How it works: `environment.emulators.ts` sets `useEmulators: true`; `AuthService` and `GameService` then connect to ports 9099 (Auth) and 9000 (Database) before first use. Normal `npm start` and every real build have `useEmulators: false` and never touch the emulators. The emulators hold nothing between runs, so re-run the seed after restarting them. The seed script only talks to `127.0.0.1`.
