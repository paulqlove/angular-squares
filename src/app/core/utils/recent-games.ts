import type { BoardSize, GameData } from '../services/game.service';
import { isBoardFull } from './board-groups';

/** A game and when this person last touched it: a visit on this device, or the day they created or joined it. */
export interface RecentVisit {
  at: number;
  id: string;
}

/** What the Your Games menu shows for each game: the next step is the state, and open squares only count while it fills. */
export type YourGameState = 'filling' | 'locked' | 'ready';

export interface YourGameRow {
  boardSize: BoardSize;
  /** The person hosts or co-hosts this game. */
  host: boolean;
  id: string;
  matchup: string;
  name: string;
  openCount: number;
  squaresFilled: number;
  state: YourGameState;
}

/** Games opened on this device, newest first. Kept for guests too, who have no list in the database. */
export const RECENT_GAMES_KEY = 'qs-recent-games';
/** How many visits the device keeps. The menu shows five; the rest cover games that were deleted since. */
export const RECENT_GAMES_KEPT = 20;

/** Ids the menu reads: how game codes look in links and in the database. */
const GAME_ID = /^[A-Za-z0-9_-]{1,64}$/;

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'getItem' | 'setItem'>;

/** Drops a game from this device's visits, for a game that was deleted. */
export function forgetRecentVisit(id: string, storage: WritableStorage | null = deviceStorage()): void {
  if (!storage) return;
  const kept = readRecentVisits(storage).filter(v => v.id !== id);
  write(storage, kept);
}

/**
 * The games the menu shows, newest first: the game on screen leads, then every other game by the latest of its visit,
 * creation or join. A game listed by both the device and the account counts once, at its latest time.
 */
export function pickYourGameIds(visits: RecentVisit[], index: RecentVisit[], currentId: string | null, limit: number): string[] {
  const latest = new Map<string, number>();
  for (const { id, at } of [...visits, ...index]) {
    if (id === currentId) continue;
    latest.set(id, Math.max(at, latest.get(id) ?? -Infinity));
  }
  const others = [...latest].sort((a, b) => b[1] - a[1]).map(([id]) => id);
  return (currentId ? [currentId, ...others] : others).slice(0, Math.max(0, limit));
}

/** This device's visits, newest first. Empty when storage is blocked or holds something unreadable. */
export function readRecentVisits(storage: ReadableStorage | null = deviceStorage()): RecentVisit[] {
  if (!storage) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(storage.getItem(RECENT_GAMES_KEY) || '[]');
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((v): v is RecentVisit =>
    !!v && typeof v === 'object' && typeof v.id === 'string' && GAME_ID.test(v.id) && typeof v.at === 'number' && Number.isFinite(v.at));
}

/** Puts a game at the top of this device's visits. */
export function recordRecentVisit(id: string, now = Date.now(), storage: WritableStorage | null = deviceStorage()): void {
  if (!storage || !GAME_ID.test(id)) return;
  const rest = readRecentVisits(storage).filter(v => v.id !== id);
  write(storage, [{ id, at: now }, ...rest].slice(0, RECENT_GAMES_KEPT));
}

/** One row of the menu. `userId` is the person looking, so a game they run carries the Host tag. */
export function toYourGameRow(game: Pick<GameData, 'awayTeam' | 'boardSize' | 'homeTeam' | 'id' | 'isLocked' | 'managerId' | 'name' | 'ownerId' | 'selectedSquares'>, userId: string | null): YourGameRow {
  const boardSize: BoardSize = game.boardSize === 25 || game.boardSize === 50 ? game.boardSize : 100;
  const squaresFilled = Object.keys(game.selectedSquares || {}).length;
  const board = { boardSize, isLocked: !!game.isLocked, squaresFilled };
  return {
    boardSize,
    host: !!userId && (game.ownerId === userId || game.managerId === userId),
    id: game.id ?? '',
    matchup: game.homeTeam && game.awayTeam ? `${game.awayTeam} vs ${game.homeTeam}` : 'Teams not set',
    name: game.name || 'Football Squares',
    openCount: Math.max(0, boardSize - squaresFilled),
    squaresFilled,
    state: board.isLocked ? 'locked' : isBoardFull(board) ? 'ready' : 'filling'
  };
}

/** localStorage, or null on the server and where the browser blocks it. */
function deviceStorage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

function write(storage: WritableStorage, visits: RecentVisit[]): void {
  try {
    storage.setItem(RECENT_GAMES_KEY, JSON.stringify(visits));
  } catch {
    // Full or blocked storage: the menu still has the account's own games.
  }
}
