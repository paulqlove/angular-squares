import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';

import { PlayerGame, PlayerSummary, playerTiles } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';

/** Where the tile's tooltip shows: centered under the tile, in screen coordinates. */
interface TileTip {
  game: PlayerGame;
  left: number;
  top: number;
}

/**
 * A player's games as small tiles, one column per board in season order, 13 to a row, so a game sits in the same
 * spot on every row. Ink is confirmed, an outline is not yet, amber has new squares, faint is not playing.
 * A tile that isn't confirmed is a button that confirms that game; hover or keyboard focus shows what it is.
 */
@Component({
  selector: 'div[appPlayerTiles]',
  host: { class: 'grid shrink-0 gap-1', '[style.grid-template-columns]': 'columns()' },
  templateUrl: './player-tiles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .qs-tile { width: 14px; height: 14px; border-radius: 3px; }
    .qs-tile-off { background: var(--qs-line); opacity: .6; }
    .qs-tile-tip { animation: qs-fade-in var(--qs-t-fast) var(--qs-ease) backwards; }
  `]
})
export class PlayerTilesComponent {
  public readonly boardIds = input.required<string[]>();
  public readonly columns = computed<string>(() => `repeat(${Math.min(this.boardIds().length, 13)}, 14px)`);
  public readonly player = input.required<PlayerSummary>();
  public readonly tiles = computed<Array<PlayerGame | null>>(() => playerTiles(this.player(), this.boardIds()));
  public readonly tip = signal<TileTip | null>(null);

  public confirm(event: Event, game: PlayerGame): void {
    event.stopPropagation();
    this.tip.set(null);
    this.players.confirmGame(this.player(), game.gameId);
  }

  public hideTip(): void {
    this.tip.set(null);
  }

  public showTip(event: Event, game: PlayerGame): void {
    const rect = (event.target as HTMLElement).getBoundingClientRect();
    this.tip.set({ game, left: rect.left + rect.width / 2, top: rect.bottom + 10 });
  }

  protected readonly players: PlayersViewService = inject(PlayersViewService);
}
