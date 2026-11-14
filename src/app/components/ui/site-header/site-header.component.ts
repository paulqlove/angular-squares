import { ChangeDetectionStrategy, Component, DestroyRef, ElementRef, OnInit, afterNextRender, computed, inject, input, signal } from '@angular/core';
import { NgTemplateOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { filter, fromEvent } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';

interface NavLink {
  path: string;
  label: string;
}

/** How the bar sits: scrolls away (static), slides away on scroll down and back on scroll up (headroom), or stays put (fixed). */
type SiteHeaderPosition = 'static' | 'headroom' | 'fixed';

/**
 * The navy bar on every page: the logo, a link home, on the left and the page's own buttons on the right.
 * `nav="guides"` adds the guide links and Create a board (Dashboard when signed in) used by the reading pages.
 */
@Component({
  selector: 'app-site-header',
  imports: [NgTemplateOutlet, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class]': 'hostClass()',
    '(focusin)': 'hidden.set(false)'
  },
  template: `
    <header [class]="barClass()">
      <div class="mx-auto flex min-h-[60px] max-w-[1600px] flex-wrap items-center gap-3 px-4 py-2 sm:px-8">
        @if (heading() === 'h1') {
          <h1><ng-container [ngTemplateOutlet]="logo"></ng-container></h1>
        } @else {
          <p><ng-container [ngTemplateOutlet]="logo"></ng-container></p>
        }

        @if (nav() === 'guides') {
          <a [routerLink]="ctaPath()" class="ml-auto qs-btn qs-btn-primary md:hidden">{{ ctaLabel() }}</a>
          <button
            type="button"
            class="qs-btn qs-btn-ghost border-white/20 md:hidden"
            [attr.aria-expanded]="menuOpen()"
            aria-controls="site-nav"
            (click)="toggleMenu()"
          >
            {{ menuOpen() ? 'Close menu' : 'Menu' }}
          </button>

          <!-- Closed on phones it takes no room, so the bar stays 60px like every other page -->
          <nav id="site-nav" aria-label="Primary" class="w-full md:ml-auto md:!block md:w-auto" [class.hidden]="!menuOpen()">
            <ul class="flex w-full flex-col gap-1 md:w-auto md:flex-row md:items-center">
              @for (link of guideLinks; track link.path) {
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
                <a [routerLink]="ctaPath()" class="qs-btn qs-btn-primary w-full md:w-auto">{{ ctaLabel() }}</a>
              </li>
            </ul>
          </nav>
        } @else {
          <div class="ml-auto flex items-center gap-1 sm:gap-2">
            <ng-content></ng-content>
          </div>
        }
      </div>
    </header>
    @if (position() === 'fixed') {
      <div class="h-[60px]"></div>
    }

    <ng-template #logo>
      <a routerLink="/" aria-label="QuarterScore home" class="flex min-h-11 items-center rounded-md">
        <img src="assets/brand/lockup-horizontal-reversed.svg" alt="" width="192" height="24" class="hidden h-6 w-auto sm:block">
        <img src="assets/brand/mark-reversed.svg" alt="" width="32" height="32" class="h-8 w-8 sm:hidden">
      </a>
    </ng-template>
  `
})
export class SiteHeaderComponent implements OnInit {
  constructor() {
    const destroyRef = inject(DestroyRef);
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      takeUntilDestroyed(destroyRef)
    ).subscribe(() => this.menuOpen.set(false));
    // Only the headroom bar listens to scrolling, so pages with a static or fixed bar don't re-render on every scroll.
    afterNextRender(() => {
      if (this.position() !== 'headroom') return;
      fromEvent(window, 'scroll', { passive: true }).pipe(takeUntilDestroyed(destroyRef)).subscribe(() => this.onScroll());
    });
  }

  public readonly guideLinks: NavLink[] = [
    { path: '/how-to-play', label: 'How to play' },
    { path: '/faq', label: 'FAQ' },
    { path: '/best-squares-numbers', label: 'Best numbers' },
    { path: '/printable-football-squares', label: 'Printable' },
    { path: '/football-squares-on-tv', label: 'TV mode' }
  ];
  /** Pages with their own `<h1>` pass `p`, so each page keeps a single h1. */
  public readonly heading = input<'h1' | 'p'>('h1');
  public readonly menuOpen = signal(false);
  public readonly nav = input<'none' | 'guides'>('none');
  public readonly position = input<SiteHeaderPosition>('static');

  public isCurrent(path: string): boolean {
    const current = this.router.url.split(/[?#]/)[0];
    return current === path || current.startsWith(`${path}/`);
  }

  public ngOnInit(): void {
    // The guide links' call to action depends on the account, which content pages load only when this browser had one.
    if (this.nav() === 'guides') this.auth.restoreSession();
  }

  public toggleMenu(): void {
    this.menuOpen.update(open => !open);
  }

  protected readonly barClass = computed(() => {
    const navy = 'qs-on-navy bg-qs-tile text-qs-tile-ink';
    return this.position() === 'fixed' ? `${navy} fixed top-0 left-0 right-0 z-[100]` : navy;
  });
  /** Signed-in hosts already have a dashboard, so the call to action becomes a link to it. */
  protected readonly ctaLabel = computed(() => (this.signedIn() ? 'Dashboard' : 'Create a board'));
  protected readonly ctaPath = computed(() => (this.signedIn() ? '/dashboard' : '/create'));
  /** Headroom: true while the bar is slid away. */
  protected readonly hidden = signal(false);
  protected readonly hostClass = computed(() => {
    // Reading pages print without the bar; the app pages print as they always have.
    const base = this.nav() === 'guides' ? 'no-print block' : 'block';
    if (this.position() !== 'headroom') return base;
    const slide = `${base} sticky top-0 z-40 transition-transform duration-200 motion-reduce:transition-none`;
    return this.hidden() ? `${slide} -translate-y-full` : slide;
  });

  private readonly auth = inject(AuthService);
  private readonly el = inject<ElementRef<HTMLElement>>(ElementRef);
  private lastY = 0;
  private readonly router = inject(Router);
  private readonly signedIn = computed(() => {
    const user = this.auth.currentUser();
    return !!user && !user.isGuest;
  });

  /** Headroom: hide on scroll down past the bar, show on scroll up or when something inside takes focus. */
  private onScroll(): void {
    const y = window.scrollY;
    if (Math.abs(y - this.lastY) < 4) return;
    const bar = this.el.nativeElement;
    this.hidden.set(y > this.lastY && y > bar.offsetHeight && !bar.contains(document.activeElement));
    this.lastY = y;
  }
}
