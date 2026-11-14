import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { DashboardViewService } from '../../services/dashboard-view.service';
import { DashboardStore } from '../../services/dashboard.store';
import { GameCardComponent } from '../game-card/game-card.component';

/** The boards you joined as a player. Sits on its section (`<section appDashboardJoined>`). */
@Component({
  selector: 'section[appDashboardJoined]',
  imports: [GameCardComponent],
  // Glides as one block when a lock above it reflows the hosted boards (see DashboardHostingComponent)
  host: { 'data-flip-id': 'joined' },
  templateUrl: './dashboard-joined.component.html',
  changeDetection: ChangeDetectionStrategy.Eager
})
export class DashboardJoinedComponent {
  /** "1 game" or "N games". */
  public readonly countLabel = computed<string>(() => {
    const count = this.store.joinedGames().length;
    return `${count} ${count === 1 ? 'game' : 'games'}`;
  });

  protected readonly store: DashboardStore = inject(DashboardStore);
  protected readonly view: DashboardViewService = inject(DashboardViewService);
}
