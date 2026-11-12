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
