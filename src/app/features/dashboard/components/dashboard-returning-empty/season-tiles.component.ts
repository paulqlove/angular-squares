import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

import { NoBoardsRowComponent } from './no-boards-row.component';

/**
 * Returning host with no boards: games hosted this season, free games left, the "No boards" card, then See Season Pass.
 * From 1024px up all four share one row. Below that the tiles sit side by side with the card and the link under them.
 */
@Component({
  selector: 'div[appSeasonTiles]',
  imports: [NoBoardsRowComponent],
  host: { class: 'grid grid-cols-2 gap-3 lg:grid-cols-[repeat(3,minmax(0,320px))_auto] lg:items-center' },
  template: `
    <div class="qs-card flex h-24 flex-col justify-center gap-1.5 px-[18px]">
      <p class="font-mono text-[30px] font-semibold leading-none tabular-nums text-qs-ink">{{ hosted() }}</p>
      <p class="text-[15px] text-qs-muted">Hosted this season</p>
    </div>
    <div class="qs-card flex h-24 flex-col justify-center gap-1.5 px-[18px]">
      <p class="font-mono text-[30px] font-semibold leading-none tabular-nums text-qs-ink">{{ left() }}</p>
      <p class="text-[15px] text-qs-muted">Free games left</p>
    </div>
    <div appNoBoardsRow class="col-span-2 lg:col-span-1"></div>
    <button type="button" (click)="seeSeasonPass.emit($event)"
      class="col-span-2 inline-flex min-h-11 items-center justify-self-start font-medium text-qs-ink underline decoration-1 underline-offset-[6px] lg:col-span-1 lg:ml-3">
      See Season Pass
    </button>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class SeasonTilesComponent {
  public readonly hosted = input.required<number>();
  public readonly left = input.required<number>();
  /** The See Season Pass tap, to open the upgrade dialog. */
  public readonly seeSeasonPass = output<Event>();
}
