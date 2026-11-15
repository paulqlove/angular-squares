# QuarterScore decision log

This file records product and design decisions, newest first. To add one, put a new entry at the top with the next ID (D-017, D-018 and so on), the date, what was decided, the options that were considered, why, and who decided. If the options or the reason weren't recorded, write "not recorded" rather than filling them in later from memory. When a decision changes, add a new entry and point it at the old one; don't edit the old entry. How a decision looks on screen belongs in [DESIGN.md](DESIGN.md), and this file links to it.

---

## D-036 · A game in a group always shows in that group's More tab

- **Date:** Nov 15 2026
- **Decision:** When a host or co-host picks a group for a game (Create game, Edit game on the game page or the dashboard, or the co-host's Edit game), Show in my open boards turns on and stays locked on, with the hint "Games in a group always show in open boards." Picking No group unlocks the switch and keeps it on. Deleting a group moves its games to No group with the switch as it was. A game filed in a group earlier with the switch off opens in Edit game with it on, and saves it on; `scripts/show-grouped-games.mjs` fixes the rest in one go. The app holds this rule (the Group picker and `GameGroupsService.fileBoard`), not the database rules. Builds on D-031. Paul's words, relayed: "If a game is assigned a group then it should automatically be made public. Where it's viewable with other games within that group." and "Lock it on".
- **Options considered:** switch turns on but stays editable (built first, Nov 15, then replaced by Paul's "Lock it on")
- **Why:** a grouped game that stays out of More can't be found from the group's other games, which is what the group is for
- **Decided by:** Paul

## D-035 · Group picker joins the Search and New board row

- **Date:** Nov 15 2026
- **Decision:** The Groups chip row under Hosting (from D-031's dashboard work) goes away. From 640px up a 200px Group dropdown sits between Search and New board: folder icon, the current choice (All groups or the group's name) and a chevron; its menu lists All groups, each group with its game count, then Manage groups (Season Pass only), which opens the Groups sheet. On a phone a 48px icon-only folder button sits in the bottom bar between Games & codes and New board and opens a short Groups sheet with the same rows. A picked group fills the phone button ink, and a chip with the group's name and an x sits by the Hosting heading (just under it when the Boards | Players switch is there). Picking a group filters Hosting for real; search works inside it; Joined is never filtered. The picker shows only when the owner has a group or can make one. Mockups w1, w2, p1 to p3 from Creative. Paul's words, relayed: "The group redesign, I think should be moved in the same section as the search in Newboard on desktop and on mobile. And make it icon only on mobile." Approved: "Yeah, that works. Build that out and give me a preview link."
- **Options considered:** not recorded
- **Why:** not recorded beyond Paul's words above
- **Decided by:** Paul

## D-034 · Season Pass hosts at the cap get a plain limit note

- **Date:** Nov 15 2026
- **Decision:** A Season Pass host (or an admin previewing Season Pass) with 25 active boards who tries to make another sees "You're at your 25-board limit" and a Done button: no price, no upgrade offer, no email signup, and no upgrade-view count. Free hosts at their one-board limit keep the "Board 1 is live" upgrade dialog exactly as before. The "Your last game is over" reset-or-delete dialog is now free-only too, so a Season Pass host who owns 25 or more boards but has fewer than 25 active can make a new one. The 25 cap is unchanged. Paul's words, relayed: "Yes, fix it".
- **Options considered:** not recorded
- **Why:** the free plan's upgrade offer made no sense to someone who already has the Season Pass
- **Decided by:** Paul

## D-033 · Share winners shows the picture, not the code or TV link

- **Date:** Nov 15 2026
- **Decision:** On a finished game the Share dialog drops the Game code block and the TV link, and shows the winners picture itself in their place: square at full dialog width, 8px radius, 1px line border, above the Share winners button. While it draws, a same-size panel reads "Drawing the picture…"; if the draw fails it reads "Couldn't make the picture. Tap Share winners to try again." Share game on live games is unchanged.
- **Options considered:** Creative's s1 (picture preview) with s2 (drawing state)
- **Why:** the code and TV link don't matter once a game is over. Paul's words, relayed: "On games that are completed where it says share winners, I think the TV link in game codes are irrelevant and not needed. Maybe it would be a good opportunity to just go ahead and show an image of what the winner's image will look like." Approved: "Build it".
- **Decided by:** Paul

## D-032 · Phone host bar: Games in the bar, one next-step button

- **Date:** Nov 15 2026
- **Decision:** On a phone the game page's host bar is Games · Lock · Players · Edit (co-host: Games · Players). Games opens the existing Your games sheet (other games, Join with a code, My dashboard), and on phones hosts and co-hosts get no header Your games button; players and guests keep it. This replaces the first pick, a Dashboard button in the bar (Creative's d2, superseded by d4 and d5; Paul, relayed: "Yes, go with creatives pick on the host bar and players and guests."). Draw/Clear numbers leaves the phone bar; Lock becomes the next step (Lock and draw, Draw if locked without numbers, Unlock once drawn), and Clear and redraw move to a Numbers row at the top of Edit game. Clear stays disabled while the board is locked, as on desktop (Paul, relayed: "currently clear is disabled if the board is locked"). Desktop is unchanged. Both ways back to the dashboard are tracked as `game_to_dashboard`: `host_bar` for My dashboard in the sheet the bar opened, `header` otherwise.
- **Options considered:** a Dashboard button in the bar (d2) and one Games button in the bar (d4, d5); Creative picked d4
- **Why:** reaching the header to get back to the dashboard is a chore on a phone. Paul's words, relayed: "the mock-ups look good and are a go for everything."
- **Decided by:** Paul

## D-031 · Game groups decide each game's More tab

- **Date:** Nov 15 2026
- **Decision:** Season Pass owners can put each game in one group (Church, Work) or No group. A game's More tab lists only the other open games in its own group; No group games show each other as before. Any game link still joins its game: no members-only games, approvals or forced sign-in. Players and guests never see group names. Co-hosts can file a game into one of the owner's groups but can't make, rename or delete groups. Deleting a group moves its games to No group. Without a Season Pass, groups stay as filed and can't be changed. Mockups g1 to g5 from Creative. Paul's words: "if you have a link you should be able to join... should only be linked. To that game's group." and "the mock-ups look good and are a go for everything."
- **Options considered:** members-only groups with approvals (dropped by Paul, Nov 15)
- **Why:** a link to one game used to expose every open game the host runs (church and work together)
- **Decided by:** Paul

## D-030 · Players card panel may animate its height on phones

- **Date:** Nov 15 2026
- **Decision:** On a phone, a player card's panel grows and folds its height (a grid row from 0fr to 1fr, 200ms open, 160ms close) so the cards below glide instead of jumping. This is an exception to DESIGN.md's rule that motion uses only transform and opacity, like D-028. From 640px the panel floats over the cards and keeps to transform and opacity. Motion spec from Creative.
- **Options considered:** not recorded
- **Why:** not recorded. Paul's words, relayed: "Build both."
- **Decided by:** Paul

## D-029 · Share winners on finished games

- **Date:** Nov 14 2026
- **Decision:** On a finished game, the Share dialog's Share invite button becomes Share winners and shares only the 1080 by 1080 winners picture from #294, with no link or text: the share sheet on touch phones, a clipboard copy on desktop (Image copied for 2 seconds), a download where neither works. Creative added a small quarterscore.com wordmark beside the logo in the picture's footer. The results card on the page stays removed (D-010). Paul's words: "it should just change to share winners. And it should be that beautiful graphic that you made with the winners and the final score. And it's just an image and it's copied. No link, just copied. The image."
- **Options considered:** not recorded
- **Why:** not recorded
- **Decided by:** Paul

## D-028 · Bottom-sheet dim may fade by color

- **Date:** Nov 14 2026
- **Decision:** On a phone, while a bottom sheet is swiped down, the dim behind it fades by its background color instead of its opacity. This is an exception to DESIGN.md's rule that motion uses only transform and opacity. Shipped in #353.
- **Options considered:** fading the dim's opacity, which would also fade the sheet, because the dim layer holds the sheet
- **Why:** it looks the same, and the dim layer holds the sheet. Paul's words: "Keep it."
- **Decided by:** Paul

## D-027 · No swipe left or right to change games on phones

- **Date:** Nov 14 2026
- **Decision:** No swipe left or right on the game page to move between games, on the board or on the game title row.
- **Options considered:** swiping anywhere on the board; swiping only on the game title row
- **Why:** people drag a little while picking squares, so a swipe on the board would switch games mid-pick, and it clashes with the phone's edge back-swipe. A title-row-only swipe is safe but few would find it, and the games dropdown already does the job. Paul's words: "Skip it."
- **Decided by:** Paul, on Engineering's advice

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
