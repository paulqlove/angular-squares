import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { DashboardSearchFieldComponent } from '../dashboard-search-field/dashboard-search-field.component';

/**
 * Phone: the search-or-code field and New board in a bar along the bottom, like the game page's host tools.
 * Tapping the field opens it with Cancel in the same bar. Sits on the dock (`<div appDashboardPhoneBar>`),
 * which the dashboard lifts above the keyboard and hides behind dialogs.
 */
@Component({
  selector: 'div[appDashboardPhoneBar]',
  imports: [NgIconComponent, DashboardSearchFieldComponent],
  templateUrl: './dashboard-phone-bar.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardPhoneBarComponent {
  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
}
