import { Component, inject, ChangeDetectionStrategy } from '@angular/core';

import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
    selector: 'app-toast',
    imports: [],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="animate-toast-in flex items-center gap-3 px-4 py-3 rounded-card border border-qs-line bg-qs-panel text-qs-ink shadow-pop min-w-[280px] max-w-sm"
          role="alert"
          aria-live="polite"
        >
          <span
            class="h-2 w-2 shrink-0 rounded-full"
            [class.bg-qs-ok]="toast.type === 'success'"
            [class.bg-qs-bad]="toast.type === 'error'"
            [class.bg-qs-warn]="toast.type === 'warning'"
            aria-hidden="true"
          ></span>
          <span class="text-sm flex-1">{{ toast.message }}</span>
          <button
            (click)="dismiss(toast.id)"
            class="text-qs-muted hover:text-qs-ink p-1"
            aria-label="Dismiss notification"
          >
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>
      }
    </div>
  `
})
export class ToastComponent {
  toastService = inject(ToastService);

  dismiss(id: string): void {
    this.toastService.dismiss(id);
  }
}
