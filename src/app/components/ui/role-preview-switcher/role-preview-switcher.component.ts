import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { PreviewPlan, PreviewRole, RolePreviewService } from '../../../core/services/role-preview.service';

/** Floating "View as" control. Only renders for the preview admin account. */
@Component({
  selector: 'app-role-preview-switcher',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (authService.isPreviewAdmin() && !hidden()) {
      <div
        class="no-print fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] [.has-host-bar_&]:bottom-[calc(6rem+env(safe-area-inset-bottom))] max-sm:[.has-phone-bar_&]:bottom-[calc(6rem+env(safe-area-inset-bottom))] left-4 z-[150] flex max-w-[calc(100vw-2rem)] flex-wrap items-center gap-2 rounded-card border bg-qs-panel py-1.5 pl-3 pr-1.5 shadow-pop"
        [class]="previewing() ? 'border-qs-warn' : 'border-qs-line'"
      >
        <label for="role-preview" class="qs-label text-qs-muted">View as</label>
        <select
          id="role-preview"
          class="min-h-9 rounded-btn border border-qs-line-strong bg-qs-panel-2 px-2 text-sm text-qs-ink"
          (change)="setRole($event)"
        >
          @for (opt of preview.options; track opt.value) {
            <option [value]="opt.value" [selected]="opt.value === preview.role()">{{ opt.label }}</option>
          }
        </select>
        <label for="plan-preview" class="sr-only">Plan</label>
        <select
          id="plan-preview"
          class="min-h-9 rounded-btn border border-qs-line-strong bg-qs-panel-2 px-2 text-sm text-qs-ink"
          (change)="setPlan($event)"
        >
          @for (opt of preview.planOptions; track opt.value) {
            <option [value]="opt.value" [selected]="opt.value === preview.plan()">{{ opt.label }}</option>
          }
        </select>
        @if (previewing()) {
          <span class="qs-badge qs-badge-warn" title="Screens show this role. Saving is blocked except as Owner. Database rules still see your real account.">
            Preview
          </span>
        }
        <button
          type="button"
          (click)="hidden.set(true)"
          class="ml-1 flex h-7 w-7 items-center justify-center rounded-btn text-qs-muted hover:bg-qs-panel-2 hover:text-qs-ink"
          aria-label="Hide preview control"
        >
          <svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </button>
      </div>
    }
  `
})
export class RolePreviewSwitcherComponent {
  protected authService = inject(AuthService);
  protected preview = inject(RolePreviewService);
  protected hidden = signal(false);

  protected previewing(): boolean {
    return this.preview.role() !== 'actual' || this.preview.plan() !== 'actual';
  }

  protected setPlan(event: Event): void {
    this.preview.setPlan((event.target as HTMLSelectElement).value as PreviewPlan);
  }

  protected setRole(event: Event): void {
    this.preview.setRole((event.target as HTMLSelectElement).value as PreviewRole);
  }
}
