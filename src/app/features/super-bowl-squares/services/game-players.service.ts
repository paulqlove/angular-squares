import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { ToastService } from '../../../core/services/toast.service';
import type { PaidCounts } from '../../../core/utils/game-data';
import { filledPaidSquares, paidCountsByName, paidSquaresFor } from '../../../core/utils/paid-squares';
import { nextPlayerColor, withoutEntries } from '../utils/board-math';
import { GamePageUiService } from './game-page-ui.service';
import { GameStateService } from './game-state.service';

interface PlayersSnapshot {
  colors: { [key: string]: string };
  paid: Set<string>;
  paidSquares: PaidCounts;
  squares: { [key: string]: string };
  userIds: { [name: string]: string };
  winners: { [key: string]: string };
}

/** The board's players: their colors, who has paid, the account each name belongs to, and taking a player off. */
@Injectable()
export class GamePlayersService {
  // Public functions

  /** Gives every player on the board a color; a new one is saved to the board. */
  public assignMissingColors(): void {
    Object.values(this.state.selectedSquares).forEach(playerName => {
      if (!this.state.playerColors[playerName]) this.getPlayerColor(playerName);
    });
  }

  /** Backfill playerUserIds for the current user if they have squares but no mapping. */
  public backfillPlayerUserId(): void {
    const state = this.state;
    const currentUser = this.authService.currentUser();
    if (!currentUser || !state.currentPlayerName) return;
    const me = state.currentPlayerName;
    const hasSquares = Object.values(state.selectedSquares).some(p => p.toLowerCase() === me.toLowerCase());
    if (hasSquares && !state.playerUserIds[me]) {
      state.playerUserIds[me] = currentUser.uid;
      this.gameService.updateGame(state.gameId, { playerUserIds: state.playerUserIds }).catch(() => {});
    }
  }

  /** Host only: paid names confirmed before counts were kept get what they hold now, so later squares show as new. */
  public backfillPaidSquares(): void {
    const state = this.state;
    if (!state.isHost()) return;
    const filled = filledPaidSquares(state.selectedSquares, state.paidPlayers, state.paidSquares);
    if (!filled) return;
    state.paidSquares = filled;
    this.gameService.updateGame(state.gameId, { paidSquares: state.paidSquares }).catch(() => {});
  }

  /** Opens Manage players; only owners and managers can manage payments. */
  public onManagePayments(): void {
    if (!this.state.isHost()) return;
    this.refreshPaymentDialog();
    this.ui.paymentDialog?.open();
  }

  /**
   * The host's Confirm marks. A name the host just confirmed covers the squares Manage players showed for it; everyone
   * else keeps their earlier count, so a square added while it was open still shows as new. Paid names it showed as
   * Unconfirmed stay on the paid list with their old count.
   */
  public onPaidPlayersChange(paidPlayers: string[]): void {
    const state = this.state;
    const justConfirmed: { [name: string]: number } = {};
    paidPlayers.filter(name => !this.shownConfirmed.has(name)).forEach(name => justConfirmed[name] = this.shownSquares[name] ?? 0);
    const previous = paidCountsByName(state.paidPlayers, state.paidSquares);
    const stillPaid = [...state.paidPlayers].filter(name => !this.shownConfirmed.has(name) && !paidPlayers.includes(name));
    const next = [...stillPaid, ...paidPlayers];
    this.shownConfirmed = new Set(paidPlayers);
    state.paidPlayers = new Set(next);
    state.paidSquares = paidSquaresFor(state.selectedSquares, next, previous, justConfirmed);
    state.calculatePlayerStats();
    this.gameService.updateGame(state.gameId, {
      paidPlayers: Array.from(state.paidPlayers),
      paidSquares: state.paidSquares
    });
  }

  /**
   * Owner and co-host: take a player off the board. Frees their squares and clears everything tied to their name.
   * Not on a locked board, where it would empty squares that can't be picked again and wipe their quarter wins.
   */
  public async onPlayerRemoved(playerName: string): Promise<void> {
    const state = this.state;
    if (!state.isHost()) return;
    if (state.isLocked) {
      this.toastService.warning('Unlock the game to remove a player.');
      return;
    }

    const previous = this.snapshot();

    state.selectedSquares = withoutEntries(state.selectedSquares, (_, name) => name === playerName);
    state.playerColors = withoutEntries(state.playerColors, key => key === playerName);
    const paidCounts = paidCountsByName(state.paidPlayers, state.paidSquares);
    state.paidPlayers = new Set([...state.paidPlayers].filter(name => name !== playerName));
    state.paidSquares = paidSquaresFor(state.selectedSquares, Array.from(state.paidPlayers), paidCounts);
    state.playerUserIds = withoutEntries(state.playerUserIds, key => key === playerName);
    state.winners = withoutEntries(state.winners, (_, name) => name === playerName);
    if (this.ui.selectedPlayer === playerName) this.ui.selectedPlayer = null;
    state.calculatePlayerStats();
    this.refreshPaymentDialog();

    try {
      await this.gameService.updateGame(state.gameId, {
        selectedSquares: state.selectedSquares,
        playerColors: state.playerColors,
        paidPlayers: Array.from(state.paidPlayers),
        paidSquares: state.paidSquares,
        playerUserIds: state.playerUserIds,
        winners: state.winners
      });
      this.toastService.success(`Removed ${playerName}`);
    } catch {
      this.restore(previous);
      this.toastService.error(`Could not remove ${playerName}. Try again.`);
    }
  }

  // Private properties

  private readonly authService: AuthService = inject(AuthService);
  private readonly gameService: GameService = inject(GameService);
  /** The Confirm marks Manage players was last given, to tell a new confirm from one already there. */
  private shownConfirmed: Set<string> = new Set();
  /** The square counts Manage players was last given, so a confirm covers what the host saw. */
  private shownSquares: { [name: string]: number } = {};
  private readonly state: GameStateService = inject(GameStateService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly ui: GamePageUiService = inject(GamePageUiService);

  // Private functions

  private getPlayerColor(playerName: string): string {
    const state = this.state;
    if (state.playerColors[playerName]) return state.playerColors[playerName];
    const color = nextPlayerColor(state.playerColors, state.availableColors);
    state.playerColors[playerName] = color;
    this.gameService.updateGame(state.gameId, { playerColors: state.playerColors }).catch(() => {});
    return color;
  }

  private refreshPaymentDialog(): void {
    this.shownConfirmed = new Set(this.state.confirmedPlayers);
    this.shownSquares = Object.fromEntries(Object.entries(this.state.playerStats).map(([name, stats]) => [name, stats.squares]));
    this.ui.paymentDialog?.setData(this.state.playerStats, this.state.playerColors, new Set(this.shownConfirmed), this.state.isLocked);
  }

  /** Puts back the players a failed removal took off. */
  private restore(previous: PlayersSnapshot): void {
    const state = this.state;
    state.selectedSquares = previous.squares;
    state.playerColors = previous.colors;
    state.paidPlayers = previous.paid;
    state.paidSquares = previous.paidSquares;
    state.playerUserIds = previous.userIds;
    state.winners = previous.winners;
    state.calculatePlayerStats();
    this.refreshPaymentDialog();
  }

  /** Everything tied to player names, to roll a removal back. */
  private snapshot(): PlayersSnapshot {
    const state = this.state;
    return {
      squares: state.selectedSquares,
      colors: state.playerColors,
      paid: state.paidPlayers,
      paidSquares: state.paidSquares,
      userIds: state.playerUserIds,
      winners: state.winners
    };
  }
}
