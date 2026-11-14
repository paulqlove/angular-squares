/** More squares than this changing at once is a load, a refresh or a board switch, so none of them animate. */
const MAX_ANIMATED_CHANGES = 3;

/** Which squares just changed hands, so the board can show each change its own way (docs/DESIGN.md, Motion). */
export interface SquareChanges {
  /** Squares the viewer just claimed: their initials spring in. */
  own: ReadonlySet<string>;
  /** Squares someone else just claimed: their initials fade in. */
  others: ReadonlySet<string>;
  /** Squares just let go: the old initials fade out. */
  released: ReadonlySet<string>;
}

export const NO_SQUARE_CHANGES: SquareChanges = { own: new Set(), others: new Set(), released: new Set() };

/**
 * Sorts the squares that changed between two snapshots of the board. `tapped` is the square the viewer last tapped,
 * so a claim there is theirs. Null when nothing changed, so the caller keeps what it is showing.
 */
export function squareChanges(
  previous: Readonly<Record<string, string>>,
  next: Readonly<Record<string, string>>,
  tapped: string | null
): SquareChanges | null {
  const keys = new Set([...Object.keys(previous), ...Object.keys(next)]);
  const changed = [...keys].filter(key => (previous[key] || '') !== (next[key] || ''));
  if (!changed.length) return null;
  if (changed.length > MAX_ANIMATED_CHANGES) return NO_SQUARE_CHANGES;
  const claimed = changed.filter(key => !!next[key]);
  return {
    own: new Set(claimed.filter(key => key === tapped)),
    others: new Set(claimed.filter(key => key !== tapped)),
    released: new Set(changed.filter(key => !next[key]))
  };
}

/**
 * Remembers what one board showed last, so only things that arrive while someone watches animate: a quarter's winner,
 * once per viewer per quarter. The first look at a board, and a switch to another board, give nothing new.
 */
export class ArrivalTracker {
  private boardId: string | null = null;
  private seen: ReadonlySet<string> | null = null;

  /** The keys that are new since the last call for this board, or null when nothing changed at all. */
  public next(boardId: string, keys: readonly string[]): string[] | null {
    const seen = this.boardId === boardId ? this.seen : null;
    const now = new Set(keys); // a square can win more than one quarter, so keys can repeat
    if (seen && seen.size === now.size && [...now].every(key => seen.has(key))) return null;
    this.boardId = boardId;
    this.seen = now;
    return seen ? [...now].filter(key => !seen.has(key)) : [];
  }
}
