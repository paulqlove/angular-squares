import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import { SAMPLE_COLUMNS, SAMPLE_ROWS, SAMPLE_SQUARES, SampleSquare } from './sample-game.data';

/** Class sets for the full board and the small one: padding, grid, number and square text. */
const SIZES = {
  full: {
    host: 'p-3 sm:p-5',
    grid: 'grid-cols-[1.75rem_repeat(5,minmax(0,1fr))] gap-1 sm:grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] sm:gap-1.5',
    number: 'text-2xl sm:text-3xl',
    square: 'rounded-[3px] text-lg sm:text-2xl'
  },
  mini: {
    host: 'p-2.5 sm:p-3',
    grid: 'grid-cols-[0.875rem_repeat(5,minmax(0,1fr))] gap-[3px] sm:grid-cols-[1.125rem_repeat(5,minmax(0,1fr))] sm:gap-1',
    number: 'text-xs sm:text-sm',
    square: 'rounded-[2px]'
  }
};

/**
 * A small made-up board: numbers along the top and side, players' initials in their colors, open squares in the
 * open-square color. Equal padding on all four sides, number band included. `mini` draws it small, without initials,
 * for the Season Pass host's start card.
 */
@Component({
  selector: 'div[appSampleBoard]',
  host: {
    '[class]': '"block rounded-card bg-qs-tile " + size().host',
    role: 'img',
    'aria-label': 'A sample board: players’ initials in their squares, with numbers along the top and side'
  },
  template: `
    <div class="grid" [class]="size().grid" aria-hidden="true">
      <span></span>
      @for (number of columns; track $index) {
        <span class="pb-1 text-center font-mono font-medium leading-none text-qs-tile-ink" [class]="size().number">{{ number }}</span>
      }
      @for (row of squares; track $index; let r = $index) {
        <span class="flex items-center font-mono font-medium text-qs-tile-ink" [class]="size().number">{{ rows[r] }}</span>
        @for (square of row; track $index) {
          <span class="flex aspect-square items-center justify-center font-mono font-semibold text-qs-tile"
            [class]="size().square + ' ' + colorOf(square)">{{ mini() ? '' : square?.initials }}</span>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleBoardComponent {
  /** Draws the small board, without initials. */
  public readonly mini = input<boolean>(false);

  protected readonly columns: readonly number[] = SAMPLE_COLUMNS;
  protected readonly rows: readonly number[] = SAMPLE_ROWS;
  protected readonly size = computed(() => SIZES[this.mini() ? 'mini' : 'full']);
  protected readonly squares = SAMPLE_SQUARES;

  protected colorOf(square: SampleSquare): string {
    return square ? square.color : 'bg-qs-tile-open';
  }
}
