import { ChangeDetectionStrategy, Component } from '@angular/core';

import { SAMPLE_COLUMNS, SAMPLE_ROWS, SAMPLE_SQUARES, SampleSquare } from './sample-game.data';

/**
 * A small made-up board for the first-time host's dashboard: numbers along the top and side, players' initials in
 * their colors, open squares in the open-square color. Equal padding on all four sides, number band included.
 */
@Component({
  selector: 'div[appSampleBoard]',
  host: {
    class: 'block rounded-card bg-qs-tile p-3 sm:p-5',
    role: 'img',
    'aria-label': 'A sample board: players’ initials in their squares, with numbers along the top and side'
  },
  template: `
    <div class="grid grid-cols-[1.75rem_repeat(5,minmax(0,1fr))] gap-1 sm:grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] sm:gap-1.5" aria-hidden="true">
      <span></span>
      @for (number of columns; track $index) {
        <span class="pb-1 text-center font-mono text-2xl font-medium leading-none text-qs-tile-ink sm:text-3xl">{{ number }}</span>
      }
      @for (row of squares; track $index; let r = $index) {
        <span class="flex items-center font-mono text-2xl font-medium text-qs-tile-ink sm:text-3xl">{{ rows[r] }}</span>
        @for (square of row; track $index) {
          <span class="flex aspect-square items-center justify-center rounded-[3px] font-mono text-lg font-semibold text-qs-tile sm:text-2xl"
            [class]="colorOf(square)">{{ square?.initials }}</span>
        }
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SampleBoardComponent {
  protected readonly columns: readonly number[] = SAMPLE_COLUMNS;
  protected readonly rows: readonly number[] = SAMPLE_ROWS;
  protected readonly squares = SAMPLE_SQUARES;

  protected colorOf(square: SampleSquare): string {
    return square ? square.color : 'bg-qs-tile-open';
  }
}
