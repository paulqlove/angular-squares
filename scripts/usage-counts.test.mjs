// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { DAY_MS, countAccounts, countBoards, isEspnStatusFinal, linkedGameKey } from './usage-counts.mjs';

const NOW = 100 * DAY_MS;

test('counts sign-ups apart from anonymous guests', () => {
  const users = [
    { email: 'a@x.com', createdAt: String(NOW - DAY_MS), lastSignedInAt: String(NOW - DAY_MS) },
    { providerUserInfo: [{ providerId: 'google.com' }], createdAt: String(NOW - 20 * DAY_MS), lastSignedInAt: String(NOW - 20 * DAY_MS) },
    { createdAt: String(NOW - DAY_MS), lastSignedInAt: String(NOW), providerUserInfo: [] }
  ];
  assert.deepEqual(countAccounts(users, NOW), { signedUp: 2, guests: 1, new7: 1, new30: 2, seen7: 1, seen30: 2 });
});

test('a linked board stays active until its game is final, unknown counts as active', () => {
  const games = {
    live: { ownerId: 'paul', espnEventId: '1', createdAt: NOW - 50 * DAY_MS },
    done: { ownerId: 'paul', espnEventId: '2', espnSport: 'nba', createdAt: NOW - 50 * DAY_MS },
    lost: { ownerId: 'sam', espnEventId: '3', createdAt: NOW - 50 * DAY_MS }
  };
  const finals = new Map([[linkedGameKey(games.live), false], [linkedGameKey(games.done), true], [linkedGameKey(games.lost), null]]);
  const t = countBoards(games, finals, NOW);
  assert.equal(t.active, 2);
  assert.equal(t.activeLinked, 2);
  assert.equal(t.unknown, 1);
  assert.equal(t.hosts, 2);
});

test('an unlinked board is active for 48 hours, or always when createdAt is missing', () => {
  const games = {
    fresh: { ownerId: 'paul', createdAt: NOW - DAY_MS },
    old: { ownerId: 'paul', createdAt: NOW - 3 * DAY_MS },
    noDate: { ownerId: 'paul' },
    blankLink: { ownerId: 'paul', espnEventId: '  ', createdAt: NOW - 10 * DAY_MS },
    junk: 'not a board'
  };
  const t = countBoards(games, new Map(), NOW);
  assert.deepEqual(t, { total: 4, hosts: 1, new7: 2, new30: 3, active: 2, activeLinked: 0, activeUnlinked: 2, unknown: 0 });
});

test('maps ESPN status the same way as the app', () => {
  assert.equal(isEspnStatusFinal({ name: 'STATUS_FINAL_OT' }), true);
  assert.equal(isEspnStatusFinal({ name: 'STATUS_POSTPONED', state: 'post', completed: true }), false);
  assert.equal(isEspnStatusFinal({ state: 'in' }), false);
  assert.equal(isEspnStatusFinal({ state: 'post', completed: true }), true);
  assert.equal(isEspnStatusFinal(null), null);
});

test('leaves out excluded accounts and their boards', () => {
  const excluded = new Set(['admin']);
  const accounts = countAccounts([{ localId: 'admin', email: 'a@x.com' }, { localId: 'sam', email: 's@x.com' }], NOW, excluded);
  assert.equal(accounts.signedUp, 1);
  const boards = countBoards({ a: { ownerId: 'admin', createdAt: NOW }, b: { ownerId: 'sam', createdAt: NOW } }, new Map(), NOW, excluded);
  assert.equal(boards.total, 1);
  assert.equal(boards.active, 1);
});
