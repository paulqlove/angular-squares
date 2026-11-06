/** Q4 reads "Final" once the game is over: it holds the final score, overtime included. */
export function quarterLabel(quarter: string, gameOver: boolean): string {
  return quarter === 'q4' && gameOver ? 'Final' : quarter.toUpperCase();
}

/**
 * Live-score boards (linked to ESPN): over only when the feed says so, or when a Q4 winner is saved
 * (that is only ever written once ESPN marks the game completed). Manual boards: a Q4 score is only
 * entered once the game is over. Never infer it from the q4 score on a linked board, because the
 * browser poller writes the running total into q4 all game long.
 */
export function isGameOver(board: {
  espnEventId?: string | null;
  espnLive?: { completed: boolean } | null;
  linkedStatus?: string | null;
  q4?: { home: number; away: number } | null;
  q4Winner?: string | null;
}): boolean {
  if (board.espnEventId) return !!board.espnLive?.completed || board.linkedStatus === 'post' || !!board.q4Winner;
  return !!board.q4 && (board.q4.home > 0 || board.q4.away > 0);
}

/**
 * How many quarters have started, for the Winners tiles. Linked boards follow the feed's period because the
 * poller writes the running total into every later quarter, so a quarter that has not started would repeat
 * the score. Manual boards, finished games and an unknown feed (still loading) count all four as started.
 */
export function startedQuarterCount(board: {
  espnEventId?: string | null;
  gameOver: boolean;
  linkedStatus?: string | null;
  period?: number | null;
}): number {
  if (!board.espnEventId || board.gameOver || !board.linkedStatus) return 4;
  if (board.linkedStatus === 'pre') return 0;
  return Math.max(1, Math.min(4, board.period ?? 1));
}
