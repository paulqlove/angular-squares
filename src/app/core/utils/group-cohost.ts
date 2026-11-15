import { gameCountLabel } from './game-groups';

/**
 * A group's co-host (Season Pass): one per group, stored by email at `groupLists/{ownerId}/groups/{groupId}/coHost`,
 * the same way Create game stores a co-host typed by email. Games in the group that have no co-host get it;
 * a game's own co-host is never replaced. Paul approved Creative's design (Nov 15).
 */

export const COHOST_EMAIL_MAX = 254;

export interface GroupCoHost {
  email: string;
}

/** A game's co-host fields, as the dashboard holds them. */
export interface CoHostedBoard {
  id: string;
  name: string;
  openListId?: string;
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
}

/** What saving a group's co-host does to the games in the group. */
export interface CoHostPlan {
  /** Games with no co-host: they get the group's. */
  adds: CoHostedBoard[];
  /** Games with a co-host of their own (someone else): they keep it. */
  keeps: CoHostedBoard[];
}

/** The email as saved: trimmed. Empty when nothing is left. */
export function cleanCoHostEmail(typed: string): string {
  return typed.trim().slice(0, COHOST_EMAIL_MAX);
}

/** True for something shaped like an email: a name, an @, and a domain with a dot. */
export function looksLikeEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/** True when the game has a co-host, picked from its players (uid) or typed by email. */
export function hasCoHost(board: Pick<CoHostedBoard, 'managerId' | 'managerEmail'>): boolean {
  return !!board.managerId || !!board.managerEmail;
}

/** True when the game's co-host is this email. */
export function isCoHostEmail(board: Pick<CoHostedBoard, 'managerEmail'>, email: string): boolean {
  return !!board.managerEmail && board.managerEmail.toLowerCase() === email.toLowerCase();
}

/** How a game's co-host reads: their name, else their email. */
export function coHostLabel(board: Pick<CoHostedBoard, 'managerName' | 'managerEmail'>): string {
  return board.managerName || board.managerEmail || '';
}

/** Which of the group's games get this co-host (no co-host yet) and which keep their own. Locked and finished games count too. */
export function coHostPlan(boards: CoHostedBoard[], groupId: string, email: string): CoHostPlan {
  const inGroup = boards.filter(b => b.openListId === groupId);
  return {
    adds: inGroup.filter(b => !hasCoHost(b)),
    keeps: inGroup.filter(b => hasCoHost(b) && !isCoHostEmail(b, email))
  };
}

/** The group's games whose co-host is this email: the ones a remove may clear. */
export function gamesWithCoHost(boards: CoHostedBoard[], groupId: string, email: string): CoHostedBoard[] {
  return boards.filter(b => b.openListId === groupId && isCoHostEmail(b, email));
}

/** One write: the group's co-host (null removes it), given to `addTo` and cleared from `clearFrom`, the way Edit game clears one. */
export function groupCoHostUpdates(ownerId: string, groupId: string, coHost: GroupCoHost | null, games: { addTo: string[]; clearFrom: string[] }): Record<string, unknown> {
  const updates: Record<string, unknown> = { [`groupLists/${ownerId}/groups/${groupId}/coHost`]: coHost };
  for (const id of games.addTo) {
    Object.assign(updates, managerUpdates(id, coHost?.email ?? ''));
  }
  for (const id of games.clearFrom) {
    Object.assign(updates, managerUpdates(id, ''));
  }
  return updates;
}

/** "1 game has no co-host and gets dana@email.com." and who keeps their own, for the save box (K2). */
export function coHostPlanLines(plan: CoHostPlan, who: string): string[] {
  const lines = [`${gameCountLabel(plan.adds.length)} ${plan.adds.length === 1 ? 'has' : 'have'} no co-host and ${plan.adds.length === 1 ? 'gets' : 'get'} ${who}.`];
  if (plan.keeps.length === 1) {
    lines.push(`${plan.keeps[0].name} keeps ${coHostLabel(plan.keeps[0])}.`);
  } else if (plan.keeps.length > 1) {
    lines.push(`${gameCountLabel(plan.keeps.length)} keep their own co-host.`);
  }
  return lines;
}

/** "Save and add to 1", or just "Save" when no game would get the co-host. */
export function coHostSaveLabel(plan: CoHostPlan): string {
  return plan.adds.length ? `Save and add to ${plan.adds.length}` : 'Save';
}

/** The question when a group's co-host is removed: "Also remove dana@email.com from 2 Church games?". Saying no keeps them on the games. */
export function removeCoHostQuestion(who: string, groupName: string, count: number): { title: string; message: string; confirmLabel: string; cancelLabel: string } {
  return {
    title: `Also remove ${who} from ${count} ${groupName} ${count === 1 ? 'game' : 'games'}?`,
    message: `${groupName} no longer has a co-host either way. Games with a different co-host keep theirs.`,
    confirmLabel: `Remove from ${count}`,
    cancelLabel: 'Keep on games'
  };
}

function managerUpdates(gameId: string, email: string): Record<string, string> {
  return {
    [`games/${gameId}/managerId`]: '',
    [`games/${gameId}/managerEmail`]: email,
    [`games/${gameId}/managerName`]: ''
  };
}
