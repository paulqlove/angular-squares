import type { GroupCoHost } from './group-cohost';
import { OpenListTarget, fileBoardUpdates, isListKey } from './open-lists';

/**
 * Game groups (Season Pass): the owner's labels, such as Church or Work, that decide which games share a
 * More tab. Stored at `groupLists/{ownerId}`. Players and guests never read them. See database.rules.notes.md.
 */

export const GROUP_NAME_MAX = 30;

export interface GameGroup {
  id: string;
  name: string;
  createdAt: number;
  /** The group's co-host, filled in on its games that have none. */
  coHost?: GroupCoHost;
}

/** A board as the group writes see it: its list and whether it is shown in More. */
export interface GroupedBoard extends OpenListTarget {
  showInOpenBoards?: boolean;
}

/** The owner's groups, oldest first, from the raw `groupLists/{ownerId}/groups` value. Bad entries are skipped. */
export function parseGroups(raw: unknown): GameGroup[] {
  if (!raw || typeof raw !== 'object') return [];
  return Object.entries(raw as Record<string, { name?: unknown; createdAt?: unknown; coHost?: { email?: unknown } }>)
    .filter(([id, g]) => isListKey(id) && typeof g?.name === 'string' && typeof g?.createdAt === 'number')
    .map(([id, g]) => ({ id, name: g.name as string, createdAt: g.createdAt as number, ...coHostOf(g.coHost) }))
    .sort((a, b) => a.createdAt - b.createdAt);
}

/** The name as saved: spaces at the ends dropped, cut to 30 characters. Empty when nothing is left. */
export function cleanGroupName(name: string): string {
  return name.trim().slice(0, GROUP_NAME_MAX).trim();
}

/** How many of these boards are filed in each group, by group id. */
export function groupCounts(boards: OpenListTarget[]): Map<string, number> {
  const counts = new Map<string, number>();
  for (const board of boards) {
    if (board.openListId) counts.set(board.openListId, (counts.get(board.openListId) ?? 0) + 1);
  }
  return counts;
}

/** "1 game", "2 games": a group's size in the Groups sheets. */
export function gameCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'game' : 'games'}`;
}

/** The boards filed in one group, or every board when no group is picked. */
export function gamesInGroup<T extends OpenListTarget>(boards: T[], groupId: string | null | undefined): T[] {
  return groupId ? boards.filter(board => board.openListId === groupId) : boards;
}

/** The group a board is filed in, or undefined for No group. */
export function groupOf(groups: GameGroup[], board: OpenListTarget): GameGroup | undefined {
  return board.openListId ? groups.find(g => g.id === board.openListId) : undefined;
}

/**
 * One write that deletes a group and moves its boards to No group, each keeping its More switch.
 * The games and their list entries move in the same write, so no board is ever left pointing at a missing group.
 */
export function deleteGroupUpdates(ownerId: string, groupId: string, ungroupedKey: string, boards: GroupedBoard[]): Record<string, unknown> {
  const updates: Record<string, unknown> = { [`groupLists/${ownerId}/groups/${groupId}`]: null };
  for (const board of boards.filter(b => b.openListId === groupId)) {
    Object.assign(updates, fileBoardUpdates(board, ungroupedKey, !!board.showInOpenBoards));
  }
  return updates;
}

/** "1 game will…" or "3 games will…": the delete confirm, worded as Creative's spec. */
export function deleteGroupMessage(count: number): string {
  if (count === 0) return 'No games are in this group.';
  return `${gameCountLabel(count)} will show alongside your other ungrouped games.`;
}

/** What the Group picker in Edit game was left on: a group, No group (null), or a new group's name. */
export interface GroupChoice {
  groupId: string | null;
  newName?: string;
}

/** The picker's starting value: the board's group, or null for No group (also for a group that was deleted). */
export function pickerValue(groups: GameGroup[], openListId: string | undefined): string | null {
  return groups.some(g => g.id === openListId) ? openListId as string : null;
}

/** True when saving this choice files the board somewhere new. */
export function groupChanged(groups: GameGroup[], openListId: string | undefined, choice: GroupChoice): boolean {
  return !!cleanGroupName(choice.newName ?? '') || pickerValue(groups, openListId) !== choice.groupId;
}

/** The hint under the locked switch. */
export const GROUPED_SHOWN_HINT = 'Games in a group always show in open boards.';

/**
 * True when the picker is on a group, or on a new group that has a name. A game in a group always shows in
 * that group's More tab (Paul, Nov 15: "Lock it on"), so Show in my open boards stays on and can't be turned off.
 */
export function inGroup(choice: GroupChoice | undefined): boolean {
  return !!choice?.groupId || !!cleanGroupName(choice?.newName ?? '');
}

/** The group's co-host, when the stored value has an email. */
function coHostOf(raw: { email?: unknown } | undefined): { coHost?: GroupCoHost } {
  return typeof raw?.email === 'string' && raw.email ? { coHost: { email: raw.email } } : {};
}
