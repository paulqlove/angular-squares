import { TestBed } from '@angular/core/testing';
import { AuthService } from './auth.service';

describe('AuthService.restoreSession', () => {
  let service: AuthService;
  let init: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    localStorage.removeItem('qs_signed_in');
    document.cookie = 'squares_guest_user=; max-age=0; path=/';
    service = TestBed.inject(AuthService);
    init = vi.spyOn(service, 'ensureInitialized').mockResolvedValue();
  });

  afterEach(() => localStorage.removeItem('qs_signed_in'));

  it('leaves Firebase unloaded for a visitor who never signed in', () => {
    service.restoreSession();
    expect(init).not.toHaveBeenCalled();
  });

  it('restores the account on a browser that was signed in, so a refresh does not look signed out', () => {
    localStorage.setItem('qs_signed_in', '1');
    service.restoreSession();
    expect(init).toHaveBeenCalledTimes(1);
  });
});

describe('AuthService.signInAsGuest', () => {
  let service: AuthService;
  let signInAnonymously: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    document.cookie = 'squares_guest_user=; max-age=0; path=/';
    service = TestBed.inject(AuthService);
    vi.spyOn(service, 'ensureInitialized').mockResolvedValue();
    signInAnonymously = vi.fn();
    const internals = service as unknown as { _auth: object; sdk: { auth: { signInAnonymously: typeof signInAnonymously } } };
    internals._auth = {};
    internals.sdk = { auth: { signInAnonymously } };
  });

  it('signs the guest in with their Firebase account id', async () => {
    signInAnonymously.mockResolvedValue({ user: { uid: 'anon-123' } });
    const user = await service.signInAsGuest('Mike');
    expect(user.uid).toBe('anon-123');
    expect(service.currentUser()?.displayName).toBe('Mike');
    expect(document.cookie).toContain('squares_guest_user');
  });

  it('fails instead of joining as a guest who cannot pick squares when Firebase refuses the account', async () => {
    signInAnonymously.mockRejectedValue(new Error('auth/too-many-requests'));
    await expect(service.signInAsGuest('Mike')).rejects.toThrow();
    expect(service.currentUser()).toBeNull();
    expect(document.cookie).not.toContain('squares_guest_user');
  });
});
