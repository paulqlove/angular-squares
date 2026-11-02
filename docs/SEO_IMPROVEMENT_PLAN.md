# SEO Improvement Plan

**Based on Google Site Audit - November 2026**

## Executive Summary

The landing page has a strong structural foundation but needs improvements in semantic hierarchy, schema markup, and content depth to capture high-volume search traffic.

---

## Priority 1: Quick Wins (1-2 weeks)

### 1.1 Fix Heading Hierarchy

**Current Issue:** Feature sections use `<h2>` for decorative text like "01", "STEP 01 / 03".

**Action Items:**
- [ ] Update hero `<h1>` from "The Ultimate Football Squares Game" to "Free Online Football Squares for Game Day & Super Bowl"
- [ ] Remove heading tags from step counters - use `<span>` with `qs-eyebrow` class instead
- [ ] Ensure each `<h2>` describes a semantic topic, not a number

**Files:** `src/app/features/welcome/welcome.component.ts`

### 1.2 Image Alt Text Optimization

**Current Issue:** Generic alt text on team logos and board previews.

**Action Items:**
- [ ] Team logos: `alt="Buffalo Bills Football Squares Grid"` format
- [ ] Hero board: `alt="Live football squares board showing players claiming squares"`
- [ ] Phone demo: Descriptive aria-label already exists, verify it's crawlable

**Files:** `src/app/features/welcome/welcome.component.ts`, `src/app/features/content/teams-list.component.ts`

### 1.3 Add noindex to Ephemeral Game Pages

**Current Issue:** Dynamic game URLs waste crawl budget.

**Action Items:**
- [ ] Add `<meta name="robots" content="noindex, nofollow">` to `/game/:id` routes
- [ ] Add noindex to `/join?code=...` routes
- [ ] Keep team pages, rules, FAQ indexable

**Files:** `src/app/core/services/seo.service.ts`, `src/app/features/super-bowl-squares/super-bowl-squares.component.ts`

---

## Priority 2: Schema Markup (2-3 weeks)

### 2.1 WebApplication Schema

Add to homepage:
```json
{
  "@context": "https://schema.org",
  "@type": "WebApplication",
  "name": "QuarterScore Football Squares",
  "url": "https://quarterscore.com",
  "applicationCategory": "GameApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "description": "Free online football squares game for Super Bowl parties and game day."
}
```

### 2.2 FAQPage Schema

Add to `/faq` route for rich snippets in search results.

### 2.3 HowTo Schema

Add to "Three steps to kickoff" section:
```json
{
  "@context": "https://schema.org",
  "@type": "HowTo",
  "name": "How to Play Football Squares",
  "step": [
    { "@type": "HowToStep", "name": "Create a board", "text": "..." },
    { "@type": "HowToStep", "name": "Share the link", "text": "..." },
    { "@type": "HowToStep", "name": "Watch the game", "text": "..." }
  ]
}
```

**Files:** `src/app/core/services/seo.service.ts` (add schema injection method)

---

## Priority 3: Content Depth (4-6 weeks)

### 3.1 Target "Printable" Searches

**High-volume queries:**
- "free printable football squares pdf"
- "super bowl squares template"
- "100 square football grid printable"

**Action Items:**
- [ ] Ensure `/printable-board` has server-rendered descriptive text, not just canvas
- [ ] Add intro paragraph explaining the printable
- [ ] Include download instructions as crawlable text

### 3.2 Target "Rules" Searches

**High-volume queries:**
- "how do football squares work"
- "super bowl squares rules"
- "football squares scoring"

**Action Items:**
- [ ] Expand `/how-to-play` with comprehensive text content
- [ ] Add FAQ accordion with common rule questions
- [ ] Internal link from homepage features section

### 3.3 "Best Numbers" / Probability Content

**High-volume queries:**
- "best football squares numbers"
- "football squares probability"
- "what numbers win football squares"

**Action Items:**
- [ ] Create dedicated `/best-numbers` page
- [ ] Include historical data visualization
- [ ] Link from probability heatmap feature

---

## Priority 4: Technical SEO (Ongoing)

### 4.1 SSR Verification

Angular SSR is configured. Verify these routes are pre-rendered:
- [ ] Homepage
- [ ] All team pages (`/team/:slug`)
- [ ] Rules, FAQ, How to Play
- [ ] Printable board page

**Test:** `curl -s https://quarterscore.com | grep -o '<h1>.*</h1>'` should return content.

### 4.2 Open Graph Optimization

**Current Issue:** Shared game links may have weak social previews.

**Action Items:**
- [ ] Dynamic `og:title` for game pages: "Join [Owner]'s Football Squares Game"
- [ ] Compelling `og:image` - board preview or branded graphic
- [ ] `og:description` with game status: "27/100 squares claimed"

**Files:** `src/app/core/services/seo.service.ts`

### 4.3 URL Canonicalization

- [ ] Add canonical tags to all pages
- [ ] Ensure trailing slash consistency
- [ ] 301 redirect any duplicate paths

---

## Traffic Growth Targets

| Metric | Current | 3-Month Target | 6-Month Target |
|--------|---------|----------------|----------------|
| Organic sessions/month | TBD | +50% | +150% |
| Indexed pages | TBD | 50+ | 100+ |
| Featured snippets | 0 | 2-3 | 5+ |
| Backlinks | TBD | +25 | +75 |

---

## Content Calendar

### November 2026
- Fix heading hierarchy
- Add noindex to game pages
- Implement WebApplication schema

### December 2026
- Schema markup for FAQ and HowTo
- Optimize team page alt text
- Expand rules content

### January 2027 (Pre-Super Bowl)
- Launch "Best Numbers" page
- Optimize printable page content
- Aggressive internal linking
- Social preview optimization

### February 2027 (Super Bowl)
- Monitor traffic spike
- Capture backlinks from shares
- A/B test landing page copy

---

## Measurement

**Tools:**
- Google Search Console (impressions, clicks, indexed pages)
- Google Analytics (organic traffic, bounce rate)
- Ahrefs/SEMrush (keyword rankings, backlinks)

**Weekly Check:**
- New indexed pages
- Crawl errors
- Top growing queries

---

*Last updated: November 2, 2026*
