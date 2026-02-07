import { Component, signal, inject, OnInit, NgZone } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
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

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RippleGridComponent, AppHeaderComponent, AuthModalComponent],
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
        backgroundColor="#10b981"
        lineColor="rgba(0,0,0,0.15)">
      </app-ripple-grid>

      <div class="relative z-10">
        <!-- Header (sits on green) -->
        <app-shared-header variant="transparent">
          @if (isAuthenticated()) {
            <button
              (click)="goToDashboard()"
              class="px-5 py-2 bg-white text-emerald-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Go to Dashboard
            </button>
          } @else {
            <button
              (click)="showAuthModal.set(true)"
              class="px-5 py-2 bg-white text-emerald-700 text-sm font-semibold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Sign in
            </button>
          }
        </app-shared-header>

        <!-- Hero card floating on green -->
        <section class="container mx-auto px-4 py-8 md:py-12">
          <div class="bg-page rounded-3xl p-8 md:p-12 lg:p-16 shadow-2xl">
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
              <!-- Left: Copy -->
              <div>
                <h1 class="text-4xl md:text-5xl lg:text-6xl font-extrabold text-heading leading-[1.1] tracking-tight">
                  The Ultimate<br>
                  <span class="text-yellow-500">Football Squares</span><br>
                  Game
                </h1>
                <p class="text-lg md:text-xl text-muted mt-6 max-w-md">
                  Create and share your football squares game in seconds.
                  Perfect for Super Bowl parties, office pools, and game day fun.
                </p>

                <div class="flex flex-wrap items-center gap-4 mt-10">
                  <button
                    (click)="showAuthModal.set(true)"
                    class="px-8 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-lg rounded-lg transition-colors"
                  >
                    Create Your Free Game
                  </button>
                </div>

                <!-- Game Code -->
                <div class="mt-10">
                  <p class="text-sm text-muted mb-2">Have a game code?</p>
                  <div class="flex items-center gap-2 sm:max-w-xs w-full">
                    <input
                      type="text"
                      [(ngModel)]="gameCode"
                      placeholder="Enter code"
                      class="flex-1 px-4 py-2.5 border-2 border-default rounded-lg focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 outline-none uppercase tracking-widest text-center font-mono bg-input text-default"
                      maxlength="6"
                      (keyup.enter)="joinGame()"
                    />
                    <button
                      (click)="joinGame()"
                      [disabled]="gameCode.length !== 6"
                      class="p-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-40"
                    >
                      <ng-icon name="heroArrowRight" class="text-xl"></ng-icon>
                    </button>
                  </div>
                </div>
              </div>

              <!-- Right: Bento grid with ripple -->
              <div class="relative h-[350px] md:h-[420px] lg:h-[460px] rounded-2xl overflow-hidden">
                <app-ripple-grid
                  class="absolute inset-0"
                  backgroundColor="#10b981"
                  lineColor="rgba(0,0,0,0.15)">
                </app-ripple-grid>
              </div>
            </div>
          </div>
        </section>

        <!-- Features Section -->
        <section class="bg-page py-16 md:py-24">
          <div class="container mx-auto px-4">
            <h3 class="text-3xl font-bold text-center text-heading mb-12">
              Everything You Need for Game Day
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
              @for (feature of features; track feature.title) {
                <div class="bg-card rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div class="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center mb-4">
                    <ng-icon [name]="feature.icon" class="text-2xl text-emerald-600"></ng-icon>
                  </div>
                  <h4 class="text-lg font-semibold text-heading mb-2">{{ feature.title }}</h4>
                  <p class="text-muted">{{ feature.description }}</p>
                </div>
              }
            </div>
          </div>
        </section>

        <!-- How It Works -->
        <section class="bg-card py-16 md:py-24">
          <div class="container mx-auto px-4">
            <h3 class="text-3xl font-bold text-center text-heading mb-12">
              How It Works
            </h3>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div class="text-center">
                <div class="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  1
                </div>
                <h4 class="text-lg font-semibold text-heading mb-2">Create a Game</h4>
                <p class="text-muted">Sign in and create a new game board with your custom settings</p>
              </div>

              <div class="text-center">
                <div class="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  2
                </div>
                <h4 class="text-lg font-semibold text-heading mb-2">Share the Link</h4>
                <p class="text-muted">Send the unique game code or link to your friends and family</p>
              </div>

              <div class="text-center">
                <div class="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                  3
                </div>
                <h4 class="text-lg font-semibold text-heading mb-2">Play & Win</h4>
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
  private ngZone = inject(NgZone);

  isAuthenticated = this.authService.isAuthenticated;

  ngOnInit(): void {
    const joinCode = this.route.snapshot.queryParamMap.get('join');
    if (joinCode) {
      this.pendingJoinCode = joinCode.toUpperCase();
      this.gameCode = this.pendingJoinCode;
    }
  }

  gameCode = '';
  showAuthModal = signal(false);

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
    this.navigateAfterAuth();
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }

  joinGame(): void {
    if (this.gameCode.length === 6) {
      this.router.navigate(['/game', this.gameCode.toUpperCase()]);
    }
  }

  private pendingJoinCode = '';

  private navigateAfterAuth(): void {
    const joinCode = this.gameCode || this.pendingJoinCode
      || this.route.snapshot.queryParamMap.get('join');
    const url = joinCode ? `/game/${joinCode.toUpperCase()}` : '/dashboard';
    this.ngZone.run(() => this.router.navigateByUrl(url));
  }
}
