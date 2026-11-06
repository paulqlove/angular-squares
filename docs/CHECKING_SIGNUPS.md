# Checking "Notify me" signups and upgrade-dialog views

The upgrade dialog is a fake door for the Season Pass (read on Jan 15, 2027). Two Realtime Database nodes hold the numbers. The app can only write them; **nothing is emailed and the rules block all client reads**, so you read them with admin access.

| Node | What it holds |
|---|---|
| `notifyMe/{pushId}` | One entry per "Notify me" click: `email`, `timestamp`, `uid`, `source` (`upgrade_dialog`), and since dialog v2 `prefilled` (true if the email was the account's own, unedited) and `trigger` (`limit` = opened by the one-board limit, `pass` = opened from "See Season Pass"). Older entries have no `prefilled` or `trigger`. |
| `upgradeViews/{uid}` | One record per signed-in host who opened the dialog: `firstAt`, `lastAt`, `count` (all opens), `limitCount` (opens caused by the limit; added with v2). Guests and the preview admin are not counted. |

Dialog v2 shipped on **2026-11-06 02:38 UTC** (PR #127). Read the Jan 15 bar from that moment only: at least 15 clicks AND at least 150 unique hosts shown.

## On Paul's Mac (Firebase CLI is signed in)

```bash
npx firebase-tools@latest database:get /notifyMe --project squares-4e4f7
npx firebase-tools@latest database:get /upgradeViews --project squares-4e4f7
```

Or open the Firebase console: project `squares-4e4f7`, Realtime Database, `notifyMe` / `upgradeViews`.

Summarize, don't dump. This prints counts only (set `CUTOFF` to the v2 ship time in milliseconds, here 2026-11-06T02:38:59Z):

```bash
CUTOFF=1793932739000
npx firebase-tools@latest database:get /notifyMe --project squares-4e4f7 > /tmp/notify.json
npx firebase-tools@latest database:get /upgradeViews --project squares-4e4f7 > /tmp/views.json
python3 -I - <<'PY'
import json
n = json.load(open('/tmp/notify.json')) or {}
v = json.load(open('/tmp/views.json')) or {}
CUT = 1793932739000
new = [e for e in n.values() if e.get('timestamp', 0) >= CUT]
print('clicks since v2:', len(new),
      '| from limit:', sum(e.get('trigger') == 'limit' for e in new),
      '| from See Season Pass:', sum(e.get('trigger') == 'pass' for e in new),
      '| prefilled:', sum(bool(e.get('prefilled')) for e in new))
print('hosts shown (limit opens > 0):', sum(r.get('limitCount', 0) > 0 for r in v.values()),
      '| hosts who opened from See Season Pass only:', sum(r.get('limitCount', 0) == 0 for r in v.values()))
PY
```

`upgradeViews` records created before v2 have no `limitCount`; treat them as not counted toward the bar.

## On the server (a cloud Claude session)

A cloud session has no Firebase login, so the commands above fail with an auth error until Paul provides credentials. Do not ask for them in chat or commit them. The safe setup:

1. Paul creates a **service account** with read access to the Realtime Database for `squares-4e4f7` (Firebase console: Project settings, Service accounts), downloads the JSON key and stores it as a secret in the cloud environment, exposed as `GOOGLE_APPLICATION_CREDENTIALS` (a path to the file). Never put the key in the repo.
2. With that set, the same `npx firebase-tools@latest database:get ...` commands should work (verify the first time).
3. If credentials are not set up, say so and ask Paul to paste the two counts from his Mac or the console instead.

The `quarterscore-users` skill in the team-hq repo also reports notify-me signups on Paul's Mac.

## Rules for whoever reads this data

- Emails are personal data. Report **counts** and, only if Paul asks, the list in chat. Never put an email in a commit, PR, doc or issue.
- Nothing may be sent to these addresses without Paul's explicit OK for each send. Draft only.
- Do not change the `notifyMe` or `upgradeViews` rules without a rules test (`npm run test:rules`) and Paul's go-ahead; rules deploy separately from hosting and must go out before the client that needs them.
