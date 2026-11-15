// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildOpenListsPatch, newListKey, summarize } from './open-lists-patch.mjs';

let n = 0;
const fakeKey = () => `generatedKey${String(++n).padStart(8, '0')}`;

test('files every board into its host\'s No group and lists the shown ones', () => {
  n = 0;
  const patch = buildOpenListsPatch({
    games: {
      a: { ownerId: 'paul', showInOpenBoards: true },
      b: { ownerId: 'paul' },
      c: { ownerId: 'sam', managerId: 'paul' },
      orphan: { name: 'no owner' }
    },
    openBoards: { paul: { a: true } }
  }, fakeKey);
  assert.deepEqual(patch, {
    'groupLists/paul/ungrouped': 'generatedKey00000001',
    'games/a/openListId': 'generatedKey00000001',
    'openLists/generatedKey00000001/a': 'paul',
    'games/b/openListId': 'generatedKey00000001',
    'groupLists/sam/ungrouped': 'generatedKey00000002',
    'games/c/openListId': 'generatedKey00000002',
    'coHosts/sam/paul': true
  });
  assert.deepEqual(summarize(patch), { hostKeys: 2, boardsFiled: 3, boardsListed: 1, coHosts: 1 });
});

test('a board only in the older list is still listed and marked shown', () => {
  const patch = buildOpenListsPatch({
    games: { a: { ownerId: 'paul' } },
    openBoards: { paul: { a: true, deleted: true } },
    groupLists: { paul: { ungrouped: 'existingKey000000001' } }
  }, fakeKey);
  assert.deepEqual(patch, {
    'games/a/openListId': 'existingKey000000001',
    'games/a/showInOpenBoards': true,
    'openLists/existingKey000000001/a': 'paul'
  });
});

test('keeps keys, lists and co-hosts the app already wrote, so a second run changes nothing', () => {
  const data = {
    games: { a: { ownerId: 'paul', openListId: 'churchGroupKey000001', showInOpenBoards: true, managerId: 'kim' } },
    groupLists: { paul: { ungrouped: 'existingKey000000001' } },
    coHosts: { paul: { kim: true } }
  };
  assert.deepEqual(buildOpenListsPatch(data, fakeKey), { 'openLists/churchGroupKey000001/a': 'paul' });
});

test('makes keys the database rules accept', () => {
  assert.match(newListKey(), /^[A-Za-z0-9]{20}$/);
});
