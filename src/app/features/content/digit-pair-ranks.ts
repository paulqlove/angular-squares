/** One digit pair from the hit-rate table: the away team's last digit, the home team's, and its share in percent. */
export interface DigitPair {
  away: number;
  home: number;
  share: number;
}

/** A hit-rate table keyed "away,home", values in percent (the shape of SQUARES_PROBABILITIES). */
export type DigitPairTable = Record<string, number>;

/**
 * The most common digit pairs, best first. 7-0 and 0-7 count as one pair, named the way round that
 * scored higher; a tie keeps the table's own order.
 */
export function topDigitPairs(table: DigitPairTable, count: number): DigitPair[] {
  return rankPairs(table, count, (a, b) => b.share - a.share);
}

/** The least common digit pairs, worst first, counted and named the same way as topDigitPairs. */
export function bottomDigitPairs(table: DigitPairTable, count: number): DigitPair[] {
  return rankPairs(table, count, (a, b) => a.share - b.share);
}

function rankPairs(table: DigitPairTable, count: number, order: (a: DigitPair, b: DigitPair) => number): DigitPair[] {
  const cells = Object.entries(table).map(([key, share]) => {
    const [away, home] = key.split(',').map(Number);
    return { away, home, share };
  });
  // Each pair is ranked by its higher way round, so a rare cell whose mirror is common never reads as a rare pair.
  const best = new Map<string, DigitPair>();
  for (const cell of [...cells].sort((a, b) => b.share - a.share)) {
    const id = [cell.away, cell.home].sort().join(',');
    if (!best.has(id)) best.set(id, cell);
  }
  return [...best.values()].sort(order).slice(0, count);
}
