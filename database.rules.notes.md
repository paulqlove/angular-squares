# Realtime Database rules — one active board

Free hosts are limited to one active board in the client (`GameService.assertUnderFreeBoardLimit` and `createGame`). These rules are the best effort the Realtime Database language can express. They do not read, delete, or rewrite existing `games/{gameId}` records.

## What the rule enforces

Creating a new `games/{gameId}` node is denied when `users/{uid}/activeBoardId` already points at a game that still exists and either:

- has an `espnEventId` (a linked game), or
- has no `espnEventId` and `createdAt` is within 48 hours (`172800000` ms).

`now` is milliseconds. A missing slot, a slot whose game was deleted, or an unlinked game older than 48 hours still allows the create. Updates by the owner or payment manager are unchanged. Accounts with no `activeBoardId` (every board created before this client) can still create, so current apps and grandfathered boards keep working.

The new client writes `activeBoardId` only after it creates a board. It removes that field only after a read-only check says the host has no active board. It never writes a final flag onto the game.

## What a rule cannot express

- Rules cannot query every `games` node owned by `auth.uid`, so they cannot count grandfathered boards that never set `activeBoardId`.
- Whether a linked game is final lives on the public scoreboard, not in this database. A linked slot stays locked until the client removes `activeBoardId` after it sees a final result. This change does not store that result on the game.
- `users/{uid}` already grants the owner `.write`. A child rule cannot revoke that, and `.validate` does not run on delete, so the owner can clear `activeBoardId`. The game-create rule only helps while the slot is still set.

The client check is the limit players and hosts actually hit. The rule stops a second create that forgets to clear a still-active slot.

## upgradeViews

`upgradeViews/{uid}` = `{ firstAt, lastAt, count }`. A signed-in user can read and write only their own record. It counts how many hosts saw the upgrade dialog for the Jan 15 2027 fake-door read; admins read it in the console. `limitCount` is optional and counts only opens caused by the one-board limit (`count` is all opens). No other keys are allowed.

## users/{uid}/usage

`{ gamesCreated, resets, deletes, lastGameAt }`, lifetime counters bumped by the client on create, reset and delete (Nov 2026 onward; earlier activity is not counted). The owner can write their own, so use it to spot heavy reuse, not for billing. No other keys.

## notifyMe

`notifyMe/{pushId}` is write-only create for a signed-in user. Reads, updates, and deletes are denied. The node must be `email`, `timestamp`, `uid`, and `source`, plus the optional `prefilled` (boolean) and `trigger` (`limit` or `pass`). `email` matches an email shape and is at most 254 characters. `uid` must be `auth.uid`. `source` is at most 64 characters. `timestamp` is a number within a day of `now`. The push id is at most 128 characters.

## Player writes (squares, playerUserIds, playerColors, paidPlayers)

Owner and co-host (`managerId`) keep full write through the game-level rule. Other signed-in users (including anonymous guests) get per-key rules only, so they can never write or wipe a whole node:

- `squares/{r-c}`: claim an empty square only under a name that `playerUserIds` maps to `auth.uid` after the write (the claim can register the name in the same update). Clear only a square whose name maps to `auth.uid`. Claim and clear are denied while `isLocked`. Renaming one of your own squares to another of your names is allowed even when locked.
- `playerUserIds/{name}`: add a name mapped to `auth.uid`, or delete your own mapping. Never change someone else's.
- `playerColors/{name}`: add a color for a name that has none (any viewer assigns missing colors), or change your own.
- `paidPlayers/{i}`: only rename an existing entry from one of your names to another (player rename). Adding, removing, or touching someone else's entry is owner/co-host only.

`GameService.updateGame` writes these four fields as per-key diffs against the current server value, because a whole-object write is checked only at the parent and would be denied.

Gaps: a name with no `playerUserIds` mapping (legacy squares) can be claimed by the first user who registers it. Name ownership is by exact key, so a square whose case differs from its mapping key cannot be cleared or renamed by the player.

## Paid plans (entitlements, adFreeUntil, quarterSplit)

- `entitlements/{uid}` = `{ plan: 'week' | 'season', expiresAt, updatedAt? }`. Readable by the user and admins. Writable only by admins (the admin SDK bypasses rules). Active means `expiresAt > now`.
- Game create: an active entitlement bypasses the one-active-board check, like the admin bypass. Paid board counts are client-side only.
- `games/{id}/adFreeUntil`: number >= 0. Non-zero needs admin or a value <= the writer's `expiresAt`. Viewers read it from the game, since they cannot read the host's entitlement.
- `games/{id}/quarterSplit`: `q1..q4` integers 0..1000 summing to 1000, no other keys. Writing needs admin or an active entitlement for the writer (owner or co-host). Delete is always allowed for owner/co-host because `.validate` does not run on delete.

Every entitlement comparison is guarded with `expiresAt.isNumber()`. A missing entitlement makes `null > now` a type error, and an error fails the whole rule expression, including unrelated `||` branches.

Gaps: `adFreeUntil` and `quarterSplit` are checked only when written. They stay on the game after the pass expires or is revoked. Readers must compare `adFreeUntil` with the current time. A co-host can stamp `adFreeUntil` up to their own pass, not the owner's.

## Tests

`npm run test:rules` runs `test/rules/` against the database emulator (project `demo-squares`, needs Java: `brew install openjdk@21`).
