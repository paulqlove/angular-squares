import type { EspnGame } from '../services/espn.service';

/** Games whose short or full team names contain the search, ignoring case and outer spaces. */
export function filterGames(games: EspnGame[], search: string): EspnGame[] {
  const query = search.toLowerCase().trim();
  if (!query) return games;
  return games.filter(g =>
    g.homeTeam.toLowerCase().includes(query) ||
    g.awayTeam.toLowerCase().includes(query) ||
    g.homeTeamFull.toLowerCase().includes(query) ||
    g.awayTeamFull.toLowerCase().includes(query)
  );
}
