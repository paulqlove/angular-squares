import { ChangeDetectionStrategy, Component, inject } from '@angular/core';

import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardGroupsService } from '../../services/dashboard-groups.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardStore } from '../../services/dashboard.store';
import { PlayersViewService } from '../../services/players-view.service';
import { GroupMenuComponent } from '../dashboard-groups/group-menu.component';
import { NewBoardButtonComponent } from '../dashboard-returning-empty/new-board-button.component';
import { DashboardSearchFieldComponent } from '../dashboard-search-field/dashboard-search-field.component';

/**
 * From 640px up: the search-or-code field, the group picker and New board (Create your first board for a new host) in a
 * taskbar floating at the bottom of the screen, like the game page's host tools. Phones keep their own bottom bar.
 * Sits on `<div appDashboardDeskBar>`, which the dashboard hides behind dialogs.
 */
@Component({
  selector: 'div[appDashboardDeskBar]',
  imports: [DashboardSearchFieldComponent, GroupMenuComponent, NewBoardButtonComponent],
  host: { class: 'qs-dock no-print fixed inset-x-3 bottom-4 z-[90] mx-auto hidden max-w-fit sm:block' },
  template: `
    <div role="toolbar" aria-label="Board actions" class="qs-bar-frame flex items-center gap-2 rounded-[12px] p-2">
      <div role="search" class="relative w-[360px] min-w-0" data-walkthrough="join-game">
        <div appDashboardSearchField class="qs-search min-w-0 flex-1" [where]="'desk'"></div>
        <!-- Above the field: under it would be off the bottom of the screen -->
        @if (search.showCodeError()) {
          <p id="code-error-desk" class="qs-error-in absolute bottom-full left-0 mb-3 rounded-inner bg-qs-panel px-3 py-1.5 text-sm text-qs-bad shadow-pop" role="alert">Game not found</p>
        }
      </div>
      <!-- On the Players tab the picker stays put but switched off, so Search doesn't slide over -->
      @if (store.groupPickerShows() && !store.emptyHost()) {
        <app-group-menu [up]="true" [off]="players.active()" [rows]="store.groupRows()" [pickedId]="groups.pickedId()" [canManage]="groups.canEdit()"
          (groupPicked)="groups.pickedId.set($event)" (manageGroups)="groups.openManage()"></app-group-menu>
      }
      @if (store.canCreateGame()) {
        <button appNewBoardButton [label]="store.newBoardLabel()"></button>
      }
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DashboardDeskBarComponent {
  protected readonly groups: DashboardGroupsService = inject(DashboardGroupsService);
  protected readonly players: PlayersViewService = inject(PlayersViewService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
}
