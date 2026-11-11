import { Injectable, signal } from '@angular/core';

export interface ConfirmOptions {
  title: string;
  message: string;
  confirmLabel: string;
  /** danger (default) for deletes and resets; primary for a safe step like locking a board. */
  tone?: 'danger' | 'primary';
}

interface PendingConfirm extends ConfirmOptions {
  resolve: (ok: boolean) => void;
}

/** Styled replacement for the browser confirm(). One question at a time; resolves true only on the confirm button. */
@Injectable({ providedIn: 'root' })
export class ConfirmService {
  private _pending = signal<PendingConfirm | null>(null);
  pending = this._pending.asReadonly();

  ask(options: ConfirmOptions): Promise<boolean> {
    this._pending()?.resolve(false);
    return new Promise<boolean>(resolve => this._pending.set({ ...options, resolve }));
  }

  answer(ok: boolean): void {
    const current = this._pending();
    this._pending.set(null);
    current?.resolve(ok);
  }
}
