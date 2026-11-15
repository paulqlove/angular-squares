import type { EspnGame } from '../../core/services/espn.service';
import {
  filterGames, matchup, openBoardPreview, stubGame, formatSummaryLine
} from './create-game-form.utils';

const game = (id: string, away: string, home: string, awayFull = away, homeFull = home) =>
  ({ id, awayTeam: away, homeTeam: home, awayTeamFull: awayFull, homeTeamFull: homeFull } as EspnGame);

describe('create game form utils', () => {
  it('filters games by short or full team name, ignoring case and spaces', () => {
    const games = [game('1', 'SF', 'KC', 'San Francisco 49ers', 'Kansas City Chiefs'), game('2', 'TB', 'CHI')];
    expect(filterGames(games, '')).toBe(games);
    expect(filterGames(games, '  chiefs ').map(g => g.id)).toEqual(['1']);
    expect(filterGames(games, 'tb').map(g => g.id)).toEqual(['2']);
    expect(filterGames(games, 'zz')).toEqual([]);
  });

  it('builds the summary line, skipping teams not chosen yet', () => {
    expect(formatSummaryLine({ matchup: 'SF @ KC', boardSize: 100, price: 10 })).toBe('SF @ KC · 100 squares · 10 pts');
    expect(formatSummaryLine({ matchup: '', boardSize: 25, price: 0 })).toBe('25 squares · No points');
    expect(matchup(' Lincoln ', '')).toBe('Lincoln');
    expect(matchup('A', 'B')).toBe('A @ B');
  });

  it('previews the open boards line, with a stand-in name', () => {
    expect(openBoardPreview('', 5, 50)).toBe('Your board · Points per square: 5 · 0/50 taken');
    expect(openBoardPreview('Party', 10, 100)).toBe('Party · Points per square: 10 · 0/100 taken');
  });

  it('rebuilds a restored pick that left the schedule', () => {
    const stub = stubGame({ id: '9', awayTeam: 'SF', homeTeam: 'KC' });
    expect(stub).toMatchObject({ id: '9', name: 'SF @ KC', awayTeamFull: 'SF', homeTeamFull: 'KC', status: 'pre', date: '' });
  });
});
