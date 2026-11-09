import { initializeApp, deleteApp, FirebaseApp } from 'firebase/app';
import * as sdk from 'firebase/auth';
import {
  Auth, EmailAuthProvider, GoogleAuthProvider, connectAuthEmulator, getAuth, linkWithCredential, sendSignInLinkToEmail,
  signInAnonymously, signInWithCredential, signInWithEmailLink, updateProfile
} from 'firebase/auth';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { connectEmailLink, connectGoogle } from '../../src/app/core/utils/auth-link';
import { LinkUsedUpError, newAddressFromLink } from '../../src/app/core/utils/link-guest';

// Runs the app's real sign-in logic against the real Firebase Auth SDK and the local Auth emulator (npm run test:auth).
// Google's popup cannot run in Node, so a fake Google ID token (which the emulator accepts) stands in for it.
const PROJECT = 'demo-link';
const HOST = '127.0.0.1:9099';
const SETTINGS = { url: 'http://localhost:4200/auth/email-link', handleCodeInApp: true };

let app: FirebaseApp;
let auth: Auth;
let n = 0;
const unique = (label: string) => `${label}${Date.now()}${n++}`;

const googleToken = (email: string, name: string) =>
  JSON.stringify({ sub: `g-${email}`, email, email_verified: true, name, picture: 'https://example.com/p.png' });
const googleCredential = (email: string, name: string) => GoogleAuthProvider.credential(googleToken(email, name));
const googlePopups = (email: string, name: string) => ({
  link: (guest: sdk.User) => linkWithCredential(guest, googleCredential(email, name)),
  signIn: () => signInWithCredential(auth, googleCredential(email, name))
});

/** An emailed sign-in link as our function would send it: the emulator's link plus acct=1 (has an account) or acct=0 (new), or no hint at all. */
async function emailLinkFor(email: string, hint: 'new' | 'exists' | 'none' = 'new'): Promise<string> {
  await sendSignInLinkToEmail(auth, email, SETTINGS);
  const body = (await (await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/oobCodes`)).json()) as {
    oobCodes: { email: string; requestType: string; oobLink: string }[];
  };
  const codes = body.oobCodes.filter(c => c.email === email && c.requestType === 'EMAIL_SIGNIN');
  const link = new URL(codes[codes.length - 1].oobLink);
  if (hint !== 'none') link.searchParams.set('acct', hint === 'exists' ? '1' : '0');
  return link.toString();
}

beforeAll(() => {
  app = initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT, authDomain: 'localhost' }, 'link-guest-test');
  auth = getAuth(app);
  connectAuthEmulator(auth, `http://${HOST}`, { disableWarnings: true });
});

afterAll(async () => {
  await deleteApp(app);
});

beforeEach(async () => {
  await auth.signOut();
  await fetch(`http://${HOST}/emulator/v1/projects/${PROJECT}/accounts`, { method: 'DELETE' });
});

describe('why this exists: a plain sign-in replaces the guest account', () => {
  it('gives a new uid, so squares recorded under the guest uid are stranded', async () => {
    const guest = (await signInAnonymously(auth)).user;
    const real = (await signInWithCredential(auth, googleCredential(`${unique('a')}@example.com`, 'Ann'))).user;
    expect(real.uid).not.toBe(guest.uid);
  });
});

describe('Google sign-in', () => {
  it('attaches Google to the guest: same uid, real account, email and Google profile', async () => {
    const guest = (await signInAnonymously(auth)).user;
    const email = `${unique('g')}@example.com`;
    const outcome = await connectGoogle(sdk, auth, googlePopups(email, 'Gina Google'));
    expect(outcome.linked).toBe(true);
    const user = outcome.result.user;
    expect(user.uid).toBe(guest.uid);
    expect(user.isAnonymous).toBe(false);
    expect(user.email).toBe(email);
    expect(auth.currentUser?.uid).toBe(guest.uid);
    const google = user.providerData.find(p => p.providerId === 'google.com');
    expect(google?.displayName).toBe('Gina Google');
    await updateProfile(user, { displayName: google?.displayName, photoURL: google?.photoURL });
    await user.reload();
    expect(auth.currentUser?.displayName).toBe('Gina Google');
  });

  it('signs in as usual when nobody is signed in', async () => {
    const outcome = await connectGoogle(sdk, auth, googlePopups(`${unique('n')}@example.com`, 'New Nina'));
    expect(outcome.linked).toBe(false);
    expect(outcome.result.user.isAnonymous).toBe(false);
  });

  it('signs in as usual when a real account is already signed in', async () => {
    const first = (await signInWithCredential(auth, googleCredential(`${unique('r')}@example.com`, 'Real Rae'))).user;
    const outcome = await connectGoogle(sdk, auth, googlePopups(`${unique('r2')}@example.com`, 'Other Rae'));
    expect(outcome.linked).toBe(false);
    expect(outcome.result.user.uid).not.toBe(first.uid);
  });

  it('when that Google account already exists, signs into it and leaves the guest behind', async () => {
    const email = `${unique('e')}@example.com`;
    const existing = (await signInWithCredential(auth, googleCredential(email, 'Existing Eve'))).user;
    await auth.signOut();
    const guest = (await signInAnonymously(auth)).user;
    const outcome = await connectGoogle(sdk, auth, googlePopups(email, 'Existing Eve'));
    expect(outcome.linked).toBe(false);
    expect(outcome.result.user.uid).toBe(existing.uid);
    expect(outcome.result.user.uid).not.toBe(guest.uid);
    expect(auth.currentUser?.uid).toBe(existing.uid);
  });

  it('keeps the guest signed in when the popup is closed', async () => {
    const guest = (await signInAnonymously(auth)).user;
    const closed = Object.assign(new Error('closed'), { code: 'auth/popup-closed-by-user' });
    await expect(
      connectGoogle(sdk, auth, { link: () => Promise.reject(closed), signIn: () => Promise.reject(closed) })
    ).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' });
    expect(auth.currentUser?.uid).toBe(guest.uid);
    expect(auth.currentUser?.isAnonymous).toBe(true);
  });
});

describe('emailed sign-in link', () => {
  it('attaches a new address to the guest: same uid, real account', async () => {
    const guest = (await signInAnonymously(auth)).user;
    const email = `${unique('m')}@example.com`;
    const link = await emailLinkFor(email, 'new');
    expect(newAddressFromLink(link)).toBe(true);
    const outcome = await connectEmailLink(sdk, auth, email, link, !newAddressFromLink(link));
    expect(outcome.linked).toBe(true);
    const user = outcome.result.user;
    expect(user.uid).toBe(guest.uid);
    expect(user.isAnonymous).toBe(false);
    expect(user.email).toBe(email);
    await updateProfile(user, { displayName: 'Mia Mail' });
    expect(auth.currentUser?.displayName).toBe('Mia Mail');
  });

  it('an address that already has an account just signs into it (the link hint), without using up the link', async () => {
    const email = `${unique('x')}@example.com`;
    const existing = (await signInWithEmailLink(auth, email, await emailLinkFor(email))).user;
    await auth.signOut();
    const guest = (await signInAnonymously(auth)).user;
    const link = await emailLinkFor(email, 'exists');
    expect(newAddressFromLink(link)).toBe(false);
    const outcome = await connectEmailLink(sdk, auth, email, link, !newAddressFromLink(link));
    expect(outcome.linked).toBe(false);
    expect(outcome.result.user.uid).toBe(existing.uid);
    expect(outcome.result.user.uid).not.toBe(guest.uid);
  });

  it('a link without the hint (sent before the hint existed) is never linked, so it cannot be used up', async () => {
    const email = `${unique('old')}@example.com`;
    const existing = (await signInWithEmailLink(auth, email, await emailLinkFor(email))).user;
    await auth.signOut();
    await signInAnonymously(auth);
    const link = await emailLinkFor(email, 'none');
    const outcome = await connectEmailLink(sdk, auth, email, link, !newAddressFromLink(link));
    expect(outcome.linked).toBe(false);
    expect(outcome.result.user.uid).toBe(existing.uid);
  });

  it('signs in as usual when nobody is signed in', async () => {
    const email = `${unique('s')}@example.com`;
    const outcome = await connectEmailLink(sdk, auth, email, await emailLinkFor(email), false);
    expect(outcome.linked).toBe(false);
    expect(outcome.result.user.email).toBe(email);
  });

  it('if an account appeared after the link was sent, says the link was used up and leaves the guest signed in', async () => {
    const email = `${unique('race')}@example.com`;
    const link = await emailLinkFor(email, 'new'); // sent while the address had no account
    const other = getAuth(initializeApp({ apiKey: 'fake-api-key', projectId: PROJECT }, unique('other')));
    connectAuthEmulator(other, `http://${HOST}`, { disableWarnings: true });
    await signInWithEmailLink(other, email, await emailLinkFor(email, 'none')); // the address gets an account
    const guest = (await signInAnonymously(auth)).user;
    await expect(connectEmailLink(sdk, auth, email, link, !newAddressFromLink(link))).rejects.toSatisfy(
      (e: unknown) => e instanceof LinkUsedUpError || (e as { code?: string })?.code === 'auth/invalid-action-code'
    );
    expect(auth.currentUser?.uid).toBe(guest.uid);
    expect(auth.currentUser?.isAnonymous).toBe(true);
  });

  it('a link that was already used fails without signing anyone in', async () => {
    const email = `${unique('u')}@example.com`;
    const link = await emailLinkFor(email);
    await signInWithEmailLink(auth, email, link);
    await auth.signOut();
    const guest = (await signInAnonymously(auth)).user;
    await expect(connectEmailLink(sdk, auth, email, link, false)).rejects.toBeTruthy();
    expect(auth.currentUser?.uid).toBe(guest.uid);
    expect(auth.currentUser?.isAnonymous).toBe(true);
  });
});

// Sanity: the SDK pieces the app depends on exist with the shapes the util expects.
describe('the SDK surface the app relies on', () => {
  it('has the credential helpers', () => {
    expect(typeof EmailAuthProvider.credentialWithLink).toBe('function');
    expect(typeof GoogleAuthProvider.credentialFromError).toBe('function');
  });
});
