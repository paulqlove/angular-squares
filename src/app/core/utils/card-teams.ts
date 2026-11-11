import { getTeamByAbbreviation, getTeamLogo } from '../../features/content/teams-data';

/** One team line on a dashboard card: logo (NFL only), short code, and name. Empty parts are left out. */
export interface CardTeam {
  code: string;
  logo: string | null;
  name: string;
}

/**
 * The two team lines for a board card, away first, or null when the teams aren't set.
 * Boards linked to ESPN store team codes (DAL); custom boards store whatever the host typed.
 * Logos come from our NFL table, so only NFL teams get one.
 */
export function cardTeams(awayTeam: string | undefined, homeTeam: string | undefined, sport?: string): CardTeam[] | null {
  const away = (awayTeam || '').trim();
  const home = (homeTeam || '').trim();
  if (!away || !home) return null;
  return [cardTeam(away, sport), cardTeam(home, sport)];
}

function cardTeam(value: string, sport?: string): CardTeam {
  const nfl = !sport || sport === 'nfl' ? getTeamByAbbreviation(value) : undefined;
  if (nfl) return { code: nfl.abbreviation, logo: getTeamLogo(nfl, 100), name: nfl.name };
  if (/^[A-Z0-9&.]{2,5}$/.test(value)) return { code: value, logo: null, name: '' };
  return { code: '', logo: null, name: value };
}
