import { withPlayerConfirmed, withoutPlayer } from './board-players';

const squares = { '0-0': 'Dana', '0-1': 'Dana', '0-2': 'Kim' };

describe('board players', () => {
  it('confirms a player for the squares they hold now and keeps the others', () => {
    expect(withPlayerConfirmed({ selectedSquares: squares, paidPlayers: ['Kim'], paidSquares: [1] }, 'Dana'))
      .toEqual({ paidPlayers: ['Kim', 'Dana'], paidSquares: [1, 2] });
  });

  it('confirms a player with new squares again at their current count', () => {
    expect(withPlayerConfirmed({ selectedSquares: squares, paidPlayers: ['Dana'], paidSquares: [1] }, 'Dana'))
      .toEqual({ paidPlayers: ['Dana'], paidSquares: [2] });
  });

  it('takes a player off and clears everything tied to their name', () => {
    const next = withoutPlayer({
      selectedSquares: squares,
      playerColors: { Dana: 'qs-p-sky', Kim: 'qs-p-rose' },
      paidPlayers: ['Dana', 'Kim'],
      paidSquares: [2, 1],
      playerUserIds: { Dana: 'dana-uid', Kim: 'kim-uid' },
      winners: { q1: 'Dana', q2: 'Kim' }
    }, 'Dana');
    expect(next).toEqual({
      selectedSquares: { '0-2': 'Kim' },
      playerColors: { Kim: 'qs-p-rose' },
      paidPlayers: ['Kim'],
      paidSquares: [1],
      playerUserIds: { Kim: 'kim-uid' },
      winners: { q2: 'Kim' }
    });
  });

  it('handles a board with no colors, accounts, confirms or winners yet', () => {
    expect(withoutPlayer({ selectedSquares: squares }, 'Kim').selectedSquares).toEqual({ '0-0': 'Dana', '0-1': 'Dana' });
  });
});
