import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { ThemeService } from '../../../core/services/theme.service';

@Component({
  selector: 'app-theme-toggle',
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <button
      type="button"
      class="qs-btn qs-btn-ghost px-3"
      [attr.aria-label]="isDark() ? 'Switch to light theme' : 'Switch to dark theme'"
      (click)="toggle()"
    >
      {{ isDark() ? 'Dark' : 'Light' }}
    </button>
  `
})
export class ThemeToggleComponent {
  private themeService = inject(ThemeService);

  isDark() {
    return this.themeService.effectiveTheme() === 'dark';
  }

  toggle() {
    this.themeService.setTheme(this.isDark() ? 'light' : 'dark');
  }
}
