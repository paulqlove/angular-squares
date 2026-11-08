import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroTrash, heroLockClosed } from '@ng-icons/heroicons/outline';
import { DEFAULT_EMPTY_QUARTER_RULE, DEFAULT_SPLIT, EmptyQuarterRule, QuarterSplit, SPLIT_PRESETS, isValidSplit } from '../../../../core/plans';
import type { BoardSize } from '../../../../core/services/game.service';
import { smallerBoardSizes } from '../../../../core/utils/shuffle-squares';
import { ToggleComponent } from '../../../../components/ui/toggle/toggle.component';
import { EmptyQuarterRuleComponent } from '../../../../components/ui/empty-quarter-rule/empty-quarter-rule.component';

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
}

/** Owner-only "Edit game" popup. Edits a draft and saves once. */
@Component({
  selector: 'app-edit-game-dialog',
  imports: [FormsModule, NgIconComponent, EmptyQuarterRuleComponent, ToggleComponent],
  providers: [provideIcons({ heroXMark, heroTrash, heroLockClosed })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isOpen) {
      <div animate.enter="qs-modal-enter" animate.leave="qs-modal-leave" class="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" (click)="close()">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-game-title"
          class="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-qs-line bg-qs-panel shadow-pop"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4 border-b border-qs-line px-6 pb-5 pt-6">
            <div>
              <p class="qs-eyebrow">Host tools</p>
              <h3 id="edit-game-title" class="qs-title mt-2 text-3xl">Edit <span class="text-qs-accent">game</span></h3>
            </div>
            <button type="button" (click)="close()" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
              <ng-icon name="heroXMark" class="text-xl"></ng-icon>
            </button>
          </div>

          <div class="flex-1 space-y-5 overflow-y-auto px-6 py-6">
            <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label for="edit-away" class="qs-label mb-1.5 block text-qs-muted">Away team</label>
                <input id="edit-away" type="text" [(ngModel)]="draft.awayTeam" maxlength="50" placeholder="Away" class="qs-input" />
              </div>
              <div>
                <label for="edit-home" class="qs-label mb-1.5 block text-qs-muted">Home team</label>
                <input id="edit-home" type="text" [(ngModel)]="draft.homeTeam" maxlength="50" placeholder="Home" class="qs-input" />
              </div>
            </div>
            <div>
              <label for="edit-points" class="qs-label mb-1.5 block text-qs-muted">Points per square</label>
              <div class="flex items-center gap-2">
                <input id="edit-points" type="number" min="0" [(ngModel)]="draft.pricePerSquare" [disabled]="isLocked" class="qs-input max-w-40 disabled:opacity-45" />
                <span class="qs-label text-qs-muted">pts</span>
              </div>
              @if (isLocked) {
                <p class="mt-1.5 text-xs text-qs-muted">Unlock the board to change points.</p>
              }
            </div>
            <div>
              <label for="edit-note" class="qs-label mb-1.5 block text-qs-muted">Note from the host <span class="normal-case tracking-normal">(optional)</span></label>
              <textarea id="edit-note" rows="2" [(ngModel)]="draft.hostNote" maxlength="140" placeholder="e.g. Snacks at halftime!" class="qs-input min-h-20 py-2.5"></textarea>
              <p class="mt-1 text-right text-xs tabular-nums text-qs-muted">{{ draft.hostNote.length }}/140</p>
            </div>

            @if (canShowInOpenBoards) {
              <div class="flex items-start justify-between gap-4">
                <div class="min-w-0">
                  <p class="qs-label mb-1.5 text-qs-muted">Show in my open boards</p>
                  <p class="text-xs text-qs-muted">Players on your other boards can see and join this board. Off means link only.</p>
                  <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">{{ boardName }} · Points per square: {{ draft.pricePerSquare }} · {{ squaresFilled }}/{{ boardSize }} taken</p>
                </div>
                <app-toggle [checked]="draft.showInOpenBoards" (onChange)="draft.showInOpenBoards = $event"></app-toggle>
              </div>
            }

            @if (canAutoManage) {
              <div>
                <div class="flex items-start justify-between gap-4">
                  <div class="min-w-0">
                    <p class="qs-label mb-1.5 text-qs-muted">Auto-lock and draw</p>
                    <p class="text-xs text-qs-muted">5 minutes after kickoff, we lock the board and draw the numbers for you.</p>
                    @if (draft.autoManage && autoRunText) {
                      <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">Locks {{ autoRunText }}</p>
                    }
                  <details class="mt-1 text-xs text-qs-muted"><summary class="inline-flex min-h-9 cursor-pointer items-center underline underline-offset-4">How it works</summary><p class="pb-1">If the board is not full it first moves to 50 or 25 squares (squares are shuffled, each player keeps their count). Players can pick until then. Cancel any time before it runs.</p></details>
                  </div>
                  <app-toggle [checked]="draft.autoManage" (onChange)="draft.autoManage = $event"></app-toggle>
                </div>
              </div>
            }

            @if (boardSize > 25) {
              <div>
                <p class="qs-label mb-1.5 text-qs-muted">Board size</p>
                <div class="flex flex-wrap gap-1.5">
                  <button type="button" class="qs-tab min-h-9 px-2.5 text-[10.5px]" [attr.aria-pressed]="!draft.newBoardSize" (click)="draft.newBoardSize = null">Keep {{ boardSize }}</button>
                  @for (s of smallerSizes; track s) {
                    @if (s < boardSize) {
                      <button type="button" class="qs-tab min-h-9 px-2.5 text-[10.5px] disabled:opacity-45" [disabled]="!sizeChoices().includes(s)" [attr.aria-pressed]="draft.newBoardSize === s" (click)="draft.newBoardSize = s">{{ s }} squares</button>
                    }
                  }
                </div>
                <p class="mt-1.5 text-xs text-qs-muted">
                  @if (draft.newBoardSize) { Squares will be shuffled into the smaller board. Players keep the same number of squares, in new spots. }
                  @else if (numbersDrawn) { The size can't change after the numbers are drawn. }
                  @else { {{ squaresFilled }} picked. A smaller board needs that many or fewer squares picked. }
                </p>
              </div>
            }

            <div>
              <p class="qs-label mb-1.5 text-qs-muted">Quarter split</p>
              @if (!canCustomSplit || splitLocked) {
                <div class="flex items-center justify-between gap-3 rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2.5">
                  <span class="font-mono text-sm tabular-nums text-qs-ink">{{ splitText() }}</span>
                  <ng-icon name="heroLockClosed" class="text-base text-qs-muted"></ng-icon>
                </div>
                <p class="mt-1.5 text-xs text-qs-muted">
                  {{ !canCustomSplit ? 'Custom splits come with the Season Pass.' : 'The split locks once numbers are drawn.' }}
                </p>
              } @else {
                <div class="flex flex-wrap gap-1.5">
                  @for (preset of presets; track preset.id) {
                    <button type="button" class="qs-tab min-h-9 px-2.5 text-[10.5px]" [attr.aria-pressed]="activePreset() === preset.id" (click)="applyPreset(preset.split)">{{ preset.label }}</button>
                  }
                  <button type="button" class="qs-tab min-h-9 px-2.5 text-[10.5px]" [attr.aria-pressed]="activePreset() === 'custom'" (click)="customOpen = true">Custom</button>
                </div>
                @if (customOpen || activePreset() === 'custom') {
                  <div class="mt-3 grid grid-cols-4 gap-2">
                    @for (q of quarters; track q.key) {
                      <div>
                        <label [for]="'split-' + q.key" class="qs-label mb-1 block text-[10px] text-qs-muted">{{ q.label }}</label>
                        <input [id]="'split-' + q.key" type="number" min="0" max="100" step="0.5" [(ngModel)]="pct[q.key]" class="qs-input px-2 text-center tabular-nums" />
                      </div>
                    }
                  </div>
                }
                <p class="mt-1.5 text-xs tabular-nums" [class]="splitValid() ? 'text-qs-muted' : 'text-qs-bad'">
                  {{ splitText() }} · {{ splitValid() ? 'Totals 100%' : 'Must total 100% (' + remaining() + ' left), one decimal at most' }}
                </p>
              }
            </div>

            <app-empty-quarter-rule name="edit-empty-quarter-rule" [(value)]="draft.emptyQuarterRule"></app-empty-quarter-rule>

            <div class="rounded-inner border border-qs-line p-4">
              <p class="qs-label text-qs-bad">Danger zone</p>
              <p class="mt-1 text-sm text-qs-muted">Clears squares, numbers, scores and settings. This can't be undone.</p>
              <button type="button" (click)="onClearClick()" class="qs-btn qs-btn-danger mt-3">
                <ng-icon name="heroTrash" class="text-base"></ng-icon>
                {{ confirmingClear ? 'Tap again to clear' : 'Clear game' }}
              </button>
            </div>
          </div>

          <div class="flex items-center justify-end gap-2 border-t border-qs-line bg-qs-panel-2 px-6 py-4">
            <button type="button" (click)="close()" class="qs-btn qs-btn-ghost text-qs-muted">Cancel</button>
            <button type="button" (click)="save()" [disabled]="canCustomSplit && !splitLocked && !splitValid()" class="qs-btn qs-btn-primary min-w-32">Save</button>
          </div>
        </div>
      </div>
    }
  `
})
export class EditGameDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isLocked = false;
  @Input() boardName = '';
  @Input() boardSize: BoardSize = 100;
  @Input() canShowInOpenBoards = false;
  @Input() canAutoManage = false;
  /** "Sun, Nov 8 at 7:25 PM": when auto-lock-and-draw would run. */
  @Input() autoRunText = '';
  @Input() canCustomSplit = false;
  @Input() numbersDrawn = false;
  @Input() squaresFilled = 0;
  /** Splits lock once numbers are drawn. */
  @Input() splitLocked = false;
  @Input() values: EditGameValues = { awayTeam: '', homeTeam: '', pricePerSquare: 10, hostNote: '', quarterSplit: null, emptyQuarterRule: DEFAULT_EMPTY_QUARTER_RULE, newBoardSize: null, showInOpenBoards: false, autoManage: false };

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EditGameValues>();
  @Output() clearGame = new EventEmitter<void>();

  confirmingClear = false;
  customOpen = false;
  /** Split being edited, in percent (20 = 20%). */
  pct: { [k in keyof QuarterSplit]: number } = { q1: 20, q2: 20, q3: 20, q4: 40 };
  readonly presets = SPLIT_PRESETS;
  readonly smallerSizes: BoardSize[] = [50, 25];
  readonly quarters: { key: keyof QuarterSplit; label: string }[] = [
    { key: 'q1', label: 'Q1' }, { key: 'q2', label: 'Q2' }, { key: 'q3', label: 'Q3' }, { key: 'q4', label: 'Q4' }
  ];
  draft: EditGameValues = { ...this.values };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.draft = { ...this.values };
      this.confirmingClear = false;
      this.customOpen = false;
      const split = isValidSplit(this.values.quarterSplit) ? this.values.quarterSplit : DEFAULT_SPLIT;
      this.pct = { q1: split.q1 / 10, q2: split.q2 / 10, q3: split.q3 / 10, q4: split.q4 / 10 };
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.close();
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

  sizeChoices(): BoardSize[] {
    return smallerBoardSizes(this.boardSize, this.squaresFilled, this.numbersDrawn);
  }

  applyPreset(split: QuarterSplit): void {
    this.pct = { q1: split.q1 / 10, q2: split.q2 / 10, q3: split.q3 / 10, q4: split.q4 / 10 };
    this.customOpen = false;
  }

  /** The edited split in tenths of a percent, or null if it isn't a whole-tenths split. */
  tenths(): QuarterSplit | null {
    const t = (v: number) => Math.round(Number(v) * 10);
    const ok = this.quarters.every(q => Number.isFinite(Number(this.pct[q.key])) && Math.abs(Number(this.pct[q.key]) * 10 - t(this.pct[q.key])) < 1e-6);
    return ok ? { q1: t(this.pct.q1), q2: t(this.pct.q2), q3: t(this.pct.q3), q4: t(this.pct.q4) } : null;
  }

  splitValid(): boolean {
    return isValidSplit(this.tenths());
  }

  remaining(): string {
    const total = this.quarters.reduce((sum, q) => sum + (Number(this.pct[q.key]) || 0), 0);
    return (Math.round((100 - total) * 10) / 10).toString() + '%';
  }

  activePreset(): string {
    const t = this.tenths();
    return this.presets.find(p => t && p.split.q1 === t.q1 && p.split.q2 === t.q2 && p.split.q3 === t.q3 && p.split.q4 === t.q4)?.id ?? 'custom';
  }

  splitText(): string {
    const fmt = (v: number) => (Math.round(Number(v) * 10) / 10).toString();
    return [this.pct.q1, this.pct.q2, this.pct.q3, this.pct.q4].map(fmt).join(' / ');
  }

  save(): void {
    const split = this.tenths();
    const isDefault = split && split.q1 === 200 && split.q2 === 200 && split.q3 === 200 && split.q4 === 400;
    this.saved.emit({ ...this.draft, quarterSplit: isDefault ? null : split });
    this.close();
  }
}
