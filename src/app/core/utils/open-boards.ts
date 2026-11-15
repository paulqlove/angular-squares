import type { BoardSize, GameData } from '../services/game.service';

/** The More tab shows at most this many boards. */
export const OPEN_ROWS_SHOWN = 10;

export interface OpenBoardRow {
  id: string;
  name: string;
  awayTeam: string;
  homeTeam: string;
  taken: number;
  size: BoardSize;
  open: number;
  pricePerSquare: number;
  /** Points per square times the number of squares. */
  totalPoints: number;
}

/** A host's boards a player on a full board can join: the same host, opted in, open squares, not locked. Most open first. */
export function openBoardRows(games: (GameData | null)[], excludeId: string, ownerId: string): OpenBoardRow[] {
  const rows: OpenBoardRow[] = [];
  for (const g of games) {
    if (!g || !g.id || g.id === excludeId || g.ownerId !== ownerId || !g.showInOpenBoards || g.isLocked) continue;
    const size: BoardSize = g.boardSize ?? 100;
    const taken = Object.keys(g.selectedSquares ?? {}).length;
    if (taken >= size) continue;
    rows.push({
      id: g.id,
      name: g.name,
      awayTeam: g.awayTeam,
      homeTeam: g.homeTeam,
      taken,
      size,
      open: size - taken,
      pricePerSquare: g.pricePerSquare,
      totalPoints: g.pricePerSquare * size
    });
  }
  return rows.sort((a, b) => b.open - a.open);
}

/**
 * Reads listed boards a page at a time until there are enough to show, so locked, full or
 * finished boards early in a host's list can't hide the open ones after them.
 */
export async function findOpenBoardRows(ids: string[], read: (id: string) => Promise<GameData | null>, excludeId: string, ownerId: string): Promise<OpenBoardRow[]> {
  const games: (GameData | null)[] = [];
  let rows: OpenBoardRow[] = [];
  for (let start = 0; start < ids.length && rows.length < OPEN_ROWS_SHOWN; start += OPEN_ROWS_SHOWN) {
    games.push(...await Promise.all(ids.slice(start, start + OPEN_ROWS_SHOWN).map(read)));
    rows = openBoardRows(games, excludeId, ownerId);
  }
  return rows.slice(0, OPEN_ROWS_SHOWN);
}
