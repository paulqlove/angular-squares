import { Injectable, inject } from '@angular/core';
import { get, ref, update } from 'firebase/database';
import { SportType } from '../utils/game-data';
import { isBoardId, isLinkableEspnId } from '../utils/game-parse';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';

/**
 * Keeps liveGames/{espnId}/{boardId} in sync so the scheduled function
 * can find linked boards without scanning every game.
 */
@Injectable({
  providedIn: 'root'
})
export class LiveGameIndexService {
  public async ensureLiveGameIndex(gameId: string, espnEventId: string, espnSport: SportType = 'nfl'): Promise<void> {
    await this.ensureLiveGameIndexes([{ gameId, espnEventId, espnSport }]);
  }

  public async ensureLiveGameIndexes(entries: { gameId: string; espnEventId: string; espnSport?: SportType | null }[]): Promise<void> {
    if (!this.database.isBrowser || entries.length === 0 || this.authService.previewRole() !== 'actual') return;
    const updates: Record<string, { sport: SportType }> = {};
    for (const entry of entries) {
      if (!isLinkableEspnId(entry.espnEventId) || !isBoardId(entry.gameId)) continue;
      updates[`liveGames/${entry.espnEventId}/${entry.gameId}`] = { sport: entry.espnSport || 'nfl' };
    }
    if (Object.keys(updates).length === 0) return;
    await update(ref(this.database.db), updates);
  }

  /** Index writes for relinking a board: drop the old event's entry, add the new one. Merged into the board's own update. */
  public async liveIndexUpdates(gameId: string, nextId: string | null, sport: SportType): Promise<Record<string, unknown>> {
    const currentSnap = await get(ref(this.database.db, `games/${gameId}/espnEventId`));
    const currentId = currentSnap.exists() && typeof currentSnap.val() === 'string' ? currentSnap.val() as string : null;
    const updates: Record<string, unknown> = {};
    if (currentId && currentId !== nextId && isLinkableEspnId(currentId)) {
      updates[`liveGames/${currentId}/${gameId}`] = null;
    }
    if (nextId) {
      updates[`liveGames/${nextId}/${gameId}`] = { sport };
    }
    return updates;
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
}
