import type { BoardSize } from '../services/game.service';

/** Smaller board sizes a board can convert to: the picks must fit and the numbers must not be drawn yet. */
export function smallerBoardSizes(boardSize: BoardSize, squaresFilled: number, numbersDrawn: boolean): BoardSize[] {
  if (numbersDrawn) return [];
  return ([50, 25] as BoardSize[]).filter(s => s < boardSize && squaresFilled <= s);
}

/**
 * Re-deals picked squares into a smaller grid: every cell of the new grid is equally likely
 * for every pick, so no player ends up in a line. Each player keeps the same number of squares.
 * Returns null when the picks do not fit.
 */
export function shuffleSquares(squares: Record<string, string>, rows: number, cols: number): Record<string, string> | null {
  const players = Object.values(squares);
  if (players.length > rows * cols) return null;
  const cells: string[] = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) cells.push(`${r}-${c}`);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return Object.fromEntries(players.map((name, i) => [cells[i], name]));
}
