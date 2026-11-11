import type { GameListItem } from '../services/game.service';
import { groupBoards, isBoardFilling, isBoardFull } from './board-groups';

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
