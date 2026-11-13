# Prompt Gaps

Log of situations where better upfront instructions would have prevented backtracking.
Review periodically and promote useful entries into CLAUDE.md.

---

### 2026-02-04 — Deployment base href assumption

**What went wrong:** Deployed with `--base-href=/angular-squares/` which 404'd all assets on the custom domain (quarterscore.com).

**Assumption made:** That gh-pages deployment needed the repo-name subdirectory path, which is only true without a custom domain.

**Suggested CLAUDE.md addition:**
> This project uses a custom domain (quarterscore.com). Base href must always be `/`. Never use `--base-href=/angular-squares/` — that's only needed for default `username.github.io/repo` URLs.

**Status:** Promoted (added to Deployment section)

---

### 2026-11-01 — Theme toggle placement

**What went wrong:** Added a Light/Dark button to every header. The owner removed it: the theme is already chosen in settings, and the default is System.

**Assumption made:** That the general UI design language (a mono Light/Dark toggle top right) applied here as-is.

**Suggested CLAUDE.md addition:**
> Theme is set only in the settings panel (System / Light / Dark). The default is System. Don't add a theme toggle to headers or page chrome.

**Status:** Open

---

### 2026-11-01 — Deployment section is out of date

**What went wrong:** CLAUDE.md says production deploys with `ng deploy` to GitHub Pages. Production is now Firebase Hosting, deployed by `.github/workflows/firebase-hosting-merge.yml` on every push to `main`. Pushing to `main` publishes the live site.

**Assumption made:** None acted on. This was caught by checking response headers and the workflows before pushing.

**Suggested CLAUDE.md addition:**
> Production is Firebase Hosting. Every push to `main` deploys quarterscore.com through GitHub Actions. PRs get a preview URL. GitHub Pages (`ng deploy`) is only the rollback target. The app is Angular 22, Node 24.15+ (see `.nvmrc`), and tests run on Vitest (`npm test`), not Karma.

**Status:** Open

---

### 2026-11-12 — Free plan limits aren't in CLAUDE.md

**What went wrong:** While writing llms.txt, I first listed custom quarter splits as a feature everyone gets. `core/plans.ts` gates custom splits, extra active boards, auto-manage and square limits behind the Season Pass, and free hosts keep 20/20/20/40 with one active board.

**Assumption made:** That every feature on the board is free, because the marketing pages say "free".

**Suggested CLAUDE.md addition:**
> Plans live in `core/plans.ts`. Free hosts get one active board and the 20/20/20/40 split; the Season Pass adds custom splits, more boards, auto-manage and square limits. Public copy (marketing pages, llms.txt, JSON-LD) only promises free-plan features, and doesn't mention the pass until checkout is live.

**Status:** Open

---

### 2026-11-13 — The session's dev branch already held an open PR

**What went wrong:** For a docs-only job, I reset the session's assigned branch (`claude/dashboard-card-redesign-32wbxf`) to main and force-pushed. That branch was the head of open PR #267 (walkthrough SVG), so the push replaced its commit. I restored the old tip within minutes and moved the docs to a new branch (#306).

**Assumption made:** That the assigned dev branch only held work that had already merged, because the last few PRs on it had merged.

**Suggested CLAUDE.md addition:**
> Each change gets its own `claude/<topic>` branch off the latest main, one PR per branch. Before force-pushing or resetting any branch, list PRs with that head branch (state all) and don't touch it if one is open.

**Status:** Open
