import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, Toast } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="fixed bottom-4 right-4 z-[200] flex flex-col gap-2">
      @for (toast of toastService.toasts(); track toast.id) {
        <div
          class="animate-toast-in flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[280px] max-w-sm"
          [class.bg-green-600]="toast.type === 'success'"
          [class.bg-red-600]="toast.type === 'error'"
          [class.bg-amber-500]="toast.type === 'warning'"
          role="alert"
          aria-live="polite"
        >
          <span class="text-white text-sm flex-1">{{ toast.message }}</span>
          <button
            (click)="dismiss(toast.id)"
            class="text-white/80 hover:text-white p-1"
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
