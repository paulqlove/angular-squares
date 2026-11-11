import type { BoardSize } from '../services/game.service';

/** One entry per square, for drawing a small thumbnail of a board. */
export function miniGridCells(size: BoardSize): number[] {
  return Array.from({ length: size }, (_, i) => i);
}

/** Columns for the thumbnail: 25 is 5 wide, 50 and 100 are 10 wide. */
export function miniGridClass(size: BoardSize): string {
  return size === 25 ? 'grid-cols-5' : 'grid-cols-10';
}

/** One thumbnail square: open or claimed while the board fills, blank or taken once it's full or locked. Claimed squares fill from the top. */
export function miniCellClass(index: number, squaresFilled: number, quiet: boolean): string {
  const taken = index < squaresFilled;
  if (quiet) return taken ? 'qs-mini-taken' : 'qs-mini-blank';
  return taken ? 'qs-mini-claimed' : 'qs-mini-open';
}
