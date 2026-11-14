import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIconComponent } from '@ng-icons/core';

import { CardMenuComponent } from '../../../../components/ui/card-menu/card-menu.component';
import { GameListItem } from '../../../../core/services/game.service';
import { TeamLogoService } from '../../../../core/services/team-logo.service';
import { isBoardFilling } from '../../../../core/utils/board-groups';
import { CardTeam, cardTeams } from '../../../../core/utils/card-teams';
import { miniCellClass, miniGridCells, miniGridClass } from '../../../../core/utils/mini-grid';
import { autoLockText, canLockFromCard, hasCardBar, isBoardQuiet, openCount } from '../../services/board-card';
import { DashboardEditService } from '../../services/dashboard-edit.service';
import { DashboardStore } from '../../services/dashboard.store';

/**
 * One board on the dashboard. Sits on the grid cell (`<div appGameCard>`), so the cell keeps its container query.
 * Phone: a row. From sm up in Grid view: the board on a navy tile.
 */
@Component({
  selector: 'div[appGameCard]',
  imports: [RouterLink, NgIconComponent, CardMenuComponent],
  templateUrl: './game-card.component.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styles: [`
    /* Mini board on each card. Filling: open squares carry the one accent, claimed squares are neutral.
       Locked or full: taken squares are filled and empty ones are left blank. From sm up the board sits on the navy tile. */
    .qs-mini { background: var(--qs-line); }
    .qs-mini-open { background: color-mix(in srgb, var(--qs-accent) 38%, var(--qs-panel)); }
    .qs-mini-claimed, .qs-mini-taken { background: color-mix(in srgb, var(--qs-line-strong) 40%, var(--qs-panel)); }
    .qs-mini-blank { background: var(--qs-panel); }
    /* Grid view only, like the tall: variant: the tall card on a card 28rem wide, or from 640px up. Compact stays a row. */
    @container (min-width: 28rem) {
      :host-context(.qs-grid-view) .qs-mini { background: color-mix(in srgb, var(--qs-tile-ink) 10%, var(--qs-tile)); }
      :host-context(.qs-grid-view) .qs-mini-open { background: var(--qs-tile-open); }
      :host-context(.qs-grid-view) .qs-mini-claimed { background: color-mix(in srgb, var(--qs-tile-ink) 20%, var(--qs-tile)); }
      :host-context(.qs-grid-view) .qs-mini-taken { background: color-mix(in srgb, var(--qs-tile-ink) 36%, var(--qs-tile)); }
      :host-context(.qs-grid-view) .qs-mini-blank { background: var(--qs-tile); }
    }
    @media (min-width: 640px) {
      :host-context(.qs-grid-view) .qs-mini { background: color-mix(in srgb, var(--qs-tile-ink) 10%, var(--qs-tile)); }
      :host-context(.qs-grid-view) .qs-mini-open { background: var(--qs-tile-open); }
      :host-context(.qs-grid-view) .qs-mini-claimed { background: color-mix(in srgb, var(--qs-tile-ink) 20%, var(--qs-tile)); }
      :host-context(.qs-grid-view) .qs-mini-taken { background: color-mix(in srgb, var(--qs-tile-ink) 36%, var(--qs-tile)); }
      :host-context(.qs-grid-view) .qs-mini-blank { background: var(--qs-tile); }
    }
  `]
})
export class GameCardComponent {
  public readonly canLock = computed<boolean>(() => canLockFromCard(this.game(), this.joined()));
  /** One class per mini-board square: open or claimed while filling, blank or taken once the board is quiet. */
  public readonly cellClasses = computed<string[]>(() => {
    const game = this.game();
    const quiet = isBoardQuiet(game);
    return miniGridCells(game.boardSize).map(i => miniCellClass(i, game.squaresFilled, quiet));
  });
  public readonly game = input.required<GameListItem>();
  public readonly hasCardBar = computed<boolean>(() => hasCardBar(this.game(), this.joined()));
  /** True while a board is unlocked and still has open squares, so Share is worth offering. */
  public readonly isFilling = computed<boolean>(() => isBoardFilling(this.game()));
  /** A board this user joined rather than hosts: Remove from my list, and no Lock now. */
  public readonly joined = input<boolean>(false);
  public readonly miniGridClass = computed<string>(() => miniGridClass(this.game().boardSize));
  public readonly openCount = computed<number>(() => openCount(this.game()));
  /** The card's two team lines, away first; null shows "Teams not set". */
  public readonly teams = computed<CardTeam[] | null>(() => {
    const game = this.game();
    return cardTeams(game.awayTeam, game.homeTeam, game.espnSport, this.teamLogos.teams(game));
  });

  /** Read on every check, not cached: the text depends on the clock and drops once the lock time has passed. */
  public autoLockText(): string {
    return autoLockText(this.game());
  }

  public onCardMenu(action: string): void {
    const game = this.game();
    if (action === 'edit') this.edit.openEditModal(game);
    else if (action === 'delete') void this.store.deleteGame(game.id);
    else if (action === 'remove') void this.store.removeJoinedGame(game.id);
  }

  protected readonly store: DashboardStore = inject(DashboardStore);

  private readonly edit: DashboardEditService = inject(DashboardEditService);
  private readonly teamLogos: TeamLogoService = inject(TeamLogoService);
}
