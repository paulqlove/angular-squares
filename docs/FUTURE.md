# Future Features Roadmap

Product roadmap and monetization strategy for QuarterScore.

## Plans

Source of truth: `src/app/core/plans.ts` (prices, lengths, limits). Research and reasoning: Drive doc "QuarterScore Game Formats and Paid Plans Research (Nov 2, 2026)".

| | Free | Week Pass | Season Pass |
|---|---|---|---|
| Price | $0 | $5.99 | $29.99 |
| Length | — | 7 days | 210 days (college Week 0 to the NFL final, plus about a month) |
| Active boards | 1 | 5 | 25 |
| Ads on the host's boards | Yes | No | No |
| Custom quarter split | No (20/20/20/40) | Yes | Yes |
| 100/50/25-square boards | ✓ Available | ✓ | ✓ |

- Buying more time stacks on what is left. A Season Pass outranks a Week Pass. An active Week Pass is credited toward a Season Pass (applies once checkout exists).
- `entitlements/{uid} = { plan, expiresAt }`, written only by an admin for now (later a Stripe webhook). `admins/{uid}` gets everything.
- Hosts stamp `games/{id}/adFreeUntil`; rules cap it at their real pass so viewers can trust it. Ads stay off until `environment.adsEnabled`; block gambling ad categories when a network is added.
- Not yet built: checkout, Season Pass organizer tools (email list, notifications, export). Coupons are shelved.

### Free-tier design (board vote 4-0, Paul approved Nov 5, 2026)

Direction: Free plus one $5.99 pass (replaces the Week/Season/stacking table above once checkout is built). The price stays $5.99; the wording and term can change after year 0. Until checkout exists, everything stays free for everyone.

| | Free | Pass ($5.99) |
|---|---|---|
| Active boards | 1 at a time, no lifetime cap | Unlimited for now (tighten the terms if someone abuses it) |
| Live scoring (ESPN auto-sync) | Manual scores | Yes |
| Presentation / TV mode | **Yes** (QR and quarterscore.com always on screen) | Yes |
| Probability heat map | Yes, all accounts | Yes |
| Custom quarter split | No | Yes |
| Ads | None | None |

Free hosts keep one board (Paul, Nov 5, 2026): once its game has ended, New game opens a dialog to reset the old game (clears it and opens its settings to pick the next game) or delete it, with an email box for anyone who wants more active boards (saved with source `ended_board_dialog`, kept out of the Jan 15 read). Paid plans with room and admins are unaffected. This supersedes the weekly-host reading of 'active' for free accounts; the 7-day unlinked rule only matters for paid hosts.

Decided Nov 5, 2026: no ads (adFree is not sold as a perk), no lifetime cap, presentation mode and the heat map moved from the pass to Free (a guest who sees a free board on a party TV is the funnel). The upgrade dialog lists only live scores, more boards and custom splits, in points and never money. Fake-door test story changed on this date: read it Jan 15, 2027 with at least 15 clicks AND at least 150 unique hosts shown (fewer shown means inconclusive, not "nobody pays").

Ship together, only once a pass can be bought (about 3 evenings): the live-scoring gate (plan flag, hide the ESPN link, stop the browser poller, skip free owners in `syncEspnScores`, rules for new links), undo on manual scoring, and unlinked boards counting for 7 days from creation (today 48 hours, too short for a Thursday board for a Sunday game). Boards already linked to ESPN keep working until final.

**The Season Pass (decided Nov 5, 2026):**
- **Name and price:** "Season Pass", $5.99 one time. The price is always shown at checkout; the no-money rule is Stripe's restricted-business rule, so copy never uses prize, pot, payout or entry-fee words about squares. Avoid "paid" in the UI. Guests always join and play for free; only hosts buy.
- **Term:** fixed date, about Sept 1 to June 30 each season (changed from Mar 1 on Nov 6 2026: the NBA runs to June, so Mar 1 was arbitrary). This first season it runs from purchase to June 30, 2027. A one-time expiring pass, never auto-renewing. The Week Pass, the $29.99 tier and stacking go away when checkout is built (`plans.ts` still has them until then).
- **Refunds:** refundable until the pass is "used", final after, stated above the buy button and on the receipt. "Used" = one `usedAt` stamp on the entitlement, written the first time a board is created under the pass AND a pass-only feature fires (ESPN link on, a custom split saved, or a second concurrent board). Store the stamp with a timestamp, board id and feature. A stricter rule (at least 10 claimed squares by at least 3 players and a score written) is the fallback if disputes appear.
- **Where we sell:** US only at launch, and say so.
- **Renewal:** reminder only, never an automatic charge. An unchecked checkbox: "Email me once in August before next season starts. I'll never be charged automatically." Store the consent date, email and wording; every send needs Paul's OK.
- **Chargebacks:** Stripe's dispute fee is $15 per dispute and is not returned even if we win, on top of losing the $5.99, so one lost dispute is about -$15.47 against a $5.52 net sale. A refund costs only the $0.47 Stripe keeps. Prevent disputes: statement descriptor "QUARTERSCORE", a receipt with the end date, policy and a support email, fast answers to inquiries, refund unused passes without asking why.
- **Still for a lawyer or CPA before launch:** is "refundable until used" enforceable in Texas and the buyers' states; exact checkout and Terms wording; state digital-goods refund disclosure; EU/UK handling if ever sold there; sales tax on a $5.99 digital pass (Stripe Tax?); revenue recognition and the tax set-aside; whether an LLC changes dispute liability; read Stripe's restricted-business list at signup.
- **Dialog count:** `upgradeViews/{uid}` records each signed-in host's first and last view and count of the upgrade dialog, for the Jan 15 read (at least 15 clicks AND at least 150 unique hosts shown). Admins read it in the Firebase console. The rule is in `database.rules.json` and needs a database rules deploy.

Why $5.99: it brings back the one-party Super Bowl host as a buyer (live scoring plus TV presentation is what they want) and fits "simple and low". Operating cost is low and mostly independent of paying users: the live-score function hits ESPN once per league per minute.

Input gathered earlier for a single ~$20 pass (CFO and skeptic reviewed that version, not this one):
- **CFO:** Stripe nets $5.52 on $5.99 (7.8% fees) versus $19.11 on $19.99 (4.4%). At $5.99 you need about 3.5x the payers to match $19.99 revenue. Break-even is about 54 passes if costs are around $300/yr (assumption: confirm real Firebase and domain bills). Before launch: sales tax on digital goods (Stripe Tax or a CPA), Stripe keeps its $0.30 on refunds (short refund window), set aside income tax.
- **Skeptic:** TEST-SMALL. Payers are hosts who hit the limits; the paid perks must feel worth it; sell the pass as "2026 Season Pass, through June 2027" (was Mar 2027 until Nov 6 2026) because a 365-day year is mostly dead time. Biggest risk is that nobody pays at any price.
- **Test before building checkout:** fake-door on the dashboard when a host hits the 1-board limit or tries live scoring or presentation: "Season Pass $5.99 · Notify me" (reuse notify-me signups). Run Nov 5, 2026 to Jan 15, 2027. Success is at least 10% click-through and at least 15 clicks; under 5% means don't build checkout.
- **Open:** gating live scoring is the biggest bet (best hook, but free becomes manual scoring); exact board count; changing plans is a one-line edit in `plans.ts`.

### Bar/Venue Tier ($49-99/season)

A separate B2B offering for sports bars and venues:

- **Customer email capture** (players sign up with email to join)
- Unlimited boards per season
- Free game mode (prizes are coupons, gift cards, etc. — no cash, no gambling concerns)
- Custom branding/theming (colors, logo)
- Branded QR codes (low chance of happening)
- Subdomain support (later: joes-bar.quarterscore.com)

**Value prop for bars**: "Capture 50-100 customer emails per season" is worth $200+ in Facebook ad equivalent. The game is free entertainment that brings people back weekly.

**Bar/Venue pricing rationale**: $10 is too cheap for B2B — signals "toy" not "tool." Bars spend $500/month on Untappd, $200 on trivia nights. Price at $49-99/season so serious buyers take it seriously.

### Bar Outreach Strategy

**Market size**: ~60,000 bars in the US, 10-15k are true sports bars showing NFL. Most do paper squares or nothing. Cold outreach converts 1-3%, so realistically hundreds of sign-ups in year one, not thousands.

**Outreach approach**: Use AI (Grok, etc.) to identify and reach sports bars. Pitch the email capture angle: "Run free squares games during Sunday football. Capture customer emails. Give away coupons instead of cash — no gambling, just engagement."

**Pricing options to test**:
- $49/season (impulse buy, still signals value)
- $99/year (covers NFL + college)
- $29/month during season (recurring, Sept-Feb only)

## Feature Details

### QR Code Generator
✓ Done for the TV screen: presentation mode shows a QR to the game page ("Scan to join", or "Scan to follow along" once the board is full). A printable, branded QR for bars is a low chance of happening.

### Bar Branding
In-app theme picker first (colors, logo upload). Subdomains later (joes-bar.quarterscore.com).

### Multi-Board TV Display
✓ Done, single-board and rotating (Nov 2026): `/present/:gameId` fills the screen with the player-colored board, live score and clock, Q1-Q4 winners (chips in the winner's color, winning squares ringed, current leader glowing), claimed/open/players-verified stats and a QR. `/present` rotates through the host's boards every 10/20/30/60s, pins a board for 30s after its score changes and skips finished games. Left/right arrow keys switch between hosted boards on the game page and in presentation mode, and the new board slides in. Casting relies on Chrome/Edge Cast, Safari AirPlay or HDMI; a real Cast receiver app is not planned.

Showing several boards at once on one screen was considered and dropped: it doesn't make sense.

### Custom Quarter Payouts
Set % per quarter during game creation. Must total 100%. Default remains 20/20/20/40.

### Facebook & Apple Sign-In
Additional OAuth providers alongside existing Google sign-in.

### Guest-to-Account Conversion
Seamless upgrade from guest to full account. Existing squares transfer automatically.

### Payment Links
Decided against: no money handling in the app.

Cash App, Zelle, PayPal.me alongside existing Venmo support. All external links (no in-app payments). Per winner: amount owed, plus a Venmo or Cash App request link. Printable board PDF for collecting offline.

### Money Collected/Outstanding
Decided against: no money handling in the app.

Payment status displayed on dashboard game cards.

### Payment Management
Decided against: no money handling in the app.

Icon button on dashboard card to manage who has paid.

### Push Notifications
Opt-in browser push when a quarter is won. Add email for the same event. The paid iOS apps are the ones advertising this.

### Built-in Blog
Static pages at /blog. AI-generated SEO content covering rules, strategy, Super Bowl history.

P1. Also ship intent pages: `/super-bowl-squares` (create a board before the teams are set), `/nfl-squares`, `/college-football-squares`, `/how-to-play`, `/best-squares-numbers` (digit frequency), `/printable-football-squares`. JSON-LD: SoftwareApplication + Offer, FAQPage, HowTo, BreadcrumbList. Super Bowl LXI pages should be indexed by December.

Oct 31 search check, not a confirmed Google rank: QuarterScore was outside the top 5 for "football squares", "super bowl squares online", and "free football squares app". Confirm in Search Console after the sitemap is live.

### Unattended scoring
P1. The Premium line above is ESPN live score sync. A client poller already updates an open game about every 30s. Still to build: a scheduled Cloud Function (~30s during games) that writes quarter scores when no tab is open. ESPN's public scoreboard is enough. Needs Blaze.

### Shareable game previews
P1. Unfurlers do not run JS, so a shared game has no per-game title or image. A function on `/game/**` injects title, description, and a 1200×630 image (teams, pot, squares left). Short cache on the HTML, about a day on the image. A miss or error returns the plain page with 200. Copy-invite sits next to the QR. Games stay out of the sitemap.

### Welcome hero
✓ Done.

### Board sizes and season boards
~~P2. Grids of 100, 50, and 25.~~ ✓ Done — board size selection (100/50/25) added to game creation. ✓ Number reveal animation and a Half & Final only split preset are done. Still open: optional four number sets and reverse winners. Reusable weekly boards with standings. Fundraiser prizes stay the Bar-tier free-game mode.

### PWA
Manifest, add to home screen, and an offline board for game day.

### Team themes
✓ Done for the NFL. Team pages show a printable board in team colors, with Print board and Create board on each upcoming game. Generic helmets in team colors with the team's initials stand in for NFL logos, which are trademarked. The live game board keeps its own look.

Decided: no team themes for college, NBA, MLB, or other leagues and sports. Those boards keep the standard look.

## UX Improvements

### Help Menu (replaces walkthrough auto-launch)
The `?` icon in the header currently auto-launches a walkthrough. Replace with a help dropdown showing contextual topics:

- **How to update scores** (for custom/manual games)
- **How to share your game** (link, QR code)
- **Presentation mode / TV view**
- **How winners are calculated**
- **Start walkthrough** (keep as an option, not auto)

The walkthrough is still available but user-initiated. Help topics should be contextual — show "Update scores" only for game owners on non-ESPN games, etc.

## Quality

Oct 31, 2026 lab pass on quarterscore.com. Mobile Lighthouse 69 / 80 / 100 / 91 (perf, a11y, best practices, SEO). Desktop perf 100. Mobile LCP 4.8s. PageSpeed field data was not collected (API quota). Re-run before calling the perf work done.

- ✓ Done. `/` is prerendered with the H1, copy, and FAQ in the HTML.
- P0. A11y: name the join-arrow button, 44px targets for Sign in and Join, contrast on muted text and the placeholder, heading order.
- Lazy-load Firebase off the landing route. The vendor chunk is 149 KB gzip, and about 85 KB of JS is unused on `/`.
- ✓ Done. Hashed bundles are cached for a year (immutable) on Firebase Hosting.

## Infrastructure

### Hosting
✓ Done. Firebase Hosting on `squares-4e4f7`, deployed by GitHub Actions on every push to `main`, with preview channels on pull requests. DNS is Cloudflare.

## Small follow-ups

- Swap the remaining ESPN logos for helmets: game board header, Box Score tab, dashboard game picker, landing team strip. Undecided.
- Team pages: hide the "No upcoming games" line in the prerendered HTML so crawlers see the games.
- Search Console: review the first data mid-November 2026 (set up Nov 2).

## Later

- AFL Grand Final squares test (Aug 2027): SEO landing page + notify-me + manual-score board; build out only if ~50 signups or ~500 AU visits. Rugby: revisit only for RWC 2027. Source: [Skeptic verdict](https://docs.google.com/document/d/1u1VswkSSvcydYiqWZ70jGgt5cVI1L90T6oUVUL04Hxs/edit)
