import { Component, Input, ChangeDetectionStrategy } from '@angular/core';
import { ThemeToggleComponent } from '../theme-toggle/theme-toggle.component';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  imports: [ThemeToggleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [class]="containerClass">
      <div class="mx-auto max-w-[1600px] px-4 sm:px-8 h-14 flex justify-between items-center">
        <div class="flex items-center gap-2.5">
          <picture>
            <source srcset="assets/logo.webp" type="image/webp">
            <img src="assets/logo.png" alt="Quarter Score logo" width="114" height="120" class="h-8 w-auto">
          </picture>
          @if (heading === 'h1') {
            <h1 class="qs-title text-lg">Quarter Score</h1>
          } @else {
            <p class="qs-title text-lg">Quarter Score</p>
          }
        </div>
        <div class="flex items-center gap-1 sm:gap-2">
          <ng-content></ng-content>
          <app-theme-toggle></app-theme-toggle>
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
