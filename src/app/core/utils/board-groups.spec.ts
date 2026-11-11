import type { GameListItem } from '../services/game.service';
import { autoLockAt, groupBoards, isBoardFilling, isBoardFull, isReadyToLock } from './board-groups';

const board = (id: string, squaresFilled: number, isLocked = false, boardSize: 25 | 50 | 100 = 100) =>
  ({ id, squaresFilled, isLocked, boardSize }) as GameListItem;

describe('groupBoards', () => {
  it('puts full unlocked boards first, then filling, then locked', () => {
    const groups = groupBoards([board('a', 64), board('b', 100, true), board('c', 100), board('d', 25, false, 25)]);
    expect(groups.map(g => g.key)).toEqual(['ready', 'filling', 'locked']);
    expect(groups[0].games.map(g => g.id)).toEqual(['c', 'd']);
    expect(groups[1].games.map(g => g.id)).toEqual(['a']);
    expect(groups[2].games.map(g => g.id)).toEqual(['b']);
  });

  it('counts a locked board with open squares as locked', () => {
    expect(groupBoards([board('a', 40, true)]).map(g => g.key)).toEqual(['locked']);
  });

  it('leaves out empty groups', () => {
    expect(groupBoards([board('a', 3)]).map(g => g.label)).toEqual(['Filling']);
    expect(groupBoards([])).toEqual([]);
  });
});

describe('board state helpers', () => {
  it('treats a missing board size as 100', () => {
    expect(isBoardFull({ squaresFilled: 100, isLocked: false, boardSize: undefined as unknown as 100 })).toBe(true);
  });

  it('offers sharing only while open squares remain on an unlocked board', () => {
    expect(isBoardFilling(board('a', 10))).toBe(true);
    expect(isBoardFilling(board('a', 100))).toBe(false);
    expect(isBoardFilling(board('a', 10, true))).toBe(false);
  });
});

describe('isReadyToLock', () => {
  it('is true only for a full board that is still open', () => {
    expect(isReadyToLock(board('a', 100))).toBe(true);
    expect(isReadyToLock(board('b', 100, true))).toBe(false);
    expect(isReadyToLock(board('c', 99))).toBe(false);
  });
});

describe('autoLockAt', () => {
  const now = 1_000_000;
  it('returns the run time while Auto-lock and draw is on and still ahead', () => {
    expect(autoLockAt({ isLocked: false, autoManage: { enabled: true, resize: true, runAt: now + 60_000 } }, now)).toBe(now + 60_000);
  });
  it('returns null when it is off, already locked, or its time has passed', () => {
    expect(autoLockAt({ isLocked: false }, now)).toBeNull();
    expect(autoLockAt({ isLocked: true, autoManage: { enabled: true, resize: true, runAt: now + 60_000 } }, now)).toBeNull();
    expect(autoLockAt({ isLocked: false, autoManage: { enabled: true, resize: true, runAt: now - 1 } }, now)).toBeNull();
    expect(autoLockAt({ isLocked: false, autoManage: { enabled: true, resize: true } }, now)).toBeNull();
  });
});
