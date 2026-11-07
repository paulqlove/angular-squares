import { Injectable, signal } from '@angular/core';

export type PreviewRole = 'actual' | 'owner' | 'cohost' | 'player' | 'guest' | 'signedOut';
export type PreviewPlan = 'actual' | 'free' | 'season';

/** Only this account sees the "View as" switcher. UI preview only; database rules still see the real account. */
export const PREVIEW_ADMIN_EMAIL = 'paulqlove@gmail.com';

const STORAGE_KEY = 'qs_preview_role';
const PLAN_KEY = 'qs_preview_plan';

@Injectable({ providedIn: 'root' })
export class RolePreviewService {
  readonly options: { value: PreviewRole; label: string }[] = [
    { value: 'actual', label: 'Me (no preview)' },
    { value: 'owner', label: 'Owner' },
    { value: 'cohost', label: 'Co-host' },
    { value: 'player', label: 'Player' },
    { value: 'guest', label: 'Guest' },
    { value: 'signedOut', label: 'Signed out' }
  ];
  readonly planOptions: { value: PreviewPlan; label: string }[] = [
    { value: 'actual', label: 'My plan' },
    { value: 'free', label: 'Free' },
    { value: 'season', label: 'Season Pass' }
  ];
  readonly role = signal<PreviewRole>(this.read());
  readonly plan = signal<PreviewPlan>(this.readPlan());

  setPlan(plan: PreviewPlan): void {
    this.plan.set(plan);
    try {
      sessionStorage.setItem(PLAN_KEY, plan);
    } catch {}
  }

  setRole(role: PreviewRole): void {
    this.role.set(role);
    try {
      sessionStorage.setItem(STORAGE_KEY, role);
    } catch {}
  }

  private read(): PreviewRole {
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY) : null;
      return this.options.some(o => o.value === stored) ? (stored as PreviewRole) : 'actual';
    } catch {
      return 'actual';
    }
  }

  private readPlan(): PreviewPlan {
    try {
      const stored = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(PLAN_KEY) : null;
      return this.planOptions.some(o => o.value === stored) ? (stored as PreviewPlan) : 'actual';
    } catch {
      return 'actual';
    }
  }
}
