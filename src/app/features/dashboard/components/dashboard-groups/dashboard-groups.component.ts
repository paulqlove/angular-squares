import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DashboardGroupsService, GroupRow } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { GroupsSheetComponent } from './groups-sheet.component';

/**
 * The Groups row under Hosting (Creative's g1): a chip per group with its game count, then Manage.
 * A chip searches the hosted boards by that group. Shows once the owner has a group, or can make one.
 * Without a Season Pass the chips still show (groups stay as filed) but Manage is gone.
 */
@Component({
  selector: 'app-dashboard-groups',
  imports: [GroupsSheetComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (shows()) {
      <div class="-mx-4 mt-3 flex items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0" role="group" aria-label="Groups">
        <span class="qs-label mr-1 shrink-0 text-qs-muted" aria-hidden="true">Groups</span>
        @for (row of rows(); track row.id) {
          <button
            type="button"
            class="min-h-11 shrink-0 rounded-pill border border-qs-line bg-qs-panel px-4 text-base text-qs-ink transition-colors hover:border-qs-line-strong"
            [attr.aria-pressed]="isSearched(row)"
            [class.border-qs-ink]="isSearched(row)"
            [attr.aria-label]="'Show ' + row.name + ', ' + row.count + (row.count === 1 ? ' game' : ' games')"
            (click)="searchFor(row)"
          >{{ row.name }} · {{ row.count }}</button>
        }
        @if (groups.canEdit()) {
          <button
            type="button"
            class="min-h-11 shrink-0 rounded-pill border border-qs-line-strong bg-transparent px-4 text-base text-qs-ink transition-colors hover:bg-qs-panel-2"
            (click)="groups.sheetOpen.set(true)"
          >Manage</button>
        }
      </div>
    }
    <app-groups-sheet></app-groups-sheet>
  `
})
export class DashboardGroupsComponent {
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly rows = computed<GroupRow[]>(() => this.groups.rows(this.store.myGames()));
  protected readonly shows = computed<boolean>(() =>
    !this.store.isLoadingGames() && (this.rows().length > 0 || (this.groups.canEdit() && this.store.myGames().length > 0)));
  private readonly search: DashboardSearchService = inject(DashboardSearchService);
  private readonly store: DashboardStore = inject(DashboardStore);

  protected isSearched(row: GroupRow): boolean {
    return this.search.gameSearch().trim().toLowerCase() === row.name.toLowerCase();
  }

  /** Tapping a chip searches by its name; tapping it again clears the search. */
  protected searchFor(row: GroupRow): void {
    this.search.gameSearch.set(this.isSearched(row) ? '' : row.name);
  }
}
