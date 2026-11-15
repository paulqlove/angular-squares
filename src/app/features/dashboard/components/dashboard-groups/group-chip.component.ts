import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroFolder, heroXMark } from '@ng-icons/heroicons/outline';

import { DashboardGroupsService } from '../../services/dashboard-groups.service';

/**
 * Phones only (Creative's groups-row p3): while a group is picked, a chip by the Hosting heading names it, since the
 * bottom bar's folder button is icon only. Its x goes back to All groups. Desktop's picker shows the name itself.
 */
@Component({
  selector: 'app-group-chip',
  imports: [NgIconComponent],
  providers: [provideIcons({ heroFolder, heroXMark })],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (groups.picked(); as group) {
      <button
        type="button"
        class="flex min-h-11 min-w-0 max-w-[11rem] items-center gap-1.5 rounded-full border border-qs-ink bg-qs-panel pl-3 pr-2 text-base text-qs-ink"
        [attr.aria-label]="'Showing ' + group.name + '. Show all groups'"
        (click)="groups.pickedId.set(null)"
      >
        <ng-icon name="heroFolder" class="shrink-0 text-lg" aria-hidden="true"></ng-icon>
        <span class="min-w-0 truncate">{{ group.name }}</span>
        <ng-icon name="heroXMark" class="shrink-0 text-base text-qs-muted" aria-hidden="true"></ng-icon>
      </button>
    }
  `
})
export class GroupChipComponent {
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
}
