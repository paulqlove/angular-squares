import { Component, ChangeDetectionStrategy } from '@angular/core';
import { environment } from '../../../../environments/environment';

/**
 * Ad space on free hosts' boards. Never over the board or in the TV view.
 * Hidden for everyone while environment.adsEnabled is false (the board decided to wait until traffic justifies ads).
 * Block gambling/sportsbook ad categories when a network is added.
 */
@Component({
  selector: 'app-ad-slot',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (adsEnabled) {
      <aside class="no-print" aria-label="Advertisement">
        <p class="qs-label mb-1.5 text-[10px] text-qs-muted">Advertisement</p>
        <div class="flex min-h-[100px] items-center justify-center rounded-inner border border-dashed border-qs-line-strong bg-qs-panel-2 px-4 text-center text-sm text-qs-muted"></div>
      </aside>
    }
  `
})
export class AdSlotComponent {
  protected adsEnabled = environment.adsEnabled;
}
