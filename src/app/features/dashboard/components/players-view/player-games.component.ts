import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { NgIconComponent } from '@ng-icons/core';

import { PlayerGame, PlayerSummary, phoneGames } from '../../services/players-across-games';
import { PlayersViewService } from '../../services/players-view.service';

/**
 * An opened player: each of their games with its squares and points, a circle that confirms that game and a remove
 * icon (a lock on locked games), then Remove… and Confirm rest. Removing asks first: on a phone under the game's own
 * row, otherwise above the buttons. Phones list unconfirmed games first and fold away confirmed ones past five.
 */
@Component({
  selector: 'div[appPlayerGames]',
  imports: [NgIconComponent, NgTemplateOutlet],
  host: { class: 'block', '[class]': "phone() ? 'border-t border-qs-line px-3.5 pb-3.5' : 'rounded-inner border border-qs-line bg-qs-panel px-5 pb-4 pt-1'" },
  templateUrl: './player-games.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: [`
    .qs-ring { width: 18px; height: 18px; border-radius: 999px; border: 1.5px solid var(--qs-line-strong); }
    .qs-check-pop { animation: qs-icon-pop var(--qs-t-state) var(--qs-ease-spring) backwards; }
  `]
})
export class PlayerGamesComponent {
  /** The games listed: all in board order, or on a phone unconfirmed first with confirmed ones past five folded away. */
  public readonly games = computed<{ shown: PlayerGame[]; hidden: number }>(() =>
    this.phone() ? phoneGames(this.player().games, this.showAll()) : { shown: this.player().games, hidden: 0 });
  /** Games that can still be removed from here: locked games keep their squares. */
  public readonly openGames = computed<PlayerGame[]>(() => this.player().games.filter(game => !game.locked));
  /** The phone layout: one column inside the player's card. */
  public readonly phone = input<boolean>(false);
  public readonly player = input.required<PlayerSummary>();
  /** The question while a remove waits. */
  public readonly removeQuestion = computed<string>(() => {
    const games = this.removing() ?? [];
    const squares = games.reduce((sum, game) => sum + game.squares, 0);
    const where = games.length === 1 ? games[0].gameName : `${games.length} games`;
    const stay = games.length < this.player().games.length ? (games.length === 1 ? ' Their other games stay.' : ' Locked games stay.') : '';
    return `Remove ${this.player().name} from ${where}? ${squares} ${squares === 1 ? 'square opens' : 'squares open'} back up.${stay}`;
  });
  /** The games the host asked to remove the player from, waiting on Remove or Cancel. */
  public readonly removing = signal<PlayerGame[] | null>(null);
  /** On a phone, a one-game remove asks under that game's row. */
  public readonly removingInRow = computed<string | null>(() => {
    const games = this.removing();
    return this.phone() && games?.length === 1 ? games[0].gameId : null;
  });
  public readonly showAll = signal<boolean>(false);
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
