import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { PreviewRole, RolePreviewService } from '../../../core/services/role-preview.service';

/** Floating "View as" control. Only renders for the preview admin account. */
@Component({
  selector: 'app-role-preview-switcher',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (authService.isPreviewAdmin()) {
      <div
        class="no-print fixed bottom-4 left-4 z-[150] flex items-center gap-2 rounded-card border bg-qs-panel py-1.5 pl-3 pr-1.5 shadow-pop"
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
        @if (previewing()) {
          <span class="qs-badge qs-badge-warn" title="Screens show this role. Saving is blocked except as Owner. Database rules still see your real account.">
            Preview
          </span>
        }
      </div>
    }
  `
})
export class RolePreviewSwitcherComponent {
  protected authService = inject(AuthService);
  protected preview = inject(RolePreviewService);

  protected previewing(): boolean {
    return this.preview.role() !== 'actual';
  }

  protected setRole(event: Event): void {
    this.preview.setRole((event.target as HTMLSelectElement).value as PreviewRole);
  }
}
