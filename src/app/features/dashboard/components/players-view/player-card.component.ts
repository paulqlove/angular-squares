import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { PlayerSummary } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';
import { PlayerTilesComponent } from './player-tiles.component';

/**
 * One player in the Players view: a card with the name, total points and an arrow, plus "+2 new squares",
 * "Same name, account 2" or "also Sammy" when they apply. From 640px up it adds squares and a tile per game.
 * Clicking it opens their games in a panel under its row (`<article appPlayerCard>`); an open card gets an ink border.
 * When their last game is confirmed it shows "All confirmed" for a beat, then fades and drops into Confirmed.
 */
@Component({
  selector: 'article[appPlayerCard]',
  imports: [NgIconComponent, PlayerTilesComponent],
  host: {
    class: 'qs-card block cursor-pointer p-3.5 sm:p-4 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-focus',
    '[class.qs-card-open]': 'isOpen()',
    '[class.qs-card-leave]': '!!beat()?.leaving',
    '(click)': 'players.toggleOpen(player().key)'
  },
  templateUrl: './player-card.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    :host.qs-card-open { border-color: var(--qs-ink); box-shadow: inset 0 0 0 0.5px var(--qs-ink); }
    /* The arrow turns with the panel, both ways, over 200ms. Reduced motion: it flips at once. */
    .qs-card-arrow { transition: transform var(--qs-t-state) var(--qs-ease); }
    .qs-card-arrow-open { transform: rotate(180deg); }
  `]
})
export class PlayerCardComponent {
  /** This card's "All confirmed" beat, when its last game was just confirmed. */
  public readonly beat = computed(() => this.players.allConfirmed()?.key === this.player().key ? this.players.allConfirmed() : null);
  public readonly boardIds = input.required<string[]>();
  public readonly isOpen = computed<boolean>(() => this.players.openKey() === this.player().key);
  public readonly player = input.required<PlayerSummary>();

  protected readonly players: PlayersViewService = inject(PlayersViewService);
}
