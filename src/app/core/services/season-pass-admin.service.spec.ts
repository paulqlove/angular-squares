import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AuthService } from './auth.service';
import { ConfirmService } from './confirm.service';
import { GameService } from './game.service';
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
  const user = signal<{ email: string } | null>(null);

  beforeEach(() => {
    user.set({ email: 'paulqlove@gmail.com' });
    listGiftedSeasonPasses = vi.fn().mockResolvedValue(passes);
    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: { isPreviewAdmin: signal(true), currentUser: user } },
        { provide: ConfirmService, useValue: {} },
        { provide: GameService, useValue: { listGiftedSeasonPasses } },
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
