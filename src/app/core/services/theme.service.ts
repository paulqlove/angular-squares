import { Injectable, signal, computed, effect, PLATFORM_ID, inject } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

export type ThemeMode = 'system' | 'light' | 'dark';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private platformId = inject(PLATFORM_ID);
  private isBrowser = isPlatformBrowser(this.platformId);
  private readonly STORAGE_KEY = 'theme';

  theme = signal<ThemeMode>(this.getStoredTheme());

  effectiveTheme = computed(() => {
    const mode = this.theme();
    if (mode === 'system') {
      return this.getSystemPreference();
    }
    return mode;
  });

  constructor() {
    if (this.isBrowser) {
      // Apply theme on changes
      effect(() => {
        const effective = this.effectiveTheme();
        this.applyTheme(effective);
      });

      // Listen for system preference changes
      window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
        if (this.theme() === 'system') {
          this.applyTheme(this.getSystemPreference());
        }
      });
    }
  }

  setTheme(mode: ThemeMode): void {
    this.theme.set(mode);
    if (this.isBrowser) {
      localStorage.setItem(this.STORAGE_KEY, mode);
    }
  }

  private applyTheme(effective: 'light' | 'dark'): void {
    if (!this.isBrowser) return;

    if (effective === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }

  private getStoredTheme(): ThemeMode {
    if (!this.isBrowser) return 'system';
    const stored = localStorage.getItem(this.STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  }

  private getSystemPreference(): 'light' | 'dark' {
    if (!this.isBrowser) return 'light';
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
}
