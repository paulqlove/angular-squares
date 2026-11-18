import { followedBoards } from './tv-follow';

describe('followedBoards', () => {
  const saved = ['AAAAA1', 'BBBBB2', 'CCCCC3'];

  it('keeps the saved order and adds boards put in the group later', () => {
    expect(followedBoards(saved, { CCCCC3: 'host', AAAAA1: 'host', BBBBB2: 'host', DDDDD4: 'host' }, 'host')).toEqual(['AAAAA1', 'BBBBB2', 'CCCCC3', 'DDDDD4']);
  });

  it('drops boards taken out of the group or deleted, and shows the new ones', () => {
    expect(followedBoards(saved, { AAAAA1: 'host', CCCCC3: 'host' }, 'host')).toEqual(['AAAAA1', 'CCCCC3']);
    expect(followedBoards(saved, { NEWNE1: 'host', NEWNE2: 'host' }, 'host')).toEqual(['NEWNE1', 'NEWNE2']);
  });

  it('ignores boards in the list that the host does not own', () => {
    expect(followedBoards(saved, { AAAAA1: 'host', EEEEE5: 'stranger' }, 'host')).toEqual(['AAAAA1']);
  });

  it('caps the rotation at 20 boards', () => {
    const list = Object.fromEntries(Array.from({ length: 25 }, (_, i) => [`B${String(i).padStart(5, '0')}`, 'host']));
    expect(followedBoards([], list, 'host')).toHaveLength(20);
  });

  it('keeps the saved boards while the list is missing or has none of the host boards', () => {
    expect(followedBoards(saved, null, 'host')).toEqual(saved);
    expect(followedBoards(saved, { EEEEE5: 'stranger' }, 'host')).toEqual(saved);
    expect(followedBoards(saved, {}, 'host')).toEqual(saved);
  });
});
