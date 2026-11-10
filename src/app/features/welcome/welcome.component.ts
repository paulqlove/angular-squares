import { Component, ElementRef, signal, inject, OnInit, effect, ViewChild, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSquares2x2,
  heroUserGroup,
  heroTrophy,
  heroCheckCircle,
  heroShare,
  heroChartBar,
  heroArrowRight
} from '@ng-icons/heroicons/outline';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { HeadroomDirective } from '../../shared/directives/headroom.directive';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { PhoneDemoComponent } from './phone-demo.component';
import { NFL_TEAMS, getTeamLogo, NflTeam } from '../content/teams-data';

interface Feature {
  icon: string;
  title: string;
  description: string;
  id?: string;
  link?: { path: string; label: string };
}

@Component({
    selector: 'app-welcome',
    imports: [FormsModule, RouterLink, NgIconComponent, AppHeaderComponent, HeadroomDirective, AuthModalComponent, PhoneDemoComponent, SiteFooterComponent],
    providers: [
        provideIcons({
            heroSquares2x2,
            heroUserGroup,
            heroTrophy,
            heroCheckCircle,
            heroShare,
            heroChartBar,
            heroArrowRight
        })
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="min-h-screen bg-qs-bg text-qs-ink">
      <app-shared-header heading="p" appHeadroom>
        @if (isAuthenticated()) {
          <button type="button" (click)="goToDashboard()" class="qs-btn qs-btn-ghost">
            Dashboard
          </button>
        } @else {
          <button type="button" (click)="showAuthModal.set(true)" class="qs-btn qs-btn-primary">
            Sign in
          </button>
        }
      </app-shared-header>

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
                    [(ngModel)]="gameCode"
                    placeholder="ABC123"
                    autocapitalize="characters"
                    autocomplete="off"
                    class="min-h-11 flex-1 px-4 border border-qs-line-strong rounded-btn uppercase tracking-[0.2em] text-center font-mono text-base bg-qs-panel-2 text-qs-ink"
                    maxlength="6"
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
              </div>
              </div>
            </div>

            <p class="qs-label mt-6 text-qs-muted">Free · Players don't need an account</p>
          </div>

          <app-phone-demo class="min-[1000px]:-mb-[14rem] min-[1000px]:-translate-x-8 xl:-translate-x-12 min-[1600px]:-translate-x-20"></app-phone-demo>
        </div>
        </div>
      </section>

      <!-- Features -->
      <section class="border-t border-qs-line py-16 md:py-24">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8">
          <p class="qs-eyebrow">Section 01 / Features</p>
          <h2 class="qs-title mt-3 text-3xl md:text-4xl">Everything you need for game <span class="text-qs-accent">day.</span></h2>

          <div class="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            @for (feature of features; track feature.title; let i = $index) {
              <div [attr.id]="feature.id || null" class="qs-card p-6 transition-colors hover:border-qs-ink">
                <div class="flex items-center justify-between">
                  <div class="w-10 h-10 bg-qs-accent-soft rounded-inner flex items-center justify-center">
                    <ng-icon [name]="feature.icon" class="text-xl text-qs-accent"></ng-icon>
                  </div>
                  <span class="qs-label text-qs-muted">{{ (i + 1).toString().padStart(2, '0') }}</span>
                </div>
                <h3 class="qs-title mt-5 text-xl">{{ feature.title }}</h3>
                <p class="mt-2 text-qs-muted">{{ feature.description }}</p>
                @if (feature.link) {
                  <a [routerLink]="feature.link.path" class="mt-3 inline-flex min-h-11 items-center font-medium text-qs-accent underline underline-offset-2">
                    {{ feature.link.label }}
                  </a>
                }
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Board Sizes -->
      <section class="border-t border-qs-line py-16 md:py-24">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8">
          <p class="qs-eyebrow">Section 02 / Board sizes</p>
          <h2 class="qs-title mt-3 text-3xl md:text-4xl">Pick the right size for your <span class="text-qs-accent">group.</span></h2>
          <p class="mt-4 max-w-2xl text-lg text-qs-muted">
            Not every party has 100 people. Choose from three board sizes to match your crowd.
          </p>

          <div class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            @for (board of boardSizes; track board.size) {
              <div class="qs-card p-6 flex flex-col">
                <div class="flex items-center justify-between">
                  <span class="qs-title text-4xl text-qs-accent">{{ board.size }}</span>
                  <span class="qs-badge">{{ board.grid }}</span>
                </div>
                <h3 class="qs-title mt-4 text-xl">{{ board.title }}</h3>
                <p class="mt-2 text-qs-muted flex-1">{{ board.description }}</p>
                <p class="mt-4 text-sm text-qs-muted">{{ board.numbers }}</p>
              </div>
            }
          </div>
        </div>
      </section>

      <!-- Pick Your Team -->
      <section class="border-t border-qs-line py-16 md:py-24">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8">
          <p class="qs-eyebrow">Section 03 / Pick your team</p>
          <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 class="qs-title text-3xl md:text-4xl">Start with your <span class="text-qs-accent">team.</span></h2>
            <a routerLink="/teams" class="qs-btn qs-btn-secondary">View all teams</a>
          </div>
          <p class="mt-4 max-w-2xl text-lg text-qs-muted">
            Create a squares board themed for your favorite NFL team.
          </p>

          <div class="mt-10 grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2 md:gap-3">
            @for (team of teams; track team.slug) {
              <a
                [routerLink]="'/team/' + team.slug"
                class="group relative aspect-square overflow-hidden rounded-lg transition-transform hover:scale-105 hover:z-10"
                [style.background]="'linear-gradient(135deg, ' + team.primaryColor + ' 0%, ' + team.secondaryColor + ' 100%)'"
                [attr.aria-label]="team.city + ' ' + team.name"
              >
                <img
                  [src]="getLogoUrl(team)"
                  alt=""
                  class="absolute inset-0 m-auto h-3/4 w-3/4 object-contain drop-shadow-md"
                  loading="lazy"
                >
                <span class="absolute inset-x-0 bottom-0 bg-black/60 px-1 py-1 text-center text-[9px] font-medium text-white opacity-0 transition-opacity group-hover:opacity-100 sm:text-[10px]">
                  {{ team.name }}
                </span>
              </a>
            }
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section id="how-it-works" class="border-t border-qs-line bg-qs-panel-2 py-16 md:py-24">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8">
          <p class="qs-eyebrow">Section 04 / How it works</p>
          <div class="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 class="qs-title text-3xl md:text-4xl">Three steps to kickoff.</h2>
            <a routerLink="/how-to-play" class="qs-btn qs-btn-secondary">Read the full rules</a>
          </div>

          <div class="mt-10 grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            @for (step of steps; track step.title; let i = $index) {
              <div class="qs-card p-6">
                <p class="qs-eyebrow qs-eyebrow-bar">Step {{ '0' + (i + 1) }} / 03</p>
                <h3 class="qs-title mt-4 text-xl">{{ step.title }}</h3>
                <p class="mt-2 text-qs-muted">{{ step.description }}</p>
              </div>
            }
          </div>
        </div>
      </section>
      </main>

      <app-site-footer></app-site-footer>
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
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private seo = inject(SeoService);

  isAuthenticated = this.authService.isAuthenticated;

  readonly steps = [
    { title: 'Create a board', description: 'Pick your teams and create a board in seconds. No sign-in to start' },
    { title: 'Share the link', description: 'Send the unique game code or link to your friends and family' },
    { title: 'Play and win', description: 'Claim your squares, watch the game, and see who wins each quarter' }
  ];

  readonly boardSizes = [
    {
      size: 100,
      grid: '10 × 10',
      title: 'Classic Board',
      description: 'The traditional football squares game. Each square gets one digit pair (0-9 for each team). Best for large groups.',
      numbers: 'Single digits 0–9 on each axis'
    },
    {
      size: 50,
      grid: '5 × 10',
      title: 'Half Board',
      description: 'Five rows, ten columns. The away team uses paired digits (0-1, 2-3, etc.) while home uses single digits.',
      numbers: 'Away: paired (0,1 / 2,3 / ...) · Home: single 0–9'
    },
    {
      size: 25,
      grid: '5 × 5',
      title: 'Quarter Board',
      description: 'Perfect for small groups. Both teams use paired digits, so each square covers four possible score combinations.',
      numbers: 'Both axes use paired digits (0,1 / 2,3 / ...)'
    }
  ];

  readonly teams = NFL_TEAMS;

  constructor() {
    effect(() => {
      if (this.authService.isAuthenticated()) {
        const joinCode = this.gameCode || this.pendingJoinCode;
        const url = joinCode ? `/game/${joinCode.toUpperCase()}` : '/dashboard';
        this.router.navigateByUrl(url);
      }
    });
  }

  ngOnInit(): void {
    this.seo.apply({
      title: 'QuarterScore — Football Squares for Game Day',
      description: 'Run free football squares online. Make a 100, 50 or 25 square board, share one link, and live scores pick each quarter\'s winner.',
      path: '/',
      headline: 'The Ultimate Football Squares Game',
      published: '2026-11-01',
      breadcrumbs: [{ name: 'Home', path: '/' }],
      extraJsonLd: [
        { '@context': 'https://schema.org', '@type': 'WebSite', name: 'QuarterScore', url: 'https://quarterscore.com/' },
        {
          '@context': 'https://schema.org',
          '@type': 'WebApplication',
          name: 'QuarterScore',
          url: 'https://quarterscore.com/',
          applicationCategory: 'EntertainmentApplication',
          operatingSystem: 'Any (web browser)',
          offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
        }
      ]
    });
    const joinCode = this.route.snapshot.queryParamMap.get('join');
    if (joinCode) {
      this.pendingJoinCode = joinCode.toUpperCase();
      this.gameCode = this.pendingJoinCode;
      this.showJoinCode.set(true);
    }
  }

  @ViewChild('joinInput') private joinInput?: ElementRef<HTMLInputElement>;

  gameCode = '';
  showAuthModal = signal(false);
  showJoinCode = signal(false);

  features: Feature[] = [
    {
      icon: 'heroSquares2x2',
      title: '100, 50, or 25 Squares',
      description: 'Classic 10x10 grid or smaller boards for fewer players. Paired digits on compact boards.'
    },
    {
      icon: 'heroUserGroup',
      title: 'Real-time Multiplayer',
      description: 'Everyone sees squares claimed instantly. No refreshing needed.'
    },
    {
      icon: 'heroTrophy',
      title: 'Auto Winners',
      description: 'Winners calculated automatically as scores update each quarter'
    },
    {
      icon: 'heroCheckCircle',
      title: 'Player Check-in',
      description: 'Host confirms who\'s in with one tap.'
    },
    {
      icon: 'heroShare',
      title: 'Easy Sharing',
      description: 'Share with a 6-digit code or direct link. Players don\'t need accounts.'
    },
    {
      icon: 'heroChartBar',
      title: 'Square hit rates',
      description: 'See which squares win most often based on NFL history',
      id: 'probability-heatmap',
      link: { path: '/best-squares-numbers', label: 'See the full number table' }
    }
  ];

  onAuthenticated(): void {
    this.showAuthModal.set(false);
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  joinGame(): void {
    if (this.gameCode.length === 6) {
      this.router.navigate(['/game', this.gameCode.toUpperCase()]);
    }
  }

  openJoinCode(): void {
    this.showJoinCode.set(true);
    setTimeout(() => this.joinInput?.nativeElement.focus());
  }

  getLogoUrl(team: NflTeam): string {
    return getTeamLogo(team, 100);
  }

  private pendingJoinCode = '';
}
