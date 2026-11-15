// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildCoHostEmailsPatch, countMoved } from './cohost-emails-patch.mjs';

test('moves each game\'s co-host email to its owner\'s hidden spot and clears it from the game', () => {
  const patch = buildCoHostEmailsPatch({
    games: {
      typed: { ownerId: 'paul', managerEmail: ' Dana@Email.com ' },
      claimed: { ownerId: 'paul', managerId: 'dana', managerEmail: 'dana@email.com' },
      picked: { ownerId: 'paul', managerId: 'kim', managerName: 'Kim', managerEmail: '' },
      none: { ownerId: 'sam' },
      orphan: { managerEmail: 'lee@email.com' }
    },
    gameCoHosts: {}
  });
  assert.deepEqual(patch, {
    'games/typed/managerEmail': null,
    'gameCoHosts/paul/typed': 'Dana@Email.com',
    'games/claimed/managerEmail': null,
    'gameCoHosts/paul/claimed': 'dana@email.com',
    'games/orphan/managerEmail': null
  });
  assert.deepEqual(countMoved(patch), { cleared: 3, moved: 2 });
});

test('keeps an email the owner already saved in the new spot, and changes nothing on a second run', () => {
  const patch = buildCoHostEmailsPatch({
    games: { a: { ownerId: 'paul', managerEmail: 'old@email.com' } },
    gameCoHosts: { paul: { a: 'new@email.com' } }
  });
  assert.deepEqual(patch, { 'games/a/managerEmail': null });
  assert.deepEqual(buildCoHostEmailsPatch({ games: { a: { ownerId: 'paul' } }, gameCoHosts: { paul: { a: 'new@email.com' } } }), {});
});

test('handles an empty database', () => {
  assert.deepEqual(buildCoHostEmailsPatch({}), {});
});
