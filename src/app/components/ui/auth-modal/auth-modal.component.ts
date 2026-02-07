import { Component, Input, Output, EventEmitter, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-auth-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <div class="w-full max-w-md bg-dialog shadow-2xl rounded-2xl p-8">
          <h2 class="text-2xl font-bold text-heading text-center mb-6">Join This Game</h2>

          <div class="space-y-4">
            <!-- Guest Mode (top) -->
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
                class="w-full px-6 py-3 bg-secondary-500 hover:bg-secondary-600 text-white rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join as Guest
              </button>
              <p class="text-xs text-muted text-center">
                Guest users can join games but cannot create new ones
              </p>
            </div>

            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-default"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="px-4 bg-dialog text-muted">or</span>
              </div>
            </div>

            <!-- Google Sign In (bottom) -->
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
              Sign in with Google
            </button>
          </div>
        </div>
      </div>
    }
  `
})
export class AuthModalComponent {
  @Input() isOpen = false;
  @Output() authenticated = new EventEmitter<void>();

  authService = inject(AuthService);

  guestName = '';

  async signInWithGoogle(): Promise<void> {
    try {
      await this.authService.signInWithGoogle();
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
