import { ChangeDetectionStrategy, Component, afterNextRender, input, signal } from '@angular/core';

/**
 * A number or short label that crossfades when it changes (docs/DESIGN.md, Score change): the old value fades up 6px
 * while the new one fades in, 200ms. Both sit in one grid cell, so nothing around it moves. The first value shows as is.
 * Counters set --qs-swap-rise: 0px and --qs-swap-t: 160ms on the host for a plain crossfade (Counters and badges).
 */
@Component({
  selector: 'app-value-swap',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @for (shown of [value()]; track shown) {
      <span [animate.enter]="ready() ? 'qs-swap-value-in' : ''" animate.leave="qs-swap-value-out">{{ shown }}</span>
    }
  `,
  styles: [`
    :host { display: inline-grid; }
    :host > span { grid-area: 1 / 1; }
    .qs-swap-value-in { animation: qs-swap-value-in var(--qs-swap-t, var(--qs-t-state)) var(--qs-ease) backwards; }
    .qs-swap-value-out { animation: qs-swap-value-out var(--qs-swap-t, var(--qs-t-state)) var(--qs-ease) forwards; }
    @keyframes qs-swap-value-in { from { opacity: 0; } }
    @keyframes qs-swap-value-out { to { opacity: 0; transform: translateY(calc(-1 * var(--qs-swap-rise, 6px))); } }
  `]
})
export class ValueSwapComponent {
  constructor() {
    afterNextRender(() => this.ready.set(true));
  }

  public readonly value = input.required<string | number>();

  protected readonly ready = signal<boolean>(false);
}
