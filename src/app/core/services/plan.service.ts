import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { AuthService } from './auth.service';
import { GameService } from './game.service';
import { RolePreviewService } from './role-preview.service';
import { Entitlement, PLANS, PlanFeatures, PlanId, daysLeft, isActive } from '../plans';

/** The signed-in host's plan for the UI. The database rules enforce the same limits. */
@Injectable({ providedIn: 'root' })
export class PlanService {
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private rolePreview = inject(RolePreviewService);

  readonly entitlement = signal<Entitlement | null>(null);
  private admin = signal(false);

  /** Free, Week Pass, Season Pass or Admin. The admin can preview any plan from the View-as switcher. */
  readonly plan = computed<PlanId>(() => {
    if (this.authService.isPreviewAdmin() && this.rolePreview.plan() !== 'actual') {
      return this.rolePreview.plan() as PlanId;
    }
    if (this.admin()) return 'admin';
    const entitlement = this.entitlement();
    return isActive(entitlement) ? entitlement!.plan : 'free';
  });

  readonly features = computed<PlanFeatures>(() => PLANS[this.plan()]);
  readonly daysLeft = computed(() => (this.plan() === 'week' || this.plan() === 'season') && this.rolePreview.plan() === 'actual'
    ? daysLeft(this.entitlement())
    : 0);

  constructor() {
    // Load the real account's plan whenever the signed-in account changes.
    effect(() => {
      const user = this.authService.realUser();
      if (!user || user.isGuest) {
        this.entitlement.set(null);
        this.admin.set(false);
        return;
      }
      void this.refresh(user.uid);
    });
  }

  async refresh(uid: string): Promise<void> {
    const user = this.authService.realUser();
    const email = user?.email;

    const [admin, entitlement, giftedPass] = await Promise.all([
      this.gameService.isAdmin(uid),
      this.gameService.getEntitlement(uid),
      email ? this.gameService.getGiftedSeasonPass(email) : Promise.resolve(null)
    ]);

    this.admin.set(admin);

    // Use whichever entitlement is better: paid or gifted
    if (giftedPass && isActive(giftedPass)) {
      // Gifted pass is active - use it if no paid entitlement or gifted expires later
      if (!entitlement || !isActive(entitlement) || giftedPass.expiresAt > entitlement.expiresAt) {
        this.entitlement.set(giftedPass);
        return;
      }
    }
    this.entitlement.set(entitlement);
  }
}
