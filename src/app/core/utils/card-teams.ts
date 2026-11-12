import { getTeamByAbbreviation, getTeamLogo } from '../../features/content/teams-data';
import type { TeamLook } from '../services/team-logo.service';

/** One team line on a dashboard card: logo, short code, and name. Empty parts are left out. */
export interface CardTeam {
  code: string;
  logo: string | null;
  name: string;
}

/**
 * The two team lines for a board card, away first, or null when the teams aren't set.
 * Boards linked to ESPN store team codes (DAL); custom boards store whatever the host typed.
 * NFL logos come from our own table; other leagues pass in ESPN's look for the linked game (TeamLogoService).
 */
export function cardTeams(
  awayTeam: string | undefined,
  homeTeam: string | undefined,
  sport?: string,
  looks?: { away: TeamLook; home: TeamLook }
): CardTeam[] | null {
  const away = (awayTeam || '').trim();
  const home = (homeTeam || '').trim();
  if (!away || !home) return null;
  return [cardTeam(away, sport, looks?.away), cardTeam(home, sport, looks?.home)];
}

/**
 * Every name a board's teams go by, for dashboard search: what the board saved (PHI),
 * plus the NFL city and name (Philadelphia, Eagles) or the name ESPN gives other leagues.
 */
export function teamSearchTerms(
  awayTeam: string | undefined,
  homeTeam: string | undefined,
  sport?: string,
  looks?: { away: TeamLook; home: TeamLook }
): string[] {
  return [teamTerms(awayTeam, sport, looks?.away), teamTerms(homeTeam, sport, looks?.home)].flat();
}

function teamTerms(saved: string | undefined, sport?: string, look?: TeamLook): string[] {
  const value = (saved || '').trim();
  if (!value) return [];
  const nfl = !sport || sport === 'nfl' ? getTeamByAbbreviation(value) : undefined;
  if (nfl) return [value, `${nfl.city} ${nfl.name}`];
  return look?.name ? [value, look.name] : [value];
}

function cardTeam(value: string, sport?: string, look?: TeamLook): CardTeam {
  const nfl = !sport || sport === 'nfl' ? getTeamByAbbreviation(value) : undefined;
  if (nfl) return { code: nfl.abbreviation, logo: getTeamLogo(nfl, 100), name: nfl.name };
  if (/^[A-Z0-9&.]{2,5}$/.test(value)) return { code: value, logo: look?.logo ?? null, name: look?.name ?? '' };
  return { code: '', logo: null, name: value };
}
