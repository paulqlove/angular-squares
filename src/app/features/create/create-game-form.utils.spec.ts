import {
  matchup, openBoardPreview, stubGame, formatSummaryLine
} from './create-game-form.utils';

describe('create game form utils', () => {
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
