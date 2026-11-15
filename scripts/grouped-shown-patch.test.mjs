// Run: npm run test:scripts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildGroupedShownPatch, countShown } from './grouped-shown-patch.mjs';

const CHURCH = 'ChurchGroupKey000001';
const NONE = 'NoGroupKey0000000001';

test('shows hidden games that sit in a group, and nothing else', () => {
  const patch = buildGroupedShownPatch({
    games: {
      hidden: { ownerId: 'paul', openListId: CHURCH },
      shown: { ownerId: 'paul', openListId: CHURCH, showInOpenBoards: true },
      ungrouped: { ownerId: 'paul', openListId: NONE },
      deletedGroup: { ownerId: 'paul', openListId: 'GoneGroupKey00000001' },
      otherHost: { ownerId: 'sam', openListId: CHURCH },
      orphan: { openListId: CHURCH }
    },
    groupLists: { paul: { ungrouped: NONE, groups: { [CHURCH]: { name: 'Church', createdAt: 1 } } } }
  });
  assert.deepEqual(patch, {
    'games/hidden/showInOpenBoards': true,
    [`openLists/${CHURCH}/hidden`]: 'paul'
  });
  assert.equal(countShown(patch), 1);
});

test('changes nothing once every grouped game is shown', () => {
  const patch = buildGroupedShownPatch({ games: { a: { ownerId: 'paul', openListId: CHURCH, showInOpenBoards: true } }, groupLists: { paul: { groups: { [CHURCH]: {} } } } });
  assert.deepEqual(patch, {});
});
