import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroCheck, heroChevronDown, heroLockClosed, heroMagnifyingGlass, heroUserMinus, heroXMark } from '@ng-icons/heroicons/outline';

import { PlayersViewService } from '../../services/players-view.service';
import { PlayerCardComponent } from './player-card.component';
import { PlayerGamesComponent } from './player-games.component';

/** First-load stagger: 30ms between cards, for the first eight, then the flag drops once they're in. */
const STAGGER_CARDS = 8;
const STAGGER_MS = 30;
const STAGGER_DONE_MS = 500;

/**
 * The Players view (Season Pass): find a player, narrow to one game, then the players in two groups, Unconfirmed and
 * Confirmed: a card per player, opening into a full-width panel of their games. Sits in the Hosting section in place
 * of the boards (`<div appPlayersView>`).
 */
@Component({
  selector: 'div[appPlayersView]',
  imports: [NgIconComponent, PlayerCardComponent, PlayerGamesComponent],
  providers: [provideIcons({ heroCheck, heroChevronDown, heroLockClosed, heroMagnifyingGlass, heroUserMinus, heroXMark })],
  templateUrl: './players-view.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: ['.qs-tile-key { display: inline-block; width: 12px; height: 12px; border-radius: 3px; }']
})
export class PlayersViewComponent {
  constructor() {
    // The stagger is for the first cards on screen only: once they've had time to arrive, cards come in together.
    effect(() => {
      if (this.groups().length && this.loading()) setTimeout(() => this.loading.set(false), STAGGER_DONE_MS);
    });
  }

  /** One tile column per board the list covers. */
  public readonly boardIds = computed<string[]>(() => this.players.shownBoards().map(board => board.id as string));
  public readonly groups = computed(() => [
    { key: 'unconfirmed', label: 'Unconfirmed', players: this.players.unconfirmed() },
    { key: 'confirmed', label: 'Confirmed', players: this.players.confirmed() }
  ].filter(group => group.players.length));

  /** True until the first cards have arrived. */
  protected readonly loading = signal<boolean>(true);
  protected readonly players: PlayersViewService = inject(PlayersViewService);

  /**
   * On first load, each of the first eight cards arrives 30ms after the one before, and any after them arrive with the
   * eighth, so it's done in about a quarter second.
   */
  protected enterDelay(group: number, index: number): string | null {
    if (!this.loading()) return null;
    const place = this.groups().slice(0, group).reduce((sum, g) => sum + g.players.length, 0) + index;
    return place > 0 ? `${Math.min(place, STAGGER_CARDS - 1) * STAGGER_MS}ms` : null;
  }

  protected pickGame(event: Event): void {
    this.players.gameFilter.set((event.target as HTMLSelectElement).value || null);
  }

  protected searchFor(event: Event): void {
    this.players.search.set((event.target as HTMLInputElement).value);
  }
}
