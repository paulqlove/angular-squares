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

/** True when this name already holds the most squares the board allows. */
export function atSquareLimit(squares: Record<string, string> | null | undefined, name: string, limit: number | undefined): boolean {
  return limit !== undefined && squaresHeldBy(squares, name) >= limit;
}

/** "5 each fills the board with 20 players or more." A cap too tight for the room would stall the board. */
export function squareLimitPreview(limit: number, boardSize: number): string {
  return `${limit} each fills the board with ${Math.ceil(boardSize / limit)} players or more.`;
}
