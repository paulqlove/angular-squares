import { summaryRows } from './summary-rows';

const base = { showInOpenBoards: false, boardName: 'Office pool', pointsPerSquare: 10, squaresFilled: 5, boardSize: 100, autoLock: false, autoRunText: 'Mon, Nov 9 at 7:20 PM' };

describe('summaryRows', () => {
  it('is empty when nothing in the form needs summarising', () => {
    expect(summaryRows(base)).toEqual([]);
  });

  it('describes how the board will appear in the open boards list', () => {
    expect(summaryRows({ ...base, showInOpenBoards: true })).toEqual([
      { label: 'Shown in your open boards as', value: 'Office pool · Points per square: 10 · 5/100 taken' }
    ]);
  });

  it('falls back to a generic name for a board with no name yet', () => {
    expect(summaryRows({ ...base, showInOpenBoards: true, boardName: '', squaresFilled: 0 })[0].value).toBe('Your board · Points per square: 10 · 0/100 taken');
  });

  it('shows when the board will lock, only with auto-lock on and a known kickoff', () => {
    expect(summaryRows({ ...base, autoLock: true })).toEqual([{ label: 'Auto-lock and draw', value: 'Locks Mon, Nov 9 at 7:20 PM' }]);
    expect(summaryRows({ ...base, autoLock: true, autoRunText: '' })).toEqual([]);
    expect(summaryRows({ ...base, autoLock: false })).toEqual([]);
  });

  it('lists both, open boards first', () => {
    const rows = summaryRows({ ...base, showInOpenBoards: true, autoLock: true });
    expect(rows.map(r => r.label)).toEqual(['Shown in your open boards as', 'Auto-lock and draw']);
  });
});
