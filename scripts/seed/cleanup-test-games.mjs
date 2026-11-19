#!/usr/bin/env node
// Removes every board seed-test-games.mjs made (games tagged seed: true), with their entries in each owner's games list,
// Open boards and the ESPN live-game index. Boards without the tag are never touched.
//
//   node cleanup-test-games.mjs            dry run: lists what it would remove
//   node cleanup-test-games.mjs --write    removes it
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getDatabase } from 'firebase-admin/database';

const WRITE = process.argv.includes('--write');

initializeApp({ credential: applicationDefault(), projectId: 'squares-4e4f7', databaseURL: 'https://squares-4e4f7-default-rtdb.firebaseio.com' });
const db = getDatabase();

const games = (await db.ref('games').once('value')).val() || {};
const updates = {};
let count = 0;
for (const [id, game] of Object.entries(games)) {
  if (!game || game.seed !== true) continue;
  count++;
  updates[`games/${id}`] = null;
  updates[`boardStats/${id}`] = null;
  if (game.ownerId) {
    updates[`users/${game.ownerId}/games/${id}`] = null;
    updates[`openBoards/${game.ownerId}/${id}`] = null;
  }
  if (game.espnEventId) updates[`liveGames/${game.espnEventId}/${id}`] = null;
  console.log(`  ${id}  ${game.seedTag || ''}  ${game.name}`);
}

console.log(`\n${count} seeded boards found.`);
if (!count) process.exit(0);
if (!WRITE) {
  console.log('Dry run: nothing was removed. Add --write to remove them.');
  process.exit(0);
}
await db.ref().update(updates);
console.log('Removed.');
process.exit(0);
