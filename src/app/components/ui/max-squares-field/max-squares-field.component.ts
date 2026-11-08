import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { ToggleComponent } from '../toggle/toggle.component';
import { DEFAULT_SQUARE_LIMIT, MAX_SQUARE_LIMIT, clampSquareLimit, squareLimitPreview } from '../../../core/utils/square-limit';

/** "Limit squares per player": one row used by the create form and both Edit game screens. null means no limit. */
@Component({
  selector: 'app-max-squares-field',
  imports: [ToggleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="qs-label mb-1.5 text-qs-muted">Limit squares per player</p>
          <p class="text-xs text-qs-muted">Each name can claim up to this many squares.</p>
        </div>
        <app-toggle [checked]="value !== null" (onChange)="toggle($event)"></app-toggle>
      </div>
      @if (value !== null) {
        <div class="mt-3 flex items-center gap-2">
          <button type="button" class="qs-btn qs-btn-secondary min-h-11 w-11 px-0" aria-label="One fewer square per player" [disabled]="value <= 1" (click)="step(-1)">−</button>
          <span class="min-w-12 text-center font-mono text-lg tabular-nums text-qs-ink" aria-live="polite">{{ value }}</span>
          <button type="button" class="qs-btn qs-btn-secondary min-h-11 w-11 px-0" aria-label="One more square per player" [disabled]="value >= max" (click)="step(1)">+</button>
        </div>
        <p class="mt-2 truncate rounded-inner border border-qs-line bg-qs-panel-2 px-3 py-2 font-mono text-xs text-qs-ink">{{ preview() }}</p>
        <details class="mt-1 text-xs text-qs-muted"><summary class="inline-flex min-h-9 cursor-pointer items-center underline underline-offset-4">How it works</summary><p class="pb-1">Counted by the name typed, so a second name gets around it. You can still clear squares by hand. Lowering the limit never removes squares a player already holds. You are never blocked by your own limit.</p></details>
      }
    </div>
  `
})
export class MaxSquaresFieldComponent {
  /** The limit, or null for none. */
  @Input() value: number | null = null;
  @Input() boardSize = 100;
  @Output() valueChange = new EventEmitter<number | null>();

  readonly max = MAX_SQUARE_LIMIT;

  preview(): string {
    return this.value === null ? '' : squareLimitPreview(this.value, this.boardSize);
  }

  step(by: number): void {
    this.set(clampSquareLimit((this.value ?? DEFAULT_SQUARE_LIMIT) + by));
  }

  toggle(on: boolean): void {
    this.set(on ? DEFAULT_SQUARE_LIMIT : null);
  }

  private set(next: number | null): void {
    this.value = next;
    this.valueChange.emit(next);
  }
}
