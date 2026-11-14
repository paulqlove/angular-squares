import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { PlayerSummary } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';
import { PlayerGamesComponent } from './player-games.component';

/**
 * One player in the Players view on a phone: a card with the name, total points and an arrow, plus "+2 new squares"
 * or "Same name, account 2" when they apply. Tapping it opens their games under it (`<article appPlayerCard>`).
 */
@Component({
  selector: 'article[appPlayerCard]',
  imports: [NgIconComponent, PlayerGamesComponent],
  host: { class: 'qs-card mt-2 block overflow-hidden' },
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerCardComponent {
  public readonly isOpen = computed<boolean>(() => this.players.openKey() === this.player().key);
  public readonly player = input.required<PlayerSummary>();

  protected readonly players: PlayersViewService = inject(PlayersViewService);
}
