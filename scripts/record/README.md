# QuarterScore video recorder

Films the seven how-to storyboards (Create, Share, Join, Pick, Lock, Scores, Your games) on the
live site with Playwright. Each storyboard gets a phone take (9:16) and a desktop take
(16:9, 1920x1080). It moves the cursor and taps at an even pace, shows a navy cursor ring on
desktop and a tap ring on phone, and saves named MP4s with caption files ready for editing.

It lives here, outside `src/`, so nothing in it reaches the app build or the deploy.

## Run it

```
cd scripts/record && npm start
```

On the first run this installs Playwright's Chromium, then opens a browser window so you can sign
in as the **demo host** (see below). That sign-in is saved to `.auth/host.json`, so later runs go
straight to filming. It films in real time, so a full run takes a while. The videos land in `out/<date-time>/`.

Needs Node 20 or newer (the repo's `.nvmrc` works).

## The demo host

Record with a separate demo account, never your own or the admin account. Before it films, the
recorder checks the account and stops if it's an admin account, because the "View as" panel
would show on camera.

- **Account:** a Google or email-link account made just for videos, with no boards of its own.
  The recorder stops if the account has any board it didn't make, so it never touches a real game.
- **Sign-in:** you sign in yourself in the window `npm run login` opens. The script never types a
  password. If Google refuses the test browser, choose "Sign in with email instead" and open the
  emailed link in that same window.
- **Plan:** Free covers storyboards 1 to 6. Storyboard 7's full list, and the "shrink a
  half-picked board" shots in storyboard 5, need several boards at once, so they need Demo Host
  Plus or Season Pass. On Free, the recorder films what it can and lists the rest.

## What it does on the site

- **Demo board:** it creates one board called "Sunday squares" (Harbor vs Riverside) and invented
  guests (Sam, Alex, Priya, Jess, Taylor and others) who join as guests and pick squares.
- **Clean-up:** every board it makes goes in `.auth/ledger.json`, and it deletes only boards on
  that list. The board is deleted at the end of the run, even when a take fails. Pass `--keep` to
  leave it up. If a run is stopped halfway, `npm run cleanup` deletes what it left behind.
- **Weekly report:** the demo host and guest accounts are added to
  `~/.config/quarterscore/exclude-uids.txt`, so `scripts/report` leaves them out of the numbers.
  Pass `--no-report-exclude` to skip that.
- **Never:** it pays, upgrades, invites or emails nobody, and doesn't sign in to anything for you.

## Options

| Option | What it does |
| --- | --- |
| `--only 1,4` | Film only those storyboards |
| `--device phone` or `desktop` | Film only one cut |
| `--pace 1.2` | Slow every hold and move down (or below 1 to speed up) |
| `--name "Office pool"` | Name of the demo board |
| `--phone-player Jess` / `--desktop-player Taylor` | The guest filmed joining |
| `--live-game CODE` | Storyboard 6 on a board linked to a real ESPN game, filmed during the game. Read-only |
| `--base-url URL` | Film somewhere else, like a PR preview channel or `http://localhost:4200`. Same as `QS_BASE_URL` |
| `--headed` | Show the browser while it films |
| `--keep` | Leave the demo board up afterwards |
| `--out DIR` | Where to save the videos |

`npm test` runs an offline check of the recording pipeline on a small local page. It touches no
website.

## What you get

For each take, for example `4-pick-phone`:

- `4-pick-phone.mp4`: the full-resolution recording, 60fps H.264.
- `4-pick-phone-social-9x16.mp4`: phone takes only. A 1080x1920 cut with the phone framed on
  paper, kept clear of the bottom 20% and right 12% where TikTok and Reels put their buttons.
- `4-pick-phone.srt`: the storyboard's on-screen text, timed to each shot.
- `4-pick-phone.shots.json`: the same timings, for an editor or a script.

`summary.md` lists every file, the shots it couldn't film and why, and any take that failed. A
failed take saves a screenshot in `errors/`, and the run carries on with the next one.

## What it doesn't film

- **Share, shots 3 and 4:** the iOS share sheet and Messages. Film these on an iPhone.
- **Create, desktop shots 9 and 10:** the Google sign-in itself.
- **Scores, live shots:** need `--live-game` during a real game. Otherwise storyboard 6 shows the
  manual score entry, winners and the TV view.
- **Your games, full list:** needs Demo Host Plus, as above.

## Files

- `record.mjs`: the commands (`record`, `login`, `cleanup`) and the run order.
- `flows/storyboards.mjs`: one function per storyboard, shot by shot, with each shot's caption and
  length.
- `lib/director.mjs`: pacing (glide, point, press, type, hold) and the caption timing.
- `lib/capture.mjs`: the screen capture and ffmpeg encoding.
- `lib/overlay.mjs`: the cursor and tap rings, sized and timed per `docs/DESIGN.md`.
- `lib/site.mjs`: signing in, the safety check, making and deleting the demo board, and seeding
  guests.
