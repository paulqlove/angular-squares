import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

@Component({
  selector: 'app-shared-header',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div [class]="containerClass">
      <div class="container mx-auto px-4 py-4 flex justify-between items-center">
        <div class="flex items-center gap-2">
          <picture>
            <source srcset="assets/logo.webp" type="image/webp">
            <img src="assets/logo.png" alt="Quarter Score logo" width="114" height="120" [class]="logoClass">
          </picture>
          @if (heading === 'h1') {
            <h1 [class]="titleClass">Quarter Score</h1>
          } @else {
            <p [class]="titleClass">Quarter Score</p>
          }
        </div>
        <div class="flex items-center gap-2">
          <ng-content></ng-content>
        </div>
      </div>
    </div>
    @if (variant === 'fixed') {
      <div class="h-[72px]"></div>
    }
  `
})
export class AppHeaderComponent {
  @Input() variant: 'transparent' | 'solid' | 'fixed' = 'solid';
  /** Welcome passes `p` so the page keeps a single h1. */
  @Input() heading: 'h1' | 'p' = 'h1';

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

  get logoClass(): string {
    switch (this.variant) {
      case 'transparent':
        return 'h-10 w-auto';
      case 'solid':
        return 'h-10 w-auto drop-shadow-lg';
      case 'fixed':
        return 'h-8 w-auto';
    }
  }

  get titleClass(): string {
    switch (this.variant) {
      case 'transparent':
        return 'text-2xl font-bold text-white';
      case 'solid':
        return 'text-xl font-bold text-header tracking-tight';
      case 'fixed':
        return 'hidden sm:block text-2xl sm:text-3xl md:text-4xl font-bold text-heading';
    }
  }
}
