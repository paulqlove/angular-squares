/**
 * More-tab lists. Each board points at one list (`games/{id}/openListId`): one of its
 * owner's groups, or the owner's No group key. `openLists/{listId}/{boardId}` holds the
 * owner's uid while the board is shown. See database.rules.notes.md "Game groups".
 */

const KEY_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const KEY_LENGTH = 20;
/** The most list entries the More tab reads, a page at a time, to find the boards it shows. */
export const MAX_OPEN_BOARDS = 30;

/** A board the More-tab writes act on. */
export interface OpenListTarget {
  id: string;
  ownerId: string;
  openListId?: string;
}

/** A random list key (a group id or the No group key). Hard to guess, so a link to one board never reveals another list. */
export function newListKey(randomByte: () => number = cryptoByte): string {
  let key = '';
  for (let i = 0; i < KEY_LENGTH; i++) key += KEY_CHARS.charAt(randomByte() % KEY_CHARS.length);
  return key;
}

/** True for a key the database rules accept as a list key. */
export function isListKey(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{16,40}$/.test(value);
}

/**
 * Board ids in a list that belong to this owner, without the board on screen. Anything else
 * (another host's uid copied into a list) is dropped.
 */
export function listedBoardIds(list: Record<string, unknown> | null, ownerId: string, excludeId: string): string[] {
  return Object.entries(list ?? {})
    .filter(([id, value]) => id !== excludeId && value === ownerId)
    .map(([id]) => id)
    .slice(0, MAX_OPEN_BOARDS);
}

/** The writes that file a board into a list, keeping its More-tab entry (if shown) in step. */
export function fileBoardUpdates(board: OpenListTarget, listId: string, shown: boolean): Record<string, unknown> {
  const updates: Record<string, unknown> = {
    [`games/${board.id}/openListId`]: listId,
    [`games/${board.id}/showInOpenBoards`]: shown ? true : null,
    [`openLists/${listId}/${board.id}`]: shown ? board.ownerId : null
  };
  if (board.openListId && board.openListId !== listId) updates[`openLists/${board.openListId}/${board.id}`] = null;
  return updates;
}

function cryptoByte(): number {
  return crypto.getRandomValues(new Uint8Array(1))[0];
}
