import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  template: `
    <div [class]="containerClass">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center gap-3">
        <div class="min-w-0 shrink">
          @if (onNavy) {
            <img
              src="assets/brand/lockup-horizontal-reversed.svg"
              alt="QuarterScore"
              width="384"
              height="48"
              class="h-7 w-auto max-w-full sm:h-8"
            >
          } @else {
            <img
              src="assets/brand/lockup-horizontal.svg"
              alt="QuarterScore"
              width="384"
              height="48"
              class="h-7 w-auto max-w-full sm:h-8 dark:hidden"
            >
            <img
              src="assets/brand/lockup-horizontal-reversed.svg"
              alt="QuarterScore"
              width="384"
              height="48"
              class="hidden h-7 w-auto max-w-full sm:h-8 dark:block"
            >
          }
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
    @if (variant === 'fixed') {
      <div class="h-16"></div>
    }
  `
})
export class AppHeaderComponent {
  /** Transparent and solid sit on the navy header. Fixed follows the page background. */
  @Input() variant: 'transparent' | 'solid' | 'fixed' = 'solid';

  get onNavy(): boolean {
    return this.variant === 'transparent' || this.variant === 'solid';
  }

  get containerClass(): string {
    switch (this.variant) {
      case 'transparent':
        return '';
      case 'solid':
        return 'bg-header shadow-lg';
      case 'fixed':
        return 'fixed top-0 left-0 right-0 z-[100] bg-page';
    }
  }
}
