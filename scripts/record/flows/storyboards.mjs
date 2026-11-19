// The seven storyboards from "QuarterScore how-to video storyboards", each as a phone take and a
// desktop take. Shot numbers and captions match the storyboard tables, so the .srt files line
// up with the edit. Shots the browser can't film (iOS share sheet, Messages, a live Google
// sign-in) are left out and listed in the run summary.
import {
  boardState, createGame, deleteGame, joinAsGuest, newBoardButton, seedPlayers, settle,
  spread, squares, waitForBoard, waitForSquare,
} from '../lib/site.mjs';
import { DEMO_AWAY, DEMO_HOME, DEMO_NOTE } from '../lib/config.mjs';

const visible = (l) => l.filter({ visible: true }).first();

// ---------- 1. Create a game ----------

export async function createAGame(s) {
  // Desktop: the first-time path, signed out, from the home page. It ends on the sign-in
  // dialog, because a Google sign-in can't be filmed by a script. Nothing is saved.
  await s.film('desktop', '01-create-desktop', { start: '/' }, async ({ page, take: t }) => {
    await t.shot(1, 'Start on quarterscore.com', 4, async () => {
      const free = page.getByText(/Players don.t need an account/).first();
      if (await free.count()) await t.point(free, 900);
      await t.press(visible(page.getByRole('link', { name: 'Create a board' })));
      await page.waitForURL(/\/create/);
    });
    await t.shot(2, 'Four quick steps', 3, async () => {
      await t.point(page.getByRole('progressbar', { name: 'Create board progress' }), 1200);
    });
    await t.shot(3, 'Pick a game or add your teams', 5, async () => {
      await t.press(page.getByRole('group', { name: 'Sport' }).getByRole('button', { name: 'Custom', exact: true }));
      await t.type(page.locator('#custom-away'), DEMO_AWAY);
      await t.type(page.locator('#custom-home'), DEMO_HOME);
    });
    await t.shot(4, 'Board size and points', 5, async () => {
      await t.press(page.getByRole('button', { name: 'Next', exact: true }));
      await t.press(page.getByRole('button', { name: /^100 squares/ }));
      await t.point(page.getByRole('button', { name: '10 pts', exact: true }), 600);
    });
    await t.shot(5, 'Check your setup', 2, async () => {
      await t.press(page.getByRole('button', { name: 'Next', exact: true }));
      await t.point(page.getByText(`${DEMO_AWAY} @ ${DEMO_HOME}`).first(), 900);
    });
    await t.shot(6, 'Choose what an empty quarter does', 5, async () => {
      await t.point(page.getByText('Quarter split').first(), 900);
      const roll = page.getByText(/Roll to Q4/).first();
      if (await roll.count()) await t.point(roll, 1200);
    });
    await t.shot(7, 'Name it, add a note', 5, async () => {
      await t.press(page.getByRole('button', { name: 'Next', exact: true }));
      await t.type(page.locator('#new-game-name'), s.gameName);
      await t.type(page.locator('#new-game-host-note'), DEMO_NOTE);
    });
    await t.shot(8, 'Create', 2, async () => {
      await t.press(page.getByRole('button', { name: 'Create', exact: true }));
    });
    await t.shot(9, 'Hosts sign in once. Players never have to', 5, async () => {
      await page.getByRole('heading', { name: 'Sign in to host a game' }).waitFor();
      await t.point(page.getByRole('button', { name: /Sign in with Google/ }).first(), 1500);
    });
  });
  s.skipped('1 desktop', 'shots 9 and 10: the Google sign-in itself and the board loading after it (use the phone take\'s last shot for "Your board is live")');

  // Phone: the signed-in demo host, from the dashboard. This makes the demo board.
  await s.film('phone', '01-create-phone', { start: '/dashboard', host: true }, async ({ page, take }) => {
    await newBoardButton(page).waitFor({ timeout: 20_000 });
    s.game = await createGame(page, { name: s.gameName, take });
  });
  if (s.game) s.log(`  demo board: ${s.game.name} (${s.game.id})`);
}

// ---------- 2. Invite and share ----------

export async function inviteAndShare(s) {
  await s.ensureGame();
  const shareButton = (page) => page.locator('[data-walkthrough="share"]').first();
  const dialog = (page) => page.getByRole('dialog').filter({ hasText: 'Share game' });

  await s.film('phone', '02-share-phone', { start: s.gamePath(), host: true, board: true }, async ({ page, take: t }) => {
    await t.shot(1, 'Invite your group', 2, () => t.press(shareButton(page)));
    await t.shot(2, 'Link, code and TV link', 2, () => dialog(page).waitFor());
    const native = page.getByRole('button', { name: 'Share link' });
    if (await native.count()) await t.shot(3, 'One tap to share', 2, () => t.point(native, 900));
    await t.shot(5, 'Or share the game code', 3, async () => {
      await t.press(page.getByRole('button', { name: 'Copy game code' }));
      await page.getByRole('button', { name: 'Copy game code' }).filter({ hasText: 'Copied' }).waitFor({ timeout: 3000 }).catch(() => {});
    });
    await t.shot(6, "That's it", 2, () => t.press(page.getByRole('button', { name: 'Done', exact: true })));
  });
  s.skipped('2 phone', 'shots 3 and 4: the iOS share sheet and Messages (film those on the iPhone, or cut from a screen recording)');

  await s.film('desktop', '02-share-desktop', { start: s.gamePath(), host: true, board: true }, async ({ page, take: t }) => {
    await t.shot(1, 'Invite players', 3, () => t.press(shareButton(page)));
    await t.shot(2, 'Copy the invite link', 4, async () => {
      await dialog(page).waitFor();
      await t.press(page.getByRole('button', { name: 'Copy share link' }));
    });
    await t.shot(3, 'Players can type the code instead', 5, async () => {
      await t.point(page.locator('#share-code'), 900);
      await t.press(page.getByRole('button', { name: 'Copy game code' }));
    });
    await t.shot(4, 'Put the board on a TV, no sign-in', 5, async () => {
      await t.press(page.getByText('TV link', { exact: true }).first());
      await t.press(page.getByRole('button', { name: 'Copy TV link' }));
    });
    await t.shot(5, 'Done', 2, () => t.press(page.getByRole('button', { name: 'Done', exact: true })));
    await t.shot(6, 'Share from your dashboard too', 8, async () => {
      await t.press(page.getByRole('button', { name: 'Your games' }));
      await t.press(visible(page.getByRole('link', { name: 'My dashboard' })));
      await page.waitForURL(/\/dashboard/);
      await t.press(page.getByRole('button', { name: `Share invite for ${s.game.name}` }));
    });
    await t.shot(7, 'Same dialog, any time', 3, async () => {
      await dialog(page).waitFor();
      await t.hold(800);
      await t.press(page.getByRole('button', { name: 'Done', exact: true }));
    });
  });
}

// ---------- 3. Join with a code or link (player) ----------

export async function joinGame(s) {
  await s.ensureGame();
  // Phone: the link path, as a guest who has never signed in.
  await s.film('phone', '03-join-phone', { start: s.gamePath(), board: true, keep: 'phoneGuest' }, async ({ page, take: t }) => {
    await t.shot(1, 'Got the link?', 2, () => t.hold(800));
    const { open } = await boardState(page);
    const pick = spread(open, 1, 3)[0];
    await t.shot(2, 'Tap any open square', 2, () => t.press(squares(page).nth(pick)));
    await t.shot(3, 'Type your name', 3, () => t.type(page.locator('#auth-guest-name'), s.phonePlayer));
    await t.shot(4, 'No account needed', 2, () => t.press(page.getByRole('button', { name: 'Join as Guest' })));
    await t.shot(5, "You're on the board", 3, () => waitForSquare(page, pick, s.phonePlayer));
  });
  s.skipped('3 phone', 'shot 1 opens the link from Messages; the take starts on the game page instead');

  // Desktop: the code path from the home page.
  await s.film('desktop', '03-join-desktop', { start: '/', keep: 'desktopGuest' }, async ({ page, take: t }) => {
    await t.shot(1, 'Have a game code?', 3, () => t.press(page.getByRole('button', { name: 'Join with code' })));
    await t.shot(2, 'Enter the code', 5, async () => {
      await t.type(page.locator('#join-code'), s.game.id);
      await t.press(page.locator('#join-code-panel').getByRole('button', { name: /Join/ }));
      await page.waitForURL(/\/game\//);
      await waitForBoard(page);
    });
    await t.shot(3, 'This is the board', 4, async () => {
      await t.point(squares(page).nth(44), 700);
      await t.point(page.getByText(/\d+\/\d+ picked/).first(), 900);
    });
    const { open } = await boardState(page);
    const pick = spread(open, 1, 5)[0];
    await t.shot(4, 'Click any open square', 2, () => t.press(squares(page).nth(pick)));
    await t.shot(5, 'Just your name', 6, () => t.type(page.locator('#auth-guest-name'), s.desktopPlayer));
    await t.shot(6, 'Or sign in to keep your games', 5, async () => {
      await t.point(page.getByRole('button', { name: /Sign in with Google/ }).first(), 900);
      const email = page.getByRole('button', { name: /Sign in with email/ }).first();
      if (await email.count()) await t.point(email, 900);
    });
    await t.shot(7, "You're in", 4, async () => {
      await t.press(page.getByRole('button', { name: 'Join as Guest' }));
      await waitForSquare(page, pick, s.desktopPlayer);
    });
  });
  s.skipped('3 desktop', 'shot 8: joining from a signed-in dashboard (optional in the storyboard)');
}

// ---------- 4. Pick squares ----------

export async function pickSquares(s) {
  await s.ensureGame();
  await s.ensurePlayers();
  // The storyboard's board is about half picked by seeded players.
  await s.seed(50);

  const flow = async (device, name, player, keep, shotsFor) =>
    s.film(device, name, { start: s.gamePath(), board: true, state: keep }, async ({ page, take: t }) => {
      const st = await boardState(page);
      const picks = spread(st.open, 3, device === 'phone' ? 21 : 31);
      const takenBy = Object.entries(st.taken).find(([, n]) => n !== s.phonePlayer && n !== s.desktopPlayer);
      await shotsFor({ page, t, picks, takenBy, player });
    });

  await flow('phone', '04-pick-phone', s.phonePlayer, 'phoneGuest', async ({ page, t, picks, takenBy, player }) => {
    await t.shot(1, 'Tap to pick', 3, async () => {
      for (const p of picks.slice(0, 2)) {
        await t.press(squares(page).nth(p));
        await waitForSquare(page, p, player);
      }
    });
    await t.shot(2, 'Your squares show your initials', 2, () => t.hold(600));
    await t.shot(3, 'Tap again to give one back', 3, async () => {
      await t.press(squares(page).nth(picks[1]));
      await waitForSquare(page, picks[1], null);
    });
    if (takenBy) {
      await t.shot(4, 'Taken squares are taken', 3, async () => {
        await t.press(squares(page).nth(Number(takenBy[0])));
        await page.getByText(`Square already taken by ${takenBy[1]}`).first().waitFor({ timeout: 5000 }).catch(() => {});
      });
    }
    await t.shot(5, 'Watch the board fill', 2, () => t.point(page.getByText(/\d+\/\d+ picked/).first(), 800));
  });

  await flow('desktop', '04-pick-desktop', s.desktopPlayer, 'desktopGuest', async ({ page, t, picks, takenBy, player }) => {
    await t.shot(1, 'Click to pick', 5, async () => {
      for (const p of picks) {
        await t.press(squares(page).nth(p));
        await waitForSquare(page, p, player);
      }
    });
    if (takenBy) await t.shot(2, 'Names show on every square', 4, () => t.point(squares(page).nth(Number(takenBy[0])), 1200));
    await t.shot(3, 'Click again to give it back', 4, async () => {
      await t.press(squares(page).nth(picks[2]));
      await waitForSquare(page, picks[2], null);
    });
    await t.shot(4, "See who's in and what's left", 5, async () => {
      for (const label of ['Picked', 'Open', 'Players']) {
        const l = page.locator('[data-walkthrough="players-list"]').getByText(label, { exact: true }).first();
        if (await l.count()) await t.point(l, 700);
      }
    });
    if (takenBy) {
      await t.shot(5, 'One name per square', 4, async () => {
        await t.press(squares(page).nth(Number(takenBy[0])));
        await page.getByText(`Square already taken by ${takenBy[1]}`).first().waitFor({ timeout: 5000 }).catch(() => {});
      });
    }
  });
  s.skipped('4 desktop', 'shot 6, the locked-board toast (film it after storyboard 5 if wanted)');
}

// ---------- 5. Lock and draw numbers ----------

const hostTools = (page) => page.getByRole('toolbar', { name: 'Host tools' });
const lockButton = (page) => hostTools(page).getByRole('button', { name: /^(Lock|Lock and draw|Lock board)$/ });

export async function lockAndDraw(s) {
  await s.ensureGame();
  await s.ensurePlayers();
  await s.seed(100);

  // Phone: the host locks while the player's phone films the same reveal.
  await s.filmTogether(
    [
      { device: 'phone', name: '05-lock-phone-host', start: s.gamePath(), host: true, board: true },
      { device: 'phone', name: '05-lock-phone-player', start: s.gamePath(), board: true, state: 'phoneGuest' },
    ],
    async ([host, player]) => {
      const both = (n, c, sec, fn) => Promise.all([host.take.shot(n, c, sec, fn), player.take.shot(n, c, sec)]);
      await both(1, "Board's full. Time to lock", 2);
      await both(2, 'Lock the board', 2, () => host.take.press(lockButton(host.page)));
      await both(3, 'Numbers drawn at random', 6);
      await player.take.shot(4, 'Everyone sees the draw live', 3);
      await both(5, 'Now every square has a pair', 3);
    },
  );

  await s.unlockAndClear();

  // Desktop: lock from the dashboard card, then watch the reveal on the board.
  await s.film('desktop', '05-lock-desktop', { start: '/dashboard', host: true }, async ({ page, take: t }) => {
    const card = page.locator(`article a[href="/game/${s.game.id}"]`).first();
    await card.waitFor({ timeout: 20_000 });
    await t.shot(1, 'Full boards wait here', 4, () => t.point(card, 1200));
    await t.shot(2, 'Lock from the dashboard', 2, () => t.press(page.getByRole('button', { name: `Lock ${s.game.name} now` })));
    await t.shot(3, 'Picks close, numbers get drawn', 5, async () => {
      const yes = page.getByRole('button', { name: 'Lock and draw numbers' });
      await yes.waitFor();
      await t.hold(1200);
      await t.press(yes);
    });
    await t.shot(4, 'Locked', 3, () => t.hold(1500));
    await t.shot(5, 'Drawn at random, every time', 7, async () => {
      await t.press(card);
      await page.waitForURL(/\/game\//);
      await waitForBoard(page);
    });
    await t.shot(6, 'Lock first, then draw', 5, () => t.point(hostTools(page), 1500));
  });
  s.skipped('5 desktop', 'shots 7 to 9, shrinking a half-picked board: a Free host keeps one board, so this needs a second board on Demo Host Plus');
}

// ---------- 6. Follow scores live ----------

export async function followLive(s) {
  if (s.liveGame) return followLiveBoard(s);
  // No linked ESPN game: the storyboard's manual fallback, then the TV view.
  await s.ensureGame();
  await s.film('desktop', '06-scores-manual-desktop', { start: s.gamePath(), host: true, board: true }, async ({ page, take: t }) => {
    await t.shot(1, 'Box score, quarter by quarter', 4, () => t.press(page.locator('#tab-boxscore')));
    await t.shot(2, 'Any game works. Type the score.', 8, async () => {
      await t.press(page.getByRole('button', { name: 'Update scores' }));
      await t.type(page.getByRole('spinbutton', { name: `${DEMO_AWAY} Q1` }), '7');
      await t.type(page.getByRole('spinbutton', { name: `${DEMO_HOME} Q1` }), '3');
      await t.press(page.getByRole('button', { name: 'Save', exact: true }));
    });
    await t.shot(3, 'Points by quarter', 6, async () => {
      await t.press(page.locator('#tab-board'));
      await t.point(page.locator('[data-walkthrough="winners-payouts"]'), 1500);
    });
    await t.shot(5, 'Put it on the big screen', 4, async () => {
      await t.press(page.locator('button[aria-controls="profile-menu"]').first());
      await t.press(page.getByRole('link', { name: 'Present on a TV' }));
      await page.waitForURL(/\/present\//);
    });
    await t.shot(6, 'Guests scan to follow along', 8, () => t.hold(2000));
  });

  await s.film('phone', '06-scores-manual-phone', { start: s.gamePath(), board: true, state: 'phoneGuest' }, async ({ page, take: t }) => {
    await t.shot(3, 'Quarter and clock', 3, () => t.press(page.locator('#tab-boxscore')));
    await t.shot(5, 'Every quarter has a winner', 4, async () => {
      await t.press(page.locator('#tab-board'));
      await t.reveal(page.locator('[data-walkthrough="winners-payouts"]'));
      await t.hold(1200);
    });
  });
  s.skipped('6', 'the live shots (pulsing Live dot, leader moving): run again with --live-game CODE on a demo board linked to a real ESPN game, during the game');
}

/** Read only: films a demo board linked to a live ESPN game. Taps tabs, writes nothing. */
async function followLiveBoard(s) {
  const path = `/game/${s.liveGame}`;
  await s.film('phone', '06-live-phone', { start: path, board: true, state: 'phoneGuest' }, async ({ page, take: t }) => {
    await t.shot(1, 'Scores update on their own', 3);
    await t.shot(2, 'This square is winning right now', 4, () => t.hold(1500));
    await t.shot(3, 'Quarter and clock', 3, () => t.press(page.locator('#tab-boxscore')));
    await t.shot(4, 'A score changes the leader', 4, () => t.press(page.locator('#tab-board')));
    await t.shot(5, 'Every quarter has a winner', 4, () => t.reveal(page.locator('[data-walkthrough="winners-payouts"]')));
  });
  await s.film('desktop', '06-live-desktop', { start: path, board: true }, async ({ page, take: t }) => {
    await t.shot(1, 'Live on one board', 5);
    await t.shot(2, 'Box score, quarter by quarter', 6, () => t.press(page.locator('#tab-boxscore')));
    await t.shot(3, 'Points by quarter', 6, async () => {
      await t.press(page.locator('#tab-board'));
      await t.point(page.locator('[data-walkthrough="winners-payouts"]'), 1500);
    });
  });
}

// ---------- 7. Your games dropdown ----------

export async function yourGames(s) {
  await s.ensureGame();
  const menuButton = (page) => page.getByRole('button', { name: 'Your games' });
  const rows = (page) => page.locator('#your-games-menu a[href^="/game/"], [role="dialog"] a[href^="/game/"]').filter({ visible: true });

  for (const device of ['phone', 'desktop']) {
    await s.film(device, `07-your-games-${device}`, { start: s.gamePath(), host: true, board: true }, async ({ page, take: t }) => {
      await t.shot(1, device === 'phone' ? 'All your games' : 'Your games', 2, () => t.press(menuButton(page)));
      await t.shot(2, 'Every game and its state', device === 'phone' ? 3 : 6, async () => {
        await rows(page).first().waitFor({ timeout: 10_000 });
        const n = await rows(page).count();
        for (let i = 0; i < n; i++) await t.point(rows(page).nth(i), 600);
      });
      if ((await rows(page).count()) > 1) {
        await t.shot(3, 'Jump between games', 4, async () => t.press(rows(page).nth(1)));
        await t.press(menuButton(page));
      }
      await t.shot(4, 'Join without leaving the board', 6, async () => {
        await t.press(visible(page.getByRole('button', { name: 'Join with a code' })));
        await t.type(page.locator('#your-games-code'), s.game.id);
      });
      if (device === 'desktop') {
        await t.shot(5, 'Or open the full dashboard', 3, async () => {
          await t.press(visible(page.getByRole('link', { name: 'My dashboard' })));
          await page.waitForURL(/\/dashboard/);
        });
        await t.shot(6, 'Everything you host, grouped', 6, () => t.hold(2000));
      }
    });
  }
  s.skipped('7', 'a full list needs 3 to 5 boards in different states, which a Free host can\'t keep; run on Demo Host Plus for the storyboard\'s version. The code typed in "Join with a code" is not submitted.');
}

export const STORYBOARDS = {
  1: { name: 'create', run: createAGame },
  2: { name: 'share', run: inviteAndShare },
  3: { name: 'join', run: joinGame },
  4: { name: 'pick', run: pickSquares },
  5: { name: 'lock', run: lockAndDraw },
  6: { name: 'scores', run: followLive },
  7: { name: 'your-games', run: yourGames },
};

export { deleteGame };
