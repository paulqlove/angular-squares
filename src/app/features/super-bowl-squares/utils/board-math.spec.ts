import {
  BoardLayout,
  BoardScores,
  cumulativeEspnScores,
  emptyScores,
  espnWinners,
  lastPlayedQuarter,
  leaderSquare,
  manualWinners,
  nextPlayerColor,
  playerStatsFor,
  quarterWins,
  renamePlayer,
  squareForScore,
  withoutEntries
} from './board-math';

// Columns are the home team's digits, rows the away team's.
const HOME = [3, 7, 0, 9, 1, 5, 2, 8, 4, 6];
const AWAY = [6, 2, 9, 0, 4, 8, 1, 3, 7, 5];

function board(squares: { [key: string]: string }, overrides: Partial<BoardLayout> = {}): BoardLayout {
  return { selectedSquares: squares, homeNumbers: HOME, awayNumbers: AWAY, homePaired: false, awayPaired: false, ...overrides };
}

function scores(partial: Partial<BoardScores>): BoardScores {
  return { ...emptyScores(), ...partial };
}

describe('squareForScore', () => {
  it('finds the row for the away digit and the column for the home digit', () => {
    // away 3 is row 7, home 7 is column 1
    expect(squareForScore(board({}), { home: 17, away: 23 })).toBe('7-1');
  });

  it('is null while the numbers are not drawn', () => {
    expect(squareForScore(board({}, { homeNumbers: Array(10).fill(null) }), { home: 7, away: 3 })).toBeNull();
  });

  it('matches paired digits on a 5-wide side: stored 2 covers 4 and 5', () => {
    const paired = board({}, { homeNumbers: [1, 2, 0, 4, 3], homePaired: true });
    expect(squareForScore(paired, { home: 5, away: 6 })).toBe('0-1');
  });
});

describe('lastPlayedQuarter', () => {
  it('is -1 with no points and the last quarter with points otherwise', () => {
    expect(lastPlayedQuarter(emptyScores())).toBe(-1);
    expect(lastPlayedQuarter(scores({ q1: { home: 0, away: 0 }, q2: { home: 3, away: 0 } }))).toBe(1);
  });
});

describe('manualWinners', () => {
  it('names the holder of each played quarter and skips an unplayed 0-0', () => {
    // Q1 7-3 points to 7-1; Q2 10-0 points to 3-2; Q3 and Q4 are unplayed, so the 0-0 square does not win
    const result = manualWinners(board({ '7-1': 'Tara', '3-2': 'Kim' }), scores({ q1: { home: 7, away: 3 }, q2: { home: 10, away: 0 } }));
    expect(result).toEqual({ q1: 'Tara', q2: 'Kim' });
  });

  it('leaves a quarter out when its square is open', () => {
    expect(manualWinners(board({}), scores({ q1: { home: 7, away: 3 } }))).toEqual({});
  });
});

describe('espnWinners', () => {
  const squares = { '7-1': 'Tara', '3-2': 'Kim' };
  const s = scores({ q1: { home: 7, away: 3 }, q2: { home: 10, away: 0 }, q3: { home: 10, away: 0 }, q4: { home: 10, away: 0 } });

  it('only settles quarters the feed has passed', () => {
    expect(espnWinners(board(squares), s, 2, false)).toEqual({ q1: 'Tara' });
  });

  it('settles Q4 once the game is completed', () => {
    expect(espnWinners(board(squares), s, 4, true)).toEqual({ q1: 'Tara', q2: 'Kim', q3: 'Kim', q4: 'Kim' });
  });
});

describe('quarterWins', () => {
  it('lists the square for each winner that still holds it', () => {
    const squares = { '7-1': 'Tara' };
    const s = scores({ q1: { home: 7, away: 3 }, q2: { home: 7, away: 3 } });
    expect(quarterWins(board(squares), s, { q1: 'Tara', q2: 'Sam' })).toEqual([{ key: '7-1', quarter: 'q1' }]);
  });
});

describe('leaderSquare', () => {
  it('uses the latest quarter with points', () => {
    expect(leaderSquare(board({}), scores({ q1: { home: 7, away: 3 }, q2: { home: 10, away: 0 } }), false)).toBe('3-2');
  });

  it('is null with no scores, unless a linked game points at 0-0', () => {
    expect(leaderSquare(board({}), emptyScores(), false)).toBeNull();
    expect(leaderSquare(board({}), emptyScores(), true)).toBe('3-2');
  });
});

describe('playerStatsFor', () => {
  it('counts squares and points per player and the board total', () => {
    expect(playerStatsFor({ '0-0': 'Tara', '0-1': 'Tara', '1-1': 'Kim' }, 10)).toEqual({
      stats: { Tara: { squares: 2, total: 20 }, Kim: { squares: 1, total: 10 } },
      totalPot: 30
    });
  });
});

describe('nextPlayerColor', () => {
  it('picks the first unused color, then cycles once all are used', () => {
    expect(nextPlayerColor({ Tara: 'a' }, ['a', 'b', 'c'])).toBe('b');
    expect(nextPlayerColor({ A: 'a', B: 'b', C: 'c', D: 'a' }, ['a', 'b', 'c'])).toBe('b');
  });
});

describe('cumulativeEspnScores', () => {
  const quarters = [{ home: 7, away: 3 }, { home: 3, away: 7 }, { home: 0, away: 0 }, { home: 7, away: 0 }];

  it('adds the per-quarter scores up', () => {
    const result = cumulativeEspnScores(emptyScores(), { quarters, status: 'in', homeScore: 17, awayScore: 10 });
    expect(result).toEqual({ q1: { home: 7, away: 3 }, q2: { home: 10, away: 10 }, q3: { home: 10, away: 10 }, q4: { home: 17, away: 10 } });
  });

  it('stores the final total in Q4 once the game is over (overtime included)', () => {
    const result = cumulativeEspnScores(emptyScores(), { quarters, status: 'post', homeScore: 20, awayScore: 10 });
    expect(result.q4).toEqual({ home: 20, away: 10 });
  });
});

describe('renamePlayer', () => {
  it('moves squares, color, paid mark and account link to the new name', () => {
    const data = {
      selectedSquares: { '0-0': 'tara', '0-1': 'Kim' },
      playerColors: { Tara: 'qs-p-sky' },
      paidPlayers: new Set(['TARA', 'Kim']),
      playerUserIds: { Tara: 'uid-1' }
    };
    expect(renamePlayer(data, 'Tara', 'Tee')).toEqual({
      selectedSquares: { '0-0': 'Tee', '0-1': 'Kim' },
      playerColors: { Tee: 'qs-p-sky' },
      paidPlayers: ['Tee', 'Kim'],
      playerUserIds: { Tee: 'uid-1' }
    });
    expect(data.playerColors).toEqual({ Tara: 'qs-p-sky' });
  });
});

describe('withoutEntries', () => {
  it('drops the entries the test picks', () => {
    expect(withoutEntries({ a: 'Tara', b: 'Kim' }, (_, name) => name === 'Kim')).toEqual({ a: 'Tara' });
  });
});
