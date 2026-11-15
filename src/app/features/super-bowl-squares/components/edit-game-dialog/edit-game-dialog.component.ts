import { MaxSquaresFieldComponent } from '../../../../components/ui/max-squares-field/max-squares-field.component';
import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectionStrategy } from '@angular/core';
import { ModalComponent } from '../../../../components/ui/modal/modal.component';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroTrash } from '@ng-icons/heroicons/outline';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, isValidSplit } from '../../../../core/plans';
import { SplitPercents, splitPercents, splitTenths, splitToSave } from '../../../../core/utils/split-edit';
import type { BoardSize } from '../../../../core/services/game.service';
import type { EspnGame, SportType } from '../../../../core/services/espn.service';
import { smallerBoardSizes } from '../../../../core/utils/shuffle-squares';
import { autoRunLabel } from '../../../../core/utils/auto-manage';
import { ToggleComponent } from '../../../../components/ui/toggle/toggle.component';
import { EmptyQuarterRuleComponent } from '../../../../components/ui/empty-quarter-rule/empty-quarter-rule.component';
import { CoHostCandidate, EditGameCoHostComponent } from './edit-game-cohost.component';
import { EditGameEspnPickComponent } from './edit-game-espn-pick.component';
import { EditGameSplitComponent } from './edit-game-split.component';

export interface EditGameValues {
  awayTeam: string;
  homeTeam: string;
  pricePerSquare: number;
  hostNote: string;
  quarterSplit: QuarterSplit | null;
  emptyQuarterRule: EmptyQuarterRule;
  /** A smaller size to convert to on save, or null to keep the board as it is. */
  newBoardSize: BoardSize | null;
  /** Players on the host's other full boards can see and join this board. */
  showInOpenBoards: boolean;
  /** Lock and draw before kickoff (Season Pass, linked game). */
  autoManage: boolean;
  /** Season Pass: most squares one name can claim, or null for no limit. */
  maxSquaresPerPlayer: number | null;
  /** Only used with showGameFields (the dashboard). */
  name?: string;
  sport?: SportType | 'custom';
  espnGameId?: string;
}

/** Owner-only "Edit game" popup, shared by the dashboard and the game page. Edits a draft and saves once. */
@Component({
  selector: 'app-edit-game-dialog',
  imports: [ModalComponent, MaxSquaresFieldComponent, FormsModule, NgIconComponent, EmptyQuarterRuleComponent, ToggleComponent, EditGameEspnPickComponent, EditGameSplitComponent, EditGameCoHostComponent],
  providers: [provideIcons({ heroXMark, heroTrash })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <app-modal [open]="isOpen" labelledBy="edit-game-title" size="xl" phone="full" extraClass="flex h-[min(44rem,calc(100dvh-2rem))] flex-col overflow-hidden" (dismissed)="close()">
      <div class="flex items-start justify-between gap-4 border-b border-qs-line px-6 pb-4 pt-5 max-sm:pt-4">
        <div>
          <p class="qs-eyebrow qs-eyebrow-bar max-sm:hidden">Your game</p>
          <h3 id="edit-game-title" class="qs-title mt-2 text-3xl max-sm:mt-0 max-sm:text-2xl">Edit <span class="text-qs-accent">game</span></h3>
        </div>
        <button type="button" (click)="close()" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
          <ng-icon name="heroXMark" class="text-2xl"></ng-icon>
        </button>
      </div>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5 [scrollbar-gutter:stable]">
        <div class="flex flex-col gap-10">
          <ng-content select="[editGameTop]"></ng-content>

          <section class="flex flex-col gap-5">
            <h4 class="qs-eyebrow qs-eyebrow-bar !flex border-b border-qs-line pb-2.5 text-[13px] font-semibold text-qs-ink">Game</h4>

            @if (showGameFields) {
              <div class="flex flex-col gap-2">
                <label for="edit-game-name" class="qs-label text-qs-muted">Game name</label>
                <input id="edit-game-name" type="text" [(ngModel)]="draft.name" placeholder="e.g. Super Bowl Party" class="qs-input" />
              </div>

              <div class="flex flex-col gap-2">
                <span class="qs-label text-qs-muted">Sport</span>
                <div class="flex flex-wrap gap-2" role="group" aria-label="Sport">
                  @for (sport of sportOptions; track sport.value) {
                    <button type="button" class="qs-tab" [attr.aria-pressed]="draft.sport === sport.value" (click)="selectSport(sport.value)">{{ sport.label }}</button>
                  }
                </div>
              </div>
            }

            @if (!showGameFields && linkedGameName) {
              <p class="truncate text-base font-semibold text-qs-ink">{{ linkedGameName }}</p>
            } @else if (!showGameFields || draft.sport === 'custom') {
              <div class="flex flex-col gap-2">
                <div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div class="flex flex-col gap-2">
                    <label for="edit-away" class="qs-label text-qs-muted">Away team</label>
                    <input id="edit-away" type="text" [(ngModel)]="draft.awayTeam" maxlength="50" [placeholder]="showGameFields ? 'e.g. Lincoln High' : 'Away'" class="qs-input" />
                  </div>
                  <div class="flex flex-col gap-2">
                    <label for="edit-home" class="qs-label text-qs-muted">Home team</label>
                    <input id="edit-home" type="text" [(ngModel)]="draft.homeTeam" maxlength="50" [placeholder]="showGameFields ? 'e.g. Washington High' : 'Home'" class="qs-input" />
                  </div>
                </div>
                @if (showGameFields) {
                  <p class="text-xs text-qs-muted">Enter scores manually from the game page.</p>
                }
              </div>
            } @else {
              <app-edit-game-espn-pick [(gameId)]="draft.espnGameId" [games]="espnGames" [loading]="loadingEspnGames" [sport]="draft.sport"></app-edit-game-espn-pick>
            }
          </section>

          <section class="flex flex-col gap-5">
            <h4 class="qs-eyebrow qs-eyebrow-bar !flex border-b border-qs-line pb-2.5 text-[13px] font-semibold text-qs-ink">Board</h4>

            <div class="flex flex-col gap-2">
              <label for="edit-points" class="qs-label text-qs-muted">Points per square</label>
              <div class="flex items-center gap-2">
                <input id="edit-points" type="number" inputmode="numeric" min="0" [(ngModel)]="draft.pricePerSquare" [disabled]="isLocked" class="qs-input flex-1 disabled:opacity-45" />
                <span class="qs-label text-qs-muted">pts</span>
              </div>
              @if (isLocked) {
                <p class="text-xs text-qs-muted">Unlock the board to change points.</p>
              }
            </div>

            @if (boardSize > 25) {
              <div class="flex flex-col gap-2">
                <span class="qs-label text-qs-muted">Board size</span>
                <div class="flex flex-wrap gap-2" role="group" aria-label="Board size">
                  <button type="button" class="qs-tab" [attr.aria-pressed]="!draft.newBoardSize" (click)="draft.newBoardSize = null">Keep {{ boardSize }}</button>
                  @for (s of smallerSizes; track s) {
                    @if (s < boardSize) {
                      <button type="button" class="qs-tab disabled:cursor-not-allowed disabled:opacity-40" [attr.aria-pressed]="draft.newBoardSize === s" [disabled]="!sizeChoices().includes(s)" (click)="draft.newBoardSize = s">{{ s }} squares</button>
                    }
                  }
                </div>
                @if (draft.newBoardSize) {
                  <p class="text-xs text-qs-muted">Squares are shuffled into the smaller board. Each player keeps their count.</p>
                } @else if (numbersDrawn) {
                  <p class="text-xs text-qs-muted">The size can't change after the numbers are drawn.</p>
                } @else {
                  <p class="text-xs text-qs-muted">{{ squaresFilled }} picked. A smaller board needs that many or fewer.</p>
                }
              </div>
            }

            @if (canLimitSquares) {
              <app-max-squares-field class="block" [value]="draft.maxSquaresPerPlayer" (valueChange)="draft.maxSquaresPerPlayer = $event"></app-max-squares-field>
            }
          </section>

          <section class="flex flex-col gap-5">
            <h4 class="qs-eyebrow qs-eyebrow-bar !flex border-b border-qs-line pb-2.5 text-[13px] font-semibold text-qs-ink">Scoring</h4>

            @if (showSplit) {
              <app-edit-game-split [(pct)]="pct" [canCustomSplit]="canCustomSplit" [splitLocked]="splitLocked"></app-edit-game-split>
            }

            <app-empty-quarter-rule class="block [&_.qs-label]:text-qs-muted" name="edit-empty-quarter-rule" [(value)]="draft.emptyQuarterRule"></app-empty-quarter-rule>
          </section>

          <details class="group" (toggle)="onMoreToggle($event)">
            <summary class="qs-eyebrow qs-eyebrow-bar !flex min-h-11 cursor-pointer list-none items-center border-b border-qs-line pb-2.5 text-[13px] font-semibold text-qs-ink [&::-webkit-details-marker]:hidden">
              <span>More options</span>
              <span class="ml-auto flex items-center gap-2">
                @if (draft.autoManage) { <span class="text-xs font-medium text-qs-accent">Auto-lock on</span> }
                <svg class="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m5 8 5 5 5-5" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </span>
            </summary>
            <div class="flex flex-col gap-5 pt-5">

              @if (autoAvailable()) {
                <div class="flex min-h-11 items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="qs-label text-qs-ink">Auto-lock and draw</p>
                    <p class="mt-1.5 text-xs text-qs-muted">5 minutes after kickoff, we lock the board and draw the numbers.</p>
                    @if (draft.autoManage && autoRun()) {
                      <p class="mt-1 text-xs text-qs-muted">Locks {{ autoRun() }}</p>
                    }
                    <details class="mt-1 text-xs text-qs-muted"><summary class="inline-flex min-h-9 cursor-pointer items-center underline underline-offset-4">How it works</summary><p class="pb-1">If the board is not full it first moves to 50 or 25 squares (squares are shuffled, each player keeps their count). Players can pick until then. Cancel any time before it runs.</p></details>
                  </div>
                  <app-toggle [checked]="draft.autoManage" (onChange)="draft.autoManage = $event"></app-toggle>
                </div>
              }

              @if (canShowInOpenBoards) {
                <div class="flex min-h-11 items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="qs-label text-qs-ink">Show in my open boards</p>
                    <p class="mt-1.5 text-xs text-qs-muted">Players on your other boards can see and join this one.</p>
                  </div>
                  <app-toggle [checked]="draft.showInOpenBoards" (onChange)="draft.showInOpenBoards = $event"></app-toggle>
                </div>
              }

              <div class="flex flex-col gap-2">
                <label for="edit-game-note" class="qs-label text-qs-muted">Note from the host <span class="text-qs-muted">· Optional</span></label>
                <input id="edit-game-note" type="text" [(ngModel)]="draft.hostNote" maxlength="140" placeholder="Rules, deadline, how to enter" class="qs-input" />
              </div>

              @if (showGameFields) {
                <app-edit-game-cohost [players]="players" [coHostName]="coHostName" (assigned)="coHostAssign.emit($event)" (removed)="coHostRemove.emit()"></app-edit-game-cohost>
              }
            </div>
          </details>

          @if (showClear) {
            <div class="rounded-inner border border-qs-line p-4">
              <p class="qs-label text-qs-bad">Danger zone</p>
              <p class="mt-1 text-sm text-qs-muted">Clears squares, numbers, scores and settings. This can't be undone.</p>
              <button type="button" (click)="onClearClick()" class="qs-btn qs-btn-danger mt-3">
                <ng-icon name="heroTrash" class="text-base"></ng-icon>
                {{ confirmingClear ? 'Tap again to clear' : 'Clear game' }}
              </button>
            </div>
          }

        </div>
      </div>

      <div class="flex items-center justify-end gap-3 border-t border-qs-line bg-qs-panel px-6 py-4 max-sm:pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button type="button" (click)="close()" class="qs-btn qs-btn-ghost text-qs-muted">Cancel</button>
        <button type="button" (click)="save()" [disabled]="saving || (showSplit && canCustomSplit && !splitLocked && !splitValid())" class="qs-btn qs-btn-primary px-8 max-sm:flex-1">
          @if (saving) { Saving... } @else { Save changes }
        </button>
      </div>
    </app-modal>
  `
})
export class EditGameDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isLocked = false;
  @Input() boardSize: BoardSize = 100;
  @Input() canShowInOpenBoards = false;
  @Input() canAutoManage = false;
  @Input() canLimitSquares = false;
  /** "Sun, Nov 8 at 7:25 PM": when auto-lock-and-draw would run. */
  @Input() autoRunText = '';
  @Input() canCustomSplit = false;
  @Input() numbersDrawn = false;
  @Input() squaresFilled = 0;
  /** Splits lock once numbers are drawn. */
  @Input() splitLocked = false;
  /** Dashboard: name, sport, ESPN game and co-host. */
  @Input() showGameFields = false;
  /** Game page, linked to ESPN: the teams come from the game, so show them read-only. */
  @Input() linkedGameName = '';
  @Input() showSplit = false;
  @Input() showClear = false;
  /** False keeps the dialog open until the host closes it (the dashboard closes after a good save). */
  @Input() closeOnSave = true;
  @Input() saving = false;
  @Input() espnGames: EspnGame[] = [];
  @Input() loadingEspnGames = false;
  /** Players the host can pick as co-host. */
  @Input() players: CoHostCandidate[] = [];
  /** Current co-host, empty for none. */
  @Input() coHostName = '';
  @Input() values: EditGameValues = { awayTeam: '', homeTeam: '', pricePerSquare: 10, hostNote: '', quarterSplit: null, emptyQuarterRule: DEFAULT_EMPTY_QUARTER_RULE, newBoardSize: null, showInOpenBoards: false, autoManage: false, maxSquaresPerPlayer: null };

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EditGameValues>();
  @Output() clearGame = new EventEmitter<void>();
  @Output() sportChange = new EventEmitter<SportType | 'custom'>();
  @Output() coHostAssign = new EventEmitter<CoHostCandidate>();
  @Output() coHostRemove = new EventEmitter<void>();

  confirmingClear = false;
  /** Split being edited, in percent (20 = 20%). */
  pct: SplitPercents = splitPercents(null);
  readonly smallerSizes: BoardSize[] = [50, 25];
  readonly sportOptions: { value: SportType | 'custom'; label: string }[] = [
    { value: 'nfl', label: 'NFL' },
    { value: 'ncaaf', label: 'NCAA Football' },
    { value: 'ufl', label: 'UFL' },
    { value: 'nba', label: 'NBA' },
    { value: 'wnba', label: 'WNBA' },
    { value: 'afl', label: 'AFL' },
    { value: 'custom', label: 'Custom' }
  ];
  draft: EditGameValues = { ...this.values };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.draft = { ...this.values };
      this.confirmingClear = false;
      this.pct = splitPercents(this.values.quarterSplit);
    }
  }

  autoAvailable(): boolean {
    return this.canAutoManage && (!this.showGameFields || !!this.draft.espnGameId);
  }

  autoRun(): string {
    return this.showGameFields ? autoRunLabel(this.selectedEspnGame()?.date) : this.autoRunText;
  }

  /** Opening More options brings it to the top of the dialog, so the new fields are not left below the fold. */
  onMoreToggle(event: Event): void {
    const details = event.target as HTMLDetailsElement;
    if (!details.open) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    requestAnimationFrame(() => details.scrollIntoView({ block: 'start', behavior: reduceMotion ? 'auto' : 'smooth' }));
  }

  close(): void {
    this.closed.emit();
  }

  onClearClick(): void {
    if (!this.confirmingClear) {
      this.confirmingClear = true;
      return;
    }
    this.clearGame.emit();
    this.close();
  }

  save(): void {
    this.saved.emit({ ...this.draft, quarterSplit: splitToSave(this.pct) });
    if (this.closeOnSave) this.close();
  }

  selectedEspnGame(): EspnGame | undefined {
    return this.espnGames.find(g => g.id === this.draft.espnGameId);
  }

  selectSport(sport: SportType | 'custom'): void {
    this.draft.sport = sport;
    this.draft.espnGameId = '';
    this.sportChange.emit(sport);
  }

  sizeChoices(): BoardSize[] {
    return smallerBoardSizes(this.boardSize, this.squaresFilled, this.numbersDrawn);
  }

  splitValid(): boolean {
    return isValidSplit(splitTenths(this.pct));
  }
}
