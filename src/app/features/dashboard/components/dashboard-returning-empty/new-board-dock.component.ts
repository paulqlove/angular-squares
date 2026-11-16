import { ChangeDetectionStrategy, Component } from '@angular/core';

import { NewBoardButtonComponent } from './new-board-button.component';

/**
 * Phone, returning host with no boards: New board alone in a bar pinned along the bottom, in place of the usual
 * search-and-New-board bar. The game-code field sits at the top of the page instead.
 */
@Component({
  selector: 'div[appNewBoardDock]',
  imports: [NewBoardButtonComponent],
  host: {
    class: 'qs-dock no-print fixed inset-x-0 bottom-0 z-[90] border-t border-qs-line bg-qs-panel px-4 pt-[15px] pb-[calc(15px+env(safe-area-inset-bottom))] sm:hidden'
  },
  template: '<button appNewBoardButton class="min-h-[54px] w-full"></button>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewBoardDockComponent {}
