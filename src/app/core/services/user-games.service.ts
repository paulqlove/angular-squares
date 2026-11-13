import { Injectable, inject } from '@angular/core';
import { get, ref, remove, set } from 'firebase/database';
import { GameListItem } from '../utils/game-data';
import { readGameIndexVisits, renamePlayerInGame, sortGameIdsNewestFirst, toGameListItem } from '../utils/game-parse';
import type { RecentVisit } from '../utils/recent-games';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';
import { GameRecordService } from './game-record.service';

/**
 * A user's own index of boards: the ones they host (users/{uid}/games) and the ones
 * they joined (users/{uid}/joinedGames), plus renaming them across those boards.
 * GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class UserGamesService {
  // Add a game to user's joined games list
  public async addJoinedGame(userId: string, gameId: string, gameName: string): Promise<void> {
    if (!this.database.isBrowser || this.authService.previewRole() !== 'actual') return;
    const joinedGameRef = ref(this.database.db, `users/${userId}/joinedGames/${gameId}`);
    const snapshot = await get(joinedGameRef);
    if (snapshot.exists()) return; // Already joined
    await set(joinedGameRef, {
      joinedAt: Date.now(),
      gameName
    });
  }

  // Get games user has joined (not owned)
  public async getJoinedGames(userId: string): Promise<GameListItem[]> {
    if (!this.database.isBrowser) return [];
    const joinedGamesRef = ref(this.database.db, `users/${userId}/joinedGames`);
    const snapshot = await get(joinedGamesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const gameIds = Object.keys(snapshot.val());
    const games: GameListItem[] = [];

    for (const gameId of gameIds) {
      const game = await this.records.getGame(gameId);
      if (game) {
        games.push(toGameListItem(gameId, game, false));
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Get games created by a user
  /** The host's board ids, newest first (same order as the dashboard). */
  public async getUserGameIds(userId: string): Promise<string[]> {
    if (!this.database.isBrowser) return [];
    const snapshot = await get(ref(this.database.db, `users/${userId}/games`));
    if (!snapshot.exists()) return [];
    return sortGameIdsNewestFirst(snapshot.val() as Record<string, { createdAt?: number }>);
  }

  public async getUserGames(userId: string): Promise<GameListItem[]> {
    if (!this.database.isBrowser) return [];
    const userGamesRef = ref(this.database.db, `users/${userId}/games`);
    const snapshot = await get(userGamesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const gameIds = Object.keys(snapshot.val());
    const games: GameListItem[] = [];

    for (const gameId of gameIds) {
      const game = await this.records.getGame(gameId);
      if (!game && this.authService.previewRole() === 'actual') {
        // The host deleted this game: drop the leftover entry from this user's own list.
        void remove(ref(this.database.db, `users/${userId}/joinedGames/${gameId}`)).catch(() => {});
      }
      if (game) {
        games.push(toGameListItem(gameId, game, true));
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  /** Games this user hosts or joined, each with when it was created or joined, for the Your Games menu. Reads only the user's own index, not the games. */
  public async getYourGameIndex(userId: string): Promise<RecentVisit[]> {
    if (!this.database.isBrowser) return [];
    const [owned, joined] = await Promise.all([
      get(ref(this.database.db, `users/${userId}/games`)),
      get(ref(this.database.db, `users/${userId}/joinedGames`))
    ]);
    return [...readGameIndexVisits(owned.val(), 'createdAt'), ...readGameIndexVisits(joined.val(), 'joinedAt')];
  }

  // Propagate a player name change across all games the user participates in
  public async propagateNameChange(userId: string, oldName: string, newName: string): Promise<void> {
    if (!this.database.isBrowser || !oldName || oldName === newName) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');

    const [owned, joined] = await Promise.all([
      this.getUserGames(userId),
      this.getJoinedGames(userId)
    ]);
    const allGames = [...owned, ...joined];

    for (const gameListing of allGames) {
      const game = await this.records.getGame(gameListing.id);
      if (!game) continue;

      const changes = renamePlayerInGame(game, oldName, newName);
      if (!changes) continue;

      await this.records.updateGame(gameListing.id, changes);
    }
  }

  // Remove a game from user's joined games list
  public async removeJoinedGame(userId: string, gameId: string): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const joinedGameRef = ref(this.database.db, `users/${userId}/joinedGames/${gameId}`);
    await remove(joinedGameRef);
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly records: GameRecordService = inject(GameRecordService);
}
