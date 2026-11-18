import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { PlanService } from '../../../../core/services/plan.service';
import { DashboardStore } from '../../services/dashboard.store';
import { SampleBoardComponent } from '../dashboard-first-board/sample-board.component';
import { NewBoardButtonComponent } from './new-board-button.component';
import { StatTileComponent } from './stat-tile.component';

/**
 * Season Pass host with no boards: "0 of 25 running" and "Pass good through June 30" tiles, then a full-width start
 * card with the small board beside its text. On phones the card has no New board of its own, since the bottom bar has
 * one. Sits on `<section appPassEmpty>`.
 */
@Component({
  selector: 'section[appPassEmpty]',
  imports: [NewBoardButtonComponent, SampleBoardComponent, StatTileComponent],
  host: { 'aria-label': 'Your Season Pass', class: 'block' },
  template: `
    <div class="grid grid-cols-2 gap-3">
      <div appStatTile [value]="'' + store.myGames().length" [label]="'of ' + planService.features().activeBoards + ' running'"></div>
      @if (planService.passLastDay(); as lastDay) {
        <div appStatTile [value]="lastDay" label="Pass good through"></div>
      }
    </div>
    <div class="qs-card mt-3 flex items-center gap-4 p-5 sm:gap-10 sm:p-6">
      <div class="min-w-0 flex-1 sm:max-w-md sm:flex-initial">
        <h2 class="qs-title text-2xl sm:text-3xl">Set up your next board</h2>
        <p class="mt-2 text-qs-muted">{{ howItWorks }}</p>
        <!-- Phones already have New board in the bar along the bottom -->
        <button appNewBoardButton [walkthrough]="false" class="mt-5 max-sm:hidden"></button>
      </div>
      <div appSampleBoard [mini]="true" aria-hidden="true" class="w-28 shrink-0 sm:w-44 lg:w-52"></div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PassEmptyComponent {
  protected readonly howItWorks: string = 'Pick the game, share the link, and lock it to draw the numbers.';
  protected readonly planService: PlanService = inject(PlanService);
  protected readonly store: DashboardStore = inject(DashboardStore);
}
