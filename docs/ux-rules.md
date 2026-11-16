# QuarterScore UX rules

Read this before designing or building any screen. These come from Paul's own feedback. When a design breaks one, fix the design, not the rule. Visual tokens, motion and color rules live in docs/DESIGN.md; this file is about where things go and how the work is checked.

## Placement

1. **Group related controls.** A new control goes next to the controls it works with, not in a new row or section of its own. Example: the dashboard group picker sits in the Search and New board row, not in a chip row under Hosting.
2. **On phones, secondary controls are icon-only, and nothing adds a row.** Fit new phone controls into a bar or row that already exists. Primary actions keep their label (New board, Lock). Every icon-only button needs an aria-label.
3. **Put an action where the task already happens.** When a new spot takes over a job, remove the old spot so there's one way in. Example: the host bar's Games button took over the header games button's job, so the header button is hidden for hosts at every size.
4. **One icon, one meaning.** Don't reuse an icon for a different job on the same page.
5. **A feature must be reachable where you need it.** If you can set something later, you can also set it when you create the thing. Example: a game's group can be picked in Create game, not only in Edit game.
6. **Controls stay near what was clicked.** Avoid long mouse travel and layout shift.

## Content

7. **Remove what doesn't fit the moment.** Show what the current state needs and drop the rest. Example: finished games drop the game code and TV link and show the winners picture instead.
8. **Nothing vanishes without feedback.** When something closes, moves or is removed, animate it or confirm it (motion per docs/DESIGN.md).
9. **Green means open squares only** (exceptions are listed in docs/DESIGN.md).

## Behavior

10. **Keep existing behavior unless Paul asks to change it.** A redesign moves and restyles; it doesn't quietly change what a control does or when it's enabled. Example: Clear stays disabled on a locked board. If a change in behavior seems needed, ask first.
11. **Copy-only changes don't need Paul's testing.** Wording and placeholder text tweaks can ship without a preview check from him.

## Process

12. **Start every design from the live screen.** Before mocking anything up, take screenshots of the current screen, phone and desktop, with the dev screenshot script (`node scripts/screenshot.mjs <url> <out-prefix>`, see CLAUDE.md). Design on top of what's really there.
13. **Check the build before Paul sees it.** Before a preview goes to Paul, screenshot the built version, phone and desktop, and compare it with the mockup and with these rules. Fix anything that doesn't match first, then send the preview with the screenshots.
14. **Any placement change needs Paul's OK before it's built.** Design proposes; Paul approves; Engineering builds.
