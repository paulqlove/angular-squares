import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { isEspnStatusFinal } from '../utils/board-activity';

export type SportType = 'nfl' | 'nba' | 'ncaaf' | 'ufl' | 'wnba' | 'afl';

export interface EspnGame {
  id: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  homeTeamFull: string;  // Full display name for search
  awayTeamFull: string;  // Full display name for search
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
  status: 'pre' | 'in' | 'post';
  completed: boolean;
  quarters: { home: number; away: number }[];
  date: string; // ISO date string
  /** Team look for the game picker, when ESPN sends it: nickname, logo (ESPN's image host only) and a colour that shows on a light card */
  awayName?: string;
  homeName?: string;
  awayLogo?: string;
  homeLogo?: string;
  awayColor?: string;
  homeColor?: string;
}

/** Nickname, logo and a visible colour for one ESPN competitor's team. Anything missing or unsafe is left out. */
export function teamLook(team: any): { name?: string; logo?: string; color?: string } {
  if (!team) return {};
  const logoUrl = typeof team.logo === 'string' ? team.logo : team.logos?.[0]?.href;
  const logo = typeof logoUrl === 'string' && /^https:\/\/a\.espncdn\.com\//.test(logoUrl) ? logoUrl : undefined;
  const color = [team.color, team.alternateColor].find(c => typeof c === 'string' && /^[0-9a-f]{6}$/i.test(c) && luminance(c) < 0.8);
  const name = typeof team.name === 'string' && team.name ? team.name : typeof team.shortDisplayName === 'string' ? team.shortDisplayName : undefined;
  return { name, logo, color: color ? `#${color.toLowerCase()}` : undefined };
}

/** Relative luminance of a 6-digit hex colour, 0 (black) to 1 (white). */
function luminance(hex: string): number {
  const [r, g, b] = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The team-look fields of an EspnGame, from its two competitors. */
function gameLook(away: any, home: any): Partial<EspnGame> {
  const a = teamLook(away?.team), h = teamLook(home?.team);
  return { awayName: a.name, homeName: h.name, awayLogo: a.logo, homeLogo: h.logo, awayColor: a.color, homeColor: h.color };
}

export const SPORT_CONFIG: Record<SportType, { label: string; periods: number; periodLabel: string }> = {
  nfl: { label: 'NFL', periods: 4, periodLabel: 'Q' },
  nba: { label: 'NBA', periods: 4, periodLabel: 'Q' },
  ncaaf: { label: 'NCAA Football', periods: 4, periodLabel: 'Q' },
  ufl: { label: 'UFL', periods: 4, periodLabel: 'Q' },
  wnba: { label: 'WNBA', periods: 4, periodLabel: 'Q' },
  afl: { label: 'AFL', periods: 4, periodLabel: 'Q' }
};

@Injectable({
  providedIn: 'root'
})
export class EspnService {
  private platformId = inject(PLATFORM_ID);

  private readonly API_URLS: Record<SportType, string> = {
    nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    ncaaf: 'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard',
    ufl: 'https://site.api.espn.com/apis/site/v2/sports/football/ufl/scoreboard',
    wnba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/wnba/scoreboard',
    afl: 'https://site.api.espn.com/apis/site/v2/sports/australian-football/afl/scoreboard'
  };

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async getGames(sport: SportType = 'nfl'): Promise<EspnGame[]> {
    if (!this.isBrowser) return [];

    try {
      const today = new Date();
      const formatDate = (d: Date) => d.getFullYear().toString() +
        (d.getMonth() + 1).toString().padStart(2, '0') +
        d.getDate().toString().padStart(2, '0');

      const dateStr = formatDate(today);

      // For NCAA, fetch FBS games with higher limit; for others, fetch today + default
      let fetches: Promise<Response>[];

      if (sport === 'ncaaf') {
        // FBS only (groups=80), limit=300 to get all games
        const nextSaturday = new Date(today);
        const daysUntilSat = (6 - today.getDay() + 7) % 7 || 7;
        nextSaturday.setDate(today.getDate() + daysUntilSat);

        fetches = [
          fetch(`${this.API_URLS[sport]}?groups=80&limit=300`),
          fetch(`${this.API_URLS[sport]}?groups=80&limit=300&dates=${formatDate(nextSaturday)}`)
        ];
      } else {
        fetches = [
          fetch(this.API_URLS[sport]),
          fetch(`${this.API_URLS[sport]}?dates=${dateStr}`)
        ];
      }

      const responses = await Promise.all(fetches);
      const dataArrays = await Promise.all(responses.map(r => r.json()));

      // Merge and deduplicate by game id
      const seen = new Set<string>();
      const merged: EspnGame[] = [];
      for (const data of dataArrays) {
        for (const game of parseScoreboard(data, sport)) {
          if (!seen.has(game.id)) {
            seen.add(game.id);
            merged.push(game);
          }
        }
      }

      // Out of season ESPN keeps serving the league's last finished game. Hide ones more than two weeks old so the list can say "coming soon".
      const staleBefore = Date.now() - 14 * 24 * 60 * 60 * 1000;
      const current = merged.filter(game => !game.completed || new Date(game.date).getTime() >= staleBefore);

      // Sort by date
      current.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

      return current;
    } catch (error) {
      console.error('Failed to fetch ESPN games:', error);
      return [];
    }
  }

  /**
   * Whether the linked event is final.
   * true / false when the summary says so. null when the lookup fails,
   * which the board limit treats as still active.
   */
  async isEventFinal(eventId: string, sport: SportType = 'nfl'): Promise<boolean | null> {
    if (!this.isBrowser || !eventId) {
      return null;
    }

    try {
      const summaryUrl = `${this.API_URLS[sport].replace(/\/scoreboard$/, '/summary')}?event=${encodeURIComponent(eventId)}`;
      const response = await fetch(summaryUrl);
      if (!response.ok) {
        return null;
      }
      const data = await response.json();
      const status = data?.header?.competitions?.[0]?.status?.type;
      return isEspnStatusFinal(status);
    } catch (error) {
      console.error('Failed to read linked game status:', error);
      return null;
    }
  }

  /**
   * One linked game, by its ESPN event id: teams, logos, score and status.
   * Reads the game's own summary, because the scoreboard ignores `event` and for college football only lists ~20 featured games.
   * Falls back to the league scoreboard when the summary can't be read.
   */
  async getGame(eventId: string, sport: SportType = 'nfl'): Promise<EspnGame | null> {
    if (!this.isBrowser || !eventId) return null;

    try {
      const response = await fetch(`${this.API_URLS[sport].replace(/\/scoreboard$/, '/summary')}?event=${encodeURIComponent(eventId)}`);
      if (response.ok) {
        const game = parseSummary(await response.json(), sport);
        if (game && game.id === eventId) return game;
      }
    } catch (error) {
      console.error('Failed to fetch ESPN game summary:', error);
    }

    try {
      const params = sport === 'ncaaf' ? 'groups=80&limit=300&' : '';
      const response = await fetch(`${this.API_URLS[sport]}?${params}event=${encodeURIComponent(eventId)}`);
      const data = await response.json();
      return parseScoreboard(data, sport).find(g => g.id === eventId) || null;
    } catch (error) {
      console.error('Failed to fetch ESPN game:', error);
      return null;
    }
  }

  async getTeamSchedule(teamId: string, sport: SportType = 'nfl'): Promise<EspnGame[]> {
    if (!this.isBrowser) return [];

    try {
      const baseUrl = this.API_URLS[sport].replace('/scoreboard', '');
      const response = await fetch(`${baseUrl}/teams/${teamId}/schedule`);
      const data = await response.json();

      if (!data?.events) return [];

      const now = new Date();
      const periodCount = SPORT_CONFIG[sport].periods;

      return data.events
        .filter((event: any) => new Date(event.date) >= now)
        .slice(0, 3)
        .map((event: any) => {
          const competition = event.competitions?.[0];
          const homeCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'home');
          const awayCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'away');

          const homeTeamFull = homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || 'Home';
          const awayTeamFull = awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || 'Away';
          return {
            id: event.id,
            name: event.name || event.shortName || '',
            homeTeam: homeCompetitor?.team?.abbreviation || homeTeamFull,
            awayTeam: awayCompetitor?.team?.abbreviation || awayTeamFull,
            homeTeamFull,
            awayTeamFull,
            homeScore: 0,
            awayScore: 0,
            period: 0,
            clock: '',
            status: 'pre' as const,
            completed: false,
            quarters: Array(periodCount).fill({ home: 0, away: 0 }),
            date: event.date || '',
            ...gameLook(awayCompetitor, homeCompetitor)
          };
        });
    } catch (error) {
      console.error('Failed to fetch team schedule:', error);
      return [];
    }
  }
}

/** Every game on an ESPN scoreboard response. */
export function parseScoreboard(data: any, sport: SportType): EspnGame[] {
  if (!Array.isArray(data?.events)) return [];
  return data.events.map((event: any) => parseEvent(event, event?.competitions?.[0], event?.status, sport));
}

/**
 * The game in an ESPN summary response (`/summary?event=ID`), or null when it has none.
 * The summary keeps the game under `header`, with status on the competition and period scores as `displayValue` text.
 */
export function parseSummary(data: any, sport: SportType): EspnGame | null {
  const header = data?.header;
  const competition = header?.competitions?.[0];
  const id = header?.id ?? competition?.id;
  if (!competition || id == null) return null;
  return parseEvent({ id: String(id), date: competition.date }, competition, competition.status, sport);
}

/** One game from an event (id, name, date), its competition and its status. */
function parseEvent(event: any, competition: any, status: any, sport: SportType): EspnGame {
  const periodCount = SPORT_CONFIG[sport].periods;
  const homeCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'home');
  const awayCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'away');

  // Parse quarter/period scores from linescores
  const quarters: { home: number; away: number }[] = [];
  const homeLinescores = homeCompetitor?.linescores || [];
  const awayLinescores = awayCompetitor?.linescores || [];
  const maxPeriods = Math.max(homeLinescores.length, awayLinescores.length, periodCount);

  for (let i = 0; i < maxPeriods; i++) {
    quarters.push({
      home: linescoreValue(homeLinescores[i]),
      away: linescoreValue(awayLinescores[i])
    });
  }

  // Map status type to our status enum
  let gameStatus: 'pre' | 'in' | 'post' = 'pre';
  if (status?.type?.name === 'STATUS_IN_PROGRESS' || status?.type?.name === 'STATUS_HALFTIME') {
    gameStatus = 'in';
  } else if (status?.type?.name === 'STATUS_FINAL' || status?.type?.completed) {
    gameStatus = 'post';
  }

  const homeTeamFull = homeCompetitor?.team?.displayName || homeCompetitor?.team?.name || homeCompetitor?.team?.abbreviation || 'Home';
  const awayTeamFull = awayCompetitor?.team?.displayName || awayCompetitor?.team?.name || awayCompetitor?.team?.abbreviation || 'Away';

  return {
    id: String(event?.id ?? ''),
    name: event?.name || `${awayTeamFull} at ${homeTeamFull}`,
    homeTeam: homeCompetitor?.team?.abbreviation || homeCompetitor?.team?.shortDisplayName || 'Home',
    awayTeam: awayCompetitor?.team?.abbreviation || awayCompetitor?.team?.shortDisplayName || 'Away',
    homeTeamFull,
    awayTeamFull,
    homeScore: parseInt(homeCompetitor?.score || '0', 10) || 0,
    awayScore: parseInt(awayCompetitor?.score || '0', 10) || 0,
    // The summary's status carries no period, so a finished game would read as period 0 and lose its Q1–Q3
    // winners. Fall back to how many periods have line scores.
    period: status?.period || Math.max(homeLinescores.length, awayLinescores.length),
    clock: status?.displayClock || '',
    status: gameStatus,
    completed: !!status?.type?.completed,
    quarters,
    date: event?.date || '',
    ...gameLook(awayCompetitor, homeCompetitor)
  };
}

/** A period score: the scoreboard sends `value`, the summary only `displayValue`. */
function linescoreValue(line: any): number {
  if (typeof line?.value === 'number') return line.value;
  const parsed = parseFloat(line?.displayValue);
  return Number.isFinite(parsed) ? parsed : 0;
}
