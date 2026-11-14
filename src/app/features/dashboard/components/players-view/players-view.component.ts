import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown, heroChevronUp, heroLockClosed, heroMagnifyingGlass, heroUserMinus, heroXMark } from '@ng-icons/heroicons/outline';

import { PlayersViewService } from '../../services/players-view.service';
import { PlayerRowComponent } from './player-row.component';

/**
 * The Players view (Season Pass, desktop): find a player, narrow to one game, then the players in two groups,
 * Unconfirmed and Confirmed. Sits in the Hosting section in place of the boards (`<div appPlayersView>`).
 */
@Component({
  selector: 'div[appPlayersView]',
  imports: [NgIconComponent, PlayerRowComponent],
  providers: [provideIcons({ heroCheck, heroChevronDown, heroChevronUp, heroLockClosed, heroMagnifyingGlass, heroUserMinus, heroXMark })],
  templateUrl: './players-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.qs-tile-key { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }']
})
export class PlayersViewComponent {
  /** One tile column per board the list covers. */
  public readonly boardIds = computed<string[]>(() => this.players.shownBoards().map(board => board.id as string));
  public readonly groups = computed(() => [
    { key: 'unconfirmed', label: 'Unconfirmed', players: this.players.unconfirmed() },
    { key: 'confirmed', label: 'Confirmed', players: this.players.confirmed() }
  ].filter(group => group.players.length));

  protected readonly players: PlayersViewService = inject(PlayersViewService);

  protected pickGame(event: Event): void {
    this.players.gameFilter.set((event.target as HTMLSelectElement).value || null);
  }

  protected searchFor(event: Event): void {
    this.players.search.set((event.target as HTMLInputElement).value);
  }
}
