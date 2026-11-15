import { listedBoardIds } from './open-lists';

/**
 * A TV link that follows a group (Paul, Nov 15: "Make it follow live"). The link keeps the boards saved when it was
 * copied plus the group and its owner, and the TV watches the group's More-tab list (`openLists/{group}`, readable by
 * key, values are each board's owner). This turns that list into the boards to rotate.
 */

/** The most boards one TV link rotates (the database rules cap the saved list at the same number). */
export const MAX_TV_BOARDS = 20;

/**
 * Saved boards still in the group, in their saved order, then boards the owner added to the group since, at most 20.
 * Entries that are not the owner's are ignored. Falls back to the saved boards while the list is not loaded or has
 * none of the owner's boards (an emptied group), so a TV never goes blank on its own.
 */
export function followedBoards(saved: string[], list: Record<string, unknown> | null, owner: string): string[] {
  const inGroup = listedBoardIds(list, owner, '');
  if (!inGroup.length) return saved;
  const kept = saved.filter(id => inGroup.includes(id));
  const added = inGroup.filter(id => !saved.includes(id)).sort();
  return [...kept, ...added].slice(0, MAX_TV_BOARDS);
}
