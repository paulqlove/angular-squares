import { Injectable, signal } from '@angular/core';

export type PreviewRole = 'actual' | 'owner' | 'cohost' | 'player' | 'guest' | 'signedOut';

/** Only this account sees the "View as" switcher. UI preview only; database rules still see the real account. */
export const PREVIEW_ADMIN_EMAIL = 'paulqlove@gmail.com';

const STORAGE_KEY = 'qs_preview_role';

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
  readonly role = signal<PreviewRole>(this.read());

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
}
