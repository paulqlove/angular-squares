/**
 * Digits for the pre-numbered printable sheet. The order is shuffled once from a fixed seed, so the
 * prerendered HTML, the browser and the PDF all show the same numbers.
 */

/** Seeds for the two sides of the pre-numbered sheet. Changing one changes the printed board and its PDF. */
export const PRE_NUMBERED_SEEDS = { home: 2027, away: 214 } as const;

/** The digits 0 through 9 in a shuffled order that is always the same for the same seed. */
export function seededDigitOrder(seed: number): number[] {
  const next = mulberry32(seed);
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
  for (let i = digits.length - 1; i > 0; i -= 1) {
    const j = Math.floor(next() * (i + 1));
    [digits[i], digits[j]] = [digits[j], digits[i]];
  }
  return digits;
}

/** A small seeded random number generator: each call returns the next number in [0, 1). */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
