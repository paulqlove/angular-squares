# Weekly report

One command prints the numbers the board uses for business decisions. Read only; it changes nothing.

```bash
node scripts/report/report.mjs 7      # last 7 days (any number works)
```

On Paul's Mac the Firebase CLI is already signed in. Ask Claude "generate the analytics report" and it runs this and summarizes it.

## What it shows

1. **Season Pass test** - Notify-me clicks and hosts shown the dialog since Nov 6, against the Jan 15 2027 bar (15 clicks AND 150 hosts), with a labelled dollar guess (clicks x 10-30% x $5.52 vs 55-pass break-even; an assumption, not data).
2. **New hosts and boards per week.**
3. **Repeat hosts** - second board within 14 days, ESPN-linked vs custom.
4. **Host funnel** - created, half full, locked or numbers drawn, Q4 score posted.
5. **Reuse** - `users/{uid}/usage` counters (creates, resets, deletes).
   - **5b. Office TV links** - how many links exist, how many are dead (every board deleted), stale, and accounts with more than one token. A watch for abuse; see FUTURE.md.
6. **Traffic** - Google Analytics (optional, needs the key below). Ads and personalization are off; analytics storage is on.
7. **Search** - Search Console clicks, impressions, position and top queries (optional).

Rules: every percentage shows its count and appears only when n is at least 30. Admins and any uid in `~/.config/quarterscore/exclude-uids.txt` (one per line, `#` for comments) are left out of every count.
8. **Where new hosts come from** - search, social, direct or a named site, plus the first page they landed on. Saved once when a new account signs in (`users/{uid}/firstTouch`); guests and accounts made before Nov 6 are not covered.

## Setup for the Google sections (once, about 15 minutes)

Files live outside the repo in `~/.config/quarterscore/`:

| File | What |
|---|---|
| `google-key.json` | Service-account key (a secret; never commit or paste it) |
| `ga-property-id.txt` | The numeric GA4 property ID (Analytics, Admin, Property details), not the `G-` ID |
| `exclude-uids.txt` | Optional accounts to leave out |

Steps (Google Cloud project `squares-4e4f7`):

1. Turn on the **Google Analytics Data API** and the **Google Search Console API** (APIs & Services, Library).
2. Create a service account (IAM & Admin, Service Accounts) with no roles. Create a JSON key and save it as `google-key.json`.
3. In Google Analytics, Admin, Property access management, add the service account's email as **Viewer**.
4. In Search Console, Settings, Users and permissions, add the same email as **Restricted** (read-only) for the `quarterscore.com` domain property.
5. Put the property ID in `ga-property-id.txt` and run the report.

Override with env vars if needed: `GOOGLE_APPLICATION_CREDENTIALS`, `GA_PROPERTY_ID`, `GSC_SITE` (default `sc-domain:quarterscore.com`).

Search Console data lags about 2 days, so the script reads up to two days ago. If a Google section prints "failed", the message says which step is missing (usually the viewer access in step 3 or 4).

## Not in the report

Real monthly costs (pull from billing), Stripe (no checkout yet).

## Rules

- Counts only. Never print or commit emails; this script prints none.
- Do not add a new metric unless it names the decision it informs (board vote, Nov 6 2026).
