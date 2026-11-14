import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { NgIconComponent } from '@ng-icons/core';

import { DashboardAdminService } from '../../services/dashboard-admin.service';

/** Admin: gifted Season Passes, for the admin account only. Sits on its section (`<section appDashboardAdminPanel>`). */
@Component({
  selector: 'section[appDashboardAdminPanel]',
  imports: [FormsModule, NgIconComponent],
  templateUrl: './dashboard-admin-panel.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardAdminPanelComponent {
  protected readonly admin: DashboardAdminService = inject(DashboardAdminService);
}
