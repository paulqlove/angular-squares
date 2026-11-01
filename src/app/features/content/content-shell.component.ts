import { Component, Input, inject, signal } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter } from 'rxjs';
import { SiteFooterComponent } from '../../shared/site-footer.component';

interface NavLink {
  path: string;
  label: string;
}

@Component({
  selector: 'app-content-shell',
  standalone: true,
  imports: [RouterLink, SiteFooterComponent],
  template: `
    <a
      href="#main"
      class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[200] focus:rounded-md focus:bg-card focus:px-4 focus:py-2 focus:text-heading"
    >
      Skip to content
    </a>
    <div class="flex min-h-screen flex-col bg-page">
      <header class="no-print border-b border-default bg-card">
        <div class="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
          <a routerLink="/" class="inline-flex min-h-11 items-center rounded-md" aria-label="QuarterScore">
            <img
              src="assets/brand/lockup-horizontal.svg"
              alt="QuarterScore"
              width="384"
              height="48"
              class="h-8 w-auto dark:hidden"
            >
            <img
              src="assets/brand/lockup-horizontal-reversed.svg"
              alt="QuarterScore"
              width="384"
              height="48"
              class="hidden h-8 w-auto dark:block"
            >
          </a>

          <button
            type="button"
            class="ml-auto inline-flex min-h-11 items-center rounded-md border border-default px-3 text-sm font-semibold text-heading md:hidden"
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
                    class="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-semibold text-heading hover:bg-control"
                    [class.bg-control]="isCurrent(link.path)"
                  >
                    {{ link.label }}
                  </a>
                </li>
              }
              <li class="md:ml-2">
                <a
                  routerLink="/dashboard"
                  class="inline-flex min-h-11 w-full items-center justify-center rounded-md bg-button px-4 text-sm font-semibold text-button hover:bg-button-hover md:w-auto"
                >
                  Start a free game
                </a>
              </li>
            </ul>
          </nav>
        </div>
      </header>

      <main id="main" class="flex-1 px-4 py-8 sm:py-12">
        <div [class]="wide ? 'mx-auto max-w-5xl' : 'mx-auto max-w-3xl'">
          <ng-content></ng-content>
        </div>
      </main>

      <app-site-footer></app-site-footer>
    </div>
  `
})
export class ContentShellComponent {
  @Input() public wide = false;

  public readonly menuOpen = signal(false);

  public readonly links: NavLink[] = [
    { path: '/how-to-play', label: 'How to play' },
    { path: '/faq', label: 'FAQ' },
    { path: '/best-squares-numbers', label: 'Best numbers' },
    { path: '/printable-football-squares', label: 'Printable' },
    { path: '/blog', label: 'Blog' }
  ];

  private router = inject(Router);

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
