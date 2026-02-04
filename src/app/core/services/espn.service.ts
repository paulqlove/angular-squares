import { Injectable, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type SportType = 'nfl' | 'nba' | 'ncaam';

export interface EspnGame {
  id: string;
  name: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  period: number;
  clock: string;
  status: 'pre' | 'in' | 'post';
  quarters: { home: number; away: number }[];
}

export const SPORT_CONFIG: Record<SportType, { label: string; periods: number; periodLabel: string }> = {
  nfl: { label: 'NFL', periods: 4, periodLabel: 'Q' },
  nba: { label: 'NBA', periods: 4, periodLabel: 'Q' },
  ncaam: { label: 'NCAA Basketball', periods: 2, periodLabel: 'H' }
};

@Injectable({
  providedIn: 'root'
})
export class EspnService {
  private platformId = inject(PLATFORM_ID);

  private readonly API_URLS: Record<SportType, string> = {
    nfl: 'https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard',
    nba: 'https://site.api.espn.com/apis/site/v2/sports/basketball/nba/scoreboard',
    ncaam: 'https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard'
  };

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  async getGames(sport: SportType = 'nfl'): Promise<EspnGame[]> {
    if (!this.isBrowser) return [];

    try {
      const response = await fetch(this.API_URLS[sport]);
      const data = await response.json();
      return this.parseGames(data, sport);
    } catch (error) {
      console.error('Failed to fetch ESPN games:', error);
      return [];
    }
  }

  async getGame(eventId: string, sport: SportType = 'nfl'): Promise<EspnGame | null> {
    if (!this.isBrowser) return null;

    try {
      const response = await fetch(`${this.API_URLS[sport]}?event=${eventId}`);
      const data = await response.json();
      const games = this.parseGames(data, sport);
      return games.find(g => g.id === eventId) || null;
    } catch (error) {
      console.error('Failed to fetch ESPN game:', error);
      return null;
    }
  }

  private parseGames(data: any, sport: SportType): EspnGame[] {
    if (!data?.events) return [];

    const periodCount = SPORT_CONFIG[sport].periods;

    return data.events.map((event: any) => {
      const competition = event.competitions?.[0];
      const status = event.status;
      const homeCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'home');
      const awayCompetitor = competition?.competitors?.find((c: any) => c.homeAway === 'away');

      // Parse quarter/period scores from linescores
      const quarters: { home: number; away: number }[] = [];
      const homeLinescores = homeCompetitor?.linescores || [];
      const awayLinescores = awayCompetitor?.linescores || [];
      const maxPeriods = Math.max(homeLinescores.length, awayLinescores.length, periodCount);

      for (let i = 0; i < maxPeriods; i++) {
        quarters.push({
          home: homeLinescores[i]?.value || 0,
          away: awayLinescores[i]?.value || 0
        });
      }

      // Map status type to our status enum
      let gameStatus: 'pre' | 'in' | 'post' = 'pre';
      if (status?.type?.name === 'STATUS_IN_PROGRESS' || status?.type?.name === 'STATUS_HALFTIME') {
        gameStatus = 'in';
      } else if (status?.type?.name === 'STATUS_FINAL' || status?.type?.completed) {
        gameStatus = 'post';
      }

      return {
        id: event.id,
        name: event.name || `${awayCompetitor?.team?.abbreviation || 'Away'} at ${homeCompetitor?.team?.abbreviation || 'Home'}`,
        homeTeam: homeCompetitor?.team?.abbreviation || homeCompetitor?.team?.shortDisplayName || 'Home',
        awayTeam: awayCompetitor?.team?.abbreviation || awayCompetitor?.team?.shortDisplayName || 'Away',
        homeScore: parseInt(homeCompetitor?.score || '0', 10),
        awayScore: parseInt(awayCompetitor?.score || '0', 10),
        period: status?.period || 0,
        clock: status?.displayClock || '',
        status: gameStatus,
        quarters
      };
    });
  }
}
