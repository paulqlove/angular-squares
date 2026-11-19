import { Injectable, inject } from '@angular/core';
import { get, ref } from 'firebase/database';

import { GameDatabaseService } from './game-database.service';
import { GameGroupsService } from './game-groups.service';
import { GameService } from './game.service';
import { ToastService } from './toast.service';

/** A player on the board who can be made co-host. */
export interface CoHostPlayer {
  name: string;
  uid: string;
}

/** A game as Edit game's Co-host field needs it. */
export interface CoHostGame {
  id: string;
  ownerId: string;
  /** The current co-host picked from players, if any. */
  managerId?: string | null;
}

/**
 * Edit game's Co-host field, shared by the dashboard and the game page: pick a player, add the group's co-host by email,
 * or remove the co-host. Each caller updates its own view of the game when a save returns true.
 */
@Injectable({ providedIn: 'root' })
export class GameCoHostService {
  /** Adds the group's co-host, by email, to a game that has none (K4). Best effort: false, after a warning, when it failed. */
  public async addGroupCoHost(game: CoHostGame, email: string): Promise<boolean> {
    try {
      await this.gameService.updateGameManager(game.id, game.ownerId, { managerEmail: email });
      return true;
    } catch {
      this.toastService.warning('Saved, but the group\'s co-host could not be added. Try again in a moment.');
      return false;
    }
  }

  /** Makes one of the board's players its co-host and marks them, so they can read the owner's group names. False, after a toast, when it failed. */
  public async assignPlayer(game: CoHostGame, player: CoHostPlayer): Promise<boolean> {
    try {
      await this.gameService.updateGameManager(game.id, game.ownerId, { managerId: player.uid, managerName: player.name });
      this.gameGroups.setCoHost(game.ownerId, player.uid, true).catch(() => undefined);
      return true;
    } catch {
      this.toastService.error('Could not assign the co-host. Try again.');
      return false;
    }
  }

  /** The co-host added by email. Only the owner and that person can read it (Paul, Nov 15: "Hide them"). Empty when none or unreadable. */
  public async email(ownerId: string, gameId: string): Promise<string> {
    if (!this.database.isBrowser) return '';
    try {
      const value = (await get(ref(this.database.db, `gameCoHosts/${ownerId}/${gameId}`))).val();
      return typeof value === 'string' ? value : '';
    } catch {
      return '';
    }
  }

  /** The board's players other than the signed-in host: who can be made co-host. */
  public players(playerUserIds: Record<string, string> | undefined, currentUid: string | undefined): CoHostPlayer[] {
    return Object.entries(playerUserIds ?? {})
      .filter(([, uid]) => uid !== currentUid)
      .map(([name, uid]) => ({ name, uid }));
  }

  /**
   * Replaces the game's co-host with one known only by email, or with none (null). The old player co-host is unmarked
   * unless `coHostsElsewhere` says they still co-host another of the owner's games. False, after a toast, when it failed.
   */
  public async replace(game: CoHostGame, email: string | null, failed: string, coHostsElsewhere: (uid: string) => boolean | Promise<boolean>): Promise<boolean> {
    try {
      await this.gameService.updateGameManager(game.id, game.ownerId, { managerEmail: email });
    } catch {
      this.toastService.error(failed);
      return false;
    }
    const oldUid = game.managerId;
    if (oldUid) {
      // Best effort: the co-host list only lets a co-host read group names.
      void Promise.resolve(coHostsElsewhere(oldUid))
        .then(still => still ? undefined : this.gameGroups.setCoHost(game.ownerId, oldUid, false))
        .catch(() => undefined);
    }
    return true;
  }

  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly gameGroups: GameGroupsService = inject(GameGroupsService);
  private readonly gameService: GameService = inject(GameService);
  private readonly toastService: ToastService = inject(ToastService);
}
