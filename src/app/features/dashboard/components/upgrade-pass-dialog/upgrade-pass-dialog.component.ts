import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
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
import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { AnalyticsService } from '../../../../core/services/analytics.service';
import { AuthService } from '../../../../core/services/auth.service';
import { CheckoutService } from '../../../../core/services/checkout.service';
import { GameService } from '../../../../core/services/game.service';
import { PLANS } from '../../../../core/plans';
import { freeGamesText } from '../../../../core/utils/season-games';
import { SEASON_PASS_PERKS } from '../../../../core/utils/season-pass';
import {
  BoardLimitDialog,
  NOTIFY_EMAIL_MAX_LENGTH,
  NOTIFY_EMAIL_PATTERN,
  NOTIFY_SOURCE,
  UPGRADE_NOTIFY_EVENT
} from '../../../../core/utils/board-activity';

/** Which version of the dialog shows: the free limit, the paid cap, the See Season Pass button, or the free board that ended. */
export type UpgradeTrigger = BoardLimitDialog | 'pass' | 'ended';

@Component({
    selector: 'app-upgrade-pass-dialog',
    imports: [ModalComponent, FormsModule],
    template: `
    <app-modal [open]="true" labelledBy="upgrade-title" [describedBy]="trigger === 'cap' ? null : 'upgrade-summary'" [level]="2" phone="center" extraClass="max-h-[calc(100dvh-2rem)] overflow-y-auto p-5 text-qs-ink sm:p-7" (dismissed)="dismiss()">
      <div class="flex items-start justify-between gap-3">
        @if (trigger !== 'cap') {
          <p class="qs-eyebrow qs-eyebrow-bar">{{ trigger === 'ended' ? 'Free board' : checkoutOn ? 'Season Pass' : 'Season Pass / Coming soon' }}</p>
        }
        <button
          type="button"
          class="-mr-2 -mt-2 ml-auto inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-btn text-qs-muted hover:bg-qs-panel-2 hover:text-qs-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-qs-accent"
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
        } @else if (trigger === 'cap') {
          You're at your {{ seasonBoards }}-board <span class="text-qs-accent">limit</span>
        } @else if (trigger === 'season') {
          You've used your {{ freeGames }} this <span class="text-qs-accent">season</span>
        } @else if (trigger === 'limit') {
          Board 1 is live. Want a <span class="text-qs-accent">second</span>?
        } @else {
          Run more boards, all <span class="text-qs-accent">season</span>.
        }
      </h2>

      @if (trigger === 'ended') {
        <p id="upgrade-summary" class="mt-4 text-base text-qs-muted">
          @if (gamesLeft === null) {
            Free accounts keep one board.
          } @else {
            Free hosts run one game at a time.
            @if (gamesLeft < freeSeasonGames) {
              You have {{ gamesLeftText }} left this season.
            }
          }
          Reset {{ boardName ? '"' + boardName + '"' : 'it' }} for your next game, or delete it to start fresh.
        </p>
        <div class="mt-5 flex flex-col gap-2 sm:flex-row">
          <button type="button" class="qs-btn qs-btn-primary w-full sm:flex-1" (click)="resetOld.emit()">Reset old game</button>
          <button type="button" class="qs-btn qs-btn-secondary w-full sm:flex-1" (click)="deleteOld.emit()">Delete old game</button>
        </div>
      } @else if (trigger === 'cap') {
        <div class="mt-6 flex justify-end">
          <button type="button" class="qs-btn qs-btn-primary min-w-28" (click)="dismiss()">Done</button>
        </div>
      } @else {
        @if (trigger === 'season') {
          <p id="upgrade-summary" class="mt-4 text-base text-qs-muted">Free hosts get {{ freeGames }} a season. The Season Pass runs as many as you want.</p>
        } @else if (trigger === 'limit' && gamesLeft !== null) {
          <p id="upgrade-summary" class="mt-4 text-base text-qs-muted">
            Free hosts run one game at a time.
            @if (gamesLeft > 0) {
              You have {{ gamesLeftText }} left this season.
            }
          </p>
        }
        <p class="mt-6 font-mono text-4xl font-semibold tabular-nums">$5.99</p>
        <p [attr.id]="seasonCopy ? null : 'upgrade-summary'" class="qs-label mt-3 text-qs-muted">One time · through June 30, 2027</p>

        <ul class="mt-5 flex flex-wrap gap-2" aria-label="Included">
          @for (perk of perks; track perk.id) {
            @if (perk.id !== 'seasonLimit' || seasonCopy) {
              <li class="qs-badge qs-badge-ok">{{ perk.label }}</li>
            }
          }
        </ul>
      }

      @if (trigger !== 'cap') {
      <div class="mt-6 border-t border-qs-line pt-5">
        @if (checkoutOn) {
          @if (trigger === 'ended') {
            <p class="mb-3 text-base text-qs-ink">Want more active boards? Get the Season Pass.</p>
          }
          <button
            type="button"
            class="qs-btn w-full"
            [class.qs-btn-primary]="trigger !== 'ended'"
            [class.qs-btn-secondary]="trigger === 'ended'"
            [disabled]="isBuying()"
            [attr.aria-busy]="isBuying()"
            [attr.aria-describedby]="buyError() ? 'upgrade-buy-error upgrade-buy-note' : 'upgrade-buy-note'"
            (click)="buy()"
          >
            {{ isBuying() ? 'Opening checkout…' : 'Get Season Pass · $5.99' }}
          </button>
          @if (buyError()) {
            <p id="upgrade-buy-error" role="alert" class="mt-2 text-sm font-medium text-qs-bad">{{ buyError() }}</p>
          }
          <p id="upgrade-buy-note" class="qs-label mt-3 normal-case tracking-normal text-qs-muted">Secure checkout by Stripe. Sales tax included.</p>
        } @else {
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
        }
        @if (trigger === 'season') {
          <p class="qs-label mt-2 normal-case leading-snug tracking-normal text-qs-muted">Games you delete before anyone joins don't count.</p>
        }
        @if (keepLabel) {
          <button type="button" class="qs-btn qs-btn-secondary mt-4 w-full" (click)="dismiss()">{{ keepLabel }}</button>
        }
      </div>
      }
    </app-modal>
  `,
    changeDetection: ChangeDetectionStrategy.Eager
})
export class UpgradePassDialogComponent implements AfterViewInit {
  /** What opened the dialog: the free one-board limit, the Season Pass cap, or the 'See Season Pass' button. */
  @Input() trigger: UpgradeTrigger = 'limit';
  /** Name of the finished board, for the 'ended' version. */
  @Input() boardName = '';
  /** Free games left this season while the season cap is on, else null (no season copy shows). */
  @Input() gamesLeft: number | null = null;
  /** A second button that only closes the dialog, such as "Keep this game" when Clear game hits the season cap. */
  @Input() keepLabel = '';
  @Output() dismissed = new EventEmitter<void>();
  @Output() resetOld = new EventEmitter<void>();
  @Output() deleteOld = new EventEmitter<void>();
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('status') status?: ElementRef<HTMLElement>;

  buyError = signal<string | null>(null);
  email = '';
  emailError = signal<string | null>(null);
  isBuying = signal(false);
  isSubmitting = signal(false);
  submitted = signal(false);

  /** Buying shows in place of Notify me once checkout is on (or for the admin, to test it). */
  protected readonly checkoutOn: boolean;
  /** What the pass unlocks; "No season game limit" shows only in the season versions. */
  protected readonly perks = SEASON_PASS_PERKS;
  /** The cap named in the 'cap' version. Season Pass is the only plan with a cap above Free. */
  protected readonly seasonBoards: number = PLANS.season.activeBoards;
  /** "1 free game": the free plan's games per season, named in the season copy. */
  protected readonly freeGames: string = freeGamesText(PLANS.free.seasonGames);
  /** The free plan's games per season, to tell whether any are used. */
  protected readonly freeSeasonGames: number = PLANS.free.seasonGames;

  /** "1 free game" left this season, for the season lines. */
  protected get gamesLeftText(): string {
    return freeGamesText(this.gamesLeft ?? 0);
  }

  /** The season versions: the cap was hit, or the one-at-a-time limit while the cap is on. */
  protected get seasonCopy(): boolean {
    return this.trigger === 'season' || (this.trigger === 'limit' && this.gamesLeft !== null);
  }

  private analytics = inject(AnalyticsService);
  private authService = inject(AuthService);
  private checkout = inject(CheckoutService);
  private gameService = inject(GameService);
  private platformId = inject(PLATFORM_ID);
  private prefilledEmail = '';

  constructor() {
    this.checkoutOn = this.checkout.available();
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
    const user = this.authService.realUser();
    if (this.trigger !== 'ended' && this.trigger !== 'cap' && user && !user.isGuest && !this.authService.isPreviewAdmin()) {
      // The season cap is a limit view too, so the fake-door read counts it with 'limit'.
      void this.gameService.recordUpgradeView(user.uid, this.trigger === 'pass' ? 'pass' : 'limit');
    }
  }

  /** Sends the host to Stripe Checkout; a refusal (a guest, a pass already running) shows under the button. */
  async buy(): Promise<void> {
    if (this.isBuying()) return;
    this.buyError.set(null);
    this.isBuying.set(true);
    this.analytics.track('season_pass_checkout_start', { trigger: this.trigger });
    try {
      await this.checkout.start();
    } catch (error) {
      this.buyError.set(error instanceof Error ? error.message : "Checkout isn't available right now. Try again in a minute.");
      this.isBuying.set(false);
    }
  }

  dismiss(): void {
    this.dismissed.emit();
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
