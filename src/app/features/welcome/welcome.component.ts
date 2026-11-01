import { Component, ElementRef, signal, inject, OnInit, effect, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../core/services/auth.service';
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
import { RippleGridComponent } from '../../components/ui/ripple-grid/ripple-grid.component';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';
import { SampleBoardComponent } from './sample-board.component';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, NgIconComponent, RippleGridComponent, AppHeaderComponent, AuthModalComponent, SampleBoardComponent],
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
  template: `
    <div class="min-h-screen relative">
      <!-- Ripple grid full background -->
      <app-ripple-grid
        class="fixed inset-0 z-0"
        backgroundColor="#0f172a"
        lineColor="rgba(255,255,255,0.14)">
      </app-ripple-grid>

      <div class="relative z-10">
        <!-- Header (sits on green) -->
        <app-shared-header variant="transparent">
          @if (isAuthenticated()) {
            <button
              (click)="goToDashboard()"
              class="px-5 py-2 bg-white text-action text-sm font-semibold rounded-lg hover:bg-primary-100 transition-colors"
            >
              Go to Dashboard
            </button>
          } @else {
            <button
              type="button"
              (click)="showAuthModal.set(true)"
              class="inline-flex min-h-11 items-center justify-center px-5 py-2 bg-white text-action text-sm font-semibold rounded-lg hover:bg-primary-100 transition-colors"
            >
              Sign in
            </button>
          }
        </app-shared-header>

        <!-- Hero card floating on green -->
        <section class="container mx-auto px-4 py-8 md:py-12">
          <div class="bg-page rounded-3xl p-8 md:p-12 lg:p-16 shadow-2xl">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center lg:items-stretch">
              <!-- Left: Copy -->
              <div>
                <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-heading leading-[1.1] tracking-tight">
                  The ultimate<br>
                  football squares<br>
                  game
                </h1>
                <p class="text-lg md:text-xl text-muted mt-6 max-w-md">
                  Every square, every score, live on one board.™
                </p>

                <div class="mt-8 flex flex-col gap-3">
                  <button
                    type="button"
                    (click)="showAuthModal.set(true)"
                    class="w-full self-stretch px-8 py-3.5 bg-button hover:bg-button-hover text-button font-bold text-lg rounded-lg transition-colors sm:w-auto sm:self-start"
                  >
                    Create game
                  </button>

                  <div class="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:self-start">
                    <a
                      [routerLink]="['/game', demoGameId]"
                      class="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-default bg-card px-4 py-2.5 text-sm font-semibold text-heading hover:bg-card-hover transition-colors"
                    >
                      See demo
                    </a>
                    <button
                      type="button"
                      (click)="openJoinCode()"
                      [attr.aria-expanded]="showJoinCode()"
                      aria-controls="join-code-panel"
                      class="inline-flex min-h-11 items-center justify-center rounded-lg border-2 border-default bg-card px-4 py-2.5 text-sm font-semibold text-heading hover:bg-card-hover transition-colors"
                    >
                      Join with code
                    </button>
                  </div>

                  @if (showJoinCode()) {
                    <div id="join-code-panel" class="flex items-center gap-2 sm:max-w-xs w-full">
                      <label for="join-code" class="sr-only">Game code</label>
                      <input
                        #joinInput
                        id="join-code"
                        type="text"
                        [(ngModel)]="gameCode"
                        placeholder="Enter code"
                        class="flex-1 px-4 py-2.5 border-2 border-default rounded-lg focus:border-focus focus:ring-2 focus:ring-focus outline-none uppercase tracking-widest text-center font-mono bg-input text-default"
                        maxlength="6"
                        (keyup.enter)="joinGame()"
                      />
                      <button
                        type="button"
                        (click)="joinGame()"
                        [disabled]="gameCode.length !== 6"
                        aria-label="Join game"
                        class="inline-flex min-h-11 min-w-11 items-center justify-center bg-button hover:bg-button-hover text-button rounded-lg transition-colors disabled:opacity-40"
                      >
                        <ng-icon name="heroArrowRight" class="text-xl" aria-hidden="true"></ng-icon>
                      </button>
                    </div>
                  }

                  <p class="text-sm text-muted">Free, no account required to play</p>
                </div>
              </div>

              <!-- Right: sample board -->
              <div class="lg:flex lg:items-center">
                <app-sample-board></app-sample-board>
              </div>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section class="bg-page py-16 md:py-24">
          <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold text-center text-heading mb-12">
              Everything You Need for Game Day
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              @for (feature of features; track feature.title) {
                <div class="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div class="w-12 h-12 bg-control rounded-lg flex items-center justify-center mb-4">
                    <ng-icon [name]="feature.icon" class="text-2xl text-heading"></ng-icon>
                  </div>
                  <h3 class="text-lg font-semibold text-heading mb-2">{{ feature.title }}</h3>
                  <p class="text-muted">{{ feature.description }}</p>
                </div>
              }
            </div>
          </div>
        </section>

        <!-- How It Works -->
        <section class="bg-card py-16 md:py-24">
          <div class="container mx-auto px-4">
            <h2 class="text-3xl font-bold text-center text-heading mb-12">
              How It Works
            </h2>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div class="text-center">
                <div class="w-16 h-16 bg-header text-header rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 tabular-nums">
                  1
                </div>
                <h3 class="text-lg font-semibold text-heading mb-2">Create a Game</h3>
                <p class="text-muted">Sign in and create a new game board with your custom settings</p>
              </div>

              <div class="text-center">
                <div class="w-16 h-16 bg-header text-header rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 tabular-nums">
                  2
                </div>
                <h3 class="text-lg font-semibold text-heading mb-2">Share the Link</h3>
                <p class="text-muted">Send the unique game code or link to your friends and family</p>
              </div>

              <div class="text-center">
                <div class="w-16 h-16 bg-header text-header rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 tabular-nums">
                  3
                </div>
                <h3 class="text-lg font-semibold text-heading mb-2">Play & Win</h3>
                <p class="text-muted">Claim your squares, watch the game, and see who wins each quarter</p>
              </div>
            </div>
          </div>
        </section>

        <!-- Footer -->
        <footer class="bg-page py-8">
          <div class="container mx-auto px-4 text-center text-muted text-sm">
            <p>Made with love for sports ball fans</p>
          </div>
        </footer>
      </div>
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

  isAuthenticated = this.authService.isAuthenticated;

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
      description: 'See which squares have the best odds based on NFL history'
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
