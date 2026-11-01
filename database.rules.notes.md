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

## notifyMe

`notifyMe/{pushId}` is write-only create for a signed-in user. Reads, updates, and deletes are denied. The node must be `email`, `timestamp`, `uid`, and `source` only. `email` matches an email shape and is at most 254 characters. `uid` must be `auth.uid`. `source` is at most 64 characters. `timestamp` is a number within a day of `now`. The push id is at most 128 characters.
