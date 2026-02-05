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
