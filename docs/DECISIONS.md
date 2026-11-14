# QuarterScore decision log

This file records product and design decisions, newest first. To add one, put a new entry at the top with the next ID (D-017, D-018 and so on), the date, what was decided, the options that were considered, why, and who decided. If the options or the reason weren't recorded, write "not recorded" rather than filling them in later from memory. When a decision changes, add a new entry and point it at the old one; don't edit the old entry. How a decision looks on screen belongs in [DESIGN.md](DESIGN.md), and this file links to it.

---

## D-023 · Players view layout

- **Date:** Nov 13–14 2026
- **Decision:** The Players view uses tiles only, keeping the round 2 and round 4 look (round 3 was rejected). The Boards | Players switch sits in the Hosting heading row, and Grid / Compact hides in Players. Statuses are Confirmed and Unconfirmed only, with no "5 of 9" counts and no color dot, and "+2 new squares" stays. Desktop tiles wrap at 13. On a phone a closed card shows the name, points and an arrow; Confirm rest sits inside the opened card, with Remove… on the left and Confirm on the right. Desktop closed rows have no Confirm button. Same-name accounts get a "Not the same" dismiss, and merging is manual only. See DESIGN.md, Players view.
- **Options considered:** five design rounds (files in quarterscore/design/players-view/)
- **Why:** not recorded
- **Decided by:** Paul, with creative's design pass

## D-022 · Co-hosted boards count; co-hosts need their own pass

- **Date:** Nov 14 2026
- **Decision:** Boards a host co-hosts show in the Players view next to the boards they run and count toward the two games it needs. A co-host without a Season Pass doesn't get the Players view.
- **Options considered:** hosted boards only
- **Why:** Paul's words: "Season pass only. Let's keep it simple."
- **Decided by:** Paul

## D-021 · Players view is Season Pass only

- **Date:** Nov 14 2026
- **Decision:** The Players view (every player across a host's games, with Confirm and Remove) is a Season Pass feature, and shows only with two or more games.
- **Options considered:** not recorded
- **Why:** free hosts can host only one game, so they don't need it.
- **Decided by:** Paul

## D-020 · Compact stays compact at every width

- **Date:** Nov 14 2026
- **Decision:** In Compact view, dashboard cards stay short rows at every window width. Before, a Compact card that ended up 448px wide or more (one column, roughly 480 to 670px windows) turned into the tall Grid card. See DESIGN.md, Cards.
- **Options considered:** not recorded
- **Why:** Paul's words: "it flips the cards to um, the regular big card view ... That needs to be fixed."
- **Decided by:** Paul

## D-019 · Split the three oversized files now

- **Date:** Nov 13 2026
- **Decision:** Split `super-bowl-squares.component.ts` (~1,850 lines), `dashboard.component.ts` (~1,640) and `game.service.ts` (~1,280) now, as their own cleanup PRs, not only when a feature touches them.
- **Options considered:** split now as a cleanup project; split only when a change touches the file
- **Why:** not recorded
- **Decided by:** Paul

## D-018 · Lighter tests

- **Date:** Nov 13 2026
- **Decision:** Unit tests are required for new or changed logic in services and utilities (scoring, data), plus rules tests for rules changes. UI is checked with screenshots instead of tests.
- **Options considered:** tests for every logic change; tests for services and utilities only, with screenshots for UI
- **Why:** not recorded
- **Decided by:** Paul

## D-017 · The Consolidator is its own skill

- **Date:** Nov 13 2026
- **Decision:** The efficiency and consolidation reviewer is a separate skill (`.claude/skills/consolidator/`) that reviews every PR before Paul sees it, apart from the engineering skill (`.claude/skills/quarterscore-engineering/`).
- **Options considered:** one engineering skill with a reviewer section; a separate reviewer skill
- **Why:** not recorded
- **Decided by:** Paul

## D-016 · Spanish shelved for now

- **Date:** Nov 13 2026
- **Decision:** No Spanish version yet. Look again once the analytics signals move (the report lists six signals to watch).
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-015 · Thumbnails use style A "Board"

- **Date:** Nov 13 2026
- **Decision:** All 14 how-to video thumbnails use style A, "Board": paper on the left with a two-line headline, the real board on the right. The full spec is in DESIGN.md, section 11.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-014 · How-to videos on YouTube, embedded tap-to-load

- **Date:** Nov 13 2026
- **Decision:** How-to videos are hosted on YouTube and embedded on the site as tap-to-load. Phones play the Short, and desktop opens a large player overlay. Shipped in #301, #302 and #303.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-013 · Season Pass at $5.99

- **Date:** Nov 13 2026
- **Decision:** Plan a Season Pass at $5.99, one-time, with unlimited boards until June 30. It is planned, not built.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-012 · No social pushing until Stripe is live

- **Date:** Nov 12 2026
- **Decision:** No social media promotion until Stripe payments are live.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-011 · Laws of UX as the base design principles

- **Date:** Nov 12 2026
- **Decision:** All 30 Laws of UX are the base design principles for QuarterScore.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-010 · Final winners card and Winners tab removed

- **Date:** Nov 12 2026
- **Decision:** The final winners (results) card on the game page and the planned Winners tab are dropped. Paul's words: "Just remove the final winners. We don't need that." The card was removed in #298.
- **Options considered:** keeping a results card after the game, or a Winners tab
- **Why:** "We don't need that."
- **Decided by:** Paul

## D-009 · Winning-square quarter tab ships as built

- **Date:** Nov 12 2026
- **Decision:** The quarter tab on winning squares ships as built in #283 (the tab on desktop, a green fill on phones).
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-008 · One search-or-code field, and game codes

- **Date:** Nov 12 2026
- **Decision:** Search and Join with a code share one field. Join turns green when the text matches a game code. Game codes are 6 characters, letters and numbers, picked at random. Shipped in #279, #290 and #292.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-007 · Section heads: no numbers, green bar

- **Date:** Nov 12 2026
- **Decision:** Section heads drop their numbers (`01 / Board` became Board) and the rule line after the word. A green vertical bar sits before the word, and Hosting and Joined show the game count after it. Shipped in #279. See DESIGN.md, section 3.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-006 · Green means open squares

- **Date:** Nov 11 2026
- **Decision:** Green (the emerald accent) marks open squares only. The exceptions are the heading bar, the New board button, Join when the text matches a code, and the winner tab.
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-005 · Locked games don't auto-compact

- **Date:** Nov 11 2026
- **Decision:** Locked games are not switched to the compact card on their own. Not built.
- **Options considered:** auto-compact locked games, or leave cards as the viewer chose
- **Why:** "Keep it simple for now."
- **Decided by:** Paul

## D-004 · Header stays clear; view toggle for hosts only

- **Date:** Nov 11 2026
- **Decision:** Join and New board are not in the header. The Grid / Compact toggle shows for hosts only. Paul's words: "No, I just want the toggle." Shipped in #271 and #274.
- **Options considered:** putting Join and New board in the header
- **Why:** not recorded
- **Decided by:** Paul

## D-003 · Borderless search bar

- **Date:** Nov 11 2026
- **Decision:** The search bar uses option B, borderless. Shipped in #274.
- **Options considered:** option B (borderless) was picked; the other options were not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-002 · "Games", not "Pools"

- **Date:** Nov 11 2026
- **Decision:** The dropdown label is "Games", never "Pools".
- **Options considered:** "Pools"
- **Why:** not recorded. The Brand Brief's do-not-say list already rules out "pool" (DESIGN.md, section 9).
- **Decided by:** Paul

## D-001 · No "mark your own squares"

- **Date:** not recorded (from the design audit)
- **Decision:** Rejected the design audit's "mark your own squares" suggestion.
- **Options considered:** marking the viewer's own squares on the board
- **Why:** not recorded
- **Decided by:** Paul
