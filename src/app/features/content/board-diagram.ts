export interface BoardDiagramOptions {
  /** Row labels, top to bottom. The away team runs down the side. */
  rows: string[];
  /** Column labels, left to right. The home team runs across the top. */
  cols: string[];
  /** The winning square as [row index, column index]. Its row and column labels light up too. */
  win: [number, number];
  /** Read by screen readers; shown under the diagram unless `showCaption` is false. */
  caption: string;
  showCaption?: boolean;
  /** Names already on squares, keyed "row-column" (indexes), each with a player color class. */
  names?: Record<string, [name: string, color: string]>;
}

export const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const PAIRS = ['0,1', '2,3', '4,5', '6,7', '8,9'];

const CELL = 'flex aspect-square items-center justify-center rounded-[3px] font-mono';
const HEAD = `${CELL} bg-qs-tile text-xs font-medium text-qs-tile-muted`;
const HEAD_HOT = `${CELL} bg-qs-accent text-xs font-semibold text-qs-on-accent`;

/** A board diagram built from the site's own tokens: navy labels, paper squares, the winning square in emerald. */
export function boardDiagram(o: BoardDiagramOptions): string {
  const [winRow, winCol] = o.win;
  const columns = o.cols.length + 1;
  const top = o.cols.map((label, c) => `<div class="${c === winCol ? HEAD_HOT : HEAD}">${label}</div>`).join('');
  const body = o.rows.map((label, r) => {
    const cells = o.cols.map((_, c) => {
      const named = o.names?.[`${r}-${c}`];
      if (r === winRow && c === winCol) return `<div class="${CELL} bg-qs-accent text-[10px] font-bold text-qs-on-accent">${named ? named[0] : 'WIN'}</div>`;
      return named
        ? `<div class="${CELL} ${named[1]} text-[10px] font-semibold text-slate-900">${named[0]}</div>`
        : `<div class="${CELL} bg-qs-panel"></div>`;
    }).join('');
    return `<div class="${r === winRow ? HEAD_HOT : HEAD}">${label}</div>${cells}`;
  }).join('');
  return `<figure class="not-prose" style="max-width:${(columns * 2.9).toFixed(1)}rem">
    <div class="qs-canvas rounded-card border border-qs-line p-3 sm:p-4">
      <div role="img" aria-label="${o.caption}" class="grid gap-[3px]" style="grid-template-columns:repeat(${columns},minmax(0,1fr))"><div></div>${top}${body}</div>
    </div>
    ${o.showCaption === false ? '' : `<figcaption class="mt-3 text-sm text-qs-muted">${o.caption}</figcaption>`}
  </figure>`;
}
