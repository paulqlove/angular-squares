import type { BoardSize, GameData } from '../services/game.service';

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

/** A host's boards a player on a full board can join: opted in, open squares, not locked. Most open first. */
export function openBoardRows(games: (GameData | null)[], excludeId: string): OpenBoardRow[] {
  const rows: OpenBoardRow[] = [];
  for (const g of games) {
    if (!g || !g.id || g.id === excludeId || !g.showInOpenBoards || g.isLocked) continue;
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
