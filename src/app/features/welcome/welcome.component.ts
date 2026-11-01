import { Component, ElementRef, signal, inject, OnInit, effect, ViewChild, ChangeDetectionStrategy } from '@angular/core';

import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
import { SeoService } from '../../core/services/seo.service';
import { SiteFooterComponent } from '../../shared/site-footer.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroSquares2x2,
  heroUserGroup,
  heroTrophy,
  heroCurrencyDollar,
  heroShare,
  heroChartBar,
  heroArrowRight
} from '@ng-icons/heroicons/outline';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { SampleBoardComponent } from './sample-board.component';

interface Feature {
  icon: string;
  title: string;
  description: string;
  id?: string;
  link?: { path: string; label: string };
}

@Component({
    selector: 'app-welcome',
    imports: [FormsModule, RouterLink, NgIconComponent, AppHeaderComponent, AuthModalComponent, SampleBoardComponent, SiteFooterComponent],
    providers: [
        provideIcons({
            heroSquares2x2,
            heroUserGroup,
            heroTrophy,
            heroCurrencyDollar,
            heroShare,
            heroChartBar,
            heroArrowRight
        })
    ],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    <div class="min-h-screen bg-qs-bg text-qs-ink">
      <app-shared-header heading="p">
        @if (isAuthenticated()) {
          <button type="button" (click)="goToDashboard()" class="qs-btn qs-btn-ghost">
            Dashboard
          </button>
        } @else {
          <button type="button" (click)="showAuthModal.set(true)" class="qs-btn qs-btn-ghost">
            Sign in
          </button>
        }
      </app-shared-header>

      <!-- Hero -->
      <section class="mx-auto max-w-[1600px] px-4 sm:px-8 pt-10 pb-16 md:pt-16 md:pb-24">
        <div class="grid grid-cols-1 xl:grid-cols-[1fr_minmax(0,1.05fr)] gap-10 xl:gap-16 items-center">
          <div>
            <p class="qs-eyebrow">Football squares / Free for game day</p>
            <h1 class="qs-display mt-5 max-w-[14ch]">
              The Ultimate Football <span class="text-qs-accent">Squares</span> Game
            </h1>
            <p class="mt-6 max-w-xl text-lg text-qs-muted leading-relaxed">
              Create and share your football squares game in seconds.
              Perfect for Super Bowl parties, office pools, and game day fun.
            </p>

            <div class="mt-8 flex flex-wrap gap-3">
              <button type="button" (click)="showAuthModal.set(true)" class="qs-btn qs-btn-primary w-full sm:w-auto px-6">
                Create game
              </button>
              <a [routerLink]="['/game', demoGameId]" class="qs-btn qs-btn-secondary flex-1 sm:flex-none">
                See demo
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

            @if (showJoinCode()) {
              <div id="join-code-panel" class="mt-5 w-full sm:max-w-sm">
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
            }

            <p class="qs-label mt-6 text-qs-muted">Free · Players don't need an account</p>
          </div>

          <app-sample-board></app-sample-board>
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

      <!-- How It Works -->
      <section id="how-it-works" class="border-t border-qs-line bg-qs-panel-2 py-16 md:py-24">
        <div class="mx-auto max-w-[1600px] px-4 sm:px-8">
          <p class="qs-eyebrow">Section 02 / How it works</p>
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

      <app-site-footer></app-site-footer>
    </div>

    <!-- Auth Modal -->
    <app-auth-modal
      [isOpen]="showAuthModal()"
      (authenticated)="onAuthenticated()">
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
    { title: 'Create a game', description: 'Sign in and create a new game board with your custom settings' },
    { title: 'Share the link', description: 'Send the unique game code or link to your friends and family' },
    { title: 'Play and win', description: 'Claim your squares, watch the game, and see who wins each quarter' }
  ];

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
      title: 'Quarter Score — Football Squares for Game Day',
      description: 'Create and share a football squares game in seconds. Claim squares, follow each quarter, and see who wins — for Super Bowl parties, office pools, and game day.',
      path: '/',
      headline: 'The Ultimate Football Squares Game',
      published: '2026-11-01',
      breadcrumbs: [{ name: 'Home', path: '/' }]
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
  demoGameId = environment.demoGameId;
  showAuthModal = signal(false);
  showJoinCode = signal(false);

  features: Feature[] = [
    {
      icon: 'heroSquares2x2',
      title: '10x10 Game Board',
      description: 'Classic football squares grid with automatic number randomization'
    },
    {
      icon: 'heroUserGroup',
      title: 'Multiplayer',
      description: 'Real-time updates so everyone sees changes instantly'
    },
    {
      icon: 'heroTrophy',
      title: 'Auto Winners',
      description: 'Winners calculated automatically based on quarter scores'
    },
    {
      icon: 'heroCurrencyDollar',
      title: 'Payment Tracking',
      description: 'Track who has paid with Venmo integration'
    },
    {
      icon: 'heroShare',
      title: 'Easy Sharing',
      description: 'Share games with a simple code or link'
    },
    {
      icon: 'heroChartBar',
      title: 'Probability Heatmap',
      description: 'See which squares have the best odds based on NFL history',
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

  private pendingJoinCode = '';
}
