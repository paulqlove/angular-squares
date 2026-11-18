import type { GameData } from '../services/game.service';
import { OPEN_ROWS_SHOWN, findOpenBoardRows, openBoardRows } from './open-boards';

const game = (id: string, over: Partial<GameData> = {}, picks = 10): GameData => ({
  id, name: id, ownerId: 'o', ownerName: 'O', createdAt: 0, boardSize: 100,
  selectedSquares: Object.fromEntries(Array.from({ length: picks }, (_, i) => [`${Math.floor(i / 10)}-${i % 10}`, 'A'])),
  homeNumbers: [], awayNumbers: [], scores: {} as GameData['scores'], playerColors: {}, winners: {},
  pricePerSquare: 100, isRandomized: false, isLocked: false, homeTeam: 'H', awayTeam: 'A', showInOpenBoards: true,
  ...over
} as GameData);

describe('openBoardRows', () => {
  it('lists opted-in boards with open squares, most open first, with totals', () => {
    const rows = openBoardRows([game('a', {}, 40), game('b', {}, 10)], 'x', 'o');
    expect(rows.map(r => r.id)).toEqual(['b', 'a']);
    expect(rows[0]).toMatchObject({ taken: 10, size: 100, open: 90, pricePerSquare: 100, totalPoints: 10000 });
  });

  it('skips the current board, another host\'s boards, boards not opted in, locked, full or missing', () => {
    const rows = openBoardRows([
      game('here'), game('off', { showInOpenBoards: false }), game('locked', { isLocked: true }),
      game('full', {}, 100), null, game('other host', { ownerId: 'someone-else' }), game('ok')
    ], 'here', 'o');
    expect(rows.map(r => r.id)).toEqual(['ok']);
  });

  it('keeps an unlocked board with open squares even when its numbers are drawn', () => {
    expect(openBoardRows([game('drawn', { isRandomized: true })], 'x', 'o').map(r => r.id)).toEqual(['drawn']);
  });

  it('uses the board size for 25 and 50 square boards', () => {
    expect(openBoardRows([game('s', { boardSize: 25 }, 5)], 'x', 'o')[0]).toMatchObject({ size: 25, open: 20, totalPoints: 2500 });
  });
});

describe('findOpenBoardRows', () => {
  const reader = (games: GameData[]) => {
    const byId = new Map(games.map(g => [g.id as string, g]));
    const read = vi.fn(async (id: string) => byId.get(id) ?? null);
    return { ids: games.map(g => g.id as string), read };
  };

  it('finds open boards listed after ten or more locked or full ones', async () => {
    const closed = Array.from({ length: 12 }, (_, i) => game(`closed${i}`, { isLocked: i % 2 === 0 }, i % 2 ? 100 : 10));
    const { ids, read } = reader([...closed, game('open')]);
    expect((await findOpenBoardRows(ids, read, 'here', 'o')).map(r => r.id)).toEqual(['open']);
    expect(read).toHaveBeenCalledTimes(13);
  });

  it('stops reading once it has enough to show, and shows at most that many', async () => {
    const { ids, read } = reader(Array.from({ length: 25 }, (_, i) => game(`b${i}`)));
    const rows = await findOpenBoardRows(ids, read, 'here', 'o');
    expect(rows.length).toBe(OPEN_ROWS_SHOWN);
    expect(read).toHaveBeenCalledTimes(OPEN_ROWS_SHOWN);
  });

  it('merges pages most open first and stops at the page that fills the list', async () => {
    const first = Array.from({ length: 10 }, (_, i) => game(`p1-${i}`, { isLocked: i < 3 }, 50));
    const second = Array.from({ length: 10 }, (_, i) => game(`p2-${i}`, {}, i < 5 ? 10 : 100));
    const third = Array.from({ length: 10 }, (_, i) => game(`p3-${i}`));
    const { ids, read } = reader([...first, ...second, ...third]);
    const rows = await findOpenBoardRows(ids, read, 'here', 'o');
    expect(read).toHaveBeenCalledTimes(20);
    expect(rows.length).toBe(OPEN_ROWS_SHOWN);
    expect(rows.slice(0, 5).every(r => r.id.startsWith('p2-'))).toBe(true);
  });

  it('reads nothing for an empty list', async () => {
    const { read } = reader([]);
    expect(await findOpenBoardRows([], read, 'here', 'o')).toEqual([]);
    expect(read).not.toHaveBeenCalled();
  });
});
