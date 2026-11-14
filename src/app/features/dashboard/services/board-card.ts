import { GameListItem } from '../../../core/services/game.service';
import { autoLockAt, isBoardFilling, isBoardFull, isReadyToLock } from '../../../core/utils/board-groups';

/** "Sun 7:25 PM" when Auto-lock and draw will lock this full board, or '' when it is off or its time has passed. */
export function autoLockText(game: GameListItem, now: number = Date.now()): string {
  const runAt = autoLockAt(game, now);
  if (!runAt) return '';
  const soon = runAt - now < 6 * 86_400_000;
  return new Intl.DateTimeFormat(undefined, soon
    ? { weekday: 'short', hour: 'numeric', minute: '2-digit' }
    : { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(runAt);
}

/** Only the host locks from the card, and only a full board that is still open (the game page handles shrinking a half-empty one). */
export function canLockFromCard(game: GameListItem, joined: boolean): boolean {
  return !joined && isReadyToLock(game);
}

/** Filling cards carry Share invite; Ready to lock cards carry Lock now for the host. */
export function hasCardBar(game: GameListItem, joined: boolean): boolean {
  return isBoardFilling(game) || canLockFromCard(game, joined);
}

/** Full or locked boards need nothing sold: taken squares are filled and empty ones are left blank. */
export function isBoardQuiet(game: GameListItem): boolean {
  return game.isLocked || isBoardFull(game);
}

/** Squares still free, shown beside the mini board. */
export function openCount(game: GameListItem): number {
  return Math.max(0, (game.boardSize || 100) - game.squaresFilled);
}
