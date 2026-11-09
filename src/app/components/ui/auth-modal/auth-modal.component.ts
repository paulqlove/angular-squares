import { Component, Input, Output, EventEmitter, inject, OnChanges, SimpleChanges, signal, ChangeDetectionStrategy, HostListener, ElementRef, ViewChild } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/services/auth.service';

@Component({
    selector: 'app-auth-modal',
    imports: [FormsModule],
    changeDetection: ChangeDetectionStrategy.Eager,
    template: `
    @if (isOpen && !checkingAuth()) {
      <div animate.enter="qs-modal-enter" animate.leave="qs-modal-leave" class="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" (click)="close()">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="auth-modal-title"
          class="relative w-full max-w-md rounded-card border border-qs-line bg-qs-panel p-8 shadow-pop"
          (keydown.tab)="trapTab($event, false)"
          (keydown.shift.tab)="trapTab($event, true)"
          (click)="$event.stopPropagation()"
        >
          <button
            type="button"
            aria-label="Close"
            (click)="close()"
            class="absolute right-3 top-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-btn text-qs-muted hover:text-qs-ink hover:bg-qs-panel-2"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"></path>
            </svg>
          </button>
          @if (mode === 'host') {
            <h2 id="auth-modal-title" class="qs-title text-center text-2xl">Sign in to host a game</h2>
            <p class="mt-3 mb-6 text-center text-qs-muted">
              Hosting needs an account so your boards are saved and only you can run them.
              Your players don't need one. They join with just a name.
            </p>
          } @else {
            <h2 id="auth-modal-title" class="qs-title mb-6 text-center text-2xl">Join this game</h2>
          }

          <div class="space-y-4">
            @if (mode !== 'host') {
            <!-- Guest Mode (top) -->
            <div class="space-y-3">
              <label for="auth-guest-name" class="qs-label block text-qs-muted">Your name</label>
              <input
                #guestInput
                id="auth-guest-name"
                type="text"
                autocomplete="name"
                [(ngModel)]="guestName"
                placeholder="Shown on the squares you pick"
                class="qs-input w-full"
                (keyup.enter)="continueAsGuest()"
              />
              <button
                (click)="continueAsGuest()"
                [disabled]="!guestName.trim()"
                class="qs-btn qs-btn-primary w-full"
              >
                Join as Guest
              </button>
              <p class="text-center text-xs text-qs-muted">
                Guest users can join games but cannot create new ones
              </p>
            </div>

            <!-- Divider -->
            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-qs-line"></div>
              </div>
              <div class="relative flex justify-center text-sm">
                <span class="bg-qs-panel px-4 text-qs-muted">or</span>
              </div>
            </div>
            }

            <!-- Google Sign In (bottom) -->
            <button
              #googleButton
              (click)="signInWithGoogle()"
              [disabled]="authService.isLoading()"
              class="qs-btn qs-btn-secondary w-full gap-3"
            >
              <svg class="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Sign in with Google
            </button>
            @if (googleError()) {
              <p class="text-center text-sm text-qs-bad" role="alert">Sign-in didn't finish. Try again or use email.</p>
            }

            @if (emailSentTo()) {
              <div class="rounded-inner bg-qs-ok-soft p-4 text-sm text-qs-ok" role="status">
                <p class="font-semibold">Check your email</p>
                <p class="mt-1">We sent a sign-in link to {{ emailSentTo() }}. Open it on this device to finish. No password needed.</p>
              </div>
            } @else if (!showEmailForm()) {
              <button type="button" (click)="showEmailForm.set(true)" class="qs-btn qs-btn-ghost w-full">Sign in with email instead</button>
            } @else {
              <form class="space-y-2" (ngSubmit)="sendEmailLink()">
                <label for="auth-name" class="qs-label block text-qs-muted">Your name</label>
                <input id="auth-name" name="name" type="text" autocomplete="name" [(ngModel)]="linkName" class="qs-input w-full" placeholder="Shown on boards" />
                <label for="auth-email" class="qs-label block text-qs-muted">Email</label>
                <input id="auth-email" name="email" type="email" autocomplete="email" required [(ngModel)]="linkEmail" class="qs-input w-full" placeholder="you@example.com" />
                @if (emailError()) {
                  <p class="text-sm text-qs-bad">{{ emailError() }}</p>
                }
                <button type="submit" class="qs-btn qs-btn-secondary w-full" [disabled]="sending() || !linkName.trim() || !validEmail()">
                  {{ sending() ? 'Sending…' : 'Email me a sign-in link' }}
                </button>
              </form>
            }
            @if (mode === 'host') {
              <p class="text-center text-xs text-qs-muted">We never see or store your password.</p>
            }
          </div>
        </div>
      </div>
    }
  `
})
export class AuthModalComponent implements OnChanges {
  @Input() isOpen = false;
  /** 'host': creating a game needs an account, so guest mode is hidden. */
  @Input() mode: 'join' | 'host' = 'join';
  @Output() authenticated = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  /** Focus lands on the first thing to fill in once the dialog renders (after the auth check). */
  @ViewChild('guestInput') set guestInputRef(ref: ElementRef<HTMLInputElement> | undefined) {
    ref?.nativeElement.focus();
  }

  @ViewChild('googleButton') set googleButtonRef(ref: ElementRef<HTMLButtonElement> | undefined) {
    if (this.mode === 'host') ref?.nativeElement.focus();
  }

  authService = inject(AuthService);
  private host = inject<ElementRef<HTMLElement>>(ElementRef);
  checkingAuth = signal(false);

  guestName = '';
  linkName = '';
  linkEmail = '';
  showEmailForm = signal(false);
  sending = signal(false);
  emailSentTo = signal<string | null>(null);
  emailError = signal<string | null>(null);
  googleError = signal(false);

  validEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.linkEmail.trim());
  }

  async sendEmailLink(): Promise<void> {
    if (this.sending() || !this.validEmail() || !this.linkName.trim()) return;
    this.sending.set(true);
    this.emailError.set(null);
    const host = this.mode === 'host' || sessionStorage.getItem('qs_create_after_auth') === 'true';
    try {
      const email = this.linkEmail.trim();
      await this.authService.sendEmailLink(email, this.linkName.trim(), host ? '/dashboard' : window.location.pathname);
      this.emailSentTo.set(email);
    } catch (e) {
      this.emailError.set(e instanceof Error ? e.message : "We couldn't send the link. Check the email and try again.");
    } finally {
      this.sending.set(false);
    }
  }

  private returnFocus: HTMLElement | null = null;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue === true) {
      this.returnFocus = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
      void this.prepareAuth();
    }
  }

  close(): void {
    this.closed.emit();
    const target = this.returnFocus;
    this.returnFocus = null;
    setTimeout(() => target?.focus());
  }

  trapTab(event: Event, back: boolean): void {
    const items = this.focusables();
    if (!items.length) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (back && active === first) { event.preventDefault(); last.focus(); }
    else if (!back && active === last) { event.preventDefault(); first.focus(); }
  }

  @HostListener('document:keydown.escape', ['$event'])
  onEscape(event: Event): void {
    if (!this.isOpen || this.checkingAuth()) return;
    event.preventDefault();
    this.close();
  }

  private focusables(): HTMLElement[] {
    return Array.from(this.host.nativeElement.querySelectorAll<HTMLElement>('button, input')).filter(e => e.offsetParent !== null && !(e as HTMLButtonElement).disabled);
  }

  private async prepareAuth(): Promise<void> {
    this.checkingAuth.set(true);
    try {
      await this.authService.ensureInitialized();
      if (this.authService.isAuthenticated()) {
        this.authenticated.emit();
      }
    } finally {
      this.checkingAuth.set(false);
    }
  }

  async signInWithGoogle(): Promise<void> {
    this.googleError.set(false);
    try {
      await this.authService.signInWithGoogle();
      // Check for pending create redirect from team page
      if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('qs_create_after_auth') === 'true') {
        window.location.href = '/dashboard';
        return;
      }
      this.authenticated.emit();
    } catch {
      // Even if there was an error, check if user is now authenticated
      if (this.authService.isAuthenticated()) {
        if (typeof sessionStorage !== 'undefined' && sessionStorage.getItem('qs_create_after_auth') === 'true') {
          window.location.href = '/dashboard';
          return;
        }
        this.authenticated.emit();
        return;
      }
      this.googleError.set(true);
    }
  }

  async continueAsGuest(): Promise<void> {
    if (this.guestName.trim()) {
      await this.authService.signInAsGuest(this.guestName.trim());
      this.authenticated.emit();
    }
  }
}
