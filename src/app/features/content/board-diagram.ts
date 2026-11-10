export interface BoardDiagramOptions {
  /** Row labels, top to bottom. The away team runs down the side. */
  rows: string[];
  /** Column labels, left to right. The home team runs across the top. */
  cols: string[];
  /** The winning square as [row index, column index]. Its row and column labels light up too. */
  win: [number, number];
  caption: string;
  /** Names already on squares, keyed "row-column" (indexes), each with a player color class. */
  names?: Record<string, [name: string, color: string]>;
  /** Taller squares, for the hero. */
  large?: boolean;
}

export const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
export const PAIRS = ['0,1', '2,3', '4,5', '6,7', '8,9'];

const HEAD = 'rounded-[3px] bg-qs-tile font-medium text-qs-tile-muted';
const HEAD_HOT = 'rounded-[3px] bg-qs-accent font-semibold text-qs-on-accent';

/** A board diagram built from the site's own tokens: navy labels, paper squares, the winning square in emerald. */
export function boardDiagram(o: BoardDiagramOptions): string {
  const [winRow, winCol] = o.win;
  const size = o.large ? 'h-8 sm:h-9' : 'h-7';
  const head = (label: string, hot: boolean) => `<th scope="col" class="${hot ? HEAD_HOT : HEAD} ${size} text-xs">${label}</th>`;
  const rows = o.rows.map((label, r) => {
    const cells = o.cols.map((_, c) => {
      const named = o.names?.[`${r}-${c}`];
      if (r === winRow && c === winCol) return `<td class="rounded-[3px] bg-qs-accent text-[10px] font-bold tracking-wide text-qs-on-accent">${named ? named[0] : 'WIN'}</td>`;
      return named
        ? `<td class="rounded-[3px] ${named[1]} text-[10px] font-semibold text-slate-900">${named[0]}</td>`
        : `<td class="rounded-[3px] bg-qs-panel"></td>`;
    }).join('');
    return `<tr class="${size}"><th scope="row" class="${r === winRow ? HEAD_HOT : HEAD} px-1 text-xs">${label}</th>${cells}</tr>`;
  }).join('');
  return `<figure class="not-prose">
    <div class="qs-canvas rounded-card border border-qs-line p-3 sm:p-5">
      <table class="w-full table-fixed border-separate border-spacing-[3px] text-center font-mono" aria-label="${o.caption}">
        <colgroup><col class="w-11">${o.cols.map(() => '<col>').join('')}</colgroup>
        <thead><tr class="${size}"><th class="${HEAD} text-[10px]"><span aria-hidden="true">↓ →</span></th>${o.cols.map((label, c) => head(label, c === winCol)).join('')}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
    <figcaption class="mt-3 text-sm text-qs-muted">${o.caption}</figcaption>
  </figure>`;
}
