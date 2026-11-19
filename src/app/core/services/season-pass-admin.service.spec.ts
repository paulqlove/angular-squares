import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { ConfirmService } from './confirm.service';
import { GameService } from './game.service';
import { SeasonGamesService } from './season-games.service';
import { SeasonPassAdminService, formatPassExpiry } from './season-pass-admin.service';
import { ToastService } from './toast.service';

describe('formatPassExpiry', () => {
  const now = 1_700_000_000_000;
  it('counts the days left, and says when a pass has run out', () => {
    expect(formatPassExpiry(now + 86_400_000, now)).toBe('1 day left');
    expect(formatPassExpiry(now + 3 * 86_400_000 - 1000, now)).toBe('3 days left');
    expect(formatPassExpiry(now - 1, now)).toBe('Expired');
  });
});

describe('SeasonPassAdminService', () => {
  const passes = [{ email: 'sam@example.com', expiresAt: Date.now() + 86_400_000 }];
  let service: SeasonPassAdminService;
  let listGiftedSeasonPasses: ReturnType<typeof vi.fn>;
  let lookupUserByEmail: ReturnType<typeof vi.fn>;
  let resetSeason: ReturnType<typeof vi.fn>;
  const user = signal<{ email: string } | null>(null);

  beforeEach(() => {
    user.set({ email: 'paulqlove@gmail.com' });
    listGiftedSeasonPasses = vi.fn().mockResolvedValue(passes);
    lookupUserByEmail = vi.fn().mockResolvedValue('uid-sam');
    resetSeason = vi.fn().mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isPreviewAdmin: signal(true), currentUser: user, lookupUserByEmail } },
        { provide: ConfirmService, useValue: {} },
        { provide: GameService, useValue: { listGiftedSeasonPasses } },
        { provide: SeasonGamesService, useValue: { resetSeason } },
        { provide: ToastService, useValue: { error: vi.fn(), success: vi.fn() } }
      ]
    });
    service = TestBed.inject(SeasonPassAdminService);
  });

  it('shows for the admin account only', () => {
    expect(service.canManagePasses()).toBe(true);
    user.set({ email: 'someone@example.com' });
    expect(service.canManagePasses()).toBe(false);
  });

  it('resets free games for the account with that email and says so', async () => {
    service.resetEmail = ' Sam@Example.com ';
    await service.resetFreeGames();
    expect(lookupUserByEmail).toHaveBeenCalledWith('sam@example.com');
    expect(resetSeason).toHaveBeenCalledWith('uid-sam');
    expect(service.resetDoneEmail()).toBe('sam@example.com');
    expect(service.resetUserMissing()).toBe(false);
    expect(service.resetEmail).toBe('');
  });

  it('marks the field when no account has that email, and clears it on edit', async () => {
    lookupUserByEmail.mockResolvedValue(null);
    service.resetEmail = 'nobody@example.com';
    await service.resetFreeGames();
    expect(resetSeason).not.toHaveBeenCalled();
    expect(service.resetUserMissing()).toBe(true);
    expect(service.resetEmail).toBe('nobody@example.com');
    service.onResetEmailChange();
    expect(service.resetUserMissing()).toBe(false);
  });

  it('treats text without an @ as no such user, without looking it up', async () => {
    service.resetEmail = 'sam';
    await service.resetFreeGames();
    expect(lookupUserByEmail).not.toHaveBeenCalled();
    expect(service.resetUserMissing()).toBe(true);
  });

  it('gifts 30 days unless changed', () => {
    expect(service.newGiftDays).toBe(30);
  });

  it('opens the dialog and loads the gifted passes', async () => {
    service.openDialog();
    expect(service.dialogOpen()).toBe(true);
    await vi.waitFor(() => expect(service.giftedPasses()).toEqual(passes));
    expect(listGiftedSeasonPasses).toHaveBeenCalledTimes(1);
    expect(service.isLoadingGiftedPasses()).toBe(false);
  });
});
