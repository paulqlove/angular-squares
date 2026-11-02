import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../core/services/auth.service';

/**
 * Ad space on free hosts' boards. Never over the board or in the TV view.
 * Until an ad network is set up (environment.adsEnabled), only the admin sees a placeholder.
 * Block gambling/sportsbook ad categories when a network is added.
 */
@Component({
  selector: 'app-ad-slot',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (adsEnabled || authService.isPreviewAdmin()) {
      <aside class="no-print" aria-label="Advertisement">
        <p class="qs-label mb-1.5 text-[10px] text-qs-muted">Advertisement</p>
        <div class="flex min-h-[100px] items-center justify-center rounded-inner border border-dashed border-qs-line-strong bg-qs-panel-2 px-4 text-center text-sm text-qs-muted">
          @if (!adsEnabled) {
            Ad space on free boards. Hidden from everyone but you until ads are turned on. A Week or Season Pass removes it.
          }
        </div>
      </aside>
    }
  `
})
export class AdSlotComponent {
  protected authService = inject(AuthService);
  protected adsEnabled = environment.adsEnabled;
}
