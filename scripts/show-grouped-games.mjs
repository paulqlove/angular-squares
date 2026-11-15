// One-time fix: games filed in a group before "Lock it on" (Nov 15) may have Show in my open boards off.
// This turns it on for them, so they show in their group's More tab. Paul runs it from his Mac.
//   node scripts/show-grouped-games.mjs           dry run: prints the count, saves the patch, writes nothing
//   node scripts/show-grouped-games.mjs --apply   writes the saved patch with the Firebase CLI
// Needs the Firebase CLI signed in (same as scripts/migrate-open-lists.mjs). Safe to run again.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildGroupedShownPatch, countShown } from './grouped-shown-patch.mjs';

const PROJECT = 'squares-4e4f7';
const firebase = (args) => execFileSync('npx', ['-y', 'firebase-tools@latest', ...args, '--project', PROJECT],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 28 });
const read = (path) => JSON.parse(firebase(['database:get', path]) || 'null') || {};

const [games, groupLists] = ['/games', '/groupLists'].map(read);
const patch = buildGroupedShownPatch({ games, groupLists });
const file = join(tmpdir(), `grouped-shown-patch-${Date.now()}.json`);
writeFileSync(file, JSON.stringify(patch, null, 2));

console.log(`Grouped games to show: ${countShown(patch)}`);
console.log(`Patch saved to ${file}`);

if (!Object.keys(patch).length) {
  console.log('Nothing to change.');
} else if (process.argv.includes('--apply')) {
  firebase(['database:update', '/', file, '--force']);
  console.log('Applied.');
} else {
  console.log('Dry run only. Run again with --apply to write it.');
}
