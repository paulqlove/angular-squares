import { afterNextRender, ChangeDetectionStrategy, Component, computed, DestroyRef, ElementRef, inject, input, signal } from '@angular/core';

import { PlayerGame, PlayerSummary, playerTiles } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';
import { WidthObserverService } from '../../services/width-observer.service';
import { newestTiles, TILE_PX, TileLayout, tileLayout } from '../../utils/player-tiles-layout';

/** Where the tile's tooltip shows: centered under the tile, in screen coordinates. */
interface TileTip {
  game: PlayerGame;
  left: number;
  top: number;
}

/**
 * A player's games as small tiles, one per board in season order, then the game count. As many tiles a line as the card
 * fits, two lines at most; past that the newest games show and the oldest drop, the same on every card. Every game stays
 * in the card's panel. Ink is confirmed, an outline is not yet, amber has new squares, faint is not playing. A tile that
 * isn't confirmed is a button that confirms that game; hover or keyboard focus shows what it is.
 */
@Component({
  selector: 'div[appPlayerTiles]',
  host: { class: 'hidden flex-wrap items-center gap-x-4 gap-y-1 sm:flex' },
  templateUrl: './player-tiles.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .qs-tile { width: 14px; height: 14px; border-radius: 3px; }
    .qs-tile-off { background: var(--qs-line); opacity: .6; }
    .qs-tile-tip { animation: qs-fade-in var(--qs-t-fast) var(--qs-ease) backwards; }
  `]
})
export class PlayerTilesComponent {
  constructor() {
    afterNextRender(() => {
      const stop = this.widths.observe(this.host.nativeElement, width => this.width.set(width));
      this.destroyRef.onDestroy(stop);
    });
  }

  public readonly boardIds = input.required<string[]>();
  public readonly columns = computed<string>(() => `repeat(${this.layout().columns}, ${TILE_PX}px)`);
  public readonly layout = computed<TileLayout>(() => tileLayout(this.width(), this.boardIds().length));
  public readonly player = input.required<PlayerSummary>();
  public readonly tiles = computed<Array<PlayerGame | null>>(() => playerTiles(this.player(), newestTiles(this.boardIds(), this.layout().shown)));
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

  private readonly destroyRef: DestroyRef = inject(DestroyRef);
  private readonly host: ElementRef<HTMLElement> = inject(ElementRef);
  /** The row's width; 0 on phones, where the row is hidden. */
  private readonly width = signal<number>(0);
  private readonly widths: WidthObserverService = inject(WidthObserverService);
}
