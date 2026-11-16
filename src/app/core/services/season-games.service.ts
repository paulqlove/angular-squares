import { Injectable, inject, signal } from '@angular/core';
import { get, ref, set } from 'firebase/database';
import { toSeasonGame } from '../utils/game-parse';
import { SEASON_LIMIT_ON, SeasonGame, gamesUsed, seasonGamePath, seasonOf } from '../utils/season-games';
import { GameDatabaseService } from './game-database.service';

/**
 * A free host's games this season. Each game with players is saved at seasonGames/{ownerId}/{season}/{key}
 * before its board is deleted or reset, and the rules never let the owner remove it, so deleting doesn't free a slot.
 */
@Injectable({
  providedIn: 'root'
})
export class SeasonGamesService {
  /** Games the signed-in host has used this season, once read. Null until then or while the switch is off. */
  public readonly used = signal<number | null>(null);

  /**
   * Saves the board's current game toward its owner's season if it has players. Call it before the board is deleted or reset.
   * Does nothing for an empty game, or while the switch is off. A failed save throws, so the delete or reset doesn't go ahead.
   */
  public async recordBoard(gameId: string): Promise<void> {
    if (!SEASON_LIMIT_ON) return;
    const raw = (await get(ref(this.database.db, `games/${gameId}`))).val();
    const path = typeof raw?.ownerId === 'string' ? seasonGamePath(raw.ownerId, toSeasonGame(gameId, raw)) : null;
    if (path) await set(ref(this.database.db, path), true);
  }

  /** Games used this season: the saved ones plus the host's boards that have players now. Also updates `used`. */
  public async usedThisSeason(ownerId: string, boards: readonly SeasonGame[]): Promise<number> {
    const now = Date.now();
    const snapshot = await get(ref(this.database.db, `seasonGames/${ownerId}/${seasonOf(now)}`));
    const count = gamesUsed(Object.keys(snapshot.val() ?? {}), boards, now);
    this.used.set(count);
    return count;
  }

  private readonly database: GameDatabaseService = inject(GameDatabaseService);
}
