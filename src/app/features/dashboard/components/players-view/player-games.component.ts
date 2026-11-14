import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { PlayerGame, PlayerSummary } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';

/**
 * An opened player: each of their games with its squares and points, a circle that confirms that game and a remove
 * icon (a lock on locked games), then Remove… and Confirm rest. Removing asks first, in a line under the games.
 */
@Component({
  selector: 'div[appPlayerGames]',
  imports: [NgIconComponent],
  host: { class: 'block rounded-inner border border-qs-line bg-qs-panel px-5 pb-4 pt-1' },
  templateUrl: './player-games.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .qs-ring { width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid var(--qs-line-strong); }
    .qs-check-pop { animation: qs-icon-pop var(--qs-t-state) var(--qs-ease-spring) backwards; }
  `]
})
export class PlayerGamesComponent {
  /** Games that can still be removed from here: locked games keep their squares. */
  public readonly openGames = computed<PlayerGame[]>(() => this.player().games.filter(game => !game.locked));
  public readonly player = input.required<PlayerSummary>();
  /** The question under the games while a remove waits. */
  public readonly removeQuestion = computed<string>(() => {
    const games = this.removing() ?? [];
    const squares = games.reduce((sum, game) => sum + game.squares, 0);
    const where = games.length === 1 ? games[0].gameName : `${games.length} games`;
    const stay = games.length < this.player().games.length ? (games.length === 1 ? ' Their other games stay.' : ' Locked games stay.') : '';
    return `Remove ${this.player().name} from ${where}? ${squares} ${squares === 1 ? 'square opens' : 'squares open'} back up.${stay}`;
  });
  /** The games the host asked to remove the player from, waiting on Remove or Cancel. */
  public readonly removing = signal<PlayerGame[] | null>(null);
  public readonly showNote = computed<boolean>(() => this.players.confirmNote()?.key === this.player().key);
  public readonly unconfirmed = computed<PlayerGame[]>(() => this.player().games.filter(game => !game.confirmed));

  public confirmOne(game: PlayerGame): void {
    this.popped.set(new Set([game.gameId]));
    this.players.confirmGame(this.player(), game.gameId);
  }

  public confirmRest(): void {
    this.popped.set(new Set(this.unconfirmed().map(game => game.gameId)));
    this.players.confirmRest(this.player());
  }

  public async removeNow(): Promise<void> {
    const games = this.removing() ?? [];
    this.removing.set(null);
    await this.players.removeFromGames(this.player(), games.map(game => game.gameId));
  }

  /** Games whose check just appeared, so only those pop. */
  protected readonly popped = signal<ReadonlySet<string>>(new Set());
  protected readonly players: PlayersViewService = inject(PlayersViewService);
}
