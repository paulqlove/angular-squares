# Future Features Roadmap

Product roadmap and monetization strategy for QuarterScore.

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

## Feature Details

### QR Code Generator
QR linking to game URL for bars to print/display. Players scan to join.

### Bar Branding
In-app theme picker first (colors, logo upload). Subdomains later (joes-bar.quarterscore.com).

### Multi-Board TV Display
Large-screen-only view showing multiple games simultaneously. Designed for bar TVs.

### Custom Quarter Payouts
Set % per quarter during game creation. Must total 100%. Default remains 20/20/20/40.

### Facebook & Apple Sign-In
Additional OAuth providers alongside existing Google sign-in.

### Guest-to-Account Conversion
Seamless upgrade from guest to full account. Existing squares transfer automatically.

### Payment Links
Cash App, Zelle, PayPal.me alongside existing Venmo support. All external links (no in-app payments).

### Money Collected/Outstanding
Payment status displayed on dashboard game cards.

### Payment Management
Icon button on dashboard card to manage who has paid.

### Push Notifications
Opt-in browser push when a quarter is won.

### Built-in Blog
Static pages at /blog. AI-generated SEO content covering rules, strategy, Super Bowl history.

## Infrastructure

### Migrate off GitHub Pages
Repo needs to be private. GitHub Pages requires a public repo on the free plan (Enterprise required for private repo Pages). Migrate hosting to Vercel, Netlify, or Firebase Hosting — all support private repos on free tiers with custom domains and HTTPS.
