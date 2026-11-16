import { ChangeDetectionStrategy, Component, inject, input } from '@angular/core';
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
  template: '<ng-icon name="heroPlus" class="text-base" aria-hidden="true"></ng-icon>{{ label() }}',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewBoardButtonComponent {
  /** The button's words: New board, or Create your first board for a first-time host. */
  public readonly label = input<string>('New board');
  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
}
