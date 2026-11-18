import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PlanService } from '../../../../core/services/plan.service';
import { DashboardStore } from '../../services/dashboard.store';
import { GiantBoardComponent } from './giant-board.component';
import { NewBoardButtonComponent } from './new-board-button.component';
import { StatTileComponent } from './stat-tile.component';

/**
 * Season Pass host with no boards: "0 of 25 running" and "Pass good through June 30" tiles, then a full-width start
 * card: the text on the left and a big board filling the rest, cropped by the card's edges. On phones the board is a
 * cropped band under the text, and the card has no New board of its own, since the bottom bar has one.
 * Sits on `<section appPassEmpty>`.
 */
@Component({
  selector: 'section[appPassEmpty]',
  imports: [GiantBoardComponent, NewBoardButtonComponent, StatTileComponent],
  host: { 'aria-label': 'Your Season Pass', class: 'block' },
  template: `
    <div class="grid grid-cols-2 gap-3">
      <div appStatTile [value]="'' + store.myGames().length" [label]="'of ' + planService.features().activeBoards + ' running'"></div>
      @if (planService.passLastDay(); as lastDay) {
        <div appStatTile [value]="lastDay" label="Pass good through"></div>
      }
    </div>
    <div class="qs-card mt-3 flex flex-col overflow-hidden sm:flex-row">
      <div class="p-5 sm:w-[22rem] sm:shrink-0 sm:p-6 lg:w-[26rem]">
        <h2 class="qs-title text-2xl sm:text-3xl">Set up your next board</h2>
        <p class="mt-2 text-qs-muted">{{ howItWorks }}</p>
        <!-- Phones already have New board in the bar along the bottom -->
        <button appNewBoardButton [walkthrough]="false" class="mt-5 max-sm:hidden"></button>
      </div>
      <!-- The board starts inside the card and runs off its right and bottom edges -->
      <div class="relative h-44 min-w-0 flex-1 overflow-hidden max-sm:ml-5 sm:mt-6 sm:h-auto sm:min-h-[15rem] lg:min-h-[17rem]">
        <div appGiantBoard class="h-full"></div>
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PassEmptyComponent {
  protected readonly howItWorks: string = 'Pick the game, share the link, and lock it to draw the numbers.';
  protected readonly planService: PlanService = inject(PlanService);
  protected readonly store: DashboardStore = inject(DashboardStore);
}
