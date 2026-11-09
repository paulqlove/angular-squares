import type { Auth, AuthCredential, User, UserCredential } from 'firebase/auth';
import { AuthLinkSdk, connectEmailLink, connectGoogle, guestUser } from './auth-link';
import { LinkUsedUpError, newAddressFromLink } from './link-guest';

const fail = (code: string) => Object.assign(new Error(code), { code });
const cred = (id: string) => ({ providerId: id }) as unknown as AuthCredential;
const result = (uid: string) => ({ user: { uid } }) as unknown as UserCredential;
const authWith = (user: Partial<User> | null) => ({ currentUser: user }) as unknown as Auth;
const guest = { uid: 'guest-uid', isAnonymous: true } as User;
const real = { uid: 'real-uid', isAnonymous: false } as User;

function fakeSdk(overrides: Partial<AuthLinkSdk> = {}): AuthLinkSdk {
  return {
    EmailAuthProvider: { credentialWithLink: vi.fn(() => cred('emailLink')) },
    GoogleAuthProvider: { credentialFromError: vi.fn(() => cred('google')) },
    linkWithCredential: vi.fn(async (user: User) => result(user.uid)),
    signInWithCredential: vi.fn(async () => result('existing-uid')),
    signInWithEmailLink: vi.fn(async () => result('email-uid')),
    ...overrides
  };
}

describe('guestUser', () => {
  it('is the current user only when it is anonymous', () => {
    expect(guestUser(authWith(guest))).toBe(guest);
    expect(guestUser(authWith(real))).toBeNull();
    expect(guestUser(authWith(null))).toBeNull();
  });
});

describe('connectGoogle', () => {
  const popups = () => ({ link: vi.fn(async (g: User) => result(g.uid)), signIn: vi.fn(async () => result('google-uid')) });

  it('attaches Google to the guest and keeps the guest uid', async () => {
    const p = popups();
    const out = await connectGoogle(fakeSdk(), authWith(guest), p);
    expect(out.linked).toBe(true);
    expect(out.result.user.uid).toBe('guest-uid');
    expect(p.link).toHaveBeenCalledWith(guest);
    expect(p.signIn).not.toHaveBeenCalled();
  });

  it('signs in normally when nobody or a real account is signed in', async () => {
    for (const user of [null, real]) {
      const p = popups();
      const out = await connectGoogle(fakeSdk(), authWith(user), p);
      expect(out).toMatchObject({ linked: false });
      expect(out.result.user.uid).toBe('google-uid');
      expect(p.link).not.toHaveBeenCalled();
    }
  });

  it('signs into the existing account with the credential from the error when Google is already in use', async () => {
    const sdk = fakeSdk();
    const p = { link: vi.fn(() => Promise.reject(fail('auth/credential-already-in-use'))), signIn: vi.fn() };
    const out = await connectGoogle(sdk, authWith(guest), p);
    expect(out.linked).toBe(false);
    expect(out.result.user.uid).toBe('existing-uid');
    expect(sdk.signInWithCredential).toHaveBeenCalledTimes(1);
    expect(p.signIn).not.toHaveBeenCalled();
  });

  it('opens a normal sign-in popup if the error carries no credential', async () => {
    const sdk = fakeSdk({ GoogleAuthProvider: { credentialFromError: vi.fn(() => null) } });
    const p = { link: vi.fn(() => Promise.reject(fail('auth/credential-already-in-use'))), signIn: vi.fn(async () => result('google-uid')) };
    const out = await connectGoogle(sdk, authWith(guest), p);
    expect(out.result.user.uid).toBe('google-uid');
  });

  it('leaves the guest signed in when the popup is closed', async () => {
    const sdk = fakeSdk();
    const p = { link: vi.fn(() => Promise.reject(fail('auth/popup-closed-by-user'))), signIn: vi.fn() };
    await expect(connectGoogle(sdk, authWith(guest), p)).rejects.toMatchObject({ code: 'auth/popup-closed-by-user' });
    expect(sdk.signInWithCredential).not.toHaveBeenCalled();
    expect(p.signIn).not.toHaveBeenCalled();
  });
});

describe('connectEmailLink', () => {
  const url = 'https://quarterscore.com/auth/email-link?oobCode=abc&mode=signIn';

  it('attaches the email to the guest when the address has no account yet', async () => {
    const sdk = fakeSdk();
    const out = await connectEmailLink(sdk, authWith(guest), 'a@b.co', url, false);
    expect(out.linked).toBe(true);
    expect(out.result.user.uid).toBe('guest-uid');
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
  });

  it('does not try to link when the link says the address already has an account', async () => {
    const sdk = fakeSdk();
    const out = await connectEmailLink(sdk, authWith(guest), 'a@b.co', url, true);
    expect(out).toMatchObject({ linked: false });
    expect(out.result.user.uid).toBe('email-uid');
    expect(sdk.linkWithCredential).not.toHaveBeenCalled();
  });

  it('signs in normally when no guest is signed in', async () => {
    const sdk = fakeSdk();
    const out = await connectEmailLink(sdk, authWith(null), 'a@b.co', url, false);
    expect(out).toMatchObject({ linked: false });
    expect(sdk.linkWithCredential).not.toHaveBeenCalled();
    expect(sdk.signInWithEmailLink).toHaveBeenCalledWith(expect.anything(), 'a@b.co', url);
  });

  it('says the link was used up when an account appeared while linking', async () => {
    const sdk = fakeSdk({
      linkWithCredential: vi.fn(() => Promise.reject(fail('auth/email-already-in-use'))),
      signInWithEmailLink: vi.fn(() => Promise.reject(fail('auth/invalid-action-code')))
    });
    await expect(connectEmailLink(sdk, authWith(guest), 'a@b.co', url, false)).rejects.toBeInstanceOf(LinkUsedUpError);
  });

  it('keeps a plain bad-link error as it is when no linking was attempted', async () => {
    const sdk = fakeSdk({ signInWithEmailLink: vi.fn(() => Promise.reject(fail('auth/invalid-action-code'))) });
    await expect(connectEmailLink(sdk, authWith(null), 'a@b.co', url, false)).rejects.toMatchObject({ code: 'auth/invalid-action-code' });
  });

  it('passes other linking errors on without signing in', async () => {
    const sdk = fakeSdk({ linkWithCredential: vi.fn(() => Promise.reject(fail('auth/network-request-failed'))) });
    await expect(connectEmailLink(sdk, authWith(guest), 'a@b.co', url, false)).rejects.toMatchObject({ code: 'auth/network-request-failed' });
    expect(sdk.signInWithEmailLink).not.toHaveBeenCalled();
  });
});

describe('newAddressFromLink', () => {
  it('is true only for acct=0; an existing account, a missing hint or a bad url all mean do not link', () => {
    expect(newAddressFromLink('https://x.com/auth/email-link?oobCode=1&acct=0')).toBe(true);
    expect(newAddressFromLink('https://x.com/auth/email-link?oobCode=1&acct=1')).toBe(false);
    expect(newAddressFromLink('https://x.com/auth/email-link?oobCode=1')).toBe(false);
    expect(newAddressFromLink('https://x.com/auth/email-link?acct=')).toBe(false);
    expect(newAddressFromLink('not a url')).toBe(false);
  });
});
