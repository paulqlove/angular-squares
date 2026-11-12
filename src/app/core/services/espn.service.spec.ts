import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { EspnService, parseScoreboard, parseSummary } from './espn.service';

/** Trimmed from ESPN's college-football summary for event 401866461 (Buffalo at Ball State, Nov 11 2026, 4th quarter). */
const collegeSummary = {
  header: {
    id: '401866461',
    competitions: [{
      id: '401866461',
      date: '2026-11-12T00:30Z',
      status: { displayClock: '1:52', period: 4, type: { name: 'STATUS_IN_PROGRESS', state: 'in', completed: false } },
      competitors: [
        {
          homeAway: 'home', score: '7',
          linescores: [{ displayValue: '7' }, { displayValue: '0' }, { displayValue: '0' }, { displayValue: '0' }],
          team: { id: '2050', abbreviation: 'BALL', displayName: 'Ball State Cardinals', name: 'Cardinals', color: 'ba0c2f', alternateColor: 'ffffff',
            logos: [{ href: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2050.png' }, { href: 'https://a.espncdn.com/i/teamlogos/ncaa/500-dark/2050.png' }] }
        },
        {
          homeAway: 'away', score: '28',
          linescores: [{ displayValue: '0' }, { displayValue: '7' }, { displayValue: '7' }, { displayValue: '14' }],
          team: { id: '2084', abbreviation: 'BUFF', displayName: 'Buffalo Bulls', name: 'Bulls', color: '005bbb', alternateColor: 'ffffff',
            logos: [{ href: 'https://a.espncdn.com/i/teamlogos/ncaa/500/2084.png' }] }
        }
      ]
    }]
  }
};

/** A college scoreboard the way ESPN sends it for `?event=`: the featured games, not the one asked for. */
const featuredScoreboard = {
  events: [{
    id: '401999999', name: 'Ohio State Buckeyes at Michigan Wolverines', date: '2026-11-28T17:00Z',
    status: { period: 0, displayClock: '0:00', type: { name: 'STATUS_SCHEDULED', completed: false } },
    competitions: [{ competitors: [
      { homeAway: 'home', score: '0', team: { abbreviation: 'MICH', displayName: 'Michigan Wolverines', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/130.png' } },
      { homeAway: 'away', score: '0', team: { abbreviation: 'OSU', displayName: 'Ohio State Buckeyes', logo: 'https://a.espncdn.com/i/teamlogos/ncaa/500/194.png' } }
    ] }]
  }]
};

function json(body: unknown, ok = true): Response {
  return { ok, json: async () => body } as Response;
}

describe('parseSummary', () => {
  it('reads teams, logos, scores, quarters and status from a summary', () => {
    const game = parseSummary(collegeSummary, 'ncaaf')!;
    expect(game.id).toBe('401866461');
    expect(game.awayTeam).toBe('BUFF');
    expect(game.homeTeam).toBe('BALL');
    expect(game.awayLogo).toBe('https://a.espncdn.com/i/teamlogos/ncaa/500/2084.png');
    expect(game.homeLogo).toBe('https://a.espncdn.com/i/teamlogos/ncaa/500/2050.png');
    expect(game.awayName).toBe('Bulls');
    expect(game.awayScore).toBe(28);
    expect(game.homeScore).toBe(7);
    expect(game.quarters).toEqual([{ home: 7, away: 0 }, { home: 0, away: 7 }, { home: 0, away: 7 }, { home: 0, away: 14 }]);
    expect(game.status).toBe('in');
    expect(game.period).toBe(4);
    expect(game.clock).toBe('1:52');
    expect(game.date).toBe('2026-11-12T00:30Z');
    expect(game.name).toBe('Buffalo Bulls at Ball State Cardinals');
  });

  it('marks a final game as post and completed', () => {
    const final = structuredClone(collegeSummary);
    final.header.competitions[0].status = { displayClock: '0:00', period: 4, type: { name: 'STATUS_FINAL', state: 'post', completed: true } };
    const game = parseSummary(final, 'ncaaf')!;
    expect(game.status).toBe('post');
    expect(game.completed).toBe(true);
  });

  it('returns null when there is no game in it', () => {
    expect(parseSummary({}, 'ncaaf')).toBeNull();
    expect(parseSummary({ header: { id: '1', competitions: [] } }, 'nfl')).toBeNull();
  });
});

describe('parseScoreboard', () => {
  it('still reads scoreboard events with numeric linescores', () => {
    const board = structuredClone(featuredScoreboard) as any;
    board.events[0].competitions[0].competitors[0].linescores = [{ value: 3 }, { value: 7 }];
    const [game] = parseScoreboard(board, 'ncaaf');
    expect(game.homeLogo).toBe('https://a.espncdn.com/i/teamlogos/ncaa/500/130.png');
    expect(game.quarters.slice(0, 2)).toEqual([{ home: 3, away: 0 }, { home: 7, away: 0 }]);
    expect(game.name).toBe('Ohio State Buckeyes at Michigan Wolverines');
  });
});

describe('EspnService.getGame', () => {
  let fetchMock: ReturnType<typeof vi.fn>;
  let service: EspnService;

  beforeEach(() => {
    fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'browser' }] });
    service = TestBed.inject(EspnService);
  });

  afterEach(() => vi.unstubAllGlobals());

  it('reads a college game from its summary, not the featured scoreboard', async () => {
    fetchMock.mockResolvedValue(json(collegeSummary));
    const game = await service.getGame('401866461', 'ncaaf');
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toBe('https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=401866461');
    expect(game?.awayLogo).toContain('/ncaa/500/2084.png');
    expect(game?.awayScore).toBe(28);
  });

  it('uses the summary for every league', async () => {
    const nfl = structuredClone(collegeSummary);
    nfl.header.id = '401772900';
    fetchMock.mockResolvedValue(json(nfl));
    await service.getGame('401772900', 'nfl');
    expect(fetchMock.mock.calls[0][0]).toBe('https://site.api.espn.com/apis/site/v2/sports/football/nfl/summary?event=401772900');
  });

  it('falls back to the full FBS scoreboard when the summary fails', async () => {
    fetchMock
      .mockResolvedValueOnce(json({}, false))
      .mockResolvedValueOnce(json(featuredScoreboard));
    const game = await service.getGame('401999999', 'ncaaf');
    expect(fetchMock.mock.calls[1][0]).toBe('https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?groups=80&limit=300&event=401999999');
    expect(game?.homeTeam).toBe('MICH');
  });

  it('returns null when neither the summary nor the scoreboard has the game', async () => {
    fetchMock
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce(json(featuredScoreboard));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await service.getGame('401866461', 'ncaaf')).toBeNull();
  });
});
