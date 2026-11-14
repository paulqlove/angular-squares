import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { PlayerSummary } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';
import { PlayerGamesComponent } from './player-games.component';
import { PlayerTilesComponent } from './player-tiles.component';

/**
 * One player in the Players view (desktop): name, a tile per game, total points, and their games when opened.
 * Sits on its own table body (`<tbody appPlayerRow>`), so the opened panel stays with its row.
 */
@Component({
  selector: 'tbody[appPlayerRow]',
  imports: [NgIconComponent, PlayerGamesComponent, PlayerTilesComponent],
  templateUrl: './player-row.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class PlayerRowComponent {
  public readonly boardIds = input.required<string[]>();
  public readonly isOpen = computed<boolean>(() => this.players.openKey() === this.player().key);
  public readonly player = input.required<PlayerSummary>();

  protected readonly players: PlayersViewService = inject(PlayersViewService);
}
