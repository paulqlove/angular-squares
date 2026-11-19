// Pure part of scripts/count-users-games.mjs: turns raw records into totals. No I/O.
// The board rules mirror src/app/core/utils/board-activity.ts (scripts can't import the app's TypeScript).

export const DAY_MS = 24 * 60 * 60 * 1000;
export const UNLINKED_BOARD_ACTIVE_MS = 2 * DAY_MS;

/** Same mapping as isEspnStatusFinal in board-activity.ts: true final, false not final, null unknown. */
export function isEspnStatusFinal(status) {
  if (!status) return null;
  const name = status.name || '';
  if (name === 'STATUS_FINAL' || name.startsWith('STATUS_FINAL_')) return true;
  if (['STATUS_CANCELED', 'STATUS_CANCELLED', 'STATUS_POSTPONED', 'STATUS_SUSPENDED', 'STATUS_DELAYED'].includes(name)) return false;
  if (status.state === 'pre' || status.state === 'in') return false;
  if (status.completed === true && status.state === 'post') return true;
  return null;
}

export function hasLinkedGame(game) {
  return typeof game?.espnEventId === 'string' && game.espnEventId.trim().length > 0;
}

/** One lookup per linked game, shared by every board on it. */
export function linkedGameKey(game) {
  return `${game.espnSport || 'nfl'}|${game.espnEventId.trim()}`;
}

/**
 * Accounts in a Firebase Auth export. Guests sign in anonymously, so an account with no email and no
 * sign-in provider is a guest, not a sign-up.
 * @param {object[]} users the export's `users` array
 * @param {Set<string>} excluded uids left out (admins and test accounts), as in scripts/report/report.mjs
 */
export function countAccounts(users, nowMs, excluded = new Set()) {
  const counted = users.filter((u) => !excluded.has(u.localId));
  const signedUp = counted.filter((u) => u.email || (u.providerUserInfo || []).length > 0);
  const since = (ms, field) => signedUp.filter((u) => Number(u[field]) >= nowMs - ms).length;
  return {
    signedUp: signedUp.length,
    guests: counted.length - signedUp.length,
    new7: since(7 * DAY_MS, 'createdAt'),
    new30: since(30 * DAY_MS, 'createdAt'),
    seen7: since(7 * DAY_MS, 'lastSignedInAt'),
    seen30: since(30 * DAY_MS, 'lastSignedInAt')
  };
}

/**
 * Board totals. A linked board is active until its game is final (unknown counts as active); a board with
 * no linked game is active for 48 hours after createdAt, and one with no createdAt counts as active.
 * @param {object} games the `/games` tree
 * @param {Map<string, boolean|null>} finals linkedGameKey -> isEspnStatusFinal result
 * @param {Set<string>} excluded owner uids left out (admins and test accounts)
 */
export function countBoards(games, finals, nowMs, excluded = new Set()) {
  const boards = Object.values(games || {}).filter((g) => g && typeof g === 'object' && !excluded.has(g.ownerId));
  const totals = { total: boards.length, hosts: 0, new7: 0, new30: 0, active: 0, activeLinked: 0, activeUnlinked: 0, unknown: 0 };
  totals.hosts = new Set(boards.map((g) => g.ownerId).filter(Boolean)).size;
  for (const g of boards) {
    const createdAt = typeof g.createdAt === 'number' && g.createdAt ? g.createdAt : null;
    if (createdAt !== null && createdAt >= nowMs - 7 * DAY_MS) totals.new7++;
    if (createdAt !== null && createdAt >= nowMs - 30 * DAY_MS) totals.new30++;
    if (hasLinkedGame(g)) {
      const final = finals.get(linkedGameKey(g)) ?? null;
      if (final === true) continue;
      totals.active++;
      totals.activeLinked++;
      if (final === null) totals.unknown++;
    } else if (createdAt === null || nowMs - createdAt < UNLINKED_BOARD_ACTIVE_MS) {
      totals.active++;
      totals.activeUnlinked++;
    }
  }
  return totals;
}
