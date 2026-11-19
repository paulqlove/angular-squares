import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { HomeGrid } from './home-grids';

/**
 * A small static board for the home page, drawn like the real one: navy axis cells, paper squares,
 * pastel players, open squares tinted green and the winning square in emerald. It fills its width;
 * the parent sets that width.
 */
@Component({
  selector: 'app-home-grid',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block [container-type:inline-size]' },
  template: `
    <div role="img" [attr.aria-label]="grid().label" class="grid gap-px overflow-hidden rounded-chip bg-qs-line p-px"
         [style.grid-template-columns]="'repeat(' + columns() + ', minmax(0, 1fr))'" [style.--n]="columns()">
      <div class="bg-qs-panel-2" aria-hidden="true"></div>
      @for (col of grid().cols; track $index) {
        <div class="cell axis" [class.axis-hot]="col.hot" [class.paired]="col.label.length > 1" aria-hidden="true">{{ col.label }}</div>
      }
      @for (row of grid().rows; track $index; let r = $index) {
        <div class="cell axis" [class.axis-hot]="row.hot" [class.paired]="row.label.length > 1" aria-hidden="true">{{ row.label }}</div>
        @for (square of rowSquares()[r]; track $index) {
          <div class="cell square" [class]="square.state === 'claimed' ? square.color : ''" [class.blank]="square.state === 'blank'" [class.open]="square.state === 'open'"
               [class.win]="square.state === 'win'" aria-hidden="true">{{ square.initials }}</div>
        }
      }
    </div>
  `,
  styles: [`
    .cell {
      aspect-ratio: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      font-size: calc(100cqw / var(--n) * .36);
    }
    .axis { background: var(--qs-tile); color: var(--qs-tile-ink); font-family: var(--qs-font-mono); font-weight: 500; }
    .axis.paired { font-size: calc(100cqw / var(--n) * .28); }
    .axis-hot { background: var(--qs-accent); color: var(--qs-on-accent); }
    /* Claimed squares take their pastel from the global player classes, so only the other states set a fill here. */
    .square { color: #0f172a; font-weight: 600; }
    .square.blank { background: var(--qs-panel); }
    .square.open { background: color-mix(in srgb, var(--qs-accent) 14%, var(--qs-panel)); }
    .square.win { background: var(--qs-win); color: var(--qs-win-ink); }
  `]
})
export class HomeGridComponent {
  public readonly grid = input.required<HomeGrid>();

  protected readonly columns = computed(() => this.grid().cols.length + 1);
  protected readonly rowSquares = computed(() => {
    const { cols, rows, squares } = this.grid();
    return rows.map((_, r) => squares.slice(r * cols.length, (r + 1) * cols.length));
  });
}
