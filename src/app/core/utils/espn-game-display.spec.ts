import { formatGameDay } from './espn-game-display';
import { teamLook } from '../services/espn.service';

describe('formatGameDay', () => {
  const now = new Date(2026, 10, 11, 9, 0);
  it('says Today and Tomorrow, then the weekday and date', () => {
    expect(formatGameDay(new Date(2026, 10, 11, 20, 15).toISOString(), now)).toBe('Today');
    expect(formatGameDay(new Date(2026, 10, 12, 1, 0).toISOString(), now)).toBe('Tomorrow');
    expect(formatGameDay(new Date(2026, 10, 15, 13, 0).toISOString(), now)).toMatch(/15/);
  });
});

describe('teamLook', () => {
  it('keeps the nickname, an ESPN logo and the team colour', () => {
    expect(teamLook({ name: 'Lakers', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', color: '552583', alternateColor: 'fdb927' }))
      .toEqual({ name: 'Lakers', logo: 'https://a.espncdn.com/i/teamlogos/nba/500/lal.png', color: '#552583' });
  });

  it('reads the logo from logos[] when there is no logo field', () => {
    expect(teamLook({ logos: [{ href: 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png' }] }).logo).toBe('https://a.espncdn.com/i/teamlogos/ncaa/500/130.png');
  });

  it('drops logos from any other host', () => {
    expect(teamLook({ logo: 'https://evil.example.com/x.png' }).logo).toBeUndefined();
    expect(teamLook({ logo: 'http://a.espncdn.com/x.png' }).logo).toBeUndefined();
  });

  it('uses the alternate colour when the main one is too pale for a light card, and drops bad values', () => {
    expect(teamLook({ color: 'ffffff', alternateColor: '0b2265' }).color).toBe('#0b2265');
    expect(teamLook({ color: 'fafafa', alternateColor: 'f5f5f5' }).color).toBeUndefined();
    expect(teamLook({ color: 'red;background:url(x)' }).color).toBeUndefined();
  });

  it('copes with a missing team', () => {
    expect(teamLook(undefined)).toEqual({});
  });
});
