import { Component, EventEmitter, Input, Output, ChangeDetectionStrategy } from '@angular/core';
import { ToggleComponent } from '../toggle/toggle.component';
import { DEFAULT_SQUARE_LIMIT, MAX_SQUARE_LIMIT, clampSquareLimit } from '../../../core/utils/square-limit';

/** "Limit squares per player": one row used by the create form and both Edit game screens. null means no limit. */
@Component({
  selector: 'app-max-squares-field',
  host: { class: 'block' },
  imports: [ToggleComponent],
  changeDetection: ChangeDetectionStrategy.Eager,
  template: `
    <div>
      <div class="flex items-start justify-between gap-4">
        <div class="min-w-0">
          <p class="qs-label mb-1.5 text-qs-ink">Limit squares per player</p>
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
      }
    </div>
  `
})
export class MaxSquaresFieldComponent {
  /** The limit, or null for none. */
  @Input() value: number | null = null;
  @Output() valueChange = new EventEmitter<number | null>();

  readonly max = MAX_SQUARE_LIMIT;

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
