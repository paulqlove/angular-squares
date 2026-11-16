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
  // The words drop their trailing letter-spacing (and the button's text indent), so plus and words sit centered as one
  template: '<ng-icon name="heroPlus" class="text-base" aria-hidden="true"></ng-icon><span class="-mr-[0.1em] indent-0">{{ label() }}</span>',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class NewBoardButtonComponent {
  /** The button's words: New board, or Create your first board for a first-time host. */
  public readonly label = input<string>('New board');
  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
}
