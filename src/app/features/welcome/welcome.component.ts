import { Component, ElementRef, signal, inject, OnInit, effect, ViewChild, ChangeDetectionStrategy, PLATFORM_ID, untracked } from '@angular/core';
import { isPlatformBrowser, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { gameCodeExists, isGameCode, normalizeCodeInput, normalizeGameCode } from '../../core/utils/game-code';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroArrowRight } from '@ng-icons/heroicons/outline';
import { SiteHeaderComponent } from '../../components/ui/site-header/site-header.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { PhoneDemoComponent } from './phone-demo.component';
import { ReadingSectionComponent } from '../content/reading-layout.components';
import { HomeBoardSizesComponent } from './home-board-sizes.component';
import { HomeFeaturesComponent } from './home-features.component';
import { HomeHowItWorksComponent } from './home-how-it-works.component';
import { HomeTeamsComponent } from './home-teams.component';

@Component({
    selector: 'app-welcome',
    imports: [
        RouterLink, NgIconComponent, SiteHeaderComponent, AuthModalComponent, PhoneDemoComponent, SiteFooterComponent,
        ReadingSectionComponent, HomeFeaturesComponent, HomeBoardSizesComponent, HomeTeamsComponent, HomeHowItWorksComponent
    ],
    providers: [
        provideIcons({ heroArrowRight })
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="min-h-screen bg-qs-bg text-qs-ink">
      <app-site-header heading="p" position="headroom">
        @if (isAuthenticated()) {
          <button type="button" (click)="goToDashboard()" class="qs-btn qs-btn-ghost">
            Dashboard
          </button>
        } @else {
          <button type="button" (click)="showAuthModal.set(true)" class="qs-btn qs-btn-primary">
            Sign in
          </button>
        }
      </app-site-header>

      <main id="main">
      <!-- Hero -->
      <section class="overflow-hidden">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8 pt-10 pb-16 md:pt-16 md:pb-24 min-[1000px]:pb-0">
        <div class="grid grid-cols-1 min-[1000px]:grid-cols-[1fr_minmax(0,1.05fr)] gap-10 min-[1000px]:gap-16 items-center">
          <div>
            <p class="qs-eyebrow">Football squares / Free for game day</p>
            <h1 class="qs-display mt-5 max-w-[14ch]">
              The Ultimate Football <span class="text-qs-accent">Squares</span> Game
            </h1>
            <p class="mt-6 text-xl font-medium">Every square, every score, live on one board.</p>
            <p class="mt-3 max-w-xl text-lg text-qs-muted leading-relaxed">
              Create and share your football squares game in seconds.
              Perfect for Super Bowl parties, office games, and game day fun.
            </p>

            <div class="mt-8 flex flex-wrap gap-3">
              <a routerLink="/create" class="qs-btn qs-btn-primary w-full sm:w-auto px-6">
                Create a board
              </a>
              <button
                type="button"
                (click)="openJoinCode()"
                [attr.aria-expanded]="showJoinCode()"
                aria-controls="join-code-panel"
                class="qs-btn qs-btn-secondary flex-1 sm:flex-none"
              >
                Join with code
              </button>
            </div>

            <!-- Grows open (grid rows 0fr to 1fr) so the page glides instead of jumping. -->
            <div
              class="grid transition-[grid-template-rows,opacity] duration-200 ease-[cubic-bezier(.2,.7,.2,1)] motion-reduce:transition-none"
              [class]="showJoinCode() ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'"
              [attr.inert]="showJoinCode() ? null : ''"
            >
              <div class="min-h-0 overflow-hidden -m-[5px] p-[5px]">
              <div id="join-code-panel" class="pt-5 w-full sm:max-w-sm">
                <label for="join-code" class="qs-label text-qs-muted">Game code</label>
                <div class="mt-2 flex items-center gap-2">
                  <input
                    #joinInput
                    id="join-code"
                    type="text"
                    [value]="gameCode"
                    (input)="onCodeInput($event)"
                    placeholder="ABC123"
                    autocapitalize="characters"
                    autocomplete="off"
                    class="min-h-11 min-w-0 flex-1 px-4 border border-qs-line-strong rounded-btn uppercase tracking-[0.2em] text-center font-mono text-base bg-qs-panel-2 text-qs-ink"
                    spellcheck="false"
                    [attr.aria-invalid]="notFound() ? 'true' : null"
                    [attr.aria-describedby]="notFound() ? 'join-code-error' : null"
                    (keyup.enter)="joinGame()"
                  />
                  <button
                    type="button"
                    (click)="joinGame()"
                    [disabled]="gameCode.length !== 6"
                    class="qs-btn qs-btn-ink"
                  >
                    Join
                    <ng-icon name="heroArrowRight" class="text-base" aria-hidden="true"></ng-icon>
                  </button>
                </div>
                @if (notFound()) {
                  <p id="join-code-error" class="qs-error-in mt-2 text-sm text-qs-bad" role="alert">Game not found</p>
                }
              </div>
              </div>
            </div>

            <p class="qs-label mt-11 text-qs-muted">Free · Players don't need an account</p>
          </div>

          <app-phone-demo class="min-[1000px]:-mb-[14rem] min-[1000px]:-translate-x-8 xl:-translate-x-12 min-[1600px]:-translate-x-20"></app-phone-demo>
        </div>
        </div>
      </section>

      <div class="mx-auto max-w-[1600px] px-4 pb-24 sm:px-8">
        <app-reading-section heading="Everything for game day" class="!mt-0">
          <p>The board, the players and the winners, all on one page.</p>
          <app-home-features wide></app-home-features>
        </app-reading-section>

        <app-reading-section heading="Pick a board size">
          <p>A 100-square board for a big group, 50 or 25 when fewer people play.</p>
          <app-home-board-sizes wide></app-home-board-sizes>
        </app-reading-section>

        <app-reading-section heading="Start with your team">
          <p>Every NFL team has its own board page.</p>
          <a routerLink="/teams" class="qs-btn qs-btn-secondary">View all teams</a>
          <app-home-teams wide></app-home-teams>
        </app-reading-section>

        <app-reading-section id="how-it-works" heading="How it works">
          <p>Three steps from setup to the final whistle.</p>
          <a routerLink="/how-to-play" class="qs-btn qs-btn-secondary">Read the full rules</a>
          <app-home-how-it-works wide></app-home-how-it-works>
        </app-reading-section>

        <section class="mt-20 grid gap-x-16 border-t border-qs-line pt-8 lg:grid-cols-[14rem_minmax(0,1fr)]">
          <div class="max-w-[40rem] lg:col-start-2">
            <p class="qs-body text-[1.0625rem] leading-[1.7]">Make your board and share the link. It's free.</p>
            <a routerLink="/create" class="qs-btn qs-btn-primary mt-6 w-full sm:w-auto px-6">Create a board</a>
          </div>
        </section>
      </div>
      </main>

      <app-site-footer width="wide"></app-site-footer>
    </div>

    <!-- Auth Modal -->
    <app-auth-modal
      [isOpen]="showAuthModal()"
      mode="host"
      (authenticated)="onAuthenticated()"
      (closed)="showAuthModal.set(false)">
    </app-auth-modal>
  `
})
export class WelcomeComponent implements OnInit {
  private authService = inject(AuthService);
  /** True while Join checks the code, so a double tap doesn't check twice. */
  private joining = false;
  private location = inject(Location);
  private platformId = inject(PLATFORM_ID);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(SeoService);

  isAuthenticated = this.authService.isAuthenticated;

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        // A code with no game goes to the dashboard, which shows "Game not found" in its search, never to the game page
        const missing = untracked(() => this.notFound());
        const joinCode = this.gameCode || this.pendingJoinCode;
        if (missing && joinCode) this.router.navigate(['/dashboard'], { queryParams: { join: joinCode, missing: 1 } });
        else this.router.navigateByUrl(joinCode ? `/game/${joinCode.toUpperCase()}` : '/dashboard');
      }
    });
  }

  ngOnInit(): void {
    this.seo.apply({
      title: 'Free Football Squares and Super Bowl Squares — QuarterScore',
      description: 'Run free football squares online all season and for Super Bowl squares. Make a 100, 50 or 25 square board, share one link, and live scores pick winners.',
      path: '/',
      headline: 'The Ultimate Football Squares Game',
      published: '2026-11-01',
      breadcrumbs: [{ name: 'Home', path: '/' }],
      extraJsonLd: [
        {
          '@context': 'https://schema.org',
          '@type': 'Organization',
          '@id': 'https://quarterscore.com/#organization',
          name: 'QuarterScore',
          url: 'https://quarterscore.com/',
          logo: 'https://quarterscore.com/assets/logo.png',
          description: 'QuarterScore makes free football squares boards for friends, families and offices. It never collects, holds, or pays out money.'
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          '@id': 'https://quarterscore.com/#website',
          name: 'QuarterScore',
          alternateName: 'QuarterScore Football Squares',
          url: 'https://quarterscore.com/',
          publisher: { '@id': 'https://quarterscore.com/#organization' }
        },
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'QuarterScore',
          url: 'https://quarterscore.com/',
          description: 'Free football squares (Super Bowl squares) online. Make a 100, 50 or 25 square board, share one link, and live scores pick each quarter\'s winner. Players do not need an account.',
          image: 'https://quarterscore.com/assets/og-image.png',
          applicationCategory: 'GameApplication',
          applicationSubCategory: 'Football squares',
          operatingSystem: 'Any (web browser)',
          browserRequirements: 'Requires a modern web browser with JavaScript.',
          isAccessibleForFree: true,
          inLanguage: 'en-US',
          publisher: { '@id': 'https://quarterscore.com/#organization' },
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
          featureList: [
            '100, 50 or 25 square boards',
            'Share by link or six-character game code',
            'Players join with just a name, no account',
            'Squares update in real time',
            'Numbers drawn at random after the board is locked',
            'Automatic quarter winners from live ESPN scores',
            'NFL, NCAA football, UFL, NBA and WNBA games, or custom teams',
            'Choose what happens when a winning square is empty',
            'Check-in and paid tracking, co-hosts and a host note',
            'TV mode with a QR code to join and rotating boards',
            'Printable blank board and PDF',
            'Historical hit rates for every digit pair'
          ]
        }
      ]
    });
    // A shared link (?join=CODE) opens the join field with the code in it. A code with no game says "Game not found"
    // under the field, both when the game page sent them here (missing=1) and when the code is checked here.
    const params = this.route.snapshot.queryParamMap;
    const joinCode = normalizeGameCode(params.get('join'));
    if (joinCode) {
      this.gameCode = joinCode;
      this.showJoinCode.set(true);
      if (params.get('missing')) {
        this.notFound.set(true);
        // Drop the flag, so a reload checks the code again
        this.location.replaceState('/', `join=${joinCode}`);
      } else {
        this.pendingJoinCode = joinCode;
        if (isPlatformBrowser(this.platformId)) this.checkJoinCode(joinCode);
      }
    }
  }

  @ViewChild('joinInput') private joinInput?: ElementRef<HTMLInputElement>;

  gameCode = '';
  /** Set when Join finds no game with the typed code. Cleared as soon as they edit the code. */
  notFound = signal(false);
  showAuthModal = signal(false);
  showJoinCode = signal(false);

  onAuthenticated(): void {
    this.showAuthModal.set(false);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  /** Opens the game, or says "Game not found" under the field and keeps the code there when no game has it. */
  async joinGame(): Promise<void> {
    const code = this.gameCode;
    if (!isGameCode(code) || this.joining) return;
    this.joining = true;
    const found = await gameCodeExists(code, environment.firebase.databaseURL);
    this.joining = false;
    if (code !== this.gameCode) return;
    if (found) this.router.navigate(['/game', code]);
    else this.notFound.set(true);
  }

  /** Keeps the field to letters and digits, upper-cased, so a pasted "abc-123" reads ABC123. */
  onCodeInput(event: Event): void {
    this.gameCode = normalizeCodeInput(event.target as HTMLInputElement);
    this.notFound.set(false);
  }

  openJoinCode(): void {
    this.showJoinCode.set(true);
    setTimeout(() => this.joinInput?.nativeElement.focus());
  }

  private pendingJoinCode = '';

  private async checkJoinCode(code: string): Promise<void> {
    const found = await gameCodeExists(code, environment.firebase.databaseURL);
    if (found || code !== this.gameCode) return;
    this.pendingJoinCode = '';
    this.notFound.set(true);
  }
}
