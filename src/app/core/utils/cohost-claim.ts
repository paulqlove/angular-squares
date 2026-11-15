/**
 * A co-host the owner added by email (Create game, or a group's co-host) is stored on the game as `managerEmail`
 * with no `managerId`, so the co-host powers, which follow `managerId`, never reached them. When that person
 * opens the game signed in with the same email, the app writes their uid as `managerId`, the record a pick from
 * the players writes. The database rules only allow that write for a verified email that matches the game's.
 */

/** The game fields the claim looks at. */
export interface CoHostInviteGame {
  ownerId?: string;
  managerId?: string;
  managerEmail?: string;
}

/** The signed-in viewer, as AuthService holds them. */
export interface CoHostInviteUser {
  uid: string;
  email: string | null;
  isGuest: boolean;
}

/** True when this viewer is the game's email co-host and doesn't hold the role yet. */
export function isCoHostInvite(game: CoHostInviteGame, user: CoHostInviteUser | null): boolean {
  if (!user || user.isGuest || !user.email || !game.managerEmail || game.managerId) return false;
  if (user.uid === game.ownerId) return false;
  return sameEmail(game.managerEmail, user.email);
}

/** Emails compare without case, exactly as the rules compare them, so the app never tries a write the rules refuse. */
export function sameEmail(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
