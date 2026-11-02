import { Component, Input, Output, EventEmitter, OnChanges, SimpleChanges, HostListener, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroXMark, heroTrash } from '@ng-icons/heroicons/outline';

export interface EditGameValues {
  awayTeam: string;
  homeTeam: string;
  pricePerSquare: number;
  hostNote: string;
}

/** Owner-only "Edit game" popup. Edits a draft and saves once. */
@Component({
  selector: 'app-edit-game-dialog',
  imports: [FormsModule, NgIconComponent],
  providers: [provideIcons({ heroXMark, heroTrash })],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    @if (isOpen) {
      <div class="fixed inset-0 z-[150] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" (click)="close()">
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
            <button type="button" (click)="save()" class="qs-btn qs-btn-primary min-w-32">Save</button>
          </div>
        </div>
      </div>
    }
  `
})
export class EditGameDialogComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isLocked = false;
  @Input() values: EditGameValues = { awayTeam: '', homeTeam: '', pricePerSquare: 10, hostNote: '' };

  @Output() closed = new EventEmitter<void>();
  @Output() saved = new EventEmitter<EditGameValues>();
  @Output() clearGame = new EventEmitter<void>();

  confirmingClear = false;
  draft: EditGameValues = { ...this.values };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen']?.currentValue) {
      this.draft = { ...this.values };
      this.confirmingClear = false;
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

  save(): void {
    this.saved.emit({ ...this.draft });
    this.close();
  }
}
