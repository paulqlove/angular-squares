/** Most squares a host can allow one player. */
export const MAX_SQUARE_LIMIT = 25;
export const DEFAULT_SQUARE_LIMIT = 5;

/** Names are compared ignoring case and extra spaces, so "Mike" and " mike  " count as one player. */
export function normalizePlayerKey(name: string): string {
  return (name || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

export function squaresHeldBy(squares: Record<string, string> | null | undefined, name: string): number {
  const key = normalizePlayerKey(name);
  if (!key) return 0;
  return Object.values(squares ?? {}).filter(n => normalizePlayerKey(n) === key).length;
}

/** The cap from the database, or undefined when the board has none. */
export function readSquareLimit(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 100 ? value : undefined;
}

export function clampSquareLimit(value: number): number {
  return Math.min(MAX_SQUARE_LIMIT, Math.max(1, Math.round(Number.isFinite(value) ? value : DEFAULT_SQUARE_LIMIT)));
}

/** How many squares this name holds against the board's limit, or null when the board has no limit or no name is given. Everyone is held to it, the host included. */
export function squareLimitState(
  squares: Record<string, string> | null | undefined,
  name: string,
  limit: number | undefined
): { held: number; max: number; full: boolean } | null {
  if (limit === undefined || !normalizePlayerKey(name)) return null;
  const held = squaresHeldBy(squares, name);
  return { held, max: limit, full: held >= limit };
}

/** The line shown when someone taps another empty square at their limit. */
export function squareLimitMessage(held: number, max: number): string {
  return `You have ${held} of ${max} squares. Tap one of yours to give it back.`;
}
