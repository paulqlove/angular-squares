import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';
import { PlanService } from './plan.service';
import { ToastService } from './toast.service';

/**
 * The one-time "You're a Season Pass host" dialog on the dashboard. It shows to a Season Pass host until they close it;
 * closing saves users/{uid}/seasonWelcomeSeen, so it never shows again on any device.
 */
@Injectable({ providedIn: 'root' })
export class SeasonWelcomeService {
  constructor() {
    // Reads the flag once per account, when it turns out to be on Season Pass
    effect(() => {
      const uid = this.authService.realUser()?.uid;
      if (!uid || this.planService.plan() !== 'season' || untracked(this.readFor) === uid) return;
      this.readFor.set(uid);
      this.seen.set(null);
      void this.load(uid);
    });
  }

  /** True while the welcome should show: a Season Pass host who hasn't closed it yet. */
  public readonly shows = computed<boolean>(() => this.planService.plan() === 'season' && this.seen() === false);

  /** Closes the welcome for good. A failed save keeps it closed for now; it may come back on the next visit. */
  public async dismiss(): Promise<void> {
    const uid = this.authService.realUser()?.uid;
    this.seen.set(true);
    if (!uid || !this.database.isBrowser || this.authService.blockPreviewWrite()) return;
    try {
      await this.save(`users/${uid}/seasonWelcomeSeen`, true);
    } catch {
      this.toast.warning("Couldn't save that. The welcome may show again next time.");
    }
  }

  /** The two database calls, kept apart so the tests can stand in for the database. */
  protected async read(path: string): Promise<unknown> {
    return (await get(ref(this.database.db, path))).val();
  }

  protected save(path: string, value: unknown): Promise<void> {
    return set(ref(this.database.db, path), value);
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly planService: PlanService = inject(PlanService);
  /** The account whose flag was read, so it's read once. */
  private readonly readFor = signal<string | null>(null);
  /** Whether this account closed the welcome: null until read, or when the read failed (then the welcome stays away). */
  private readonly seen = signal<boolean | null>(null);
  private readonly toast: ToastService = inject(ToastService);

  private async load(uid: string): Promise<void> {
    if (!this.database.isBrowser) return;
    try {
      const value = await this.read(`users/${uid}/seasonWelcomeSeen`);
      if (this.readFor() === uid) this.seen.set(value === true);
    } catch {
      // Unreadable flag: leave the welcome away rather than show it to someone who already closed it
    }
  }
}
