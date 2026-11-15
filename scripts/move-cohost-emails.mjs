// One-time move ("Hide them", Paul, Nov 15): co-host emails typed in Create game, Edit game or a group's co-host
// were saved on the game, where everyone who opens it can read them. This moves each one to
// gameCoHosts/{ownerId}/{gameId}, which only the owner and that email's own account can read, and clears it
// from the game. Paul runs it from his Mac, after deploying the rules that add gameCoHosts.
//   node scripts/move-cohost-emails.mjs           dry run: prints the counts, saves the patch, writes nothing
//   node scripts/move-cohost-emails.mjs --apply   writes the saved patch with the Firebase CLI
// Needs the Firebase CLI signed in (same as scripts/show-grouped-games.mjs). Safe to run again.
import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildCoHostEmailsPatch, countMoved } from './cohost-emails-patch.mjs';

const PROJECT = 'squares-4e4f7';
const firebase = (args) => execFileSync('npx', ['-y', 'firebase-tools@latest', ...args, '--project', PROJECT],
  { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'], maxBuffer: 1 << 28 });
const read = (path) => JSON.parse(firebase(['database:get', path]) || 'null') || {};

const [games, gameCoHosts] = ['/games', '/gameCoHosts'].map(read);
const patch = buildCoHostEmailsPatch({ games, gameCoHosts });
const file = join(tmpdir(), `cohost-emails-patch-${Date.now()}.json`);
writeFileSync(file, JSON.stringify(patch, null, 2));

const { cleared, moved } = countMoved(patch);
console.log(`Games with a co-host email on them: ${cleared}`);
console.log(`Emails to save in the hidden spot: ${moved} (the rest are already there)`);
console.log(`Patch saved to ${file}`);

if (!Object.keys(patch).length) {
  console.log('Nothing to change.');
} else if (process.argv.includes('--apply')) {
  firebase(['database:update', '/', file, '--force']);
  console.log('Applied.');
} else {
  console.log('Dry run only. Run again with --apply to write it.');
}
