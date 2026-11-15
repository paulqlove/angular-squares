import { cleanGroupName, deleteGroupMessage, deleteGroupUpdates, gameCountLabel, gamesInGroup, groupChanged, groupCounts, groupOf, inGroup, parseGroups, pickerValue } from './game-groups';

const CHURCH = 'ChurchGroupKey000001';
const WORK = 'WorkGroupKey00000001';
const NONE = 'NoGroupKey0000000001';

describe('game groups', () => {
  it('parses groups oldest first and skips bad entries', () => {
    const groups = parseGroups({
      [WORK]: { name: 'Work', createdAt: 2 },
      [CHURCH]: { name: 'Church', createdAt: 1 },
      bad: { name: 'Short key', createdAt: 3 },
      [`${NONE}x`]: { name: 42, createdAt: 4 }
    });
    expect(groups.map(g => g.name)).toEqual(['Church', 'Work']);
    expect(parseGroups(null)).toEqual([]);
  });

  it('cleans names: trims and caps at 30 characters', () => {
    expect(cleanGroupName('  Church  ')).toBe('Church');
    expect(cleanGroupName('   ')).toBe('');
    expect(cleanGroupName('x'.repeat(40)).length).toBe(30);
  });

  it('narrows boards to the picked group, or keeps them all with no group picked', () => {
    const boards = [{ id: 'a', ownerId: 'o', openListId: CHURCH }, { id: 'b', ownerId: 'o', openListId: WORK }, { id: 'c', ownerId: 'o' }];
    expect(gamesInGroup(boards, CHURCH).map(b => b.id)).toEqual(['a']);
    expect(gamesInGroup(boards, 'GoneGroupKey00000001')).toEqual([]);
    expect(gamesInGroup(boards, null)).toBe(boards);
    expect(gamesInGroup(boards, undefined)).toBe(boards);
  });

  it('labels a group\'s size', () => {
    expect(gameCountLabel(1)).toBe('1 game');
    expect(gameCountLabel(0)).toBe('0 games');
    expect(gameCountLabel(2)).toBe('2 games');
  });

  it('counts boards per group and finds a board\'s group', () => {
    const boards = [{ id: 'a', ownerId: 'o', openListId: CHURCH }, { id: 'b', ownerId: 'o', openListId: CHURCH }, { id: 'c', ownerId: 'o', openListId: NONE }, { id: 'd', ownerId: 'o' }];
    const counts = groupCounts(boards);
    expect(counts.get(CHURCH)).toBe(2);
    expect(counts.get(WORK)).toBeUndefined();
    const groups = [{ id: CHURCH, name: 'Church', createdAt: 1 }];
    expect(groupOf(groups, boards[0])?.name).toBe('Church');
    expect(groupOf(groups, boards[2])).toBeUndefined();
    expect(groupOf(groups, boards[3])).toBeUndefined();
  });

  it('deletes a group and moves only its boards to No group, keeping each More switch', () => {
    const updates = deleteGroupUpdates('o', CHURCH, NONE, [
      { id: 'a', ownerId: 'o', openListId: CHURCH, showInOpenBoards: true },
      { id: 'b', ownerId: 'o', openListId: CHURCH },
      { id: 'c', ownerId: 'o', openListId: WORK, showInOpenBoards: true }
    ]);
    expect(updates).toEqual({
      [`groupLists/o/groups/${CHURCH}`]: null,
      [`groupCoHosts/o/${CHURCH}`]: null,
      'games/a/openListId': NONE,
      'games/a/showInOpenBoards': true,
      [`openLists/${NONE}/a`]: 'o',
      [`openLists/${CHURCH}/a`]: null,
      'games/b/openListId': NONE,
      'games/b/showInOpenBoards': null,
      [`openLists/${NONE}/b`]: null,
      [`openLists/${CHURCH}/b`]: null
    });
  });

  it('words the delete confirm by count', () => {
    expect(deleteGroupMessage(3)).toBe('3 games will show alongside your other ungrouped games.');
    expect(deleteGroupMessage(1)).toBe('1 game will show alongside your other ungrouped games.');
    expect(deleteGroupMessage(0)).toBe('No games are in this group.');
  });
});

describe('group picker', () => {
  const groups = [{ id: CHURCH, name: 'Church', createdAt: 1 }];

  it('starts on the board\'s group, or No group for a board in no group or a deleted one', () => {
    expect(pickerValue(groups, CHURCH)).toBe(CHURCH);
    expect(pickerValue(groups, NONE)).toBeNull();
    expect(pickerValue(groups, WORK)).toBeNull();
    expect(pickerValue(groups, undefined)).toBeNull();
  });

  it('saves only when the choice moves the board', () => {
    expect(groupChanged(groups, CHURCH, { groupId: CHURCH })).toBe(false);
    expect(groupChanged(groups, NONE, { groupId: null })).toBe(false);
    expect(groupChanged(groups, NONE, { groupId: CHURCH })).toBe(true);
    expect(groupChanged(groups, CHURCH, { groupId: null })).toBe(true);
    expect(groupChanged(groups, NONE, { groupId: null, newName: 'Gym' })).toBe(true);
  });
});

describe('inGroup', () => {
  it('is true on a group, or on a new group once it has a name', () => {
    expect(inGroup({ groupId: CHURCH })).toBe(true);
    expect(inGroup({ groupId: null, newName: 'Gym' })).toBe(true);
  });

  it('is false on No group, a new group with no name yet, or no picker', () => {
    expect(inGroup({ groupId: null })).toBe(false);
    expect(inGroup({ groupId: null, newName: '  ' })).toBe(false);
    expect(inGroup(undefined)).toBe(false);
  });
});
