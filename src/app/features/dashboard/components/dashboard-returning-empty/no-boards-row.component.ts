import { ChangeDetectionStrategy, Component } from '@angular/core';

/** Returning host with no boards: the "No boards" card beside the season tiles. No button; New board is the one call to action. */
@Component({
  selector: 'div[appNoBoardsRow]',
  host: { class: 'qs-card flex h-24 items-center gap-4 px-[18px]' },
  template: `
    <div class="grid h-11 w-11 shrink-0 grid-cols-3 gap-[3px] rounded-inner bg-qs-tile p-2" aria-hidden="true">
      @for (open of squares; track $index) {
        <span class="rounded-[2px]" [class]="open ? 'bg-qs-tile-open' : 'bg-qs-tile-muted opacity-60'"></span>
      }
    </div>
    <div class="min-w-0 flex-1">
      <p class="text-lg font-semibold text-qs-ink">No boards</p>
      <p class="text-[15px] text-qs-muted">Nothing running right now</p>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NoBoardsRowComponent {
  /** The little board's nine squares, row by row: true for an open one. */
  protected readonly squares: ReadonlyArray<boolean> = [false, false, true, false, true, false, true, false, false];
}
