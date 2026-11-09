import type { Auth, AuthCredential, User, UserCredential } from 'firebase/auth';
import { LinkOutcome, LinkUsedUpError, errorCode, linkOrSignIn } from './link-guest';

/** The parts of the Firebase Auth SDK used here, so the logic runs against fakes in unit tests and the real SDK in the emulator tests. */
export interface AuthLinkSdk {
  EmailAuthProvider: { credentialWithLink(email: string, url: string): AuthCredential };
  GoogleAuthProvider: { credentialFromError(error: never): AuthCredential | null };
  linkWithCredential(user: User, credential: AuthCredential): Promise<UserCredential>;
  signInWithCredential(auth: Auth, credential: AuthCredential): Promise<UserCredential>;
  signInWithEmailLink(auth: Auth, email: string, url: string): Promise<UserCredential>;
}

/** The signed-in guest (an anonymous account), or null when nobody or a real account is signed in. */
export function guestUser(auth: Pick<Auth, 'currentUser'>): User | null {
  const user = auth.currentUser;
  return user && user.isAnonymous ? user : null;
}

/**
 * Google sign-in. A guest gets Google attached to their account (same uid, so their squares stay theirs).
 * If that Google account already exists, sign into it instead.
 */
export function connectGoogle(
  sdk: AuthLinkSdk,
  auth: Auth,
  popups: { link: (guest: User) => Promise<UserCredential>; signIn: () => Promise<UserCredential> }
): Promise<LinkOutcome<UserCredential>> {
  const guest = guestUser(auth);
  return linkOrSignIn(guest ? () => popups.link(guest) : null, error => {
    const credential = error ? sdk.GoogleAuthProvider.credentialFromError(error as never) : null;
    return credential ? sdk.signInWithCredential(auth, credential) : popups.signIn();
  });
}

/**
 * Finishes an emailed-link sign-in. An emailed link works once, and a failed attempt to attach it uses it up,
 * so a guest is only linked when the link says its address has no account yet (accountExists false).
 * If an account turned up in the meantime, the link is gone and the person has to ask for a new one.
 */
export function connectEmailLink(
  sdk: AuthLinkSdk,
  auth: Auth,
  email: string,
  url: string,
  accountExists: boolean
): Promise<LinkOutcome<UserCredential>> {
  const guest = guestUser(auth);
  const link = guest && !accountExists ? () => sdk.linkWithCredential(guest, sdk.EmailAuthProvider.credentialWithLink(email, url)) : null;
  return linkOrSignIn(link, async alreadyInUse => {
    try {
      return await sdk.signInWithEmailLink(auth, email, url);
    } catch (error) {
      if (alreadyInUse && errorCode(error) === 'auth/invalid-action-code') throw new LinkUsedUpError();
      throw error;
    }
  });
}
