import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroFolder, heroMagnifyingGlass } from '@ng-icons/heroicons/outline';

import { ToastService } from '../../../../core/services/toast.service';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { GroupClearButtonComponent } from '../dashboard-groups/group-clear-button.component';
import { GROUPS_OFF_HINT } from '../dashboard-groups/group-menu.component';
import { NewBoardButtonComponent } from '../dashboard-returning-empty/new-board-button.component';
import { DashboardSearchFieldComponent } from '../dashboard-search-field/dashboard-search-field.component';

/**
 * Phone: the search-or-code field, the group picker's folder button and New board in a bar along the bottom, like the
 * game page's host tools. The folder button shows once the owner has a group or can make one. On the Players tab the
 * field reads Players & games and opens the players filter sheet, and the folder stays put but off: a tap says why.
 * Tapping the field opens it with Cancel in the same bar. Sits on the dock (`<div appDashboardPhoneBar>`),
 * which the dashboard lifts above the keyboard and hides behind dialogs.
 */
@Component({
  selector: 'div[appDashboardPhoneBar]',
  imports: [NgIconComponent, DashboardSearchFieldComponent, GroupClearButtonComponent, NewBoardButtonComponent],
  providers: [provideIcons({ heroFolder, heroMagnifyingGlass })],
  templateUrl: './dashboard-phone-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardPhoneBarComponent {
  /** Off on the Players tab; a picked group fills it ink. */
  protected readonly folderClass = computed<string>(() => {
    // A picked group's name may shrink (to the folder, a letter and the ×) once the search field is down to its icon
    const size = this.groups.picked() ? 'min-w-[100px] max-w-[9rem] flex-[0_1_auto]' : 'shrink-0';
    if (this.players.active()) return `${size} qs-ctrl-off`;
    return `${size} ${this.groups.picked() ? 'border-qs-ink bg-qs-ink text-qs-bg' : 'border-qs-line-strong bg-qs-panel text-qs-ink'}`;
  });
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly hint = GROUPS_OFF_HINT;
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);

  private readonly toast: ToastService = inject(ToastService);

  /** The × back to All groups. Off on the Players tab, where a tap says why, as the folder does. */
  protected clearGroup(): void {
    if (this.players.active()) this.toast.info(GROUPS_OFF_HINT);
    else this.groups.pickedId.set(null);
  }

  protected tapGroups(): void {
    if (this.players.active()) this.toast.info(GROUPS_OFF_HINT);
    else this.groups.pickSheetOpen.set(true);
  }
}
