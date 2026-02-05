import { Component, Input, Output, EventEmitter, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroEnvelope } from '@ng-icons/heroicons/outline';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, NgIconComponent],
  providers: [provideIcons({ heroEnvelope })],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-md bg-dialog shadow-2xl rounded-2xl p-8">
          <h2 class="text-2xl font-bold text-heading text-center mb-6">Join This Game</h2>

          @if (!showAuthForm()) {
            <div class="space-y-4">
              <!-- Google Sign In -->
              <button
                (click)="signInWithGoogle()"
                [disabled]="authService.isLoading()"
                class="w-full flex items-center justify-center gap-3 px-6 py-3 bg-control border-2 border-default rounded-lg hover:bg-control-hover transition-all font-medium text-default disabled:opacity-50"
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
                  <div class="w-full border-t border-default"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-dialog text-muted">or</span>
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
                class="w-full px-6 py-3 border-2 border-secondary-500 text-secondary-600 hover:bg-secondary-50 dark:hover:bg-secondary-500/10 rounded-lg transition-colors font-medium"
              >
                Create an Account
              </button>

              <!-- Divider -->
              <div class="relative my-6">
                <div class="absolute inset-0 flex items-center">
                  <div class="w-full border-t border-default"></div>
                </div>
                <div class="relative flex justify-center text-sm">
                  <span class="px-4 bg-dialog text-muted">just joining a game?</span>
                </div>
              </div>

              <!-- Guest Mode -->
              <div class="space-y-3">
                <input
                  type="text"
                  [(ngModel)]="guestName"
                  placeholder="Enter your name"
                  class="w-full px-4 py-3 border-2 border-default rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-input text-default"
                  (keyup.enter)="continueAsGuest()"
                />
                <button
                  (click)="continueAsGuest()"
                  [disabled]="!guestName.trim()"
                  class="w-full px-6 py-3 bg-control hover:bg-control-hover text-default rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
                  class="w-full px-4 py-3 border-2 border-default rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-input text-default"
                />
              }

              <input
                type="email"
                [(ngModel)]="email"
                placeholder="Email address"
                class="w-full px-4 py-3 border-2 border-default rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-input text-default"
              />

              <input
                type="password"
                [(ngModel)]="password"
                placeholder="Password"
                class="w-full px-4 py-3 border-2 border-default rounded-lg focus:border-secondary-500 focus:ring-2 focus:ring-secondary-100 outline-none transition-all bg-input text-default"
                (keyup.enter)="submitEmailAuth()"
              />

              @if (authService.authError()) {
                <p class="text-red-500 text-sm">{{ authService.authError() }}</p>
              }

              <button
                (click)="submitEmailAuth()"
                [disabled]="authService.isLoading() || !email || !password"
                class="w-full px-6 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50"
              >
                @if (authService.isLoading()) {
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
      </div>
    }
  `
})
export class AuthModalComponent {
  @Input() isOpen = false;
  @Output() authenticated = new EventEmitter<void>();

  authService = inject(AuthService);

  showAuthForm = signal(false);
  authMode = signal<'signin' | 'signup'>('signin');
  email = '';
  password = '';
  displayName = '';
  guestName = '';

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
      this.authenticated.emit();
    } catch {}
  }

  async submitEmailAuth(): Promise<void> {
    try {
      if (this.authMode() === 'signin') {
        await this.authService.signInWithEmail(this.email, this.password);
      } else {
        await this.authService.signUpWithEmail(this.email, this.password, this.displayName);
      }
      this.authenticated.emit();
    } catch {}
  }

  async continueAsGuest(): Promise<void> {
    if (this.guestName.trim()) {
      await this.authService.signInAsGuest(this.guestName.trim());
      this.authenticated.emit();
    }
  }
}
