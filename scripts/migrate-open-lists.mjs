// One-time move of the More tab to per-group lists. Paul runs it from his Mac, after the
// groups rules are deployed and the app that writes openLists is live.
//   node scripts/migrate-open-lists.mjs           dry run: prints counts, saves the patch, writes nothing
//   node scripts/migrate-open-lists.mjs --apply   writes the saved patch with the Firebase CLI
// Needs the Firebase CLI signed in (same as scripts/report). Safe to run again: it keeps what exists.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildOpenListsPatch, summarize } from './open-lists-patch.mjs';

const PROJECT = 'squares-4e4f7';
const firebase = (args) => execFileSync('npx', ['-y', 'firebase-tools@latest', ...args, '--project', PROJECT],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 28 });
const read = (path) => JSON.parse(firebase(['database:get', path]) || 'null') || {};

const [games, openBoards, groupLists, coHosts] = ['/games', '/openBoards', '/groupLists', '/coHosts'].map(read);
const patch = buildOpenListsPatch({ games, openBoards, groupLists, coHosts });
const counts = summarize(patch);
const file = join(tmpdir(), `open-lists-patch-${Date.now()}.json`);
writeFileSync(file, JSON.stringify(patch, null, 2));

console.log(`Hosts given a No group key: ${counts.hostKeys}`);
console.log(`Boards filed into a list:   ${counts.boardsFiled}`);
console.log(`Shown boards listed:        ${counts.boardsListed}`);
console.log(`Co-hosts recorded:          ${counts.coHosts}`);
console.log(`Patch saved to ${file}`);

if (!Object.keys(patch).length) {
  console.log('Nothing to change.');
} else if (process.argv.includes('--apply')) {
  firebase(['database:update', '/', file, '--force']);
  console.log('Applied.');
} else {
  console.log('Dry run only. Run again with --apply to write it.');
}
