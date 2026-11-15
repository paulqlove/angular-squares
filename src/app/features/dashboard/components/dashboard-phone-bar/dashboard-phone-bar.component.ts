import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroFolder } from '@ng-icons/heroicons/outline';

import { ToastService } from '../../../../core/services/toast.service';
import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { GROUPS_OFF_HINT } from '../dashboard-groups/group-menu.component';
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
  imports: [NgIconComponent, DashboardSearchFieldComponent],
  providers: [provideIcons({ heroFolder })],
  templateUrl: './dashboard-phone-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardPhoneBarComponent {
  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  /** Off on the Players tab; a picked group fills it ink. */
  protected readonly folderClass = computed<string>(() => {
    if (this.players.active()) return 'qs-ctrl-off';
    return this.groups.picked() ? 'border-qs-ink bg-qs-ink text-qs-bg' : 'border-qs-line-strong bg-qs-panel text-qs-ink';
  });
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly hint = GROUPS_OFF_HINT;
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);

  private readonly toast: ToastService = inject(ToastService);

  protected tapGroups(): void {
    if (this.players.active()) this.toast.info(GROUPS_OFF_HINT);
    else this.groups.pickSheetOpen.set(true);
  }
}
