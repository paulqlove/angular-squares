import { inject, Injectable } from '@angular/core';
import { AuthService } from '../../../core/services/auth.service';
import { GameService } from '../../../core/services/game.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { ToastService } from '../../../core/services/toast.service';
import { squareLimitMessage, squareLimitState } from '../../../core/utils/square-limit';
import { GamePageUiService } from './game-page-ui.service';
import { GameStateService } from './game-state.service';
import { PlayerNameService } from './player-name.service';

/**
 * Tapping a square: claims an open one, gives back one of your own, or says who holds it. A signed-out visitor signs in
 * first and the square they tapped is claimed after.
 */
@Injectable()
export class SquarePickerService {
  // Public functions

  /** Signed in from the square tap: play under the new account's name and claim the square they tapped. */
  public async onAuthModalAuthenticated(): Promise<void> {
    this.ui.showAuthModal.set(false);
    this.names.adoptAuthName();
    if (this.ui.pendingSquare) {
      const square = this.ui.pendingSquare;
      this.ui.pendingSquare = null;
      await this.onSquareClick(square);
    }
  }

  /** The user backed out, so don't claim this square on a later sign-in. */
  public onAuthModalClosed(): void {
    this.ui.showAuthModal.set(false);
    this.ui.pendingSquare = null;
  }

  public async onSquareClick(event: { row: number; col: number }): Promise<void> {
    if (!this.readyToPick(event)) return;
    const state = this.state;
    const key = `${event.row}-${event.col}`;
    const sanitizedPlayer = this.sanitizationService.sanitizePlayerName(this.names.currentPlayer);

    if (state.selectedSquares[key]) {
      if (state.selectedSquares[key].toLowerCase() === sanitizedPlayer.toLowerCase()) {
        await this.releaseSquare(key);
      } else {
        this.ui.takenByPlayer = state.selectedSquares[key];
        this.ui.flashAlert(`Square already taken by ${this.ui.takenByPlayer}`);
      }
      return;
    }

    const limit = squareLimitState(state.selectedSquares, sanitizedPlayer, state.maxSquaresPerPlayer);
    if (limit?.full) {
      this.toastService.warning(squareLimitMessage(limit.held, limit.max));
      return;
    }

    await this.claimSquare(key, sanitizedPlayer);
  }

  // Private properties

  private readonly authService: AuthService = inject(AuthService);
  private readonly gameService: GameService = inject(GameService);
  private readonly names: PlayerNameService = inject(PlayerNameService);
  private readonly sanitizationService: SanitizationService = inject(SanitizationService);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly ui: GamePageUiService = inject(GamePageUiService);

  // Private functions

  /** Claims an open square for this player, shown at once and rolled back if the save fails. */
  private async claimSquare(key: string, player: string): Promise<void> {
    const state = this.state;
    const previousSquares = { ...state.selectedSquares };
    const newSelectedSquares = { ...state.selectedSquares, [key]: player };
    state.selectedSquares = newSelectedSquares;
    state.calculatePlayerStats();

    // Record userId ownership for this player name
    const user = this.authService.currentUser();
    if (user && !state.playerUserIds[player]) {
      state.playerUserIds[player] = user.uid;
    }

    try {
      await this.gameService.updateGame(state.gameId, {
        selectedSquares: newSelectedSquares,
        playerUserIds: state.playerUserIds
      });
    } catch {
      // Rollback on failure
      state.selectedSquares = previousSquares;
      state.calculatePlayerStats();
      this.toastService.error('Could not claim the square. Try again.');
      return;
    }

    // Track joined game for authenticated non-owner users
    if (user && !user.isGuest && user.uid !== state.gameOwnerId) {
      this.gameService.addJoinedGame(user.uid, state.gameId, state.gameName);
    }
  }

  /**
   * Whether this viewer can pick now. If not, says why: a locked board, no sign-in (remembers the square and opens
   * sign-in), no name yet, or a name another player holds.
   */
  private readyToPick(event: { row: number; col: number }): boolean {
    if (this.state.isLocked) {
      this.toastService.warning('This game is locked. Contact the game owner or co-host to unlock it.');
      return false;
    }
    if (!this.authService.currentUser()) {
      this.ui.pendingSquare = event;
      this.ui.showAuthModal.set(true);
      return false;
    }
    if (!this.names.currentPlayer && !this.authService.currentUser()?.isGuest) {
      this.names.openNameEditModal();
      return false;
    }
    if (!this.names.currentPlayer) {
      this.ui.flashAlert('Please enter your name first');
      return false;
    }
    if (this.names.duplicateNameWarning()) {
      this.ui.flashAlert(this.names.duplicateNameWarning()!);
      return false;
    }
    return true;
  }

  /** Gives back one of the player's own squares, rolled back if the save fails. */
  private async releaseSquare(key: string): Promise<void> {
    const state = this.state;
    const previousSquares = { ...state.selectedSquares };
    const newSelectedSquares = { ...state.selectedSquares };
    delete newSelectedSquares[key];
    state.selectedSquares = newSelectedSquares;
    state.calculatePlayerStats();

    try {
      await this.gameService.updateGame(state.gameId, {
        selectedSquares: newSelectedSquares
      });
    } catch {
      // Rollback on failure
      state.selectedSquares = previousSquares;
      state.calculatePlayerStats();
      this.toastService.error('Could not update the square. Try again.');
    }
  }
}
