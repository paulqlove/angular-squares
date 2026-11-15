import { Injectable, inject } from '@angular/core';
import { ref, update } from 'firebase/database';
import { CoHostInviteGame, isCoHostInvite } from '../utils/cohost-claim';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';
import { ToastService } from './toast.service';
import { UserGamesService } from './user-games.service';

/**
 * Turns an email co-host into a real one (see utils/cohost-claim.ts): when they open the game signed in with that
 * email, their uid goes in `managerId`. In the same write they mark themselves as the owner's co-host through this
 * game, so they can read the owner's group names as a picked co-host can. The game then joins their dashboard list.
 */
@Injectable({
  providedIn: 'root'
})
export class CoHostClaimService {
  /** Claims the co-host role on this game when the viewer is its email co-host. Tries once per game per visit. */
  public async claimIfInvited(gameId: string, game: CoHostInviteGame & { name?: string }): Promise<void> {
    const user = this.auth.currentUser();
    if (!this.database.isBrowser || this.auth.previewRole() !== 'actual') return;
    if (!user || !isCoHostInvite(game, user) || this.tried.has(gameId)) return;
    this.tried.add(gameId);
    const role = { [`games/${gameId}/managerId`]: user.uid };
    const mark = game.ownerId ? { [`coHosts/${game.ownerId}/${user.uid}`]: gameId } : {};
    // The rules never let the mark replace one the owner wrote (they were picked on another game): then the role goes alone.
    const saved = await this.patch({ ...role, ...mark }).then(() => true, () => this.patch(role).then(() => true, () => false));
    if (!saved) {
      this.toast.warning('Your co-host tools didn\'t turn on for this game. Reload to try again.');
      return;
    }
    // An extra: the role is saved either way, and an earlier join is kept as it is.
    await this.userGames.addJoinedGame(user.uid, gameId, game.name || 'Football Squares').catch(() => undefined);
  }

  /** The one database call, kept apart so the tests can stand in for the database. */
  protected patch(updates: Record<string, unknown>): Promise<void> {
    return update(ref(this.database.db), updates);
  }

  private readonly auth: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly toast: ToastService = inject(ToastService);
  /** Games already tried this visit, so a refused claim isn't retried on every board update. */
  private readonly tried: Set<string> = new Set();
  private readonly userGames: UserGamesService = inject(UserGamesService);
}
