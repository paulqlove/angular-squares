#!/usr/bin/env node
// QuarterScore how-to video recorder. Films the storyboards on the live site with a demo host
// and invented guests, saves named MP4s with caption files, then deletes the demo board.
//
//   npm start                      every storyboard, phone and desktop (signs in first if needed)
//   npm start -- --only 1,2        just Create and Share
//   npm run login                  save the demo host's sign-in (you sign in; the script never types it)
//   npm run cleanup                delete any demo board a stopped run left behind
//
// See README.md for every option.
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { parseArgs } from 'node:util';
import { DEFAULT_BASE_URL, DEMO_GAME_NAME, HOST_STATE, OUT_DIR } from './lib/config.mjs';
import { Take } from './lib/director.mjs';
import {
  boardState, createGame, deleteGame, excludeFromReport, hasHostState, joinAsGuest, launch,
  newBoardButton, newContext, preflight, readLedger, seedPlayers, settle, spread, squares,
  waitForBoard, waitForSquare, whoAmI,
} from './lib/site.mjs';
import { STORYBOARDS } from './flows/storyboards.mjs';

const { values: opt, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    only: { type: 'string' },
    device: { type: 'string' },
    'base-url': { type: 'string', default: process.env.QS_BASE_URL || DEFAULT_BASE_URL },
    out: { type: 'string' },
    pace: { type: 'string', default: '1' },
    name: { type: 'string', default: DEMO_GAME_NAME },
    'phone-player': { type: 'string', default: 'Jess' },
    'desktop-player': { type: 'string', default: 'Taylor' },
    'live-game': { type: 'string' },
    keep: { type: 'boolean', default: false },
    headed: { type: 'boolean', default: false },
    'no-report-exclude': { type: 'boolean', default: false },
    help: { type: 'boolean', short: 'h', default: false },
  },
});

const command = positionals[0] || 'record';
const base = opt['base-url'].replace(/\/$/, '');
const log = (...a) => console.log(...a);

if (opt.help) {
  log('Usage: node record.mjs [record|login|cleanup] [--only 1,2,...] [--device phone|desktop] [--base-url URL]');
  log('       [--pace 1] [--name "Sunday squares"] [--live-game CODE] [--keep] [--headed] [--out DIR]');
  process.exit(0);
}


// ---------- login ----------

/** Opens a window on the site; Paul signs in as the demo host himself. Saves the session. */
async function login() {
  log(`Opening ${base} in a browser window. Sign in there as the DEMO HOST (not your own account).`);
  log('Google may refuse sign-in in a test browser; if it does, use "Sign in with email instead" and paste the emailed link into this window.');
  const browser = await launch({ headed: true });
  const context = await browser.newContext({ baseURL: base, viewport: { width: 1152, height: 760 } });
  const page = await context.newPage();
  await page.goto('/dashboard');
  const until = Date.now() + 15 * 60_000;
  let me = null;
  while (Date.now() < until) {
    me = await whoAmI(page).catch(() => null);
    if (me && !me.isAnonymous) break;
    await page.waitForTimeout(1500);
  }
  if (!me || me.isAnonymous) throw new Error('No sign-in seen within 15 minutes. Nothing was saved.');
  await mkdir(join(HOST_STATE, '..'), { recursive: true });
  await context.storageState({ path: HOST_STATE, indexedDB: true });
  await browser.close();
  if (!opt['no-report-exclude']) await excludeFromReport([me.uid], 'video recorder demo host');
  log(`Saved the sign-in for ${me.email || me.name || me.uid} to .auth/host.json (kept out of git).`);
}

// ---------- cleanup ----------

async function cleanup() {
  const ledger = await readLedger();
  if (!ledger.games.length) return log('No demo boards to clean up.');
  if (!hasHostState()) throw new Error('No saved host sign-in. Run `npm run login` first.');
  const browser = await launch({ headed: opt.headed });
  const context = await newContext(browser, base, 'desktop', { host: true });
  const page = await context.newPage();
  for (const g of ledger.games) {
    await deleteGame(page, g);
    log(`Deleted ${g.name} (${g.id})`);
  }
  await browser.close();
}

// ---------- record ----------

async function record() {
  const only = opt.only ? opt.only.split(',').map((n) => Number(n.trim())) : Object.keys(STORYBOARDS).map(Number);
  for (const n of only) if (!STORYBOARDS[n]) throw new Error(`No storyboard ${n}. Pick from 1 to 7.`);
  // Two takes need no host: the signed-out desktop Create, and a live board filmed read only.
  const signedOut = (n) => (n === 1 && opt.device === 'desktop') || (n === 6 && opt['live-game']);
  const needsHost = only.some((n) => !signedOut(n));
  if (needsHost && !hasHostState()) {
    log('No saved demo host sign-in yet, so signing in first.');
    await login();
  }

  const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-');
  const out = opt.out || join(OUT_DIR, stamp);
  await mkdir(out, { recursive: true });
  const browser = await launch({ headed: opt.headed });
  const s = new Session({ browser, out, only });
  log(`Recording storyboards ${only.join(', ')} against ${base}`);
  log(`Saving to ${out}\n`);

  try {
    if (needsHost) {
      const ctx = await newContext(browser, base, 'desktop', { host: true });
      const me = await preflight(await ctx.newPage(), { log });
      await ctx.close();
      log(`Demo host: ${me.email || me.name || me.uid}`);
    }
    for (const n of only) {
      log(`\nStoryboard ${n}: ${STORYBOARDS[n].name}`);
      // A set-up step that fails (say, making the board) skips this storyboard, not the run.
      await STORYBOARDS[n].run(s).catch((e) => {
        log(`  FAILED storyboard ${n}: ${e.message.split('\n')[0]}`);
        s.failed.push({ name: `storyboard ${n} set-up`, error: e.message });
      });
    }
  } finally {
    if (s.game && !opt.keep) {
      log(`\nDeleting the demo board ${s.game.name} (${s.game.id})`);
      const ctx = await newContext(browser, base, 'desktop', { host: true });
      await deleteGame(await ctx.newPage(), s.game).catch((e) => log(`  Could not delete it: ${e.message}. Run \`npm run cleanup\`.`));
      await ctx.close();
    } else if (s.game) {
      log(`\nKept the demo board ${s.game.id} (--keep). Run \`npm run cleanup\` to delete it.`);
    }
    if (!opt['no-report-exclude']) await excludeFromReport(s.uids, 'video recorder demo guest').catch(() => {});
    await browser.close();
    await s.writeSummary();
  }
  if (s.failed.length) {
    log(`\n${s.failed.length} take(s) failed: ${s.failed.map((f) => f.name).join(', ')}. See summary.md and errors/.`);
    process.exitCode = 1;
  }
}

class Session {
  constructor({ browser, out, only }) {
    this.browser = browser;
    this.out = out;
    this.only = only;
    this.base = base;
    this.pace = Number(opt.pace) || 1;
    this.gameName = opt.name;
    this.phonePlayer = opt['phone-player'];
    this.desktopPlayer = opt['desktop-player'];
    this.liveGame = opt['live-game'];
    this.game = null;
    this.states = {};
    this.uids = [];
    this.files = [];
    this.failed = [];
    this.skips = [];
    this.log = log;
  }

  gamePath() {
    return `/game/${this.game.id}`;
  }

  skipped(where, what) {
    this.skips.push(`Storyboard ${where}: ${what}`);
  }

  /** Opens a recorded page on one device, films `fn`, saves the files. One failed take doesn't stop the run. */
  async film(device, name, o, fn) {
    if (opt.device && opt.device !== device) return;
    await this.filmTogether([{ device, name, ...o }], ([r]) => fn(r));
  }

  /** Several recorded pages at once (the host locks while the player's phone watches). */
  async filmTogether(list, fn) {
    list = list.filter((o) => !opt.device || opt.device === o.device);
    if (!list.length) return;
    const recs = [];
    try {
      for (const o of list) {
        const context = await newContext(this.browser, base, o.device, {
          record: true,
          host: !!o.host,
          storageState: o.state ? this.states[o.state] : undefined,
        });
        const page = await context.newPage();
        page.setDefaultTimeout(20_000);
        await page.goto(o.start);
        if (o.board) await waitForBoard(page);
        await settle(page, 900);
        recs.push({ ...o, context, page, take: new Take({ page, device: o.device, name: o.name, outDir: this.out, pace: this.pace }) });
      }
      for (const r of recs) await r.take.start();
      await new Promise((res) => setTimeout(res, 500));
      await fn(recs);
      await new Promise((res) => setTimeout(res, 700 * this.pace));
      for (const r of recs) {
        const files = await r.take.stop();
        this.files.push(...files);
        log(`  saved ${files.map((f) => f.split('/').pop()).join(', ')}`);
        if (r.keep) {
          this.states[r.keep] = await r.context.storageState({ indexedDB: true });
          this.uids.push((await whoAmI(r.page))?.uid);
        }
      }
    } catch (e) {
      const names = list.map((o) => o.name).join(' + ');
      log(`  FAILED ${names}: ${e.message.split('\n')[0]}`);
      await mkdir(join(this.out, 'errors'), { recursive: true });
      for (const r of recs) {
        await r.page.screenshot({ path: join(this.out, 'errors', `${r.name}.png`) }).catch(() => {});
        await rm(join(this.out, `.frames-${r.name}`), { recursive: true, force: true }).catch(() => {});
      }
      this.failed.push({ name: names, error: e.message });
    } finally {
      for (const r of recs) await r.context.close().catch(() => {});
    }
  }

  /** Makes the demo board off camera when a run starts after storyboard 1. */
  async ensureGame() {
    if (this.game) return;
    const context = await newContext(this.browser, base, 'desktop', { host: true });
    const page = await context.newPage();
    await page.goto('/dashboard');
    await newBoardButton(page).waitFor({ timeout: 20_000 });
    this.game = await createGame(page, { name: this.gameName, note: null });
    await context.close();
    log(`  made the demo board off camera: ${this.game.id}`);
  }

  /** Off camera: the two filmed players join with one square each, if storyboard 3 didn't run. */
  async ensurePlayers() {
    for (const [key, device, name] of [['phoneGuest', 'phone', this.phonePlayer], ['desktopGuest', 'desktop', this.desktopPlayer]]) {
      if (this.states[key]) continue;
      const context = await newContext(this.browser, base, device);
      const page = await context.newPage();
      await page.goto(this.gamePath());
      await waitForBoard(page);
      const pick = spread((await boardState(page)).open, 1, key.length)[0];
      await squares(page).nth(pick).click();
      await joinAsGuest(page, name);
      await waitForSquare(page, pick, name);
      this.states[key] = await context.storageState({ indexedDB: true });
      this.uids.push((await whoAmI(page))?.uid);
      await context.close();
    }
  }

  /** Off camera: invented guests fill the board to `target` squares. */
  async seed(target) {
    const uids = await seedPlayers(this.browser, base, this.game.id, target, { log, skipNames: [this.phonePlayer, this.desktopPlayer] });
    this.uids.push(...uids);
  }

  /** Off camera: unlocks and clears the numbers so the next take can lock again. */
  async unlockAndClear() {
    const context = await newContext(this.browser, base, 'desktop', { host: true });
    const page = await context.newPage();
    try {
      await page.goto(this.gamePath());
      await waitForBoard(page);
      const tools = page.getByRole('toolbar', { name: 'Host tools' });
      const unlock = tools.getByRole('button', { name: 'Unlock' });
      if (await unlock.count()) await unlock.click();
      const clear = tools.getByRole('button', { name: 'Clear numbers' });
      await clear.waitFor({ timeout: 10_000 });
      await clear.click();
      const confirm = page.getByRole('dialog').getByRole('button', { name: /Clear/ });
      if (await confirm.count()) await confirm.click();
      await tools.getByRole('button', { name: 'Lock and draw' }).waitFor({ timeout: 10_000 });
    } finally {
      await context.close();
    }
  }

  async writeSummary() {
    const rel = (f) => f.slice(this.out.length + 1);
    const lines = [
      `# QuarterScore recordings, ${new Date().toLocaleString('en-US', { timeZone: 'America/Chicago' })} Central`,
      '',
      `Site: ${base}. Storyboards: ${this.only.join(', ')}. Pace: ${this.pace}.`,
      '',
      '## Files',
      ...(this.files.length ? this.files.map((f) => `- ${rel(f)}`) : ['- none']),
      '',
      'Each video has a `.srt` (captions with the storyboard\'s timing) and a `.shots.json` (shot numbers and times). Phone takes also have a `-social-9x16.mp4`: the phone at about 80% in the top of a paper frame, clear of TikTok and Reels buttons.',
      '',
      '## Not filmed by the script',
      ...(this.skips.length ? this.skips.map((s) => `- ${s}`) : ['- nothing']),
    ];
    if (this.failed.length) lines.push('', '## Failed takes', ...this.failed.map((f) => `- ${f.name}: ${f.error.split('\n')[0]}`));
    await writeFile(join(this.out, 'summary.md'), lines.join('\n') + '\n');
  }
}

// Runs last: the class above must exist before the first await.
try {
  if (command === 'login') await login();
  else if (command === 'cleanup') await cleanup();
  else if (command === 'record') await record();
  else throw new Error(`Unknown command "${command}". Use record, login or cleanup.`);
} catch (e) {
  console.error(`\n${e.message}`);
  process.exit(1);
}
