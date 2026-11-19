import { Injectable, Signal, computed, inject, signal } from '@angular/core';

import { isNoExpiry } from '../plans';
import { AuthService } from './auth.service';
import { ConfirmService } from './confirm.service';
import { GameService } from './game.service';
import { SeasonGamesService } from './season-games.service';
import { ToastService } from './toast.service';

/** The only account that sees the gifted Season Passes item and dialog. */
const PASS_ADMIN_EMAIL = 'paulqlove@gmail.com';

interface GiftedPass {
  email: string;
  expiresAt: number;
  updatedAt?: number;
}

/** "Never expires", "Expired", "1 day left" or "N days left" for a gifted pass. */
export function formatPassExpiry(expiresAt: number, now: number = Date.now()): string {
  if (isNoExpiry(expiresAt)) return 'Never expires';
  const days = Math.ceil((expiresAt - now) / 86_400_000);
  if (days <= 0) return 'Expired';
  if (days === 1) return '1 day left';
  return `${days} days left`;
}

/** Admin: gifted Season Passes, granted, revoked and made permanent, and free games reset, from the profile menu's Season Passes dialog. */
@Injectable({ providedIn: 'root' })
export class SeasonPassAdminService {
  /** The Season Passes item and dialog show for the admin account only. */
  public readonly canManagePasses = computed<boolean>(() => this.isAdmin() && this.authService.currentUser()?.email?.toLowerCase() === PASS_ADMIN_EMAIL);
  public readonly giftedPasses = signal<GiftedPass[]>([]);
  public readonly dialogOpen = signal<boolean>(false);
  public readonly isAdmin: Signal<boolean> = inject(AuthService).isPreviewAdmin;
  public readonly isGrantingPass = signal<boolean>(false);
  public readonly isLoadingGiftedPasses = signal<boolean>(false);
  public readonly isResettingFreeGames = signal<boolean>(false);
  public newGiftDays: number = 30;
  public newGiftEmail: string = '';
  /** The email whose free games were just reset, for the short success line. Null otherwise. */
  public readonly resetDoneEmail = signal<string | null>(null);
  public resetEmail: string = '';
  /** True when the last reset email matched no account: a red ring and "User doesn't exist" under the field. */
  public readonly resetUserMissing = signal<boolean>(false);
  public readonly updatingPassEmail = signal<string | null>(null);

  public formatExpiry(expiresAt: number): string {
    return formatPassExpiry(expiresAt);
  }

  public async grantSeasonPass(): Promise<void> {
    const email = this.newGiftEmail.trim().toLowerCase();
    if (!email || !email.includes('@')) {
      this.toastService.error('Please enter a valid email');
      return;
    }
    this.isGrantingPass.set(true);
    try {
      await this.gameService.grantSeasonPass(email, this.newGiftDays);
      this.newGiftEmail = '';
      this.toastService.success(`Season pass granted to ${email}`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Could not grant the season pass. Try again.');
    } finally {
      this.isGrantingPass.set(false);
    }
  }

  public hasNoExpiry(expiresAt: number): boolean {
    return isNoExpiry(expiresAt);
  }

  public isPassExpired(expiresAt: number): boolean {
    return expiresAt <= Date.now();
  }

  public async loadGiftedPasses(): Promise<void> {
    this.isLoadingGiftedPasses.set(true);
    try {
      const passes = await this.gameService.listGiftedSeasonPasses();
      this.giftedPasses.set(passes);
    } catch {
      this.toastService.error('Could not load gifted passes. Try again.');
    } finally {
      this.isLoadingGiftedPasses.set(false);
    }
  }

  public async makePassPermanent(email: string): Promise<void> {
    this.updatingPassEmail.set(email);
    try {
      await this.gameService.setSeasonPassNoExpiry(email);
      this.toastService.success(`${email} now has a pass that never expires`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Could not update the pass. Try again.');
    } finally {
      this.updatingPassEmail.set(null);
    }
  }

  /** Clears the not-found ring and the success line once the email is edited. */
  public onResetEmailChange(): void {
    this.resetUserMissing.set(false);
    this.resetDoneEmail.set(null);
  }

  /** Sets the free games used this season back to 0 for the account with this email. */
  public async resetFreeGames(): Promise<void> {
    const email = this.resetEmail.trim().toLowerCase();
    if (!email) return;
    this.resetDoneEmail.set(null);
    if (!email.includes('@')) {
      this.resetUserMissing.set(true);
      return;
    }
    this.isResettingFreeGames.set(true);
    try {
      const uid = await this.authService.lookupUserByEmail(email);
      if (!uid) {
        this.resetUserMissing.set(true);
        return;
      }
      await this.seasonGamesService.resetSeason(uid);
      this.resetEmail = '';
      this.resetDoneEmail.set(email);
    } catch {
      this.toastService.error('Could not reset free games. Try again.');
    } finally {
      this.isResettingFreeGames.set(false);
    }
  }

  public async revokePass(email: string): Promise<void> {
    if (!await this.confirmService.ask({ title: 'Revoke season pass?', message: email, confirmLabel: 'Revoke pass' })) return;
    try {
      await this.gameService.revokeSeasonPass(email);
      this.toastService.success(`Pass revoked for ${email}`);
      await this.loadGiftedPasses();
    } catch {
      this.toastService.error('Could not revoke the pass. Try again.');
    }
  }

  public openDialog(): void {
    this.dialogOpen.set(true);
    this.loadGiftedPasses();
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly gameService: GameService = inject(GameService);
  private readonly seasonGamesService: SeasonGamesService = inject(SeasonGamesService);
  private readonly toastService: ToastService = inject(ToastService);
}
