import { cardTeams } from './card-teams';

describe('cardTeams', () => {
  it('gives NFL teams a logo, code and name, away first', () => {
    const teams = cardTeams('DAL', 'PHI', 'nfl')!;
    expect(teams.map(t => [t.code, t.name])).toEqual([['DAL', 'Cowboys'], ['PHI', 'Eagles']]);
    expect(teams.every(t => !!t.logo)).toBe(true);
  });

  it('treats a board with no sport as NFL when the codes match', () => {
    expect(cardTeams('KC', 'BUF')![1]).toEqual(expect.objectContaining({ code: 'BUF', name: 'Bills' }));
  });

  it('shows other sports by code with no logo', () => {
    expect(cardTeams('LAL', 'BOS', 'nba')).toEqual([{ code: 'LAL', logo: null, name: '' }, { code: 'BOS', logo: null, name: '' }]);
  });

  it('shows custom team names as typed', () => {
    expect(cardTeams('Smith Family', 'The Joneses')).toEqual([{ code: '', logo: null, name: 'Smith Family' }, { code: '', logo: null, name: 'The Joneses' }]);
  });

  it('is null until both teams are set', () => {
    expect(cardTeams('DAL', '')).toBeNull();
    expect(cardTeams(undefined, 'PHI')).toBeNull();
  });
});
