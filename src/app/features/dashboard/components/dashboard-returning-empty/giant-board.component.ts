import { ChangeDetectionStrategy, Component } from '@angular/core';

import { DEMO_PLAYERS, DemoPlayer } from '../../../../shared/demo-players';

/** Numbers along the top and down the side of the made-up 10 by 10 board. */
const COLUMNS: readonly number[] = [7, 3, 0, 9, 4, 1, 8, 2, 6, 5];
const ROWS: readonly number[] = [2, 8, 5, 1, 6, 0, 9, 3, 7, 4];

/** A made-up fill: about two squares in three claimed, by the demo players, the rest open. */
const SQUARES: readonly (readonly (DemoPlayer | null)[])[] = ROWS.map((_, r) => COLUMNS.map((__, c) => {
  const i = r * 10 + c;
  return (i * 7) % 11 < 4 ? null : DEMO_PLAYERS[(i * 3 + r) % DEMO_PLAYERS.length];
}));

/**
 * A big made-up board for the Season Pass start card: a full 10 by 10 board drawn larger than the space it sits in,
 * from its top-left corner, so the card's edges crop it. Its squares are an eighth of the space's width, so it fills
 * the space at any width. Decorative only. The parent gives the space a size and `overflow: hidden`.
 */
@Component({
  selector: 'div[appGiantBoard]',
  host: { class: 'block [container-type:inline-size]', 'aria-hidden': 'true' },
  template: `
    <div class="qs-giant absolute left-0 top-0 rounded-card bg-qs-tile">
      <div class="qs-giant-grid grid">
        <span></span>
        @for (number of columns; track $index) {
          <span class="qs-giant-num flex items-end justify-center font-mono font-medium leading-none text-qs-tile-ink">{{ number }}</span>
        }
        @for (row of squares; track $index; let r = $index) {
          <span class="qs-giant-num flex items-center font-mono font-medium leading-none text-qs-tile-ink">{{ rows[r] }}</span>
          @for (square of row; track $index) {
            <span class="qs-giant-sq flex aspect-square items-center justify-center rounded-[3px] font-mono font-semibold text-qs-tile"
              [class]="square ? square.color : 'bg-qs-tile-open'">{{ square?.initials }}</span>
          }
        }
      </div>
    </div>
  `,
  // --sq: one square, an eighth of the space's width, so about seven columns show at any width
  styles: [`
    .qs-giant { --sq: calc(100cqi / 8); --gap: calc(var(--sq) * 0.08); padding: calc(var(--sq) * 0.3); }
    .qs-giant-grid { grid-template-columns: calc(var(--sq) * 0.55) repeat(10, var(--sq)); gap: var(--gap); }
    .qs-giant-num { font-size: calc(var(--sq) * 0.42); }
    .qs-giant-sq { font-size: calc(var(--sq) * 0.3); }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class GiantBoardComponent {
  protected readonly columns: readonly number[] = COLUMNS;
  protected readonly rows: readonly number[] = ROWS;
  protected readonly squares = SQUARES;
}
