# QuarterScore facts

The true, dated things about QuarterScore that agents and channels may say. Read this before writing copy, docs, support answers, marketing or anything public. If a fact isn't here, don't invent it: check the source or ask Paul.

**How to use and change it**
- Every line has its source and the date it was last checked (`checked YYYY-MM-DD`). When you change a line, update its date and source.
- The code is the source of truth for how the product behaves. Paul's decisions are the source of truth for pricing and policy. When the two disagree, the fact goes under "Needs Paul's call" until he decides; don't pick one.
- A line under "Needs Paul's call" is not a fact yet. Don't state either side in public copy until Paul decides; use the "Safe to say now" line.
- New decisions go in [DECISIONS.md](DECISIONS.md) first, then the fact here.

---

## Needs Paul's call

1. **Season Pass board limit.**
   - Code: up to 25 active boards at a time (`src/app/core/plans.ts` `activeBoards: 25`; upgrade dialog says "Up to 25 active boards"; FUTURE.md says "25 at a time (decided Nov 7, 2026)").
   - Paul and CFO: unlimited boards until June 30 (D-013 in DECISIONS.md, Nov 13; Paul in the CFO channel, Nov 13: "It's for unlimited boards until June 30th"; the CFO's price check used "unlimited boards").
   - Options: keep 25 and correct D-013 and the CFO notes, or make it unlimited (a one-line change in `plans.ts` plus the dialog copy, in its own PR).
   - Safe to say now: "more active boards".

Settled on Nov 14, 2026: ads (D-024), live scores (D-025) and the Bar/Venue tier (D-026).

---

## The product

- QuarterScore is a free website for running football squares (Super Bowl squares) online. *Source: `scripts/agent-files.mjs`, welcome page; checked 2026-11-14.*
- A host makes a board and shares one link or a six-character game code. Games are not listed publicly. *Source: `scripts/agent-files.mjs` FACTS, D-008; checked 2026-11-14.*
- Players don't need an account: they open the link and type a name on a square. Only the host signs in. *Source: `scripts/agent-files.mjs` FACTS; checked 2026-11-14.*
- Boards come in 100, 50 or 25 squares. *Source: create form, `scripts/agent-files.mjs`; checked 2026-11-14.*
- Squares update in real time for everyone on the board. *Source: Firebase Realtime Database, `scripts/agent-files.mjs`; checked 2026-11-14.*
- The host locks the board, then digits 0 to 9 are drawn at random for rows and columns. *Source: `scripts/agent-files.mjs`; checked 2026-11-14.*
- Quarter winners come from the last digit of each team's score. *Source: CLAUDE.md, Game Logic; checked 2026-11-14.*
- Points split 20/20/20/40 across the quarters by default. They are points, never money. *Source: `plans.ts` `DEFAULT_SPLIT`; checked 2026-11-14.*
- An empty winning square's points roll into Q4 or are shared across the other quarters, the host's choice (default: roll into Q4). *Source: `plans.ts` `EMPTY_QUARTER_RULES`; checked 2026-11-14.*
- Live score and clock come from ESPN for NFL, NCAA football, UFL, NBA, WNBA and AFL, free on every plan. Any other game works as a custom board. *Source: `functions/src/espn.ts` `SPORT_TYPES`, `plans.ts`, D-025; checked 2026-11-14.*
- TV mode shows the board, live score, quarter winners and a join QR code, can rotate boards every 10 to 60 seconds, and Copy TV link opens it on any screen with no sign-in. Free on every plan. *Source: `scripts/agent-files.mjs`, FUTURE.md (Nov 5); checked 2026-11-14.*
- The probability heat map ("Hit rate" tab) and the Best numbers page show historical last-digit frequency. Free on every plan. *Source: FUTURE.md (Nov 5), `scripts/agent-files.mjs`; checked 2026-11-14.*
- A printable blank 10 by 10 grid and PDF are free. Printables are the regular 100-square board only. *Source: `scripts/agent-files.mjs`; main channel notes; checked 2026-11-14.*
- QuarterScore never collects, holds or pays out money. *Source: FAQ in `marketing-pages.ts`, FUTURE.md "Payment Links: decided against"; checked 2026-11-14.*
- There is no public API. *Source: `public/skills/football-squares/SKILL.md`; checked 2026-11-14.*

## Plans and pricing

- Two plans: Free, or a Season Pass at $5.99, one time. No other tiers, and no Bar/Venue tier. *Source: `plans.ts`, FUTURE.md (decided Nov 5, 2026), D-013, D-026; checked 2026-11-14.*
- Only hosts buy. Players always join and play free. *Source: FUTURE.md, The Season Pass; checked 2026-11-14.*
- The Season Pass never auto-renews. This first season it runs from purchase to June 30, 2027. *Source: FUTURE.md (term changed Nov 6, 2026); upgrade dialog "One time · through June 30, 2027"; checked 2026-11-14.*
- Free hosts get 1 active board at a time, with no lifetime cap. When its game ends, they reset or delete it to start the next one. *Source: `FREE_ACTIVE_BOARD_LIMIT = 1` in `core/utils/board-activity.ts`, `database.rules.json`, FUTURE.md; checked 2026-11-14.*
- A board with no ESPN game linked stops counting as active 48 hours after it was created. *Source: `database.rules.json` (172800000 ms); checked 2026-11-14.*
- Season Pass features in the code: more active boards (see Needs Paul's call 1), custom quarter splits, auto-lock and draw after kickoff, limit squares per player, open boards list, and the Players view. *Source: `plans.ts` `PLANS.season`, upgrade dialog; checked 2026-11-14.*
- No ads on any board today. Ads may come to free boards later if QuarterScore gets popular enough; don't promise "no ads" or "ad-free" as lasting. *Source: D-024, `environment.adsEnabled: false`; checked 2026-11-14.*
- The Players view lists every player across a host's boards, including co-hosted ones, and shows only with two or more games. A co-host needs their own pass. *Source: D-021, D-022, `players-view.service.ts`; checked 2026-11-14.*
- The free-plan limits are enforced today in the app and the database rules, for everyone without a pass. *Source: `plan.service.ts`, `database.rules.json`; checked 2026-11-14.*
- Refunds (planned): refundable until the pass is used, final after. Not live; wording still needs a lawyer or CPA. *Source: FUTURE.md, The Season Pass; checked 2026-11-14.*
- Sales (planned): US only at launch. *Source: FUTURE.md; checked 2026-11-14.*

## Launch status

- quarterscore.com is live. A merge to `main` deploys the app. *Source: CLAUDE.md, Deployment; checked 2026-11-14.*
- The Season Pass can't be bought yet. The upgrade dialog says "Coming soon" with a Notify me signup. The only passes today are admin gifts. *Source: `upgrade-pass-dialog.component.ts`, `season-pass.service.ts`; checked 2026-11-14.*
- No payment processor is set up. The CFO recommends Stripe Checkout; Paul's plan is "Stripe or alternatives". *Source: CFO channel, Nov 13; main channel notes; checked 2026-11-14.*
- The fake-door test (Notify me on the upgrade dialog) is read on Jan 15, 2027: it needs at least 15 clicks and at least 150 unique hosts shown. *Source: FUTURE.md; checked 2026-11-14.*
- No social media promotion until Stripe payments are live. *Source: D-012; checked 2026-11-14.*
- No Spanish version for now. *Source: D-016; checked 2026-11-14.*

## Platforms and domain

- A website at https://quarterscore.com/, installable from the browser (web app manifest). No native iOS or Android app. *Source: `public/site.webmanifest`, CLAUDE.md; checked 2026-11-14.*
- Hosted on Firebase (project `squares-4e4f7`). Hosts sign in with Google or an emailed sign-in link. *Source: `core/services/auth.service.ts`, `functions/src/signin-email.ts`; checked 2026-11-14.*
- Contact: hello@quarterscore.com. *Source: `/contact` in `marketing-pages.ts`; checked 2026-11-14.*
- How-to videos are on YouTube and embedded on the site as tap-to-load. *Source: D-014; checked 2026-11-14.*

## Words

- Tagline: "Every square, every score, live on one board.™" *Source: `public/site.webmanifest`; checked 2026-11-14.*
- Say "Games", never "Pools". *Source: D-002; checked 2026-11-14.*
- Never use: pool, prize, payout, bet, odds, cash, wager, gamble, stake, pot, winnings, jackpot, entry fee, buy in, sportsbook, betting lines. No "Super Bowl" in product names or marks. Sample teams in marketing are invented, never real. *Source: DESIGN.md §9; checked 2026-11-14.*

## Docs that disagree with the code

The code wins on behaviour. These lines are out of date; fix them when the doc is next touched.

- FUTURE.md: "Until checkout exists, everything stays free for everyone." The pass features and the 1-board limit are enforced today; live scores are free by decision (D-025). *Checked 2026-11-14.*
- D-013: "It is planned, not built." The plan limits and pass features are built; checkout isn't. *Checked 2026-11-14.*
