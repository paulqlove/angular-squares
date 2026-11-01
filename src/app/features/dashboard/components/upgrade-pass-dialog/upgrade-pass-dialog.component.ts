import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Output,
  ViewChild,
  inject,
  signal,
  PLATFORM_ID,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../../core/services/auth.service';
import { GameService } from '../../../../core/services/game.service';
import {
  NOTIFY_EMAIL_MAX_LENGTH,
  NOTIFY_EMAIL_PATTERN,
  NOTIFY_SOURCE,
  UPGRADE_NOTIFY_EVENT
} from '../../../../core/utils/board-activity';

@Component({
  selector: 'app-upgrade-pass-dialog',
  standalone: true,
  imports: [FormsModule],
  template: `
    <div class="fixed inset-0 z-[400] overflow-y-auto bg-slate-950/75" (click)="dismiss()">
      <div class="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div
          #dialogRoot
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-title"
          aria-describedby="upgrade-summary"
          class="upgrade-dialog-in w-full max-w-lg rounded-2xl border border-default bg-dialog text-default shadow-2xl"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-3 border-b border-default p-4 sm:p-6">
            <h2 id="upgrade-title" class="text-xl font-bold text-heading sm:text-2xl">
              Your free board is still going
            </h2>
            <button
              #closeButton
              type="button"
              class="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-lg text-default hover:bg-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white"
              (click)="dismiss()"
              aria-label="Close"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-6 w-6" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"></path>
              </svg>
            </button>
          </div>

          <div class="space-y-3 p-4 sm:space-y-5 sm:p-6">
            <div id="upgrade-summary" class="space-y-2 text-base leading-6 text-default">
              <p>You can host one active board at a time. Live scoring and the heatmap stay included.</p>
              <p>It stays up until a linked game is final, or for 48 hours if you didn't link one.</p>
            </div>

            <section class="rounded-xl border border-default p-3 sm:p-4" aria-labelledby="upgrade-pass-name">
              <p class="text-sm font-semibold uppercase tracking-wide text-label">Coming soon</p>
              <div class="mt-1 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <h3 id="upgrade-pass-name" class="text-lg font-bold text-heading">QuarterScore Big Game Pass</h3>
                <p class="text-2xl font-bold text-heading">
                  $4.99
                  <span class="text-base font-semibold text-default">one-time</span>
                </p>
              </div>
              <ul class="mt-2 list-disc space-y-1 pl-5 text-base text-default">
                <li>Run multiple boards at once, each with live scoring and the heatmap</li>
                <li>Team-color themes</li>
              </ul>
              <p id="upgrade-pass-note" class="mt-3 text-sm leading-5 text-default">No payment today. Your email is only used to tell you when it's ready.</p>
            </section>

            @if (submitted()) {
              <p #status tabindex="-1" role="status" class="rounded-xl border border-default bg-input p-4 text-base text-default focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white">
                You're on the list. We'll email you when Big Game Pass is available.
              </p>
            } @else {
              <form (ngSubmit)="submit()" novalidate class="space-y-3">
                <div>
                  <label for="upgrade-email" class="mb-1.5 block text-sm font-semibold text-label">Email address</label>
                  <input
                    #emailInput
                    id="upgrade-email"
                    name="email"
                    type="email"
                    inputmode="email"
                    autocomplete="email"
                    spellcheck="false"
                    maxlength="254"
                    required
                    [(ngModel)]="email"
                    [disabled]="isSubmitting()"
                    [attr.aria-invalid]="emailError() ? 'true' : 'false'"
                    [attr.aria-describedby]="emailError() ? 'upgrade-email-error upgrade-pass-note' : 'upgrade-pass-note'"
                    class="min-h-11 w-full rounded-xl border border-input bg-input px-4 py-3 text-base text-default placeholder:text-muted focus:border-focus focus:outline-none focus:ring-2 focus:ring-focus"
                    placeholder="you@example.com"
                  />
                  @if (emailError()) {
                    <p id="upgrade-email-error" role="alert" class="mt-1.5 text-sm font-medium leading-5 text-red-800 dark:text-red-200">
                      {{ emailError() }}
                    </p>
                  }
                </div>
                <button
                  type="submit"
                  class="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-button px-4 py-3 text-base font-bold text-button hover:bg-button-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-60 dark:focus-visible:outline-white sm:w-auto"
                  [disabled]="isSubmitting()"
                  [attr.aria-busy]="isSubmitting()"
                >
                  {{ isSubmitting() ? 'Saving…' : 'Notify me' }}
                </button>
              </form>
            }

            <div class="flex justify-end">
              <button
                type="button"
                class="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-2.5 text-base font-medium text-default hover:bg-control focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 dark:focus-visible:outline-white"
                (click)="dismiss()"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .upgrade-dialog-in {
      animation: upgrade-dialog-in 0.2s ease-out;
    }
    @keyframes upgrade-dialog-in {
      from {
        opacity: 0;
        transform: translateY(8px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }
    @media (prefers-reduced-motion: reduce) {
      .upgrade-dialog-in {
        animation: none;
      }
    }
  `]
})
export class UpgradePassDialogComponent implements AfterViewInit, OnDestroy {
  @Output() dismissed = new EventEmitter<void>();
  @ViewChild('closeButton') closeButton?: ElementRef<HTMLButtonElement>;
  @ViewChild('dialogRoot') dialogRoot?: ElementRef<HTMLElement>;
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('status') status?: ElementRef<HTMLElement>;

  email = '';
  emailError = signal<string | null>(null);
  isSubmitting = signal(false);
  submitted = signal(false);

  private analytics = inject(AnalyticsService);
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private platformId = inject(PLATFORM_ID);
  private previousOverflow = '';

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.closeButton?.nativeElement.focus();
  }

  ngOnDestroy(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    document.body.style.overflow = this.previousOverflow;
  }

  dismiss(): void {
    this.dismissed.emit();
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.dismiss();
      return;
    }
    if (event.key === 'Tab') {
      this.trapTab(event);
    }
  }

  async submit(): Promise<void> {
    if (this.isSubmitting() || this.submitted()) {
      return;
    }
    const message = this.validateEmail(this.email);
    if (message) {
      this.announceEmailError(message);
      this.emailInput?.nativeElement.focus();
      return;
    }
    this.emailError.set(null);

    const user = this.authService.currentUser();
    if (!user || user.isGuest) {
      this.announceEmailError('Sign in to join the list.');
      return;
    }

    this.analytics.track(UPGRADE_NOTIFY_EVENT, { source: NOTIFY_SOURCE });
    this.isSubmitting.set(true);
    try {
      await this.gameService.createNotifyMe(this.email, user.uid, NOTIFY_SOURCE);
      this.submitted.set(true);
      setTimeout(() => this.status?.nativeElement.focus());
    } catch {
      this.announceEmailError('We couldn\'t save that email. Try again in a moment.');
    } finally {
      this.isSubmitting.set(false);
    }
  }

  private trapTab(event: KeyboardEvent): void {
    const root = this.dialogRoot?.nativeElement;
    if (!root) {
      return;
    }
    const focusable = Array.from(root.querySelectorAll<HTMLElement>(
      'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href]'
    )).filter((element) => element.tabIndex !== -1);
    if (focusable.length === 0) {
      event.preventDefault();
      return;
    }
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !root.contains(active))) {
      event.preventDefault();
      last.focus();
      return;
    }
    if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private announceEmailError(message: string): void {
    this.emailError.set(null);
    setTimeout(() => this.emailError.set(message));
  }

  private validateEmail(value: string): string | null {
    const trimmed = value.trim();
    if (!trimmed) {
      return 'Enter an email address.';
    }
    if (trimmed.length > NOTIFY_EMAIL_MAX_LENGTH || !NOTIFY_EMAIL_PATTERN.test(trimmed)) {
      return 'Enter an email address like name@example.com.';
    }
    return null;
  }
}
