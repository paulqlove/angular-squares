/**
 * Free hosts' games per season: which games count, which season they fall in, and how many are left.
 * The cap itself is PlanFeatures.seasonGames in core/plans.ts.
 */

/**
 * The on/off switch for the per-season cap. Off: nothing counts, nothing is saved, and no copy about it shows.
 * Turn it on only after the seasonGames rules are deployed, or deletes and resets will fail.
 */
export const SEASON_LIMIT_ON = false;

/** A season starts on July 1 (UTC) and runs to June 30, the same window as the Season Pass. 6 is July (months count from 0). */
export const SEASON_START_MONTH = 6;

/** A game counts toward the season once this many squares are claimed on it. */
export const SQUARES_TO_COUNT = 1;

/** One game on a board: a reset starts a new one, so a board can hold several over a season. */
export interface SeasonGame {
  id: string;
  createdAt: number;
  /** When the board was last reset. A board never reset started at createdAt. */
  startedAt?: number;
  squaresFilled: number;
}

/** True once someone has claimed a square on the game. */
export function gameCounts(squaresFilled: number): boolean {
  return squaresFilled >= SQUARES_TO_COUNT;
}

/** The season a time falls in, named by the year it starts: Sep 2026 and Feb 2027 are both '2026'. */
export function seasonOf(ms: number): string {
  const date = new Date(ms);
  const year = date.getUTCFullYear();
  return String(date.getUTCMonth() >= SEASON_START_MONTH ? year : year - 1);
}

/** When this game started: its last reset, or when the board was made. */
export function gameStart(game: SeasonGame): number {
  return game.startedAt ?? game.createdAt;
}

/** The key the game is saved under in seasonGames/{ownerId}/{season}. */
export function seasonGameKey(game: SeasonGame): string {
  return `${game.id}_${gameStart(game)}`;
}

/** True when the game counts toward a season: it has players and a known start time. */
export function isCounted(game: SeasonGame): boolean {
  return gameCounts(game.squaresFilled) && gameStart(game) > 0;
}

/** The path that records this game toward its owner's season, or null when it doesn't count. */
export function seasonGamePath(ownerId: string, game: SeasonGame): string | null {
  if (!isCounted(game)) return null;
  return `seasonGames/${ownerId}/${seasonOf(gameStart(game))}/${seasonGameKey(game)}`;
}

/** Games used this season: the ones already saved, plus the host's boards with players that aren't saved yet. */
export function gamesUsed(saved: readonly string[], boards: readonly SeasonGame[], now: number): number {
  const season = seasonOf(now);
  const used = new Set(saved);
  for (const board of boards) {
    if (isCounted(board) && seasonOf(gameStart(board)) === season) used.add(seasonGameKey(board));
  }
  return used.size;
}

/** Games left this season under this cap, never below 0. */
export function gamesLeft(cap: number, used: number): number {
  return Math.max(0, cap - used);
}

/** The delete-confirm line for a game that stays counted after it's deleted, or '' when there's nothing to say. */
export function deleteCountNote(game: SeasonGame, cap: number, now: number, on: boolean = SEASON_LIMIT_ON): string {
  if (!seasonLimitApplies(cap, on) || !isCounted(game) || seasonOf(gameStart(game)) !== seasonOf(now)) return '';
  return `This game has players, so it still counts as 1 of your ${cap} free games this season.`;
}

/** True when the cap applies: the switch is on and the plan has a finite cap. */
export function seasonLimitApplies(cap: number, on: boolean = SEASON_LIMIT_ON): boolean {
  return on && Number.isFinite(cap);
}

/** What Clear game does: clear as before, clear with a line that the new game will count, or open the season dialog instead. */
export type ClearGameStep = 'clear' | 'note' | 'blocked';

/** Clearing an empty board can't start a counted game, so only a board with players gets the line or the block. Null left means no cap. */
export function clearGameStep(squaresFilled: number, left: number | null): ClearGameStep {
  if (left === null || !gameCounts(squaresFilled)) return 'clear';
  return left > 0 ? 'note' : 'blocked';
}

/** The extra line on the clear confirm for a host under the cap. */
export function clearCountNote(left: number, cap: number): string {
  return `Once someone claims a square, this counts as a new game. You have ${left} of ${cap} free games left this season.`;
}
