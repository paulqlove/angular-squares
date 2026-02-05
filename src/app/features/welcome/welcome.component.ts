import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
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
  heroArrowRight,
  heroEnvelope
} from '@ng-icons/heroicons/outline';
import { RippleGridComponent } from '../../components/ui/ripple-grid/ripple-grid.component';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent, RippleGridComponent, AppHeaderComponent],
  providers: [
    provideIcons({
      heroSquares2x2,
      heroUserGroup,
      heroTrophy,
      heroCurrencyDollar,
      heroShare,
      heroChartBar,
      heroArrowRight,
      heroEnvelope
    })
  ],
  template: `
    <div class="min-h-screen">
      <!-- Hero Section with ripple background -->
      <section class="relative min-h-[85vh] overflow-hidden">
        <!-- Ripple grid background -->
        <app-ripple-grid
          class="absolute inset-0"
          backgroundColor="#10b981"
          lineColor="rgba(0,0,0,0.15)">
        </app-ripple-grid>

        <!-- Content layer -->
        <div class="relative z-10">
          <!-- Header -->
          <app-shared-header variant="transparent"></app-shared-header>

          <!-- Hero Content -->
          <div class="container mx-auto px-4 py-12 md:py-16">
            <div class="max-w-4xl mx-auto text-center">
          <h2 class="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6">
            The Ultimate
            <span class="bg-gradient-to-r from-yellow-200 via-white to-yellow-200 bg-clip-text text-transparent">
              Football Squares
            </span>
            Game
          </h2>
          <p class="text-lg md:text-xl text-white/80 mb-8 max-w-2xl mx-auto">
            Create and share your football squares game in seconds.
            Perfect for Super Bowl parties, office pools, and game day fun.
          </p>

          <!-- Auth Options -->
          <div class="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md mx-auto">
            @if (!showAuthForm()) {
              <div class="space-y-4">
                <!-- Google Sign In -->
                <button
                  (click)="signInWithGoogle()"
                  [disabled]="isLoading()"
                  class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-slate-700 border-2 border-gray-200 dark:border-slate-600 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-600 hover:border-gray-300 transition-all font-medium text-gray-700 dark:text-slate-200 disabled:opacity-50"
                >
                  <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </button>

                <!-- Divider -->
                <div class="relative my-6">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200 dark:border-slate-600"></div>
                  </div>
                  <div class="relative flex justify-center text-sm">
                    <span class="px-4 bg-white dark:bg-slate-800 text-muted">or</span>
                  </div>
                </div>

                <!-- Email Sign In -->
                <button
                  (click)="showAuthForm.set(true); authMode.set('signin')"
                  class="w-full flex items-center justify-center gap-2 px-6 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors font-medium"
                >
                  <ng-icon name="heroEnvelope" class="text-xl"></ng-icon>
                  Sign in with Email
                </button>

                <!-- Create Account -->
                <button
                  (click)="showAuthForm.set(true); authMode.set('signup')"
                  class="w-full px-6 py-3 border-2 border-secondary-500 text-secondary-600 hover:bg-secondary-50 rounded-lg transition-colors font-medium"
                >
                  Create an Account
                </button>

                <!-- Divider -->
                <div class="relative my-6">
                  <div class="absolute inset-0 flex items-center">
                    <div class="w-full border-t border-gray-200 dark:border-slate-600"></div>
                  </div>
                  <div class="relative flex justify-center text-sm">
                    <span class="px-4 bg-white dark:bg-slate-800 text-muted">just joining a game?</span>
                  </div>
                </div>

                <!-- Guest Mode -->
                <div class="space-y-3">
                  <input
                    type="text"
                    [(ngModel)]="guestName"
                    placeholder="Enter your name"
                    class="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-white dark:bg-slate-700 text-default"
                    (keyup.enter)="continueAsGuest()"
                  />
                  <button
                    (click)="continueAsGuest()"
                    [disabled]="!guestName.trim()"
                    class="w-full px-6 py-3 bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-200 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Continue as Guest
                  </button>
                  <p class="text-xs text-muted text-center">
                    Guest users can join games but cannot create new ones
                  </p>
                </div>
              </div>
            } @else {
              <!-- Email Auth Form -->
              <div class="space-y-4">
                <button
                  (click)="showAuthForm.set(false)"
                  class="text-secondary-600 hover:text-secondary-700 text-sm font-medium flex items-center gap-1"
                >
                  <svg class="w-4 h-4 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"/>
                  </svg>
                  Back
                </button>

                <h3 class="text-xl font-bold text-heading">
                  {{ authMode() === 'signin' ? 'Sign In' : 'Create Account' }}
                </h3>

                @if (authMode() === 'signup') {
                  <input
                    type="text"
                    [(ngModel)]="displayName"
                    placeholder="Your name"
                    class="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-white dark:bg-slate-700 text-default"
                  />
                }

                <input
                  type="email"
                  [(ngModel)]="email"
                  placeholder="Email address"
                  class="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-white dark:bg-slate-700 text-default"
                />

                <input
                  type="password"
                  [(ngModel)]="password"
                  placeholder="Password"
                  class="w-full px-4 py-3 border-2 border-gray-200 dark:border-slate-600 rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-white dark:bg-slate-700 text-default"
                  (keyup.enter)="submitEmailAuth()"
                />

                @if (authError()) {
                  <p class="text-red-500 text-sm">{{ authError() }}</p>
                }

                <button
                  (click)="submitEmailAuth()"
                  [disabled]="isLoading() || !email || !password"
                  class="w-full px-6 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  @if (isLoading()) {
                    <span class="flex items-center justify-center gap-2">
                      <svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
                        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
                        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                      </svg>
                      Processing...
                    </span>
                  } @else {
                    {{ authMode() === 'signin' ? 'Sign In' : 'Create Account' }}
                  }
                </button>

                <p class="text-sm text-center text-muted">
                  @if (authMode() === 'signin') {
                    Don't have an account?
                    <button (click)="authMode.set('signup')" class="text-secondary-600 hover:underline font-medium">
                      Sign up
                    </button>
                  } @else {
                    Already have an account?
                    <button (click)="authMode.set('signin')" class="text-secondary-600 hover:underline font-medium">
                      Sign in
                    </button>
                  }
                </p>
              </div>
            }
          </div>

          <!-- Join with Code -->
          <div class="mt-8">
            <p class="text-white/80 mb-3">Have a game code?</p>
            <div class="flex items-center justify-center gap-2 max-w-xs mx-auto">
              <input
                type="text"
                [(ngModel)]="gameCode"
                placeholder="Enter game code"
                class="flex-1 px-4 py-2 border-2 border-white/30 rounded-lg focus:border-white outline-none uppercase tracking-widest text-center font-mono bg-white/20 text-white placeholder-white/60"
                maxlength="6"
                (keyup.enter)="joinGame()"
              />
              <button
                (click)="joinGame()"
                [disabled]="gameCode.length !== 6"
                class="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors disabled:opacity-50 border-2 border-white/30"
              >
                <ng-icon name="heroArrowRight" class="text-xl"></ng-icon>
              </button>
            </div>
          </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Features Section -->
      <section class="bg-gradient-to-br from-secondary-50 via-white to-accent-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 py-16 md:py-24">
        <div class="container mx-auto px-4">
        <h3 class="text-3xl font-bold text-center text-heading mb-12">
          Everything You Need for Game Day
        </h3>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-5xl mx-auto">
          @for (feature of features; track feature.title) {
            <div class="bg-white dark:bg-slate-800 rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
              <div class="w-12 h-12 bg-secondary-100 rounded-lg flex items-center justify-center mb-4">
                <ng-icon [name]="feature.icon" class="text-2xl text-secondary-600"></ng-icon>
              </div>
              <h4 class="text-lg font-semibold text-heading mb-2">{{ feature.title }}</h4>
              <p class="text-muted">{{ feature.description }}</p>
            </div>
          }
          </div>
        </div>
      </section>

      <!-- How It Works -->
      <section class="bg-white dark:bg-slate-800 py-16 md:py-24">
        <div class="container mx-auto px-4">
          <h3 class="text-3xl font-bold text-center text-heading mb-12">
            How It Works
          </h3>

          <div class="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div class="text-center">
              <div class="w-16 h-16 bg-secondary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h4 class="text-lg font-semibold text-heading mb-2">Create a Game</h4>
              <p class="text-muted">Sign in and create a new game board with your custom settings</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-secondary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h4 class="text-lg font-semibold text-heading mb-2">Share the Link</h4>
              <p class="text-muted">Send the unique game code or link to your friends and family</p>
            </div>

            <div class="text-center">
              <div class="w-16 h-16 bg-secondary-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h4 class="text-lg font-semibold text-heading mb-2">Play & Win</h4>
              <p class="text-muted">Claim your squares, watch the game, and see who wins each quarter</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Footer -->
      <footer class="bg-gray-50 dark:bg-slate-900 py-8">
        <div class="container mx-auto px-4 text-center text-muted text-sm">
          <p>Made with love for sports ball fans</p>
        </div>
      </footer>
    </div>
  `
})
export class WelcomeComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  guestName = '';
  gameCode = '';
  email = '';
  password = '';
  displayName = '';

  showAuthForm = signal(false);
  authMode = signal<'signin' | 'signup'>('signin');

  isLoading = this.authService.isLoading;
  authError = this.authService.authError;

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

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.navigateAfterAuth();
    } catch (error) {
      console.error('Google sign in failed:', error);
    }
  }

  async submitEmailAuth(): Promise<void> {
    try {
      if (this.authMode() === 'signin') {
        await this.authService.signInWithEmail(this.email, this.password);
      } else {
        await this.authService.signUpWithEmail(this.email, this.password, this.displayName);
      }
      this.navigateAfterAuth();
    } catch (error) {
      console.error('Email auth failed:', error);
    }
  }

  continueAsGuest(): void {
    if (this.guestName.trim()) {
      this.authService.signInAsGuest(this.guestName.trim());
      this.navigateAfterAuth();
    }
  }

  joinGame(): void {
    if (this.gameCode.length === 6) {
      // If not logged in as guest, prompt for name
      if (!this.authService.currentUser()) {
        if (this.guestName.trim()) {
          this.authService.signInAsGuest(this.guestName.trim());
        } else {
          // Show guest name input
          return;
        }
      }
      this.router.navigate(['/game', this.gameCode.toUpperCase()]);
    }
  }

  private navigateAfterAuth(): void {
    // Check if there's a pending game to join
    if (this.gameCode.length === 6) {
      this.router.navigate(['/game', this.gameCode.toUpperCase()]);
    } else {
      this.router.navigate(['/dashboard']);
    }
  }
}
