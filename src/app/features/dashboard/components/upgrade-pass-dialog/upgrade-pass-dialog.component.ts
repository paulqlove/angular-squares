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
import { GameService } from '../../../../core/services/game.service';
import { PLANS } from '../../../../core/plans';
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
          <p class="qs-eyebrow qs-eyebrow-bar">{{ trigger === 'ended' ? 'Free board' : 'Season Pass / Coming soon' }}</p>
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
          You've used your {{ freeSeasonGames }} free games this <span class="text-qs-accent">season</span>
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
              You have {{ gamesLeft }} of {{ freeSeasonGames }} free games left this season.
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
          <p id="upgrade-summary" class="mt-4 text-base text-qs-muted">Free hosts get {{ freeSeasonGames }} games a season. The Season Pass runs as many as you want.</p>
        } @else if (trigger === 'limit' && gamesLeft !== null) {
          <p id="upgrade-summary" class="mt-4 text-base text-qs-muted">
            Free hosts run one game at a time.
            @if (gamesLeft > 0) {
              You have {{ gamesLeft }} of {{ freeSeasonGames }} free games left this season.
            }
          </p>
        }
        <p class="mt-6 font-mono text-4xl font-semibold tabular-nums">$5.99</p>
        <p [attr.id]="seasonCopy ? null : 'upgrade-summary'" class="qs-label mt-3 text-qs-muted">One time · through June 30, 2027</p>

        <ul class="mt-5 flex flex-wrap gap-2" aria-label="Included">
          <li class="qs-badge qs-badge-ok">Live scores</li>
          @if (seasonCopy) {
            <li class="qs-badge qs-badge-ok">No season game limit</li>
          }
          <li class="qs-badge qs-badge-ok">Up to 25 boards at a time</li>
          <li class="qs-badge qs-badge-ok">Custom splits</li>
          <li class="qs-badge qs-badge-ok">Auto-lock and draw</li>
          <li class="qs-badge qs-badge-ok">Open boards list</li>
          <li class="qs-badge qs-badge-ok">Limit squares per player</li>
        </ul>
      }

      @if (trigger !== 'cap') {
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
        @if (trigger === 'season') {
          <p class="qs-label mt-2 normal-case leading-snug tracking-normal text-qs-muted">Games you delete before anyone joins don't count.</p>
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
  @Output() dismissed = new EventEmitter<void>();
  @Output() resetOld = new EventEmitter<void>();
  @Output() deleteOld = new EventEmitter<void>();
  @ViewChild('emailInput') emailInput?: ElementRef<HTMLInputElement>;
  @ViewChild('status') status?: ElementRef<HTMLElement>;

  email = '';
  emailError = signal<string | null>(null);
  isSubmitting = signal(false);
  submitted = signal(false);

  /** The cap named in the 'cap' version. Season Pass is the only plan with a cap above Free. */
  protected readonly seasonBoards: number = PLANS.season.activeBoards;
  /** The free plan's games per season, named in the season copy. */
  protected readonly freeSeasonGames: number = PLANS.free.seasonGames;

  /** The season versions: the cap was hit, or the one-at-a-time limit while the cap is on. */
  protected get seasonCopy(): boolean {
    return this.trigger === 'season' || (this.trigger === 'limit' && this.gamesLeft !== null);
  }

  private analytics = inject(AnalyticsService);
  private authService = inject(AuthService);
  private gameService = inject(GameService);
  private platformId = inject(PLATFORM_ID);
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
    const user = this.authService.realUser();
    if (this.trigger !== 'ended' && this.trigger !== 'cap' && user && !user.isGuest && !this.authService.isPreviewAdmin()) {
      // The season cap is a limit view too, so the fake-door read counts it with 'limit'.
      void this.gameService.recordUpgradeView(user.uid, this.trigger === 'pass' ? 'pass' : 'limit');
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
