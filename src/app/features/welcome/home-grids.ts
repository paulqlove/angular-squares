import { DEMO_PLAYERS } from '../../shared/demo-players';

/** One axis cell: its digit (or digit pair) and whether it sits on the winning square's row or column. */
export interface GridAxis {
  label: string;
  hot: boolean;
}

/** One square. `blank` is an unsold square on an empty board; `open` is one still for sale while a board fills. */
export interface GridSquare {
  state: 'blank' | 'open' | 'claimed' | 'win';
  initials: string;
  /** Player color class for claimed and winning squares, '' otherwise. */
  color: string;
}

/** A small board drawn from the site's own tokens: away digits down the side, home digits across the top. */
export interface HomeGrid {
  rows: GridAxis[];
  cols: GridAxis[];
  /** Row by row, left to right. */
  squares: GridSquare[];
  /** Read by screen readers in place of the squares. */
  label: string;
}

export type BoardSize = 100 | 50 | 25;

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const PAIRS = ['0,1', '2,3', '4,5', '6,7', '8,9'];
/** A drawn order, so the filling board looks like a real one after the draw. */
const DRAWN_COLS = ['3', '8', '0', '7', '5', '1', '9', '4', '2', '6'];
const DRAWN_ROWS = ['6', '2', '9', '4', '0', '7', '3', '8', '1', '5'];
const BLANK: GridSquare = { state: 'blank', initials: '', color: '' };

/** An empty board of one size: 10 by 10 uses single digits, 50 pairs the away digits, 25 pairs both. */
export function emptyBoard(size: BoardSize): HomeGrid {
  const rowLabels = size === 100 ? DIGITS : PAIRS;
  const colLabels = size === 25 ? PAIRS : DIGITS;
  return {
    rows: axis(rowLabels),
    cols: axis(colLabels),
    squares: Array.from({ length: rowLabels.length * colLabels.length }, () => BLANK),
    label: `An empty ${rowLabels.length} by ${colLabels.length} board with ${size} squares`
  };
}

/** A 10 by 10 board part way through filling: most squares claimed, the rest still open. */
export function fillingBoard(): HomeGrid {
  const squares = DRAWN_ROWS.flatMap((_, r) => DRAWN_COLS.map((_, c) => {
    if ((r * 7 + c * 3) % 10 >= 7) return { state: 'open', initials: '', color: '' } as GridSquare;
    const player = DEMO_PLAYERS[(r * 3 + c) % DEMO_PLAYERS.length];
    return { state: 'claimed', initials: player.initials, color: player.color } as GridSquare;
  }));
  const grid: HomeGrid = { rows: axis(DRAWN_ROWS), cols: axis(DRAWN_COLS), squares, label: '' };
  return { ...grid, label: `A 10 by 10 board with ${openCount(grid)} squares still open` };
}

/** A three by three corner of a locked board, with the quarter's winning square in the middle. */
export function winningCorner(): HomeGrid {
  // Player indexes around the winner (JO, index 2), so no name shows twice
  const squares = [1, 4, 7, 0, 2, 6, 9, 3, 5].map((index, i) => {
    const player = DEMO_PLAYERS[index];
    return { state: i === 4 ? 'win' : 'claimed', initials: player.initials, color: player.color } as GridSquare;
  });
  return {
    rows: ['2', '7', '5'].map((label, i) => ({ label, hot: i === 1 })),
    cols: ['9', '4', '1'].map((label, i) => ({ label, hot: i === 1 })),
    squares,
    label: 'Part of a board where the row for 7 and the column for 4 meet at the winning square, JO'
  };
}

/** Number of squares that are still open on a board. */
export function openCount(grid: HomeGrid): number {
  return grid.squares.filter(s => s.state === 'open').length;
}

function axis(labels: string[]): GridAxis[] {
  return labels.map(label => ({ label, hot: false }));
}
