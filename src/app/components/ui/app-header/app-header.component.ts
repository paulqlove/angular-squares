import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [class]="containerClass">
      <div class="mx-auto max-w-[1600px] px-4 sm:px-8 h-14 flex justify-between items-center">
        <div class="flex items-center">
          @if (heading === 'h1') {
            <h1><img src="assets/brand/lockup-horizontal-reversed.svg" alt="QuarterScore" width="192" height="24" class="h-6 w-auto"></h1>
          } @else {
            <p><img src="assets/brand/lockup-horizontal-reversed.svg" alt="QuarterScore" width="192" height="24" class="h-6 w-auto"></p>
          }
        </div>
        <div class="flex items-center gap-1 sm:gap-2">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
    @if (variant === 'fixed') {
      <div class="h-14"></div>
    }
  `
})
export class AppHeaderComponent {
  @Input() variant: 'transparent' | 'solid' | 'fixed' = 'solid';
  /** Welcome passes `p` so the page keeps a single h1. */
  @Input() heading: 'h1' | 'p' = 'h1';

  get containerClass(): string {
    const navy = 'qs-on-navy bg-qs-tile text-qs-tile-ink';
    return this.variant === 'fixed' ? `${navy} fixed top-0 left-0 right-0 z-[100]` : navy;
  }
}
