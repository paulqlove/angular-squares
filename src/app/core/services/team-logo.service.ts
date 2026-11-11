import { Injectable, inject, signal } from '@angular/core';
import { getTeamLogoByAbbreviation } from '../../features/content/teams-data';
import { EspnGame, EspnService, SportType } from './espn.service';

/** One team's look from ESPN: its logo (ESPN's image host only) and nickname. */
export interface TeamLook {
  logo: string | null;
  name: string | null;
}

/** The fields of a board that say which teams it shows and which ESPN game it follows. */
export interface LogoBoard {
  awayTeam?: string | null;
  homeTeam?: string | null;
  espnEventId?: string | null;
  espnSport?: SportType | string | null;
}

const STORAGE_KEY = 'qs_team_looks';

/** A game's two team looks, by team code. */
function byCode(game: EspnGame): Record<string, TeamLook> {
  const looks: Record<string, TeamLook> = {};
  if (game.awayTeam) looks[game.awayTeam.toUpperCase()] = { logo: game.awayLogo ?? null, name: game.awayName ?? null };
  if (game.homeTeam) looks[game.homeTeam.toUpperCase()] = { logo: game.homeLogo ?? null, name: game.homeName ?? null };
  return looks;
}

/**
 * Team logos for every board, in one place: the dashboard card, the board's axis caption, the box score and the TV view.
 * NFL teams use our own logo table. Other leagues (college, UFL, NBA...) use the logo ESPN sends with the linked game,
 * the same one the Edit game picker shows. A linked game is fetched once per session and kept by team code.
 */
@Injectable({ providedIn: 'root' })
export class TeamLogoService {
  private readonly espn = inject(EspnService);
  /** ESPN looks by `${sport}:${eventId}`, then by team code. */
  private readonly looks = signal<Record<string, Record<string, TeamLook>>>(this.readStored());
  private readonly asked = new Set<string>();

  /** Logo and nickname for each side of a board. Fetches the linked game's look in the background when it is not known yet. */
  teams(board: LogoBoard, linked?: EspnGame | null): { away: TeamLook; home: TeamLook } {
    const sport = (board.espnSport || 'nfl') as SportType;
    const eventId = board.espnEventId;
    // No signal writes here: templates call this.
    const known = !eventId || sport === 'nfl' ? undefined : linked?.id === eventId ? byCode(linked) : this.lookFor(sport, eventId);
    return { away: this.side(board.awayTeam, sport, known), home: this.side(board.homeTeam, sport, known) };
  }

  /** Keeps the look of a game already fetched (the game page and TV view poll it anyway). */
  remember(sport: SportType, game: EspnGame): void {
    if (sport === 'nfl') return;
    const key = `${sport}:${game.id}`;
    const looks = byCode(game);
    this.asked.add(key);
    if (JSON.stringify(this.looks()[key]) === JSON.stringify(looks)) return;
    this.looks.update(all => ({ ...all, [key]: looks }));
    this.store();
  }

  private lookFor(sport: SportType, eventId: string): Record<string, TeamLook> | undefined {
    const key = `${sport}:${eventId}`;
    const known = this.looks()[key];
    if (!known && !this.asked.has(key)) {
      this.asked.add(key);
      void this.espn.getGame(eventId, sport).then(game => {
        if (game) this.remember(sport, game);
      });
    }
    return known;
  }

  private side(team: string | null | undefined, sport: SportType, known: Record<string, TeamLook> | undefined): TeamLook {
    const code = (team || '').trim().toUpperCase();
    if (!code) return { logo: null, name: null };
    if (sport === 'nfl') return { logo: getTeamLogoByAbbreviation(code, 100), name: null };
    return known?.[code] ?? { logo: null, name: null };
  }

  private readStored(): Record<string, Record<string, TeamLook>> {
    try {
      const raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
      const parsed = raw ? JSON.parse(raw) : null;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private store(): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(this.looks()));
    } catch {}
  }
}
