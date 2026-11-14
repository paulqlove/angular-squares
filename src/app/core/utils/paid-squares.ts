import type { PaidCounts } from './game-data';

/**
 * A host's Confirm covers the squares a player held at that moment. The count sits in `paidSquares` at the same
 * position as the name in `paidPlayers`, so a player's own rename (which keeps the position) keeps it, and a square
 * added later shows the player as Unconfirmed until the host confirms them again.
 */

type Squares = { [key: string]: string };
type NameCounts = { [name: string]: number };

/**
 * Players who count as Confirmed: on the paid list and holding no more squares than the host confirmed. A paid entry
 * with no count yet (confirmed before counts were kept) counts as Confirmed for what the name holds now.
 */
export function confirmedPlayers(squares: Squares, paidPlayers: Iterable<string>, paidSquares: PaidCounts = {}): Set<string> {
  const held = squaresByPlayer(squares);
  const confirmed = new Set<string>();
  Array.from(paidPlayers).forEach((name, i) => {
    const count = held[name] ?? 0;
    if (count > 0 && count <= (countAt(paidSquares, i) ?? count)) confirmed.add(name);
  });
  return confirmed;
}

/** The counts with each gap filled in by what that name holds now, or null when no paid entry is missing one. */
export function filledPaidSquares(squares: Squares, paidPlayers: Iterable<string>, paidSquares: PaidCounts = {}): number[] | null {
  const players = Array.from(paidPlayers);
  if (players.every((_, i) => countAt(paidSquares, i) !== undefined)) return null;
  const held = squaresByPlayer(squares);
  return players.map((name, i) => countAt(paidSquares, i) ?? held[name] ?? 0);
}

/** Each paid name's count, by name. */
export function paidCountsByName(paidPlayers: Iterable<string>, paidSquares: PaidCounts = {}): NameCounts {
  const counts: NameCounts = {};
  Array.from(paidPlayers).forEach((name, i) => {
    const count = countAt(paidSquares, i);
    if (count !== undefined) counts[name] = count;
  });
  return counts;
}

/**
 * The counts to save with the host's new paid list, in its order. A name the host just confirmed gets the squares
 * the host saw for it (never more than it holds now); any other name keeps its earlier count, so squares added while
 * the list was open stay unconfirmed.
 */
export function paidSquaresFor(squares: Squares, paidPlayers: readonly string[], previous: NameCounts, justConfirmed: NameCounts = {}): number[] {
  const held = squaresByPlayer(squares);
  return paidPlayers.map(name => {
    const now = held[name] ?? 0;
    if (name in justConfirmed) return Math.min(justConfirmed[name], now);
    return previous[name] ?? now;
  });
}

/** How many squares each name holds on a board. */
export function squaresByPlayer(squares: Squares): NameCounts {
  const held: NameCounts = {};
  for (const name of Object.values(squares)) held[name] = (held[name] ?? 0) + 1;
  return held;
}

/** The database can hand back a gap as a missing key or a null. */
function countAt(paidSquares: PaidCounts, index: number): number | undefined {
  const count = paidSquares[index];
  return typeof count === 'number' ? count : undefined;
}
