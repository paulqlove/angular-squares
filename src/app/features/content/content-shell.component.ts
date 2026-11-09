import { Component, computed, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../core/services/auth.service';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { HeadroomDirective } from '../../shared/directives/headroom.directive';

interface NavLink {
  path: string;
  label: string;
}

@Component({
    selector: 'app-content-shell',
    imports: [RouterLink, SiteFooterComponent, HeadroomDirective],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-heading"
    >
      Skip to content
    </a>
    <div class="flex min-h-screen flex-col bg-page overflow-x-hidden">
      <header appHeadroom class="no-print qs-on-navy bg-qs-tile text-qs-tile-ink">
        <div class="mx-auto flex max-w-[1600px] flex-wrap items-center gap-3 px-4 sm:px-8 py-2">
          <a routerLink="/" aria-label="QuarterScore home" class="flex min-h-11 items-center gap-2 rounded-md">
            <img src="assets/brand/lockup-horizontal-reversed.svg" alt="" width="192" height="24" class="hidden h-6 w-auto sm:block">
            <img src="assets/brand/mark-reversed.svg" alt="" width="32" height="32" class="h-8 w-8 sm:hidden">
          </a>

          <a
            [routerLink]="signedIn() ? '/dashboard' : '/create'"
            class="ml-auto qs-btn qs-btn-primary md:hidden"
          >
            {{ signedIn() ? 'Dashboard' : 'Start a free game' }}
          </a>

          <button
            type="button"
            class="qs-btn qs-btn-ghost border-white/20 md:hidden"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="site-nav"
            (click)="toggleMenu()"
          >
            {{ menuOpen() ? 'Close menu' : 'Menu' }}
          </button>

          <nav aria-label="Primary" class="w-full md:ml-auto md:w-auto">
            <ul
              id="site-nav"
              class="w-full flex-col gap-1 md:!flex md:w-auto md:flex-row md:items-center"
              [class.hidden]="!menuOpen()"
              [class.flex]="menuOpen()"
            >
              @for (link of links; track link.path) {
                <li>
                  <a
                    [routerLink]="link.path"
                    [attr.aria-current]="isCurrent(link.path) ? 'page' : null"
                    class="qs-btn qs-btn-ghost w-full justify-start px-3 text-qs-tile-muted hover:text-qs-tile-ink aria-[current=page]:bg-white/10 aria-[current=page]:text-qs-tile-ink md:w-auto"
                  >
                    {{ link.label }}
                  </a>
                </li>
              }
              <li class="hidden md:ml-2 md:block">
                <a
                  [routerLink]="signedIn() ? '/dashboard' : '/create'"
                  class="qs-btn qs-btn-primary w-full md:w-auto"
                >
                  {{ signedIn() ? 'Dashboard' : 'Start a free game' }}
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" class="flex-1 px-4 sm:px-8 py-8 sm:py-12 overflow-x-hidden">
        <div class="mx-auto max-w-5xl overflow-x-hidden">
          <ng-content></ng-content>
        </div>
      </main>

      <app-site-footer></app-site-footer>
    </div>
  `
})
export class ContentShellComponent {

  public readonly menuOpen = signal(false);

  public readonly links: NavLink[] = [
    { path: '/how-to-play', label: 'How to play' },
    { path: '/faq', label: 'FAQ' },
    { path: '/best-squares-numbers', label: 'Best numbers' },
    { path: '/printable-football-squares', label: 'Printable' },
    { path: '/football-squares-on-tv', label: 'TV mode' }
  ];

  private router = inject(Router);
  private auth = inject(AuthService);

  /** Signed-in hosts already have a dashboard; the call to action becomes a link to it. */
  public readonly signedIn = computed(() => {
    const user = this.auth.currentUser();
    return !!user && !user.isGuest;
  });

  constructor() {
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd)
    ).subscribe(() => this.menuOpen.set(false));
  }

  public isCurrent(path: string): boolean {
    const current = this.router.url.split(/[?#]/)[0];
    return current === path || current.startsWith(`${path}/`);
  }

  public toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }
}
