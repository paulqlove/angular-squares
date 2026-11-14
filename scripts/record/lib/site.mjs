// QuarterScore helpers: browser contexts, the demo host's saved sign-in, the ledger of boards
// this tool made, and the few app actions the storyboards need. Everything goes through the
// app's own screens, the way a person would use it, never straight to the database.
import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'node:fs';
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { overlayScript } from './overlay.mjs';
import { AUTH_DIR, COLORS, DEMO_AWAY, DEMO_HOME, DEVICES, HOST_STATE, LEDGER, SEED_NAMES } from './config.mjs';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- Browser and contexts ----------

export async function launch({ headed = false } = {}) {
  return chromium.launch({
    headless: !headed,
    // For an unusual setup only (a CI image, a sandbox): point at a Chromium build and its flags.
    executablePath: process.env.QS_CHROMIUM || undefined,
    args: process.env.QS_CHROMIUM_ARGS ? process.env.QS_CHROMIUM_ARGS.split(' ') : [],
  });
}

/**
 * A fresh browser profile on one device. `record` adds the pointer or tap overlay.
 * `host` loads the demo host's saved sign-in.
 */
export async function newContext(browser, base, device, { record = false, host = false, storageState } = {}) {
  const context = await browser.newContext({
    ...DEVICES[device].context,
    baseURL: base,
    colorScheme: 'light',
    reducedMotion: 'no-preference',
    locale: 'en-US',
    timezoneId: 'America/Chicago',
    storageState: host ? HOST_STATE : storageState,
  });
  await context.grantPermissions(['clipboard-read', 'clipboard-write'], { origin: new URL(base).origin }).catch(() => {});
  if (record) await context.addInitScript(overlayScript({ mode: device === 'phone' ? 'tap' : 'cursor', navy: COLORS.navy }));
  return context;
}

// ---------- The demo host's sign-in ----------

export function hasHostState() {
  return existsSync(HOST_STATE);
}

/** Reads who the page is signed in as, from Firebase's saved user in localStorage. */
export async function whoAmI(page) {
  return page.evaluate(() => {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith('firebase:authUser:')) {
        try {
          const u = JSON.parse(localStorage.getItem(k));
          return { uid: u.uid, email: u.email || null, isAnonymous: !!u.isAnonymous, name: u.displayName || null };
        } catch {}
      }
    }
    return null;
  });
}

// ---------- Ledger: boards this tool made, so cleanup touches nothing else ----------

export async function readLedger() {
  try {
    return JSON.parse(await readFile(LEDGER, 'utf8'));
  } catch {
    return { games: [] };
  }
}

async function writeLedger(ledger) {
  await mkdir(AUTH_DIR, { recursive: true });
  await writeFile(LEDGER, JSON.stringify(ledger, null, 2));
}

export async function ledgerAdd(game) {
  const l = await readLedger();
  if (!l.games.some((g) => g.id === game.id)) l.games.push({ ...game, createdAt: new Date().toISOString() });
  await writeLedger(l);
}

export async function ledgerRemove(id) {
  const l = await readLedger();
  l.games = l.games.filter((g) => g.id !== id);
  await writeLedger(l);
}

/**
 * Demo accounts and seeded guests would otherwise count in the weekly report
 * (scripts/report/report.mjs). Adds their uids to its exclude list on this computer.
 */
export async function excludeFromReport(uids, note) {
  const fresh = [...new Set(uids.filter(Boolean))];
  if (!fresh.length) return;
  const file = join(homedir(), '.config', 'quarterscore', 'exclude-uids.txt');
  const have = existsSync(file) ? readFileSync(file, 'utf8') : '';
  const add = fresh.filter((u) => !have.includes(u));
  if (!add.length) return;
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, (have && !have.endsWith('\n') ? '\n' : '') + add.map((u) => `${u}  # ${note}`).join('\n') + '\n');
}

// ---------- Pages ----------

export async function settle(page, ms = 600) {
  await page.waitForLoadState('domcontentloaded');
  await sleep(ms);
}

export function board(page) {
  return page.locator('[role="grid"][aria-label="Football squares game board"]');
}

export function squares(page) {
  return board(page).locator('[role="gridcell"]');
}

/** Waits for the board to draw its squares and returns how many it has. */
export async function waitForBoard(page) {
  await squares(page).first().waitFor({ state: 'visible', timeout: 30_000 });
  return squares(page).count();
}

/** Square states from their labels: { open: [i], taken: { i: name } }. */
export async function boardState(page) {
  const labels = await squares(page).evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') || ''));
  const open = [];
  const taken = {};
  labels.forEach((l, i) => {
    const m = /taken by (.+?)(, winning square)?$/.exec(l);
    if (m) taken[i] = m[1];
    else if (l.endsWith('available')) open.push(i);
  });
  return { size: labels.length, open, taken };
}

export async function waitForSquare(page, index, name, timeout = 15_000) {
  const cell = squares(page).nth(index);
  if (name) await cell.and(page.locator(`[aria-label*="taken by ${name}"]`)).waitFor({ timeout });
  else await cell.and(page.locator('[aria-label$="available"]')).waitFor({ timeout });
}

/** Picks squares spread over the board, deterministic for a given seed, from those still open. */
export function spread(open, count, seed = 7) {
  const pool = [...open];
  const out = [];
  let s = seed;
  while (out.length < count && pool.length) {
    s = (s * 9301 + 49297) % 233280;
    out.push(pool.splice(Math.floor((s / 233280) * pool.length), 1)[0]);
  }
  return out;
}

/** The "Join this game" dialog: types a name and joins as a guest. Uses take for pacing when filming. */
export async function joinAsGuest(page, name, take) {
  const field = page.locator('#auth-guest-name');
  await field.waitFor({ state: 'visible', timeout: 15_000 });
  const join = page.getByRole('button', { name: 'Join as Guest' });
  if (take) {
    await take.type(field, name);
    await take.press(join);
  } else {
    await field.fill(name);
    await join.click();
  }
  await field.waitFor({ state: 'hidden', timeout: 15_000 });
}

// ---------- Host actions ----------

/** The visible "New board" button (top right on desktop, the bottom bar on phones). */
export function newBoardButton(page) {
  return page.getByRole('button', { name: 'New board' }).filter({ visible: true }).first();
}

/** Waits for the dashboard to load its boards and returns the game ids it links to. */
export async function dashboardGameIds(page) {
  await page.goto('/dashboard');
  await settle(page, 800);
  let last = -1;
  let stable = 0;
  let ids = [];
  for (let i = 0; i < 30 && stable < 4; i++) {
    ids = await page.$$eval('a[href^="/game/"]', (as) => [...new Set(as.map((a) => a.getAttribute('href').split('/')[2]))]);
    stable = ids.length === last ? stable + 1 : 0;
    last = ids.length;
    await sleep(500);
  }
  return ids.filter(Boolean);
}

/**
 * Safety check before anything is made. The host must be a signed-in, non-admin account whose
 * only boards (if any) are ones this tool made. Leftovers from an earlier run are deleted first.
 */
export async function preflight(page, { log }) {
  await page.goto('/dashboard');
  await settle(page, 1200);
  const me = await whoAmI(page);
  if (!me || me.isAnonymous) throw new Error('The saved host sign-in is missing or is a guest. Run `npm run login` and sign in as the demo host.');
  // The saved session can be stale even when it's still stored: the site then sends /dashboard home.
  if (!new URL(page.url()).pathname.startsWith('/dashboard')) {
    throw new Error('The site no longer accepts the saved demo host sign-in. Run `npm run login` and sign in again.');
  }
  if (await page.locator('app-role-preview-switcher #role-preview').count()) {
    throw new Error(`${me.email || me.uid} is an admin account. Record on a demo host, never the admin account (its "View as" panel would be on camera).`);
  }
  const ledger = await readLedger();
  for (const g of ledger.games) {
    log(`Removing a demo board left from an earlier run: ${g.name} (${g.id})`);
    await deleteGame(page, g).catch((e) => log(`  could not delete ${g.id}: ${e.message}`));
  }
  const ids = await dashboardGameIds(page);
  const mine = new Set((await readLedger()).games.map((g) => g.id));
  const foreign = ids.filter((id) => !mine.has(id));
  if (foreign.length) {
    throw new Error(
      `${me.email || me.uid} already has ${foreign.length} board(s) this tool did not make (${foreign.join(', ')}). ` +
        'Use a dedicated demo host with no boards, so no real game is ever touched.',
    );
  }
  return me;
}

/**
 * Creates the demo board from the dashboard: Custom teams, 100 squares, 10 pts.
 * With a take, every step is filmed at the storyboard's pace; without, it runs quickly.
 * Returns { id, name }.
 */
export async function createGame(page, { name, note, take, shots = {} }) {
  const t = take;
  const act = async (n, caption, sec, fn) => (t ? t.shot(n, caption, sec, fn) : fn());
  const press = (l) => (t ? t.press(l) : l.click());
  const type = (l, v) => (t ? t.type(l, v) : l.fill(v));

  if (!page.url().includes('/dashboard')) {
    await page.goto('/dashboard');
    await settle(page, 1000);
  }
  await act(1, shots[1] ?? 'Run your squares from your phone', 2, async () => press(newBoardButton(page)));
  await page.getByRole('group', { name: 'Sport' }).waitFor({ timeout: 15_000 });
  await act(2, shots[2] ?? 'Pick a game or add your teams', 2, async () =>
    press(page.getByRole('group', { name: 'Sport' }).getByRole('button', { name: 'Custom', exact: true })),
  );
  await act(3, shots[3] ?? 'Name both teams', 3, async () => {
    await type(page.locator('#custom-away'), DEMO_AWAY);
    await type(page.locator('#custom-home'), DEMO_HOME);
  });
  await act(4, shots[4] ?? 'Classic 10×10 board', 2, async () => {
    await press(page.getByRole('button', { name: 'Next', exact: true }));
    await press(page.getByRole('button', { name: /^100 squares/ }));
  });
  await act(5, shots[5] ?? 'Points per square', 2, async () => {
    const ten = page.getByRole('button', { name: '10 pts', exact: true });
    if ((await ten.getAttribute('aria-pressed')) !== 'true') await press(ten);
    else if (t) await t.point(ten, 900);
  });
  await act(6, shots[6] ?? 'Scoring is optional', 2, async () => {
    await press(page.getByRole('button', { name: 'Next', exact: true }));
    await press(page.getByRole('button', { name: 'Next', exact: true }));
  });
  await act(7, shots[7] ?? 'Give it a name', 3, async () => {
    await type(page.locator('#new-game-name'), name);
    if (note) await type(page.locator('#new-game-host-note'), note);
  });
  let id;
  await act(8, shots[8] ?? 'Your board is live', 3, async () => {
    await press(page.getByRole('button', { name: 'Create', exact: true }));
    await page.waitForURL(/\/game\/[A-Za-z0-9]{6}/, { timeout: 30_000 });
    id = /\/game\/([A-Za-z0-9]{6})/.exec(page.url())[1];
    await ledgerAdd({ id, name });
    await waitForBoard(page);
  });
  return { id, name };
}

/** Deletes one board this tool made, from the dashboard card's menu, after checking it is ours. */
export async function deleteGame(page, game) {
  const ledger = await readLedger();
  if (!ledger.games.some((g) => g.id === game.id)) throw new Error(`Refusing to delete ${game.id}: this tool did not make it.`);
  const ids = await dashboardGameIds(page);
  if (!ids.includes(game.id)) {
    await ledgerRemove(game.id); // already gone
    return;
  }
  const menu = page.getByRole('button', { name: `More actions for ${game.name}`, exact: true });
  if ((await menu.count()) !== 1) throw new Error(`Expected one board named "${game.name}" on the dashboard, found ${await menu.count()}.`);
  await menu.click();
  await page.getByRole('menuitem', { name: 'Delete game' }).click();
  await page.getByRole('button', { name: 'Delete game', exact: true }).last().click();
  await page.locator(`article a[href="/game/${game.id}"]`).first().waitFor({ state: 'detached', timeout: 20_000 });
  await ledgerRemove(game.id);
}

/**
 * Off camera: guests with invented names claim squares until the board has `target` taken.
 * Returns the guests' uids (for the report's exclude list).
 */
export async function seedPlayers(browser, base, gameId, target, { log, skipNames = [] }) {
  const uids = [];
  // Guest names are unique per board, so a second top-up (say 50, then 100) uses new names.
  const names = SEED_NAMES.filter((n) => !skipNames.includes(n));
  const used = new Set();
  let state;
  for (const [i, name] of names.entries()) {
    if (used.has(name)) continue;
    const context = await newContext(browser, base, 'desktop');
    const page = await context.newPage();
    try {
      await page.goto(`/game/${gameId}`);
      await waitForBoard(page);
      state = await boardState(page);
      const have = Object.keys(state.taken).length;
      if (have >= target) break;
      for (const n of Object.values(state.taken)) used.add(n);
      if (used.has(name)) continue;
      const left = names.slice(i).filter((n) => !used.has(n)).length;
      const want = Math.min(state.open.length, Math.ceil((target - have) / left));
      const picks = spread(state.open, want, 11 + i);
      if (!picks.length) break;
      await squares(page).nth(picks[0]).click();
      await joinAsGuest(page, name);
      await waitForSquare(page, picks[0], name);
      for (const p of picks.slice(1)) {
        await squares(page).nth(p).click();
        await waitForSquare(page, p, name);
      }
      uids.push((await whoAmI(page))?.uid);
      log(`  seeded ${name}: ${picks.length} squares`);
    } finally {
      await context.close();
    }
  }
  return uids;
}
