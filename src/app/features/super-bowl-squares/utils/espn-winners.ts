type QuarterScore = { home: number; away: number };

/**
 * Whether a linked game's quarter is settled: Q1–Q3 once the period has passed them, Q4 once ESPN marks the
 * game completed. Same rule as winnersForCompletedQuarters in functions/src/scoring.ts.
 */
export function espnQuarterIsComplete(index: number, period: number, completed: boolean): boolean {
  return index === 3 ? completed : period > index + 1;
}

/** True when two winner maps name the same player for every quarter. */
export function sameWinners(a: Record<string, string> | null | undefined, b: Record<string, string> | null | undefined): boolean {
  const left = a ?? {}, right = b ?? {};
  const keys = new Set([...Object.keys(left), ...Object.keys(right)]);
  for (const key of keys) {
    if (left[key] !== right[key]) return false;
  }
  return true;
}

/** True when two sets of quarter scores match. */
export function sameScores(a: Record<string, QuarterScore | undefined>, b: Record<string, QuarterScore | undefined>): boolean {
  return (['q1', 'q2', 'q3', 'q4'] as const).every(q => a[q]?.home === b[q]?.home && a[q]?.away === b[q]?.away);
}
