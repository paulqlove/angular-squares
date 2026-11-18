import type { EspnGame } from '../services/espn.service';
import { filterGames } from './espn-game-search';

const game = (id: string, away: string, home: string, awayFull = away, homeFull = home) =>
  ({ id, awayTeam: away, homeTeam: home, awayTeamFull: awayFull, homeTeamFull: homeFull } as EspnGame);

describe('filterGames', () => {
  const games = [game('1', 'SF', 'KC', 'San Francisco 49ers', 'Kansas City Chiefs'), game('2', 'TB', 'CHI')];

  it('returns the same list for an empty or blank search', () => {
    expect(filterGames(games, '')).toBe(games);
    expect(filterGames(games, '   ')).toBe(games);
  });

  it('matches short or full names of either team, ignoring case and outer spaces', () => {
    expect(filterGames(games, '  chiefs ').map(g => g.id)).toEqual(['1']);
    expect(filterGames(games, 'SAN FRAN').map(g => g.id)).toEqual(['1']);
    expect(filterGames(games, 'tb').map(g => g.id)).toEqual(['2']);
    expect(filterGames(games, 'c').map(g => g.id)).toEqual(['1', '2']);
  });

  it('returns nothing when no team matches', () => {
    expect(filterGames(games, 'zz')).toEqual([]);
  });
});
