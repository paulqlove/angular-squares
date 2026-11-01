# Adding a blog post

Marketing writes posts as Markdown. The production build turns them into prerendered pages, a sitemap entry, and an RSS item. Nothing goes on the public site until Paul approves the copy and the change is merged.

## Create the file

Add `content/blog/{slug}.md`. The filename and the `slug` field must match.

```markdown
---
title: "Post title"
description: "One or two sentences for the meta description, Open Graph, and the blog index."
date: "2026-11-05"
slug: post-title
ogImage: /assets/og-image.png
---

The post body is Markdown. Link to other pages with root paths, for example [how to play](/how-to-play).
```

Required frontmatter:

| Field | Notes |
| --- | --- |
| `title` | Shown as the H1. The HTML title adds “— Quarter Score”. |
| `description` | Unique summary. Also used as the meta description. |
| `date` | Publish date as a quoted string, `"YYYY-MM-DD"`. The November 5, 2026 post uses `"2026-11-05"`. |
| `slug` | Lowercase words separated by hyphens. The URL is `/blog/{slug}`. |
| `ogImage` | A root path such as `/assets/og-image.png`, or an `https` URL. No team, league, or Super Bowl logos, and no player likenesses. |

## What the build does

`npm run build` runs `scripts/build-content.mjs` first. That script:

- reads every `content/blog/*.md` file
- writes `src/app/features/blog/blog-posts.generated.ts`
- adds `/blog/{slug}` to `prerender-routes.txt` and `src/sitemap.xml`
- rebuilds `src/rss.xml` at `https://quarterscore.com/rss.xml`

`npm start` runs the same content step, so a new file shows up in the dev server. Public pages are prerendered only by the production build. Dashboard and game routes stay a client-rendered app.

## House style

- Say “game,” “friends and fans,” “bragging rights,” and “prizes.”
- Do not say “bet,” “wager,” “gamble,” or “cash payout.”
- If you mention payment tracking, say that Quarter Score never collects, holds, or pays out money.
- Do not use NFL, team, or Super Bowl logos. Plain team names are fine. Do not imply the site is an official league product.
- Mark unfinished writing with `TODO` so it is obvious in the page and in review.
- Link to the evergreen pages that match the brief (`/how-to-play`, `/faq`, `/super-bowl-squares`, `/best-squares-numbers`, `/printable-football-squares`, and the rest of the footer). The call to action for a normal post is [Start a free game](/dashboard).

## Check the result

After `npm run build`, open `dist/angular-squares/browser/blog/{slug}/index.html`. The title, the post text, and the canonical URL should be in that file before any JavaScript runs. Confirm the slug is in `src/sitemap.xml` and `src/rss.xml`.
