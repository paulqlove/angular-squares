import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { DashboardDialogsService } from '../../services/dashboard-dialogs.service';
import { DashboardSearchService } from '../../services/dashboard-search.service';
import { DashboardViewService } from '../../services/dashboard-view.service';
import { DashboardStore } from '../../services/dashboard.store';
import { DashboardViewToggleComponent } from '../dashboard-view-toggle/dashboard-view-toggle.component';
import { GameCardComponent } from '../game-card/game-card.component';

/**
 * The boards you host, grouped by what you do next: Ready to lock, Filling, Locked.
 * Sits on its section (`<section appDashboardHosting>`), with the Grid / Compact toggle in its heading.
 */
@Component({
  selector: 'section[appDashboardHosting]',
  imports: [NgIconComponent, DashboardViewToggleComponent, GameCardComponent],
  templateUrl: './dashboard-hosting.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardHostingComponent {
  /** "10 games", or "3 of 10 games" while the search narrows the list. */
  public readonly countLabel = computed<string>(() => {
    const all = this.store.myGames().length;
    const shown = this.store.visibleMyGames().length;
    return `${shown === all ? all : shown + ' of ' + all} ${all === 1 ? 'game' : 'games'}`;
  });
  /** Three placeholder cards while the boards load. */
  public readonly skeletons: ReadonlyArray<number> = [0, 1, 2];

  protected readonly dialogs: DashboardDialogsService = inject(DashboardDialogsService);
  protected readonly search: DashboardSearchService = inject(DashboardSearchService);
  protected readonly store: DashboardStore = inject(DashboardStore);
  protected readonly view: DashboardViewService = inject(DashboardViewService);
}
