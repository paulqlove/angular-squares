import { ALREADY_IN_USE_CODES, errorCode, linkOrSignIn } from './link-guest';

const fail = (code: string) => Object.assign(new Error(code), { code });

describe('linkOrSignIn', () => {
  it('signs in normally when there is no guest to link', async () => {
    const signIn = vi.fn().mockResolvedValue('real');
    const out = await linkOrSignIn<string>(null, signIn);
    expect(out).toEqual({ result: 'real', linked: false });
    expect(signIn).toHaveBeenCalledTimes(1);
  });

  it('links the guest and never falls back when linking works', async () => {
    const link = vi.fn().mockResolvedValue('same-uid');
    const signIn = vi.fn();
    const out = await linkOrSignIn<string>(link, signIn);
    expect(out).toEqual({ result: 'same-uid', linked: true });
    expect(signIn).not.toHaveBeenCalled();
  });

  it('falls back to a normal sign-in when the credential already belongs to an account', async () => {
    for (const code of ALREADY_IN_USE_CODES) {
      const error = fail(code);
      const signIn = vi.fn().mockResolvedValue('existing-account');
      const out = await linkOrSignIn<string>(() => Promise.reject(error), signIn);
      expect(out).toEqual({ result: 'existing-account', linked: false });
      expect(signIn).toHaveBeenCalledWith(error);
    }
  });

  it('passes other failures on and signs nobody in', async () => {
    for (const code of ['auth/popup-closed-by-user', 'auth/network-request-failed', 'auth/cancelled-popup-request', '']) {
      const signIn = vi.fn();
      await expect(linkOrSignIn<string>(() => Promise.reject(fail(code)), signIn)).rejects.toMatchObject({ code });
      expect(signIn).not.toHaveBeenCalled();
    }
  });

  it('passes on a failure that has no code', async () => {
    const signIn = vi.fn();
    await expect(linkOrSignIn<string>(() => Promise.reject(new Error('boom')), signIn)).rejects.toThrow('boom');
    expect(signIn).not.toHaveBeenCalled();
  });

  it('surfaces an error from the fallback sign-in', async () => {
    const out = linkOrSignIn<string>(() => Promise.reject(fail('auth/credential-already-in-use')), () => Promise.reject(fail('auth/invalid-credential')));
    await expect(out).rejects.toMatchObject({ code: 'auth/invalid-credential' });
  });
});

describe('errorCode', () => {
  it('reads a string code and ignores anything else', () => {
    expect(errorCode(fail('auth/x'))).toBe('auth/x');
    expect(errorCode(null)).toBe('');
    expect(errorCode('auth/x')).toBe('');
    expect(errorCode({ code: 5 })).toBe('');
  });
});
