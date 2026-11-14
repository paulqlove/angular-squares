import { confirmedPlayers, filledPaidSquares, paidCountsByName, paidSquaresFor } from './paid-squares';

describe('paid squares', () => {
  const squares = { '0-0': 'Dana', '0-1': 'Dana', '0-2': 'Eve' };

  it('shows a paid player as Confirmed while they hold no more squares than were confirmed', () => {
    expect([...confirmedPlayers(squares, ['Dana', 'Eve'], [2, 1])]).toEqual(['Dana', 'Eve']);
  });

  it('shows a player as Unconfirmed once they add a square after the confirm', () => {
    expect([...confirmedPlayers(squares, ['Dana', 'Eve'], [1, 1])]).toEqual(['Eve']);
  });

  it('keeps the count with the paid mark through a rename, read from an array or index keys', () => {
    const renamed = { '0-0': 'Dee', '0-1': 'Dee', '0-2': 'Dee' };
    expect([...confirmedPlayers(renamed, ['Dee'], { 0: 2 })]).toEqual([]);
    expect([...confirmedPlayers(renamed, ['Dee'], [3])]).toEqual(['Dee']);
  });

  it('keeps an older confirm with no count, and leaves out paid names with no squares', () => {
    expect([...confirmedPlayers(squares, ['Dana', 'Gone'])]).toEqual(['Dana']);
  });

  it('fills in counts that are missing, and reports nothing when none is', () => {
    expect(filledPaidSquares(squares, ['Eve', 'Dana', 'Gone'], [1])).toEqual([1, 2, 0]);
    expect(filledPaidSquares(squares, ['Eve'], [1])).toBeNull();
  });

  it('reads counts by name', () => {
    expect(paidCountsByName(['Dana', 'Eve'], { 1: 1 })).toEqual({ Eve: 1 });
  });

  it('records what the host saw for a just-confirmed player and keeps everyone else at their earlier count', () => {
    expect(paidSquaresFor(squares, ['Eve', 'Dana'], { Dana: 1, Eve: 1 }, { Eve: 1 })).toEqual([1, 1]);
    expect(paidSquaresFor(squares, ['Dana'], { Dana: 1 }, { Dana: 2 })).toEqual([2]);
  });

  it('never records more squares than the host saw, or than the player still holds', () => {
    expect(paidSquaresFor(squares, ['Dana'], {}, { Dana: 1 })).toEqual([1]);
    expect(paidSquaresFor(squares, ['Eve'], {}, { Eve: 3 })).toEqual([1]);
  });
});
