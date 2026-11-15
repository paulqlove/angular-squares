/**
 * A TV link that follows a group (Paul, Nov 15: "Make it follow live"). The link keeps the boards saved when it was
 * copied, and the TV also watches the group's More-tab list (`openLists/{group}`, readable by key, values are each
 * board's owner). These helpers turn that list into the boards to rotate.
 */

/** The most boards one TV link rotates (the database rules cap the saved list at the same number). */
const MAX_FOLLOWED = 20;

/**
 * The group's owner, read from the list itself: the value under any saved board that is still in it.
 * A board can only be filed under its own owner's group, so every saved board gives the same answer.
 */
export function followedOwner(saved: string[], list: Record<string, unknown> | null): string | null {
  const value = saved.map(id => list?.[id]).find(owner => typeof owner === 'string');
  return typeof value === 'string' ? value : null;
}

/**
 * The boards to rotate: saved boards still in the group, in their saved order, then boards the owner added to the
 * group since, at most 20. Falls back to the saved boards when the owner is unknown or the list has none of the
 * owner's boards (an emptied group, or older boards not yet shown in More), so a TV never goes blank on its own.
 */
export function followedBoards(saved: string[], list: Record<string, unknown> | null, owner: string | null): string[] {
  if (!list || !owner) return saved;
  const inGroup = Object.keys(list).filter(id => list[id] === owner);
  if (!inGroup.length) return saved;
  const kept = saved.filter(id => inGroup.includes(id));
  const added = inGroup.filter(id => !saved.includes(id)).sort();
  return [...kept, ...added].slice(0, MAX_FOLLOWED);
}
