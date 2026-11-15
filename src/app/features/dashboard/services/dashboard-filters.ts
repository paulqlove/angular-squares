import { GameListItem } from '../../../core/services/game.service';
import { GAME_CODE_LENGTH } from '../../../core/utils/game-code';
import { teamSearchTerms } from '../../../core/utils/card-teams';

/** Grid shows the tall cards from 640px up; Compact shows every board as a short row. */
export type CardView = 'grid' | 'compact';

/** The extra search words for a board: its teams (as TeamLogoService.teams gives them) and its group's name. */
export interface SearchLookups {
  teamsOf: (game: GameListItem) => Parameters<typeof teamSearchTerms>[3];
  /** The owner's group name for a hosted board. Only the owner's own list uses it, so players never search by group. */
  groupNameOf?: (game: GameListItem) => string | undefined;
}

/** Grid / Compact is a hosting tool: players who don't host games always see Grid. */
export function activeCardView(canCreateGame: boolean, chosen: CardView): CardView {
  return canCreateGame ? chosen : 'grid';
}

/** Board columns: two or three tall cards in Grid; as many 19rem rows as fit in Compact. */
export function cardGridClass(view: CardView): string {
  return view === 'grid' ? 'sm:grid-cols-2 xl:grid-cols-3' : 'sm:grid-cols-[repeat(auto-fill,minmax(19rem,1fr))]';
}

/** "Game not found" shows for the code in the field after Enter, or after a broken game link, until the text changes. */
export function codeErrorShows(codeNotFound: string | null, candidate: string | null): boolean {
  return !!codeNotFound && codeNotFound === candidate;
}

/** The game code the server confirmed for the current text, or null. Join shows inside the field while it's set. */
export function confirmedCodeMatch(candidate: string | null, confirmed: string | null): string | null {
  return candidate && confirmed === candidate ? candidate : null;
}

/**
 * Hosted boards matching the search (name, code, teams or group), newest first. A real game code, or a code
 * with no game, doesn't narrow the list: the code joins, or "Game not found" shows over the list as it is.
 */
export function filterHostedGames(games: GameListItem[], search: string, codeInField: boolean, lookups: SearchLookups): GameListItem[] {
  const query = codeInField ? '' : search.trim().toLowerCase();
  const terms = (g: GameListItem): (string | undefined)[] =>
    [g.name, g.id, lookups.groupNameOf?.(g), ...teamSearchTerms(g.awayTeam, g.homeTeam, g.espnSport, lookups.teamsOf(g))];
  return games
    .filter(g => !query || terms(g).some(v => (v || '').toLowerCase().includes(query)))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/**
 * The search text as a game code: six letters or digits once spaces, dashes and other marks are dropped, upper-cased,
 * so a pasted "abc-123" or "ABC 123" works. Null when it can't be one. The server confirms the code before Join shows.
 */
export function gameCodeFrom(text: string): string | null {
  const letters = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
  return letters.length === GAME_CODE_LENGTH ? letters : null;
}
