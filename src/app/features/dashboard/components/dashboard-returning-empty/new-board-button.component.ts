import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroPlus } from '@ng-icons/heroicons/outline';

import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';

/** New board: opens Create game once the board-limit check passes. Sits on a `<button appNewBoardButton>`. */
@Component({
  selector: 'button[appNewBoardButton]',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroPlus })],
  host: {
    type: 'button',
    class: 'qs-btn qs-btn-primary disabled:cursor-wait',
    'data-walkthrough': 'create-game',
    '[disabled]': 'dialogs.isCheckingBoardLimit()',
    '[attr.aria-busy]': 'dialogs.isCheckingBoardLimit()',
    '(click)': 'dialogs.openCreateModal($event)'
  },
  template: '<ng-icon name="heroPlus" class="text-base" aria-hidden="true"></ng-icon>New board',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewBoardButtonComponent {
  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
}
