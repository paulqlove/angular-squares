/** How long a board with no linked game stays active. */
export const UNLINKED_BOARD_ACTIVE_MS = 48 * 60 * 60 * 1000;

/** Free hosts can have this many active boards at once. */
export const FREE_ACTIVE_BOARD_LIMIT = 1;

export const NOTIFY_EMAIL_MAX_LENGTH = 254;
export const NOTIFY_SOURCE_MAX_LENGTH = 64;
export const NOTIFY_SOURCE = 'upgrade_dialog';
export const UPGRADE_NOTIFY_EVENT = 'upgrade_notify_click';

/**
 * Same shape as the Realtime Database rule on notifyMe/$id/email.
 * RTDB `.matches()` is case-sensitive, so both cases are listed.
 */
export const NOTIFY_EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;

export interface BoardActivity {
  createdAt: number | null;
  espnEventId?: string | null;
  /**
   * Result of the linked-game lookup.
   * true: the linked game is final.
   * false: the linked game is not final.
   * null: unknown, or the board has no linked game.
   */
  linkedGameFinal: boolean | null;
}

export interface EspnStatusLike {
  name?: string;
  state?: string;
  completed?: boolean;
}

export function hasLinkedGame(espnEventId: string | null | undefined): boolean {
  return typeof espnEventId === 'string' && espnEventId.trim().length > 0;
}

/**
 * A linked board stays active until that game is confirmed final.
 * An unknown lookup stays active. A board with no linked game stays active
 * until 48 hours after createdAt. A missing timestamp stays active so an
 * older record is not treated as expired.
 */
export function isBoardActive(board: BoardActivity, nowMs: number): boolean {
  if (hasLinkedGame(board.espnEventId)) {
    return board.linkedGameFinal !== true;
  }
  if (typeof board.createdAt !== 'number' || !Number.isFinite(board.createdAt)) {
    return true;
  }
  return nowMs - board.createdAt < UNLINKED_BOARD_ACTIVE_MS;
}

/**
 * Map a public scoreboard status onto final / not final / unknown.
 * Postponed, delayed, suspended, and canceled games are not final.
 */
export function isEspnStatusFinal(status: EspnStatusLike | null | undefined): boolean | null {
  if (!status) {
    return null;
  }
  const name = status.name || '';
  if (name === 'STATUS_FINAL' || name.startsWith('STATUS_FINAL_')) {
    return true;
  }
  if (
    name === 'STATUS_CANCELED' ||
    name === 'STATUS_CANCELLED' ||
    name === 'STATUS_POSTPONED' ||
    name === 'STATUS_SUSPENDED' ||
    name === 'STATUS_DELAYED'
  ) {
    return false;
  }
  if (status.state === 'pre' || status.state === 'in') {
    return false;
  }
  if (status.completed === true && status.state === 'post') {
    return true;
  }
  return null;
}
