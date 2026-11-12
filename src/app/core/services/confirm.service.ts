import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** danger (default) for deletes and resets; primary for a safe step like locking a board. */
  tone?: 'danger' | 'primary';
  /** Adds a "Never show me this again" checkbox. Once ticked and confirmed, ask() resolves true without showing the dialog (this browser only). */
  rememberKey?: string;
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

const SKIP_PREFIX = 'qs_skip_confirm_';

/** Styled replacement for the browser confirm(). One question at a time; resolves true only on the confirm button. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private _pending = signal<PendingConfirm | null>(null);
  pending = this._pending.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    if (options.rememberKey && this.skipped(options.rememberKey)) return Promise.resolve(true);
    this._pending()?.resolve(false);
    return new Promise<boolean>(resolve => this._pending.set({ ...options, resolve }));
  }

  answer(ok: boolean, neverAgain = false): void {
    const current = this._pending();
    this._pending.set(null);
    if (ok && neverAgain && current?.rememberKey) {
      try { localStorage.setItem(SKIP_PREFIX + current.rememberKey, '1'); } catch { /* storage blocked: the dialog just keeps showing */ }
    }
    current?.resolve(ok);
  }

  private skipped(key: string): boolean {
    try { return localStorage.getItem(SKIP_PREFIX + key) === '1'; } catch { return false; }
  }
}
