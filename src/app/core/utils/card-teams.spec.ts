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

describe('cardTeams with ESPN looks', () => {
  it('gives college teams the logo and nickname ESPN sent with the linked game', () => {
    const looks = {
      away: { logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/194.png', name: 'Buckeyes' },
      home: { logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png', name: 'Wolverines' }
    };
    expect(cardTeams('OSU', 'MICH', 'ncaaf', looks)).toEqual([
      { code: 'OSU', logo: looks.away.logo, name: 'Buckeyes' },
      { code: 'MICH', logo: looks.home.logo, name: 'Wolverines' }
    ]);
  });

  it('falls back to the code alone while the look is unknown', () => {
    const none = { logo: null, name: null };
    expect(cardTeams('OSU', 'MICH', 'ncaaf', { away: none, home: none })![0]).toEqual({ code: 'OSU', logo: null, name: '' });
  });
});
