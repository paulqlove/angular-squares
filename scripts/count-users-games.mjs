// Read-only: counts QuarterScore accounts and boards. Writes nothing to the database. Paul runs it from his Mac:
//   node scripts/count-users-games.mjs
// Needs the Firebase CLI signed in (same as scripts/migrate-open-lists.mjs). Prints totals only, never emails.
// Leaves out the same accounts as scripts/report/report.mjs: admins plus ~/.config/quarterscore/exclude-uids.txt.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { homedir, tmpdir } from 'node:os';
import { join } from 'node:path';
import { countAccounts, countBoards, hasLinkedGame, isEspnStatusFinal, linkedGameKey } from './usage-counts.mjs';

const PROJECT = 'squares-4e4f7';
const SPORT_PATHS = {
  nfl: 'football/nfl', nba: 'basketball/nba', ncaaf: 'football/college-football',
  ufl: 'football/ufl', wnba: 'basketball/wnba', afl: 'australian-football/afl'
};

const firebase = (args) => execFileSync('npx', ['-y', 'firebase-tools@latest', ...args, '--project', PROJECT],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 28 });
const read = (path) => JSON.parse(firebase(['database:get', path]) || 'null') || {};

// The Auth export holds account details, so it goes to a temp file that is deleted right after counting.
function readAuthUsers() {
  const file = join(tmpdir(), `qs-auth-${Date.now()}.json`);
  try {
    firebase(['auth:export', file, '--format=json']);
    return JSON.parse(readFileSync(file, 'utf8')).users || [];
  } catch (error) {
    console.error(`Could not read Firebase Auth: ${error.message.split('\n')[0]}`);
    return null;
  } finally {
    rmSync(file, { force: true });
  }
}

// Same lookup as EspnService.isEventFinal: the game's own summary, null when it can't be read.
async function linkedGameFinal(key) {
  const [sport, eventId] = key.split('|');
  const url = `https://site.api.espn.com/apis/site/v2/sports/${SPORT_PATHS[sport] || SPORT_PATHS.nfl}/summary?event=${encodeURIComponent(eventId)}`;
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    return isEspnStatusFinal(data?.header?.competitions?.[0]?.status?.type);
  } catch {
    return null;
  }
}

const now = Date.now();
const [games, users, admins] = ['/games', '/users', '/admins'].map(read);
const exFile = join(homedir(), '.config', 'quarterscore', 'exclude-uids.txt');
const listed = existsSync(exFile) ? readFileSync(exFile, 'utf8').split('\n').map((s) => s.split('#')[0].trim()).filter(Boolean) : [];
const excluded = new Set([...Object.keys(admins), ...listed]);
const keys = new Set(Object.values(games).filter((g) => hasLinkedGame(g) && !excluded.has(g.ownerId)).map(linkedGameKey));
const finals = new Map();
for (const key of keys) finals.set(key, await linkedGameFinal(key));

const boards = countBoards(games, finals, now, excluded);
const authUsers = readAuthUsers();

console.log('QuarterScore counts (read-only)');
console.log(`Leaves out ${excluded.size} account(s): ${Object.keys(admins).length} admin, ${listed.length} listed.`);
if (authUsers) {
  const a = countAccounts(authUsers, now, excluded);
  console.log(`Signed-up accounts: ${a.signedUp} (new in 7 days: ${a.new7}, 30 days: ${a.new30})`);
  console.log(`Signed in within 7 days: ${a.seen7}, 30 days: ${a.seen30}`);
  console.log(`Guest accounts: ${a.guests}`);
} else {
  console.log('Accounts: could not read Firebase Auth (needs auth:export permission)');
}
console.log(`User records in the database: ${Object.keys(users).filter((uid) => !excluded.has(uid)).length}`);
console.log(`Boards: ${boards.total} total, made by ${boards.hosts} hosts (new in 7 days: ${boards.new7}, 30 days: ${boards.new30})`);
console.log(`Active boards: ${boards.active} (linked to a game: ${boards.activeLinked}, no linked game: ${boards.activeUnlinked})`);
if (boards.unknown) console.log(`  ${boards.unknown} linked boards counted active because ESPN gave no answer`);
