import { BoardSize, getBoardDimensions } from '../services/game.service';

/**
 * One shuffled line of numbers for a board side, the same rule the auto-lock function uses:
 * a 10-wide side gets the digits 0-9, a 5-wide side gets the pair groups 0-4 (0 = digits 0,1).
 * Fisher-Yates, so every order is equally likely.
 */
export function drawNumberLine(count: number, rng: () => number = Math.random): number[] {
  const line = Array.from({ length: count === 10 ? 10 : 5 }, (_, i) => i);
  for (let i = line.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [line[i], line[j]] = [line[j], line[i]];
  }
  return line;
}

/** Both lines for a board: home runs across the columns, away down the rows. */
export function drawBoardNumbers(boardSize: BoardSize, rng: () => number = Math.random): { homeNumbers: number[]; awayNumbers: number[] } {
  const { rows, cols } = getBoardDimensions(boardSize);
  return { homeNumbers: drawNumberLine(cols, rng), awayNumbers: drawNumberLine(rows, rng) };
}
