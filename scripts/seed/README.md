# Test boards (seed and cleanup)

Two scripts that write to the **live** QuarterScore database (project `squares-4e4f7`). Run them from a Mac, not from CI.

- `seed-test-games.mjs` makes 20 test boards: 10 hosted by each of two accounts, in sizes 25, 50 and 100 and every state
  (filling, ready to lock, locked with numbers drawn, live with scores, final with winners). Squares are filled with made-up
  players. Every board has Show in open boards on and is tagged `seed: true` with a `seedTag` of the run date.
- `cleanup-test-games.mjs` removes every board tagged `seed: true`, plus its entries in the owner's games list,
  Open boards, board stats and the ESPN live-game index. It never touches a board without the tag.

Both are a dry run by default and only write with `--write`. The account emails are passed in when you run the seed,
so they never go in the repo.

## One-time setup

1. Node 20 or newer.
2. Install the Admin SDK here:
   ```
   cd scripts/seed && npm install
   ```
3. Give the Admin SDK a login. Either way works; the key file is the simplest.

   **Service account key (recommended).** Firebase console, project squares-4e4f7, Project settings, Service accounts,
   Generate new private key. Save the file outside the repo, for example `~/keys/squares-admin.json`, then:
   ```
   export GOOGLE_APPLICATION_CREDENTIALS=~/keys/squares-admin.json
   ```
   Delete the key in the console (and the file) when you're done testing.

   **Or your own Google login** (needs the gcloud CLI and owner access to the project):
   ```
   gcloud auth application-default login --scopes=https://www.googleapis.com/auth/cloud-platform,https://www.googleapis.com/auth/userinfo.email,https://www.googleapis.com/auth/firebase.database
   gcloud auth application-default set-quota-project squares-4e4f7
   ```

## Seed

Dry run first. It looks up both accounts, checks ESPN for upcoming games to link the four Filling boards marked for it,
and prints all 20 boards without writing anything:
```
node seed-test-games.mjs --paul <your email> --eric <Eric's email>
```
Then write them:
```
node seed-test-games.mjs --paul <your email> --eric <Eric's email> --write
```
Each run makes 20 new boards, so run `--write` once.

## Clean up

```
node cleanup-test-games.mjs           # lists every seeded board
node cleanup-test-games.mjs --write   # removes them
```

## Notes

- Live and final boards carry made-up scores and are not linked to ESPN, so the live score poller never changes them.
- The four linked Filling boards get real upcoming NFL or college games from ESPN. If ESPN has none, they keep a fixed matchup.
- Writing through the Admin SDK skips the database rules, which is why it needs a login with admin access.
