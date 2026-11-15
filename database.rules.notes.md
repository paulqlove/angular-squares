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

## users/{uid}/firstTouch

`{ at, path, ref?, src?, med?, camp? }`, written once by the client when a brand-new (under a day old) non-guest account first signs in: the referrer host, utm_source/medium/campaign, and landing path from the visitor's first visit on that device. No full URLs, no personal data. `users/{uid}` grants the owner `.write`, so the owner could overwrite it; "write once" is a client behavior. Guests are not captured.

## tvLinks and users/{uid}/tvToken (office TV link)

A host presses **Copy office link** in TV mode. The client creates a random token (16 bytes, base64url) and stores it privately at `users/{uid}/tvToken`, then publishes `tvLinks/{token}` = `{ boards, interval, updatedAt }`. `boards` is a comma-separated string of up to 20 six-character board ids (a rules regex caps it; the rules language cannot count children). `interval` is 10, 20, 30 or 60. Anyone holding the token can read that one node (a TV with no sign-in); nobody can list `tvLinks`. Each token is claimed once at `tvTokenOwners/{token}` = the owner's uid (unreadable, and a claim can never be overwritten or taken by another account); only that account can write or delete `tvLinks/{token}`. A claim can only be released after its link is deleted, and only signed-in (non-guest) accounts can claim or publish. `users/{uid}/tvToken` is just the owner's own copy for lookup and grants no rights. Known and accepted: one signed-in account can still create many claims and links (the rules cannot cap per account); the weekly report flags this, see docs/FUTURE.md "Office TV link: watch for abuse". (Found in the automated security review: checking only `users/{uid}/tvToken` let anyone who had seen a link copy its token into their own record and then overwrite it.) The link holds board ids only, no account id or name. Turn it off by deleting `tvLinks/{token}` first, then clearing `users/{uid}/tvToken` and `tvTokenOwners/{token}` in one update; the next link gets a new token. Board data itself is already public by game id. Deploy rules before the client.

**Following a group (Nov 15, Paul: "Make it follow live").** A link copied while a group is picked also stores `group` = that group's key and `owner` = the writer's uid. The rules accept `group` only when it is one of the writer's own groups (`groupLists/{auth.uid}/groups/{group}` exists) and `owner` is the writer. The TV then watches `openLists/{group}` and rotates the saved boards still in the group plus boards the owner added since, at most 20; entries whose value is not `owner` are ignored. Nothing new becomes readable: the list was already readable by key, its values are owner uids, the uid is already public on every board (`games/{id}/ownerId`), and the group key on `games/{id}/openListId`. Group names (`groupLists`, signed-in only) and co-host emails (`groupCoHosts`, owner only) stay closed, and rules tests check both. While the list has none of the owner's boards (an emptied group), the TV keeps the saved boards. Older grouped boards that were never shown in More have no list entry, so a following TV leaves them out until `scripts/show-grouped-games.mjs --apply` runs. Links without `group` work as before. Deploy rules before the client: an old rule set rejects the new keys, so Copy TV link with a group picked would fail.

## notifyMe

`notifyMe/{pushId}` is write-only create for a signed-in user. Reads, updates, and deletes are denied. The node must be `email`, `timestamp`, `uid`, and `source`, plus the optional `prefilled` (boolean) and `trigger` (`limit` or `pass`). `email` matches an email shape and is at most 254 characters. `uid` must be `auth.uid`. `source` is at most 64 characters. `timestamp` is a number within a day of `now`. The push id is at most 128 characters.

## Player writes (squares, playerUserIds, playerColors, paidPlayers)

Owner and co-host (`managerId`) keep full write through the game-level rule. Other signed-in users (including anonymous guests) get per-key rules only, so they can never write or wipe a whole node:

- `squares/{r-c}`: claim an empty square only under a name that `playerUserIds` maps to `auth.uid` after the write (the claim can register the name in the same update). Clear only a square whose name maps to `auth.uid`. Claim and clear are denied while `isLocked`. Renaming one of your own squares to another of your names is allowed even when locked.
- `playerUserIds/{name}`: add a name mapped to `auth.uid`, or delete your own mapping. Never change someone else's. A player can only add a name that has no color yet. Every name on the board gets a color (any viewer assigns missing ones), so a name with a color is already on the board, for example one the host typed in. Linking it to your account would hand you its squares and paid mark, so only the owner or co-host can link it. A brand-new name gets its color after the first square is claimed, and a rename moves the color in the same write, so neither is affected. When the host removes a player, the color goes with them and the name is free again.
- `playerColors/{name}`: add a color for a name that has none (any viewer assigns missing colors), or change your own.
- `paidPlayers/{i}`: only rename an existing entry from one of your names to another (player rename). Adding, removing, or touching someone else's entry is owner/co-host only.

- `paidSquares/{index}`: owner/co-host only (no player rule). A whole number from 0 to 100 at the same position as the name in `paidPlayers`: the squares that name held when the host confirmed it. A player's rename keeps the position, so the count stays with it.

`GameService.updateGame` writes these fields as per-key diffs against the current server value, because a whole-object write is checked only at the parent and would be denied.

Gaps: a name with squares but no `playerUserIds` mapping and no color yet (a board nobody has opened since it was written) can still be claimed by the first user who registers it. A player on an old board whose name was never linked can't link it themselves any more; the host can. Anyone can still register a name that isn't on the board yet; if the host later picks squares for that name, they go to that account (as before). Name ownership is by exact key, so a square whose case differs from its mapping key cannot be cleared or renamed by the player.

## Paid plans (entitlements, adFreeUntil, quarterSplit)

- `entitlements/{uid}` = `{ plan: 'week' | 'season', expiresAt, updatedAt? }`. Readable by the user and admins. Writable only by admins (the admin SDK bypasses rules). Active means `expiresAt > now`.
- Game create: an active entitlement bypasses the one-active-board check, like the admin bypass. Paid board counts are client-side only.
- `games/{id}/adFreeUntil`: number >= 0. Non-zero needs admin or a value <= the writer's `expiresAt`. Viewers read it from the game, since they cannot read the host's entitlement.
- `games/{id}/quarterSplit`: `q1..q4` integers 0..1000 summing to 1000, no other keys. Writing needs admin or an active entitlement for the writer (owner or co-host). Delete is always allowed for owner/co-host because `.validate` does not run on delete.

Every entitlement comparison is guarded with `expiresAt.isNumber()`. A missing entitlement makes `null > now` a type error, and an error fails the whole rule expression, including unrelated `||` branches.

Gaps: `adFreeUntil` and `quarterSplit` are checked only when written. They stay on the game after the pass expires or is revoked. Readers must compare `adFreeUntil` with the current time. A co-host can stamp `adFreeUntil` up to their own pass, not the owner's.

## Tests

`npm run test:rules` runs `test/rules/` against the database emulator (project `demo-squares`, needs Java: `brew install openjdk@21`).

## Game groups: groupLists, coHosts, openLists (Nov 2026)

A Season Pass host can sort boards into groups (Church, Work). A board's **More** tab lists only the other open boards in its own group; boards in No group list each other as before. Any link still joins its board.

- `groupLists/{ownerId}` = `{ ungrouped, groups/{groupId}: { name, createdAt } }`. `ungrouped` is a random key (16 to 40 of `A-Za-z0-9_-`) the owner writes once and can never change or delete, because boards point at it. Groups need a live Season Pass (or admin) to create, rename or delete, so they freeze when the pass ends. Names 1 to 30 characters. Readable by the owner, their co-hosts and admins only, so players never see a group name.
- `coHosts/{ownerId}/{uid}: true`, written by the owner when they make someone a co-host, so co-hosts can read the owner's group names for the Edit game picker. Only the owner reads or writes it.
- `groupCoHosts/{ownerId}/{groupId}` = `{ email }`: a group's co-host (Nov 2026). Only the owner can read it, not their co-hosts or admins (Paul: "Only me"). Written with the same Season Pass rule as the group, only while the group exists; deleting a group clears it in the same update. Saving it may also give the email to the group's games, in `gameCoHosts` (below), not on the games.
- `games/{id}/openListId`: the list this board belongs to, either one of its owner's group ids or the owner's `ungrouped` key. The rule checks it against the owner's `groupLists` as they stand after the write, so deleting a group and moving its boards to No group can go in one update.
- `openLists/{listId}/{boardId}` = the board's ownerId, present while **Show in my open boards** is on. Anyone can read one list if they know its key (a board link shows only its own key), nobody can list `openLists`. Only the board's owner or co-host can add or remove the entry, and only in the list the board points at. The value must be the board's owner, so the app can drop entries a stranger copied into a list.
- Why: `openBoards/{ownerId}` was readable by anyone holding one board link, because every board shows its ownerId. That exposed every open board of the host. `openBoards` stays for now so older app builds keep working; it is removed after the one-time move (see `scripts/migrate-open-lists.mjs`).
- A board in a group is always shown in its More tab (D-036). The app enforces this, not the rules: `.validate` never runs on a delete, so a rule can't stop the switch or the list entry from being cleared.
- A host could create a group id equal to someone else's (ids are not globally claimed). The `openLists` value check plus the app's owner filter keep such entries out of another host's More tab.

Deploy these rules before the app that writes them.

## A co-host added by email (games/{id}/managerId claim)

Co-host powers follow `games/{id}/managerId`. A co-host picked from the players gets it at once. One typed by email (Create game's or Edit game's Co-host, or a group's co-host) is stored by email only, so they had no powers. Now, when that person opens the game signed in, the app writes their own uid as `managerId`.

- `games/{id}/managerId` (claim): a signed-in user may set it to their own uid only while it is empty or `''`, the game's `gameCoHosts/{ownerId}/{id}` is a string, and it equals `auth.token.email` ignoring case, with `auth.token.email_verified == true`. Google and the emailed sign-in link both give a verified email; an email typed without proving it never matches. The email is kept, so a group co-host change still finds the game.
- `coHosts/{ownerId}/{uid}`: besides the owner's `true`, the co-host may write their own entry as the id of a game of that owner where they are `managerId`, written in the same update as the claim. It can never replace the owner's `true`. `groupLists/{ownerId}` reads with it only while that game's `managerId` is still them, so removing the co-host also ends the read.
- Not used: `emailIndex`. Any signed-in user can write any email there, so it can't prove who owns an address.

Deploy these rules before the app that writes them. An older app never claims; the claim simply waits for the new one.

## A game's co-host email is hidden (gameCoHosts)

Paul, Nov 15: "Hide them". A co-host's email used to sit on the game (`games/{id}/managerEmail`), which anyone who can open the game can read.

- `gameCoHosts/{ownerId}/{gameId}` = the email (text, 1 to 254 characters). The owner reads all of theirs. One entry is also readable by the person it names, signed in with a verified email that matches ignoring case, so the app can check their invite before the claim. Players, guests, other co-hosts, strangers and signed-out visitors can't read it.
- Only the owner writes it, and only for a game whose `ownerId` is them (checked on the data after the write, so a new game and its email go in one update). Deleting the game clears it in the same update.
- Every co-host save writes `games/{id}/managerEmail: null`, so the old public copy goes away. `scripts/move-cohost-emails.mjs` moves the existing ones (dry run, then `--apply`).
- `games/{id}/managerEmail` still accepts writes for now, so a phone still running an older app can create a game. Its email stays public and can't be claimed until the script runs again. Once old apps are gone, its `.validate` can be set to refuse anything but null.

