# ESPN score functions

Live quarter scores are written by a scheduled Cloud Function, not by each open browser. The function is **not** deployed by GitHub Actions. Paul deploys it by hand.

Project: `squares-4e4f7` (Blaze, Realtime Database). The Admin SDK writes scores and bypasses security rules.

## Deploy

`serverScoring` is `false` in both environment files. Merging this change leaves the browser ESPN poller in place. Turn the poller off only after the function is live.

From the repo root, with the Firebase CLI logged in as a project owner:

1. Deploy the function. This does not deploy Hosting.

```bash
cd functions && npm ci && npm test && cd ..
firebase deploy --only functions --project squares-4e4f7
```

2. Set `serverScoring` to `true` in `src/environments/environment.ts` and `src/environments/environment.prod.ts`.

3. Merge that flag change, or redeploy hosting so the built client picks it up. Until that hosting release is live, browsers keep writing scores.

That functions command deploys `syncEspnScores` only. It does not change the GitHub workflows. Those workflows (`firebase-hosting-pr.yml`, `firebase-hosting-merge.yml`) stay hosting-only. Do not add a functions deploy step to them.

`firebase.json` runs `npm run build` in `functions/` before a functions deploy. The runtime is Node 20 (`functions/package.json` `engines.node`).

To turn the browser poller back on later, set `serverScoring` to `false` again and redeploy hosting. The function can stay deployed.

## What the function does

`syncEspnScores` runs every minute (`onSchedule`, `every 1 minutes`, `us-central1`, 256MiB, 0.167 vCPU, 30s timeout, max 1 instance).

1. Read `liveGames/{espnId}/{boardId}`. If that node is empty, it returns without calling ESPN.
2. Group the rows by sport and fetch the ESPN scoreboard **once per league** (NFL, NBA, NCAA football, WNBA, AFL). Two boards linked to the same ESPN id share that one response.
3. For each linked `games/{id}`, compute cumulative quarter scores and winners with the same rules as `syncFromEspn()` / `calculateWinnersFromEspn()`:
   - Linescores are per quarter. The board stores running totals in `scores.q1`–`scores.q4`.
   - When ESPN says the game is final, `q4` is the final total (overtime and a 3-period game included).
   - Q1–Q3 winners are set only after that period has passed. The Q4 winner is set only when ESPN marks the game completed.
   - The winning square is `awayNumbers[row] === awayScore % 10` and `homeNumbers[col] === homeScore % 10`. The key is `row-col`. An open square or an unrandomized board produces no winner.
4. Write `scores`, `winners`, and `espnLive` (clock, period, status, per-quarter linescores for the Box Score tab) only when the new value differs.
5. When the game is final, the same update deletes `liveGames/{espnId}/{boardId}` so the function stops fetching it. A final game that is already stored is removed from the index even if the scores did not change.

Games that are linked but not on the current league scoreboard are left in the index and skipped until ESPN lists them.

## Index

```
liveGames/{espnId}/{boardId}: { sport: "nfl" | "nba" | "ncaaf" | "wnba" | "afl" }
```

The client maintains this when a board is created with an ESPN game, when the dashboard saves a new or cleared link, and when a board is deleted. Owners and managers may write only their own board id. Clients cannot read the index. The Admin SDK can.

Boards linked before this shipped are added the next time the owner opens the dashboard or the game page. Until that happens the function does not know about them.

Clearing the ESPN game on edit (switching sport, which clears the selection, then saving) removes `espnEventId` and the index row. Manual score entry on a board with no ESPN link is unchanged.

## Client flag

`environment.serverScoring` defaults to `false` in both `environment.ts` and `environment.prod.ts`. Both files talk to `squares-4e4f7`. Leave the flag false until `firebase deploy --only functions` has succeeded, then set it to `true` and merge or redeploy hosting.

When the flag is false, the 30-second browser poller (`syncFromEspn`) writes scores, which is the current behavior.

When the flag is true, the game page does not poll ESPN to write scores. It still listens to Realtime Database. The Box Score tab uses `espnLive` from the function. If that snapshot is not there yet, the page fetches ESPN once for display and does not write. With the flag true and the function not deployed, linked boards stop receiving scores.

## Tests

```bash
cd functions && npm test
```

`scoring.test.ts` covers cumulative scores, overtime and 3-period finals, quarter completion, last-digit winners, and write-if-changed. `sync.test.ts` covers one fetch per league, deduped ESPN ids, and dropping a final game from the index.

## Cost

Cloud Scheduler cannot run faster than once a minute. One job is inside the 3 free jobs per billing account ($0.10 per extra job per month).

A tighter loop would mean keeping the instance awake between polls. At 256MiB and 0.167 vCPU, staying up for the whole minute is about 670,000 GiB-seconds and 450,000 vCPU-seconds a month. That is past the Cloud Run free tier (360,000 GiB-seconds and 180,000 vCPU-seconds on request-based billing) by roughly **$7/month**, almost all of it idle time. One short run per minute stays in the free tier, and football scores do not need a faster tick.

Expected bill for this app: **$0/month**.

| Piece | This function | Free tier |
| --- | --- | --- |
| Invocations | ~44,600 / month | 2,000,000 |
| CPU | ~2,200 vCPU-seconds when the index is empty (~0.3s each). A few thousand more on game days. | 180,000 vCPU-seconds |
| Memory | ~3,300 GiB-seconds when idle | 360,000 GiB-seconds |
| Scheduler | 1 job | 3 jobs |
| Realtime Database | One small index read per minute, plus a game read only while a board is linked. Writes happen when a score, winner, or clock actually changes. | 10 GB downloaded |

ESPN egress is the only line that can leave the free tier, and only if a board stays linked all month. One league scoreboard (~150KB) every minute is about 6GB, just over the 5GiB outbound allowance, on the order of **$0.20**. Five leagues linked every minute of the month would be a few dollars. A normal NFL Sunday is tens of megabytes. Off-season minutes do not call ESPN.

Prices checked against [Cloud Run request-based billing](https://cloud.google.com/run/pricing), [Cloud Scheduler](https://cloud.google.com/scheduler/pricing), and the [Cloud Run functions free tier](https://cloud.google.com/functions). Region is `us-central1`.
