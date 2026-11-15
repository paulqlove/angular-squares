/**
 * A co-host the owner added by email (Create game, Edit game or a group's co-host) has no `managerId`, so the
 * co-host powers, which follow `managerId`, never reached them. Their email is kept at `gameCoHosts/{ownerId}/{gameId}`,
 * which only the owner and that email's own signed-in account can read (Paul, Nov 15: "Hide them"). When that person
 * opens the game signed in with the same email, the app writes their uid as `managerId`, the record a pick from the
 * players writes. The database rules only allow that write for a verified email that matches the saved one.
 */

/** The game fields the claim looks at. `managerEmail` is the saved co-host email, read from its owner-only spot. */
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

/** True when this viewer could be the game's email co-host: signed in with an email, not the owner, and the game has no co-host by uid. */
export function mayBeCoHostInvite(game: Pick<CoHostInviteGame, 'ownerId' | 'managerId'>, user: CoHostInviteUser | null): user is CoHostInviteUser & { email: string } {
  return !!user && !user.isGuest && !!user.email && !!game.ownerId && !game.managerId && user.uid !== game.ownerId;
}

/** True when this viewer is the game's email co-host and doesn't hold the role yet. */
export function isCoHostInvite(game: CoHostInviteGame, user: CoHostInviteUser | null): boolean {
  return mayBeCoHostInvite(game, user) && !!game.managerEmail && sameEmail(game.managerEmail, user.email);
}

/** Emails compare without case, exactly as the rules compare them, so the app never tries a write the rules refuse. */
export function sameEmail(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
