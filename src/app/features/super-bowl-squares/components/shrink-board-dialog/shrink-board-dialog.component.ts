import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroLockClosed } from '@ng-icons/heroicons/outline';
import { BoardSize, getBoardDimensions } from '../../../../core/services/game.service';

/** Shown when the host locks a board that is half empty or less: offers a smaller board before locking. */
@Component({
  selector: 'app-shrink-board-dialog',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroXMark, heroLockClosed })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" (click)="closed.emit()">
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="shrink-board-title"
          class="animate-modal-in flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-card border border-qs-line bg-qs-panel shadow-pop"
          (click)="$event.stopPropagation()"
        >
          <div class="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
            <div>
              <p class="qs-eyebrow">Before you lock</p>
              <h3 id="shrink-board-title" class="qs-title mt-2 text-3xl">Only <span class="text-qs-accent">{{ squaresFilled }}</span> of {{ boardSize }} picked</h3>
            </div>
            <button type="button" (click)="closed.emit()" class="qs-btn qs-btn-ghost -mr-2 w-11 px-0 text-qs-muted hover:text-qs-ink" aria-label="Close">
              <ng-icon name="heroXMark" class="text-xl"></ng-icon>
            </button>
          </div>

          <div class="flex-1 space-y-4 overflow-y-auto px-6 pb-6">
            <p class="text-sm text-qs-muted">
              A smaller board fills up and every square counts for more. Players keep the same number of squares, shuffled into new spots.
            </p>

            <div class="grid gap-3" [class]="sizes.length > 1 ? 'sm:grid-cols-2' : ''" role="radiogroup" aria-label="Board size">
              @for (s of sizes; track s) {
                <button
                  type="button"
                  role="radio"
                  [attr.aria-checked]="selected === s"
                  (click)="selected = s"
                  class="relative flex items-center gap-4 rounded-inner border bg-qs-panel-2 p-4 text-left transition-colors duration-150 hover:border-qs-accent"
                  [class]="selected === s ? 'border-qs-accent ring-2 ring-qs-accent-soft' : 'border-qs-line'"
                >
                  <div class="grid w-20 shrink-0 gap-[3px]" [style.grid-template-columns]="'repeat(' + dims(s).cols + ', minmax(0, 1fr))'" aria-hidden="true">
                    @for (i of cells(s); track i) {
                      <span class="aspect-square rounded-[2px]" [class]="isFilled(i, s) ? 'bg-qs-accent' : 'bg-qs-line'"></span>
                    }
                  </div>
                  <div class="min-w-0">
                    <p class="text-lg font-semibold text-qs-ink">{{ s }} squares</p>
                    <p class="text-xs text-qs-muted">{{ dims(s).rows }}×{{ dims(s).cols }} · {{ percent(s) }}% full</p>
                    @if (s === recommended) {
                      <span class="qs-badge qs-badge-ok mt-2 inline-flex">Best fit</span>
                    }
                  </div>
                </button>
              }
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-2 border-t border-qs-line bg-qs-panel-2 px-6 py-4">
            <button type="button" (click)="lockAsIs.emit()" class="qs-btn qs-btn-ghost text-qs-muted">
              <ng-icon name="heroLockClosed" class="text-base"></ng-icon>
              Lock as is
            </button>
            <button type="button" (click)="converted.emit(selected)" class="qs-btn qs-btn-primary">Convert to {{ selected }} and lock</button>
          </div>
        </div>
      </div>
    }
  `
})
export class ShrinkBoardDialogComponent implements OnChanges {
  @Input() boardSize: BoardSize = 100;
  @Input() isOpen = false;
  /** Sizes the picks fit into, largest first. */
  @Input() sizes: BoardSize[] = [];
  @Input() squaresFilled = 0;

  @Output() closed = new EventEmitter<void>();
  @Output() converted = new EventEmitter<BoardSize>();
  @Output() lockAsIs = new EventEmitter<void>();

  /** The smallest board the picks fit into. */
  get recommended(): BoardSize {
    return this.sizes[this.sizes.length - 1];
  }

  selected: BoardSize = 50;

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) this.selected = this.recommended;
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.isOpen) this.closed.emit();
  }

  cells(size: BoardSize): number[] {
    return Array.from({ length: size }, (_, i) => i);
  }

  dims(size: BoardSize): { rows: number; cols: number } {
    return getBoardDimensions(size);
  }

  /** Spreads the picked cells around the preview so it does not read as a block. */
  isFilled(index: number, size: BoardSize): boolean {
    return (index * 37) % size < this.squaresFilled;
  }

  percent(size: BoardSize): number {
    return Math.round((this.squaresFilled / size) * 100);
  }
}
