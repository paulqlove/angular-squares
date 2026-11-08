import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  OnDestroy,
  Input,
  Output,
  ViewChild,
  inject,
  signal,
  PLATFORM_ID,
  ChangeDetectionStrategy
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
    imports: [FormsModule],
    template: `
    <div animate.enter="qs-modal-enter" animate.leave="qs-modal-leave" class="fixed inset-0 z-[400] overflow-y-auto bg-slate-950/75" (click)="dismiss()">
      <div class="flex min-h-full items-center justify-center p-3 sm:p-6">
        <div
          #dialogRoot
          role="dialog"
          aria-modal="true"
          aria-labelledby="upgrade-title"
          aria-describedby="upgrade-summary"
          class="upgrade-dialog-in w-full max-w-md rounded-card border border-qs-line bg-qs-panel p-5 text-qs-ink shadow-pop sm:p-7"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-3">
            <p class="qs-eyebrow qs-eyebrow-bar">{{ trigger === 'ended' ? 'Free board' : 'Season Pass / Coming soon' }}</p>
            <button
              #closeButton
              type="button"
              class="-mr-2 -mt-2 inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-btn text-qs-muted hover:bg-qs-panel-2 hover:text-qs-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent"
              (click)="dismiss()"
              aria-label="Close"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" d="M6 6l12 12M18 6L6 18"></path>
              </svg>
            </button>
          </div>

          <h2 id="upgrade-title" class="qs-title mt-3 text-3xl sm:text-4xl">
            @if (trigger === 'ended') {
              Your last game is <span class="text-qs-accent">over</span>.
            } @else if (trigger === 'limit') {
              Board 1 is live. Want a <span class="text-qs-accent">second</span>?
            } @else {
              Run more boards, all <span class="text-qs-accent">season</span>.
            }
          </h2>

          @if (trigger === 'ended') {
            <p id="upgrade-summary" class="mt-4 text-base text-qs-muted">
              Free accounts keep one board. Reset {{ boardName ? '"' + boardName + '"' : 'it' }} for your next game, or delete it to start fresh.
            </p>
            <div class="mt-5 flex flex-col gap-2 sm:flex-row">
              <button type="button" class="qs-btn qs-btn-primary w-full sm:flex-1" (click)="resetOld.emit()">Reset old game</button>
              <button type="button" class="qs-btn qs-btn-secondary w-full sm:flex-1" (click)="deleteOld.emit()">Delete old game</button>
            </div>
          } @else {
            <p class="mt-6 font-mono text-4xl font-semibold tabular-nums">$5.99</p>
            <p id="upgrade-summary" class="qs-label mt-3 text-qs-muted">One time · through June 30, 2027</p>

            <ul class="mt-5 flex flex-wrap gap-2" aria-label="Included">
              <li class="qs-badge qs-badge-ok">Live scores</li>
              <li class="qs-badge qs-badge-ok">Up to 25 active boards</li>
              <li class="qs-badge qs-badge-ok">Custom splits</li>
            </ul>
          }

          <div class="mt-6 border-t border-qs-line pt-5">
            @if (trigger === 'ended') {
              <p class="mb-3 text-base text-qs-ink">Want more active boards? Leave your email.</p>
            }
            @if (submitted()) {
              <p #status tabindex="-1" role="status" class="rounded-inner border border-qs-line bg-qs-panel-2 p-4 text-base text-qs-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent">
                You're on the list. We'll email you when the Season Pass is ready.
              </p>
            } @else {
              <form (ngSubmit)="submit()" novalidate>
                <label for="upgrade-email" class="qs-label text-qs-muted">Email</label>
                <div class="mt-2 flex flex-col gap-2 sm:flex-row">
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
                    class="min-h-11 w-full min-w-0 rounded-btn border border-qs-line-strong bg-qs-panel-2 px-3 text-base text-qs-ink placeholder:text-qs-muted focus:border-qs-accent focus:outline-none focus:ring-2 focus:ring-qs-accent sm:flex-1"
                    placeholder="you@example.com"
                  />
                  <button
                    type="submit"
                    class="qs-btn qs-btn-primary w-full sm:w-auto"
                    [disabled]="isSubmitting()"
                    [attr.aria-busy]="isSubmitting()"
                  >
                    {{ isSubmitting() ? 'Saving…' : 'Notify me' }}
                  </button>
                </div>
                @if (emailError()) {
                  <p id="upgrade-email-error" role="alert" class="mt-2 text-sm font-medium text-qs-bad">{{ emailError() }}</p>
                }
                <p id="upgrade-pass-note" class="qs-label mt-3 normal-case tracking-normal text-qs-muted">One email when it's ready. Nothing else.</p>
              </form>
            }
          </div>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
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
  /** What opened the dialog: the one-board limit, or the 'See Season Pass' button. */
  @Input() trigger: 'limit' | 'pass' | 'ended' = 'limit';
  /** Name of the finished board, for the 'ended' version. */
  @Input() boardName = '';
  @Output() dismissed = new EventEmitter<void>();
  @Output() resetOld = new EventEmitter<void>();
  @Output() deleteOld = new EventEmitter<void>();
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
  private prefilledEmail = '';

  constructor() {
    const user = this.authService.currentUser();
    if (user && !user.isGuest && user.email) {
      this.email = user.email;
      this.prefilledEmail = user.email.trim().toLowerCase();
    }
  }

  ngAfterViewInit(): void {
    if (!isPlatformBrowser(this.platformId)) {
      return;
    }
    this.previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    this.closeButton?.nativeElement.focus();
    const user = this.authService.realUser();
    if (this.trigger !== 'ended' && user && !user.isGuest && !this.authService.isPreviewAdmin()) {
      void this.gameService.recordUpgradeView(user.uid, this.trigger);
    }
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

    const prefilled = this.prefilledEmail !== '' && this.email.trim().toLowerCase() === this.prefilledEmail;
    // The 'ended' version is a general-interest signup, not the Season Pass pitch: keep it out of the Jan 15 read.
    const source = this.trigger === 'ended' ? 'ended_board_dialog' : NOTIFY_SOURCE;
    const stored: 'limit' | 'pass' = this.trigger === 'pass' ? 'pass' : 'limit';
    this.analytics.track(UPGRADE_NOTIFY_EVENT, { source, trigger: this.trigger, prefilled, dialog_version: 'v2' });
    this.isSubmitting.set(true);
    try {
      await this.gameService.createNotifyMe(this.email, user.uid, source, { prefilled, trigger: stored });
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
