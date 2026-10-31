# Future Features Roadmap

Product roadmap and monetization strategy for QuarterScore.

## Now

Already in flight as separate PRs. Do not redo them here.

- Sized WebP logo (width and height set) and a local favicon. Open: https://github.com/paulqlove/angular-squares/pull/2
- Self-hosted Roboto. Removes the render-blocking Google Fonts CSS (~0.8s on mobile FCP). Open: https://github.com/paulqlove/angular-squares/pull/3
- Meta description, OG/Twitter tags, a 1200×630 og:image, canonical, robots.txt, and sitemap.xml. Open: https://github.com/paulqlove/angular-squares/pull/4. Title there is "Quarter Score — Football Squares for Game Day". Sitemap is the homepage only. Still to add, so a preview is not a search hit: `noindex` on game routes, and `Disallow: /dashboard` in robots.txt.

## Account Tiers

### Free
- 1 active game
- Manual score entry
- Basic dashboard with payment tracking
- QR code for game join link
- All payment links (Venmo, Cash App, Zelle, PayPal.me)
- Guest mode + full account (Google, Facebook, Apple sign-in)
- Guest-to-account conversion (attach existing squares)

### Premium (~$1-2/season)
- ESPN live score sync
- 2+ active games
- Push notifications for winners
- Custom quarter payouts (default 20/20/20/40)

### Bar/Venue (~$5-10/month or season)
- Everything in Premium
- Custom branding/theming (colors, logo)
- Multi-board TV display (large screen only)
- Branded QR codes
- Subdomain support (later: joes-bar.quarterscore.com)
- Max squares per player (limit how many squares one person can claim)
- Require account to play (disable guest mode per game)
- Free game mode (no payment tracking — prizes are custom like gift cards, coupons, etc.)

### Pricing
Keep play free. The free sites dominate search. Charge the host. Public prices elsewhere run about $0.99 per game to $25 per grid, so these tiers are the low end. Branding, weekly reuse, and export can cost more. No popups. No gambling affiliates.

## Feature Details

### QR Code Generator
QR linking to game URL for bars to print/display. Players scan to join. Add a public demo game, and put Join with code on the welcome page next to it.

### Bar Branding
In-app theme picker first (colors, logo upload). Subdomains later (joes-bar.quarterscore.com).

### Multi-Board TV Display
Large-screen-only view showing multiple games simultaneously. Designed for bar TVs. Competitors ship a single-board cast-to-TV view; the multi-board view stays the venue feature.

### Custom Quarter Payouts
Set % per quarter during game creation. Must total 100%. Default remains 20/20/20/40.

### Facebook & Apple Sign-In
Additional OAuth providers alongside existing Google sign-in.

### Guest-to-Account Conversion
Seamless upgrade from guest to full account. Existing squares transfer automatically.

### Payment Links
Cash App, Zelle, PayPal.me alongside existing Venmo support. All external links (no in-app payments). Per winner: amount owed, plus a Venmo or Cash App request link. Printable board PDF for collecting offline.

### Money Collected/Outstanding
Payment status displayed on dashboard game cards.

### Payment Management
Icon button on dashboard card to manage who has paid.

### Push Notifications
Opt-in browser push when a quarter is won. Add email for the same event. The paid iOS apps are the ones advertising this.

### Built-in Blog
Static pages at /blog. AI-generated SEO content covering rules, strategy, Super Bowl history.

P1. Also ship intent pages: `/super-bowl-squares` (create a board before the teams are set), `/nfl-squares`, `/college-football-squares`, `/how-to-play`, `/best-squares-numbers` (digit frequency), `/printable-football-squares`. JSON-LD: SoftwareApplication + Offer, FAQPage, HowTo, BreadcrumbList. Super Bowl LXI pages should be indexed by December.

Oct 31 search check, not a confirmed Google rank: QuarterScore was outside the top 5 for "football squares", "super bowl squares online", and "free football squares app". Confirm in Search Console after the sitemap is live.

### Unattended scoring
P1. The Premium line above is ESPN live score sync. A client poller already updates an open game about every 30s. Still to build: a scheduled Cloud Function (~30s during games) that writes quarter scores when no tab is open. ESPN's public scoreboard is enough. Needs Blaze. After hosting. Not part of the cutover.

### Shareable game previews
P1. Unfurlers do not run JS, so a shared game has no per-game title or image. After the hosting move, a function on `/game/**` injects title, description, and a 1200×630 image (teams, pot, squares left). Short cache on the HTML, about a day on the image. A miss or error returns the plain page with 200. Copy-invite sits next to the QR. Games stay out of the sitemap (see Now).

### Welcome hero
P0. At 375px the empty green grid fills the first screen. Replace it with a real sample board. Full-width Create game, plus See demo and Join with code. Trust line: free, no account required to play.

### Board sizes and season boards
P2. Grids of 100, 50, and 25. Optional four number sets, reverse or final-only payouts, and a random number reveal. Reusable weekly boards with standings. Fundraiser prizes stay the Bar-tier free-game mode.

### PWA
Manifest, add to home screen, and an offline board for game day.

## Quality

Oct 31, 2026 lab pass on quarterscore.com. Mobile Lighthouse 69 / 80 / 100 / 91 (perf, a11y, best practices, SEO). Desktop perf 100. Mobile LCP 4.8s. PageSpeed field data was not collected (API quota). Re-run before calling the perf work done.

Logo, fonts, and crawl tags are in Now.

- P0. Prerender or SSR `/` so the H1, copy, and FAQ are in the HTML. No H1 in the raw HTML today. Title and meta tags are the SEO PR above.
- P0. A11y: name the join-arrow button, 44px targets for Sign in and Join, contrast on muted text and the placeholder, heading order.
- Lazy-load Firebase off the landing route. The vendor chunk is 149 KB gzip, and about 85 KB of JS is unused on `/`.
- Hashed bundles use `max-age=600`, same as HTML (~390 KB on repeat visits). That ships with the hosting move below.

## Infrastructure

### Migrate off GitHub Pages
Repo needs to be private. GitHub Pages requires a public repo on the free plan (Enterprise required for private repo Pages). Migrate hosting to Vercel, Netlify, or Firebase Hosting — all support private repos on free tiers with custom domains and HTTPS.

**Plan only (2026-10-31): Firebase Hosting** on `squares-4e4f7`. No hosting block and no `.firebaserc` yet. Do not change DNS until the decisions at the bottom are closed. This is the fix for shared game links: `/game/:id` returns HTTP 404 today (Pages serves `404.html` as the SPA shell). The page still renders for people. Crawlers and iMessage, Slack, X, and Facebook treat the link as missing.

- Rewrites for `/dashboard` and `/game/*` only. `/` is `index.html`. Any other path is a real 404 from `public/404.html` (branded, inline CSS, link to `/`). `/game/abc/extra` is 404. Change the Angular `**` route from a redirect home to a not-found view so the client matches the server.
- `/game/<unknown-id>` stays 200. The game screen should say the game was not found.
- Cache: hashed `main`, `polyfills`, `chunk`, `styles`, and fonts immutable for a year. `/assets/**` at 1 day until the logo and favicon are fingerprinted. `index.html` is `no-cache`. robots.txt and sitemap.xml at 1 hour. Headers: nosniff, strict-origin-when-cross-origin, HSTS. The SEO PR already copies those two files to the build root. Hosting must serve them as files, not rewrites.
- A new route needs its rewrite and a checklist line in the same change.
- GitHub Actions via `firebase init hosting:github` (secret `FIREBASE_SERVICE_ACCOUNT_SQUARES_4E4F7`). Preview on pull requests, 7-day expiry, skip forks. Live deploy on `main`. Add preview hosts to Firebase Auth authorized domains. Keep the gh-pages deploy until the rollback window closes.
- DNS is Cloudflare (`deb.ns.cloudflare.com`, `kyree.ns.cloudflare.com`). GoDaddy is the registrar only. Edit records in the Cloudflare dashboard. Every Firebase record (A, www, TXT, `_acme-challenge`) must be DNS only (grey cloud). An orange-cloud proxy blocks domain verification and the certificate.
- Today: apex A records `185.199.108.153` through `185.199.111.153`, www CNAME `paulqlove.github.io`, TTL 300. No AAAA. No TXT.
- Cut over on a Tuesday or Wednesday, mid-morning US Central, away from a game day. Date TBD. Prove `https://squares-4e4f7.web.app` first, including 200 on a real `/game/<id>`. Add the Firebase ownership TXT and wait until the console says Verified (plus the ACME TXT if it asks) before swapping A records, so SSL can be issued first. Then point the apex and www at the console values, and remove the custom domain in GitHub Pages settings. Leave Pages serving `paulqlove.github.io/angular-squares` as the rollback target. After 24–48 hours stable, raise TTL to 3600.
- Rollback: Hosting release history, or restore the four GitHub A records and the www CNAME and re-add the Pages custom domain. Keep that path for 2 weeks.
- The per-game preview function is Shareable game previews above. It is not part of this cutover.

Checks, on a preview channel, then `*.web.app`, then quarterscore.com: `/`, `/dashboard`, and `/game/<real-id>` return 200; `/no-such-page` and `/game/abc/extra` return 404; hashed JS is immutable; robots.txt and sitemap.xml return 200; create, join, claim, and live updates in two browsers; Auth works on the apex and `*.web.app`; database rules unchanged; www redirects to the apex; HTTP redirects to HTTPS; mobile Lighthouse at least 69 with no cache-policy failure; unfurl a game link; submit the sitemap in Search Console.

Open:

1. Billing plan is unverified. Hosting works on Spark. The per-game OG function and scheduled scoring need Blaze. Check Project settings → Usage and billing.
2. Which Tuesday or Wednesday.
3. Who can edit Cloudflare DNS for quarterscore.com.
4. Decided: known routes only, plus a real `404.html`.
