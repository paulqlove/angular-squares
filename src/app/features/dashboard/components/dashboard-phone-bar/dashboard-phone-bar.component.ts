import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroFolder } from '@ng-icons/heroicons/outline';

import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { DashboardSearchFieldComponent } from '../dashboard-search-field/dashboard-search-field.component';

/**
 * Phone: the search-or-code field, the group picker's folder button and New board in a bar along the bottom, like the
 * game page's host tools. The folder button shows on the Boards tab once the owner has a group or can make one. On the
 * Players tab the field reads Players & games and opens the players filter sheet.
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
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
}
