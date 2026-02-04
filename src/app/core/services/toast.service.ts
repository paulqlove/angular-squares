import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning';
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toasts = signal<Toast[]>([]);
  toasts = this._toasts.asReadonly();

  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  success(message: string): void {
    this.addToast(message, 'success', 4000);
  }

  error(message: string): void {
    this.addToast(message, 'error', 6000);
  }

  warning(message: string): void {
    this.addToast(message, 'warning', 5000);
  }

  dismiss(id: string): void {
    this._toasts.update(toasts => toasts.filter(t => t.id !== id));
  }

  private addToast(message: string, type: Toast['type'], duration: number): void {
    const id = this.generateId();
    const toast: Toast = { id, message, type };

    this._toasts.update(toasts => {
      const updated = [...toasts, toast];
      // Max 3 toasts
      if (updated.length > 3) {
        return updated.slice(-3);
      }
      return updated;
    });

    setTimeout(() => this.dismiss(id), duration);
  }
}
