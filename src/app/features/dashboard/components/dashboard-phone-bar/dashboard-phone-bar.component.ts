import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroAdjustmentsHorizontal } from '@ng-icons/heroicons/outline';

import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { DashboardSearchFieldComponent } from '../dashboard-search-field/dashboard-search-field.component';

/**
 * Phone: the search-or-code field and New board in a bar along the bottom, like the game page's host tools. On the
 * Players tab the field reads Find a player and a filter button joins it; both open the players filter sheet.
 * Tapping the field opens it with Cancel in the same bar. Sits on the dock (`<div appDashboardPhoneBar>`),
 * which the dashboard lifts above the keyboard and hides behind dialogs.
 */
@Component({
  selector: 'div[appDashboardPhoneBar]',
  imports: [NgIconComponent, DashboardSearchFieldComponent],
  providers: [provideIcons({ heroAdjustmentsHorizontal })],
  templateUrl: './dashboard-phone-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardPhoneBarComponent {
  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
}
