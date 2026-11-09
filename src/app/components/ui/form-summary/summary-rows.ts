import type { SummaryRow } from './form-summary.component';

/** The rows shared by the Create form and both Edit game forms, in one place so the wording cannot drift. */
export function summaryRows(input: {
  showInOpenBoards: boolean;
  boardName: string;
  pointsPerSquare: number | string;
  squaresFilled: number;
  boardSize: number;
  autoLock: boolean;
  /** "Mon, Nov 9 at 7:20 PM", or empty when the game has no known kickoff. */
  autoRunText: string;
}): SummaryRow[] {
  const rows: SummaryRow[] = [];
  if (input.showInOpenBoards) {
    rows.push({
      label: 'Shown in your open boards as',
      value: `${input.boardName || 'Your board'} · Points per square: ${input.pointsPerSquare} · ${input.squaresFilled}/${input.boardSize} taken`
    });
  }
  if (input.autoLock && input.autoRunText) {
    rows.push({ label: 'Auto-lock and draw', value: `Locks ${input.autoRunText}` });
  }
  return rows;
}
