import { ChangeDetectionStrategy, Component } from '@angular/core';
import { HomeGridComponent } from './home-grid.component';
import { BoardSize, HomeGrid, emptyBoard } from './home-grids';

interface SizeOption {
  size: BoardSize;
  shape: string;
  text: string;
  grid: HomeGrid;
  /** Grid width in rem: every board uses the same square size, so the sizes compare at a glance. */
  width: number;
  /** At least 15rem, so the small board's line doesn't wrap word by word. */
  captionWidth: number;
}

/** Rem per column, axis included. */
const CELL_REM = 1.5;

const SIZES: Pick<SizeOption, 'size' | 'shape' | 'text'>[] = [
  { size: 100, shape: '10 × 10', text: 'The classic board. Each team gets one digit, 0 to 9.' },
  { size: 50, shape: '5 × 10', text: 'Each row covers two of the away team\'s digits.' },
  { size: 25, shape: '5 × 5', text: 'Both teams\' digits come in pairs, so each square covers four scores.' }
];

/** The three board sizes, drawn side by side at one square size. */
@Component({
  selector: 'app-home-board-sizes',
  imports: [HomeGridComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'flex flex-wrap items-start gap-x-10 gap-y-10' },
  template: `
    @for (option of options; track option.size) {
      <figure class="max-w-full">
        <div class="qs-canvas inline-block border border-qs-line p-4">
          <app-home-grid [grid]="option.grid" class="max-w-full" [style.width.rem]="option.width"></app-home-grid>
        </div>
        <figcaption class="mt-3" [style.max-width.rem]="option.captionWidth">
          <p class="flex items-baseline gap-3">
            <span class="text-lg font-semibold text-qs-ink">{{ option.size }} squares</span>
            <span class="qs-label text-qs-muted">{{ option.shape }}</span>
          </p>
          <p class="mt-1 text-[0.9375rem] text-qs-muted">{{ option.text }}</p>
        </figcaption>
      </figure>
    }
  `
})
export class HomeBoardSizesComponent {
  public readonly options: SizeOption[] = SIZES.map(option => {
    const grid = emptyBoard(option.size);
    const width = (grid.cols.length + 1) * CELL_REM;
    return { ...option, grid, width, captionWidth: Math.max(width + 2, 15) };
  });
}
