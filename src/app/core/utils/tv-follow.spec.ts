import { followedBoards, followedOwner } from './tv-follow';

describe('followedOwner', () => {
  it('reads the owner from a saved board still in the group', () => {
    expect(followedOwner(['GONE01', 'AAAAA1'], { AAAAA1: 'host', ZZZZZ9: 'other' })).toBe('host');
  });

  it('is null when no saved board is in the group or there is no list', () => {
    expect(followedOwner(['AAAAA1'], { BBBBB2: 'host' })).toBeNull();
    expect(followedOwner(['AAAAA1'], null)).toBeNull();
  });
});

describe('followedBoards', () => {
  const saved = ['AAAAA1', 'BBBBB2', 'CCCCC3'];

  it('keeps the saved order and adds boards put in the group later', () => {
    expect(followedBoards(saved, { CCCCC3: 'host', AAAAA1: 'host', BBBBB2: 'host', DDDDD4: 'host' }, 'host')).toEqual(['AAAAA1', 'BBBBB2', 'CCCCC3', 'DDDDD4']);
  });

  it('drops boards taken out of the group', () => {
    expect(followedBoards(saved, { AAAAA1: 'host', CCCCC3: 'host' }, 'host')).toEqual(['AAAAA1', 'CCCCC3']);
  });

  it('ignores boards in the list that the host does not own', () => {
    expect(followedBoards(saved, { AAAAA1: 'host', EEEEE5: 'stranger' }, 'host')).toEqual(['AAAAA1']);
  });

  it('caps the rotation at 20 boards', () => {
    const list = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`B${String(i).padStart(5, '0')}`, 'host']));
    expect(followedBoards([], list, 'host')).toHaveLength(20);
  });

  it('falls back to the saved boards when the owner is unknown, the list is missing, or none of the host boards is in it', () => {
    expect(followedBoards(saved, { AAAAA1: 'host' }, null)).toEqual(saved);
    expect(followedBoards(saved, null, 'host')).toEqual(saved);
    expect(followedBoards(saved, { EEEEE5: 'stranger' }, 'host')).toEqual(saved);
    expect(followedBoards(saved, {}, 'host')).toEqual(saved);
  });
});
