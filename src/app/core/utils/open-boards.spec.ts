import type { GameData } from '../services/game.service';
import { openBoardRows } from './open-boards';

const game = (id: string, over: Partial<GameData> = {}, picks = 10): GameData => ({
  id, name: id, ownerId: 'o', ownerName: 'O', createdAt: 0, boardSize: 100,
  selectedSquares: Object.fromEntries(Array.from({ length: picks }, (_, i) => [`${Math.floor(i / 10)}-${i % 10}`, 'A'])),
  homeNumbers: [], awayNumbers: [], scores: {} as GameData['scores'], playerColors: {}, winners: {},
  pricePerSquare: 100, isRandomized: false, isLocked: false, homeTeam: 'H', awayTeam: 'A', showInOpenBoards: true,
  ...over
} as GameData);

describe('openBoardRows', () => {
  it('lists opted-in boards with open squares, most open first, with totals', () => {
    const rows = openBoardRows([game('a', {}, 40), game('b', {}, 10)], 'x');
    expect(rows.map(r => r.id)).toEqual(['b', 'a']);
    expect(rows[0]).toMatchObject({ taken: 10, size: 100, open: 90, pricePerSquare: 100, totalPoints: 10000 });
  });

  it('skips the current board, boards not opted in, locked, full or missing', () => {
    const rows = openBoardRows([
      game('here'), game('off', { showInOpenBoards: false }), game('locked', { isLocked: true }),
      game('full', {}, 100), null, game('ok')
    ], 'here');
    expect(rows.map(r => r.id)).toEqual(['ok']);
  });

  it('keeps an unlocked board with open squares even when its numbers are drawn', () => {
    expect(openBoardRows([game('drawn', { isRandomized: true })], 'x').map(r => r.id)).toEqual(['drawn']);
  });

  it('uses the board size for 25 and 50 square boards', () => {
    expect(openBoardRows([game('s', { boardSize: 25 }, 5)], 'x')[0]).toMatchObject({ size: 25, open: 20, totalPoints: 2500 });
  });
});
