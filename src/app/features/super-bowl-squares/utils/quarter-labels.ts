/** One quarter a square won: q1 to q4 and the square's "row-col" key. */
export interface QuarterWin {
  key: string;
  quarter: 'q1' | 'q2' | 'q3' | 'q4';
}

const LABELS: Record<QuarterWin['quarter'], string> = { q1: 'Q1', q2: 'Q2', q3: 'Q3', q4: 'FINAL' };
const ORDER: QuarterWin['quarter'][] = ['q1', 'q2', 'q3', 'q4'];

/** The tab text for each winning square: "Q1", "FINAL", or "Q1 Q3" for a square that won more than once. */
export function quarterLabels(wins: QuarterWin[]): Record<string, string> {
  const byKey = new Map<string, Set<QuarterWin['quarter']>>();
  for (const { key, quarter } of wins) {
    if (!byKey.has(key)) byKey.set(key, new Set());
    byKey.get(key)!.add(quarter);
  }
  const labels: Record<string, string> = {};
  for (const [key, quarters] of byKey) {
    labels[key] = ORDER.filter(q => quarters.has(q)).map(q => LABELS[q]).join(' ');
  }
  return labels;
}
