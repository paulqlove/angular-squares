import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';

import { AuthService } from '../../../core/services/auth.service';
import { CoHostGame, CoHostPlayer, GameCoHostService } from '../../../core/services/game-cohost.service';
import { GameService } from '../../../core/services/game.service';
import { coHostLabel, hasCoHost } from '../../../core/utils/group-cohost';
import { GamePageUiService } from './game-page-ui.service';
import { GameStateService } from './game-state.service';

/**
 * Edit game's Co-host field on the game page, for the owner. Works like the dashboard's, through the shared GameCoHostService.
 * The co-host's email is read only when the owner opens Edit game: only the owner and that person can read it (Paul, Nov 15: "Hide them").
 */
@Injectable()
export class GamePageCoHostService {
  constructor() {
    effect(() => {
      if (!this.ui.showSettings() || !this.state.isGameOwner()) return;
      untracked(() => void this.coHost.email(this.state.gameOwnerId, this.state.gameId).then(email => this.email.set(email)));
    });
  }

  /** The co-host added by email, once read. */
  public readonly email = signal<string>('');
  /** The co-host line: their name, else their email, else Assigned; empty with no co-host. */
  public readonly name = computed<string>(() => {
    const board = { managerId: this.state.managerId() ?? undefined, managerName: this.state.managerName() ?? undefined, managerEmail: this.email() || undefined };
    return hasCoHost(board) ? (coHostLabel(board) || 'Assigned') : '';
  });

  /** Adds the picked group's co-host to a game with none, when Edit game showed it. Called after the group is saved. */
  public async addGroupCoHost(fromGroup: boolean | undefined, groupEmail: string | undefined): Promise<void> {
    if (!fromGroup || !groupEmail || this.name()) return;
    if (await this.coHost.addGroupCoHost(this.game(), groupEmail)) this.setCoHost(null, null, groupEmail);
  }

  public async assign(player: CoHostPlayer): Promise<void> {
    if (await this.coHost.assignPlayer(this.game(), player)) this.setCoHost(player.uid, player.name, '');
  }

  /** The board's players other than the owner. */
  public players(): CoHostPlayer[] {
    return this.coHost.players(this.state.playerUserIds, this.authService.currentUser()?.uid);
  }

  public remove(): Promise<void> {
    return this.replace(null, 'Could not remove the co-host. Try again.');
  }

  /** The group's co-host, by email, replaces this game's own. */
  public useGroup(email: string): Promise<void> {
    return this.replace(email, 'Could not change the co-host. Try again.');
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly coHost: GameCoHostService = inject(GameCoHostService);
  private readonly gameService: GameService = inject(GameService);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly ui: GamePageUiService = inject(GamePageUiService);

  private game(): CoHostGame {
    return { id: this.state.gameId, ownerId: this.state.gameOwnerId, managerId: this.state.managerId() };
  }

  private async replace(email: string | null, failed: string): Promise<void> {
    const game = this.game();
    // Removing a co-host reads the owner's games once, so one who still co-hosts another game keeps their mark.
    const elsewhere = async (uid: string): Promise<boolean> =>
      (await this.gameService.getUserGameRecords(game.ownerId)).some(g => g.id !== game.id && g.managerId === uid);
    if (await this.coHost.replace(game, email, failed, elsewhere)) this.setCoHost(null, null, email ?? '');
  }

  /** Shows the new co-host at once; the board's live update brings the same values. */
  private setCoHost(managerId: string | null, managerName: string | null, email: string): void {
    this.state.managerId.set(managerId);
    this.state.managerName.set(managerName);
    this.email.set(email);
  }
}
