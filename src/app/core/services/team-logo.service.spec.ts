import { TestBed } from '@angular/core/testing';
import { EspnGame, EspnService } from './espn.service';
import { TeamLogoService } from './team-logo.service';

const college: EspnGame = {
  id: '401', name: 'Ohio State at Michigan', awayTeam: 'OSU', homeTeam: 'MICH', awayTeamFull: 'Ohio State Buckeyes', homeTeamFull: 'Michigan Wolverines',
  homeScore: 0, awayScore: 0, period: 0, clock: '', status: 'pre', completed: false, quarters: [], date: '2026-11-28T17:00Z',
  awayLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/194.png', homeLogo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png',
  awayName: 'Buckeyes', homeName: 'Wolverines'
};

describe('TeamLogoService', () => {
  let getGame: ReturnType<typeof vi.fn>;
  let service: TeamLogoService;

  beforeEach(() => {
    try { sessionStorage.clear(); } catch {}
    getGame = vi.fn().mockResolvedValue(college);
    TestBed.configureTestingModule({ providers: [{ provide: EspnService, useValue: { getGame } }] });
    service = TestBed.inject(TeamLogoService);
  });

  it('uses our own table for NFL teams without asking ESPN', () => {
    const t = service.teams({ awayTeam: 'DAL', homeTeam: 'PHI', espnEventId: '9', espnSport: 'nfl' });
    expect(t.away.logo).toContain('espncdn.com/i/teamlogos/nfl');
    expect(t.home.logo).toBeTruthy();
    expect(getGame).not.toHaveBeenCalled();
  });

  it('uses the linked game it is given for college teams', () => {
    const t = service.teams({ awayTeam: 'OSU', homeTeam: 'MICH', espnEventId: '401', espnSport: 'ncaaf' }, college);
    expect(t.away).toEqual({ logo: college.awayLogo, name: 'Buckeyes' });
    expect(t.home.logo).toBe(college.homeLogo);
    expect(getGame).not.toHaveBeenCalled();
  });

  it('fetches a linked college game once, then knows its logos', async () => {
    const board = { awayTeam: 'OSU', homeTeam: 'MICH', espnEventId: '401', espnSport: 'ncaaf' };
    expect(service.teams(board).away.logo).toBeNull();
    service.teams(board);
    await Promise.resolve();
    await Promise.resolve();
    expect(getGame).toHaveBeenCalledTimes(1);
    expect(service.teams(board).home).toEqual({ logo: college.homeLogo, name: 'Wolverines' });
  });

  it('matches by team code, so swapped sides still get the right logo', () => {
    const t = service.teams({ awayTeam: 'MICH', homeTeam: 'OSU', espnEventId: '401', espnSport: 'ncaaf' }, college);
    expect(t.away.logo).toBe(college.homeLogo);
  });

  it('gives a custom college board no logo rather than an NFL one', () => {
    expect(service.teams({ awayTeam: 'MIA', homeTeam: 'FSU', espnSport: 'ncaaf' }).away.logo).toBeNull();
  });
});
