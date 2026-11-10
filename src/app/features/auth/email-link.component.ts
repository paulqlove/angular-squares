import { LinkUsedUpError } from '../../core/utils/link-guest';
import { Component, ChangeDetectionStrategy, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

/** Where the emailed sign-in link lands. Finishes sign-in, then goes where the user was headed. */
@Component({
  selector: 'app-email-link',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <main class="min-h-screen bg-qs-bg flex items-center justify-center p-4">
      <div class="qs-card w-full max-w-md p-8">
        <p class="qs-eyebrow">Sign in</p>
        @switch (state()) {
          @case ('working') {
            <div role="status" aria-live="polite" aria-busy="true">
              <h1 class="qs-title mt-3 text-3xl">Signing you in…</h1>
              <span class="mt-6 block h-6 w-6 animate-spin rounded-full border-2 border-qs-accent border-t-transparent" aria-hidden="true"></span>
            </div>
          }
          @case ('ask') {
            <h1 class="qs-title mt-3 text-3xl">Confirm your email</h1>
            <p class="mt-3 text-qs-muted">You opened the link on a different device or browser. Enter the email you used so we know it's you.</p>
            <form class="mt-6 space-y-3" (ngSubmit)="finish()">
              <label for="link-name" class="qs-label block text-qs-muted">Your name</label>
              <input id="link-name" name="name" type="text" autocomplete="name" required [(ngModel)]="name" class="qs-input w-full" placeholder="Shown on boards you join" />
              <label for="link-email" class="qs-label block text-qs-muted">Email</label>
              <input id="link-email" name="email" type="email" autocomplete="email" required [(ngModel)]="email" class="qs-input w-full" />
              <button type="submit" class="qs-btn qs-btn-primary w-full" [disabled]="!email.trim() || !name.trim()">Finish signing in</button>
            </form>
          }
          @case ('error') {
            <h1 class="qs-title mt-3 text-3xl">That link didn't work</h1>
            <p class="mt-3 text-qs-muted">{{ error() }}</p>
            <a routerLink="/create" class="qs-btn qs-btn-primary mt-6 w-full">Start over</a>
          }
        }
      </div>
    </main>
  `
})
export class EmailLinkComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);
  private isBrowser = isPlatformBrowser(inject(PLATFORM_ID));

  state = signal<'working' | 'ask' | 'error'>('working');
  error = signal('');
  email = '';
  name = '';
  private next = '/dashboard';

  async ngOnInit(): Promise<void> {
    if (!this.isBrowser) return;
    if (!(await this.authService.isEmailLink(window.location.href))) {
      this.fail('This sign-in link is incomplete or has already been used.');
      return;
    }
    const pending = this.authService.pendingEmailLink();
    if (!pending?.email) {
      this.state.set('ask');
      return;
    }
    this.email = pending.email;
    this.name = pending.name;
    this.next = pending.next || this.next;
    await this.finish();
  }

  async finish(): Promise<void> {
    this.state.set('working');
    try {
      await this.authService.completeEmailLink(this.email.trim(), this.name.trim(), window.location.href);
      sessionStorage.removeItem('qs_create_after_auth');
      await this.router.navigateByUrl(this.next);
    } catch (e: any) {
      this.fail(
        e instanceof LinkUsedUpError
          ? e.message
          : e?.code === 'auth/invalid-email'
            ? "That email doesn't match the one the link was sent to."
            : 'Sign-in links work once and expire after a while. Send yourself a new one.'
      );
    }
  }

  private fail(message: string): void {
    this.error.set(message);
    this.state.set('error');
  }
}
