import { MAX_OPEN_BOARDS, fileBoardUpdates, isListKey, listedBoardIds, newListKey } from './open-lists';

describe('open-lists', () => {
  it('makes 20-character keys the rules accept', () => {
    let n = 0;
    const key = newListKey(() => n++);
    expect(key.length).toBe(20);
    expect(isListKey(key)).toBe(true);
    expect(key.startsWith('ABC')).toBe(true);
    expect(isListKey(newListKey())).toBe(true);
  });

  it('rejects keys the rules would refuse', () => {
    expect(isListKey('short')).toBe(false);
    expect(isListKey('has a space in it here')).toBe(false);
    expect(isListKey(42)).toBe(false);
    expect(isListKey(undefined)).toBe(false);
  });

  it('keeps only the owner\'s boards, never the one on screen, at most thirty', () => {
    const list: Record<string, unknown> = { here: 'owner', a: 'owner', legacy: true, intruder: 'someone-else' };
    expect(listedBoardIds(list, 'owner', 'here')).toEqual(['a']);
    expect(listedBoardIds(null, 'owner', 'here')).toEqual([]);
    const many = Object.fromEntries(Array.from({ length: 35 }, (_, i) => [`b${i}`, 'owner']));
    expect(listedBoardIds(many, 'owner', 'x').length).toBe(MAX_OPEN_BOARDS);
  });

  it('files a shown board into a new list and takes it out of the old one', () => {
    expect(fileBoardUpdates({ id: 'g1', ownerId: 'o', openListId: 'old' }, 'new', true)).toEqual({
      'games/g1/openListId': 'new',
      'games/g1/showInOpenBoards': true,
      'openLists/new/g1': 'o',
      'openLists/old/g1': null
    });
  });

  it('hides a board without moving it', () => {
    expect(fileBoardUpdates({ id: 'g1', ownerId: 'o', openListId: 'same' }, 'same', false)).toEqual({
      'games/g1/openListId': 'same',
      'games/g1/showInOpenBoards': null,
      'openLists/same/g1': null
    });
  });
});
