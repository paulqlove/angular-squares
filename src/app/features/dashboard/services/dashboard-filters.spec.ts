import { GameListItem } from '../../../core/services/game.service';
import { groupBoards } from '../../../core/utils/board-groups';
import { activeCardView, cardGridClass, codeErrorShows, confirmedCodeMatch, filterHostedGames } from './dashboard-filters';

const noTeams = (): { away: { logo: null; name: null }; home: { logo: null; name: null } } =>
  ({ away: { logo: null, name: null }, home: { logo: null, name: null } });

function board(id: string, name: string, extra: Partial<GameListItem> = {}): GameListItem {
  return { id, name, ownerName: 'Paul', createdAt: 0, playerCount: 0, squaresFilled: 0, isLocked: false, isRandomized: false, pricePerSquare: 10, boardSize: 100, ...extra } as GameListItem;
}

describe('filterHostedGames', () => {
  const games = [
    board('AAA111', 'Office Pool', { createdAt: 1, awayTeam: 'KC', homeTeam: 'DAL', espnSport: 'nfl' }),
    board('BBB222', 'Family Board', { createdAt: 3 }),
    board('CCC333', 'Gym Crew', { createdAt: 2, awayTeam: 'Harbor', homeTeam: 'Riverside' })
  ];

  it('lists every board newest first with no search', () => {
    expect(filterHostedGames(games, '', false, noTeams).map(g => g.id)).toEqual(['BBB222', 'CCC333', 'AAA111']);
  });

  it('matches the name, the code and the teams, ignoring case and spaces', () => {
    expect(filterHostedGames(games, '  office ', false, noTeams).map(g => g.id)).toEqual(['AAA111']);
    expect(filterHostedGames(games, 'bbb2', false, noTeams).map(g => g.id)).toEqual(['BBB222']);
    expect(filterHostedGames(games, 'riverside', false, noTeams).map(g => g.id)).toEqual(['CCC333']);
    expect(filterHostedGames(games, 'kc', false, noTeams).map(g => g.id)).toEqual(['AAA111']);
  });

  it('leaves the list whole while the field holds a game code', () => {
    expect(filterHostedGames(games, 'ZZZ999', true, noTeams)).toHaveLength(3);
  });

  it('returns nothing when no board matches', () => {
    expect(filterHostedGames(games, 'qqqq', false, noTeams)).toEqual([]);
  });

  it('does not reorder the list it was given', () => {
    filterHostedGames(games, '', false, noTeams);
    expect(games.map(g => g.id)).toEqual(['AAA111', 'BBB222', 'CCC333']);
  });
});

describe('dashboard grouping', () => {
  it('groups the matching boards into Ready to lock, Filling and Locked, leaving empty groups out', () => {
    const games = [
      board('a', 'Full board', { squaresFilled: 100, createdAt: 3 }),
      board('b', 'Half board', { squaresFilled: 50, createdAt: 2 }),
      board('c', 'Locked board', { squaresFilled: 100, isLocked: true, createdAt: 1 })
    ];
    expect(groupBoards(filterHostedGames(games, '', false, noTeams)).map(g => [g.label, g.games.map(x => x.id)])).toEqual([
      ['Ready to lock', ['a']],
      ['Filling', ['b']],
      ['Locked', ['c']]
    ]);
    expect(groupBoards(filterHostedGames(games, 'half', false, noTeams)).map(g => g.key)).toEqual(['filling']);
  });
});

describe('code matching', () => {
  it('shows Join only for the code the server confirmed', () => {
    expect(confirmedCodeMatch('ABC123', 'ABC123')).toBe('ABC123');
    expect(confirmedCodeMatch('ABC123', 'XYZ789')).toBeNull();
    expect(confirmedCodeMatch(null, 'ABC123')).toBeNull();
    expect(confirmedCodeMatch('ABC123', null)).toBeNull();
  });

  it('shows Game not found only while the field still holds the missing code', () => {
    expect(codeErrorShows('ABC123', 'ABC123')).toBe(true);
    expect(codeErrorShows('ABC123', 'ABC124')).toBe(false);
    expect(codeErrorShows('ABC123', null)).toBe(false);
    expect(codeErrorShows(null, 'ABC123')).toBe(false);
  });
});

describe('card view', () => {
  it('keeps Grid for players who do not host', () => {
    expect(activeCardView(false, 'compact')).toBe('grid');
    expect(activeCardView(true, 'compact')).toBe('compact');
    expect(activeCardView(true, 'grid')).toBe('grid');
  });

  it('gives Grid two or three columns and Compact as many rows as fit', () => {
    expect(cardGridClass('grid')).toBe('sm:grid-cols-2 xl:grid-cols-3');
    expect(cardGridClass('compact')).toBe('sm:grid-cols-[repeat(auto-fill,minmax(19rem,1fr))]');
  });
});
