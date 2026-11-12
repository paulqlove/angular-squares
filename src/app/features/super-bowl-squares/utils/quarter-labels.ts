/** One quarter a square won: q1 to q4 and the square's "row-col" key. */
export interface QuarterWin {
  key: string;
  quarter: 'q1' | 'q2' | 'q3' | 'q4';
}

const LABELS: Record<QuarterWin['quarter'], string> = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'FINAL' };
const SHORT: Record<QuarterWin['quarter'], string> = { q1: '1', q2: '2', q3: '3', q4: 'F' };
const ORDER: QuarterWin['quarter'][] = ['q1', 'q2', 'q3', 'q4'];

/**
 * The tab text for each winning square: "Q1", "FINAL", or "Q1 Q3" for a square that won more than once.
 * Past two quarters, or with FINAL in a double, the full list is wider than a square on a smaller desktop (46px at
 * 1024 wide), so those go short: "ALL 4", "1·2·3", "2·F", "1·3·F". Singles and doubles without FINAL stay as they are.
 */
export function quarterLabels(wins: QuarterWin[]): Record<string, string> {
  const byKey = new Map<string, Set<QuarterWin['quarter']>>();
  for (const { key, quarter } of wins) {
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key)!.add(quarter);
  }
  const labels: Record<string, string> = {};
  for (const [key, quarters] of byKey) {
    const won = ORDER.filter(q => quarters.has(q));
    const short = won.length > 2 || (won.length === 2 && quarters.has('q4'));
    labels[key] = won.length === 4 ? 'ALL 4' : short ? won.map(q => SHORT[q]).join('·') : won.map(q => LABELS[q]).join(' ');
  }
  return labels;
}
