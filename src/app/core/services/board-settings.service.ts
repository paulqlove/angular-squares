import { Injectable, inject } from '@angular/core';
import { get, increment, ref, set, update } from 'firebase/database';
import { AUTO_MANAGE_DELAY_MS, AutoManageSettings } from '../utils/auto-manage';
import { normalizeSport } from '../utils/game-parse';
import { OpenBoardRow, findOpenBoardRows } from '../utils/open-boards';
import { OpenListTarget, fileBoardUpdates, isListKey, listedBoardIds, newListKey } from '../utils/open-lists';
import { AuthService } from './auth.service';
import { EspnService } from './espn.service';
import { GameDatabaseService } from './game-database.service';
import { GameRecordService } from './game-record.service';

/**
 * Host settings on a board (auto-manage, square limit, open boards) and the
 * per-board visitor counters. GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class BoardSettingsService {
  /** Auto-manage is on by default for new boards. A host can switch that off in the profile menu (users/{uid}/autoManageOff). */
  public async getAutoManageDefault(uid: string): Promise<boolean> {
    if (!this.database.isBrowser || !uid) return true;
    try {
      return (await get(ref(this.database.db, `users/${uid}/autoManageOff`))).val() !== true;
    } catch {
      return true;
    }
  }

  /**
   * The other boards in this board's More list (its group, or the host's No group boards).
   * Empty for a board with no list and on any error.
   */
  public async getOpenBoards(board: OpenListTarget): Promise<OpenBoardRow[]> {
    if (!this.database.isBrowser || !board.ownerId || !board.openListId) return [];
    try {
      const snap = await get(ref(this.database.db, `openLists/${board.openListId}`));
      const ids = listedBoardIds(snap.val(), board.ownerId, board.id);
      return await findOpenBoardRows(ids, id => this.records.getGame(id), board.id, board.ownerId);
    } catch {
      return [];
    }
  }

  /** Counts one visitor's first full-board view, Start-your-own click or other-board join per board. Never throws. */
  public async recordBoardStatOnce(boardId: string, field: 'fullBoardViews' | 'fullBoardViewsWithOpenBoards' | 'startYourOwnClicks' | 'otherBoardJoins'): Promise<void> {
    if (!this.database.isBrowser) return;
    const key = `qs_stat_${field}_${boardId}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, '1');
      await update(ref(this.database.db, `boardStats/${boardId}`), { [field]: increment(1) });
    } catch {
      // storage or rules not available: a missed count is fine
    }
  }

  /**
   * The host turns auto-manage on or off. On needs the game's kickoff time (the picker already has it);
   * the server runs the board 5 minutes after it, from autoManageQueue. Off clears everything.
   */
  public async setAutoManage(gameId: string, settings: AutoManageSettings | null, kickoffAt?: number): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    if (!settings || !settings.enabled) {
      await update(ref(this.database.db), {
        [`games/${gameId}/autoManage`]: null,
        [`games/${gameId}/autoManageResult`]: null,
        [`autoManageQueue/${gameId}`]: null
      });
      return;
    }
    let kickoff = kickoffAt;
    if (kickoff === undefined || !Number.isFinite(kickoff)) {
      const game = await this.records.getGame(gameId);
      const linked = game?.espnEventId ? await this.espnService.getGame(game.espnEventId, normalizeSport(game.espnSport)) : null;
      kickoff = linked?.date ? Date.parse(linked.date) : NaN;
    }
    const runAt = (kickoff as number) + AUTO_MANAGE_DELAY_MS;
    if (!Number.isFinite(runAt)) throw new Error('No kickoff time for this game');
    if ((kickoff as number) + 4 * 3_600_000 < Date.now()) throw new Error('This game is already over');
    await update(ref(this.database.db), {
      [`games/${gameId}/autoManage`]: { enabled: true, resize: !!settings.resize, runAt },
      [`games/${gameId}/autoManageResult`]: null,
      [`autoManageQueue/${gameId}`]: runAt
    });
  }

  public async setAutoManageDefault(uid: string, on: boolean): Promise<void> {
    if (!this.database.isBrowser) return;
    await update(ref(this.database.db), { [`users/${uid}/autoManageOff`]: on ? null : true });
  }

  /**
   * The host or co-host turns "Show in my open boards" on or off. A board with no list yet is
   * filed into No group on the way. Returns the board's list.
   */
  public async setShowInOpenBoards(board: OpenListTarget, on: boolean): Promise<string> {
    if (!this.database.isBrowser) throw new Error('Cannot save on server');
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const listId = board.openListId || await this.ungroupedKey(board.ownerId);
    const updates = fileBoardUpdates(board, listId, on);
    await update(ref(this.database.db), updates);
    return listId;
  }

  /** The owner's No group key, made on first use. Only the owner can make it; a co-host only reads it. */
  public async ungroupedKey(ownerId: string): Promise<string> {
    const keyRef = ref(this.database.db, `groupLists/${ownerId}/ungrouped`);
    const existing = (await get(keyRef)).val();
    if (isListKey(existing)) return existing;
    const key = newListKey();
    try {
      await set(keyRef, key);
      return key;
    } catch (error) {
      // Another tab may have made it first: the rule lets it be written only once
      const again = (await get(keyRef)).val();
      if (isListKey(again)) return again;
      throw error;
    }
  }

  /** Sets or clears the most squares one name can claim on a board (Season Pass; the database rule checks the pass). */
  public async setSquareLimit(gameId: string, limit: number | null): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    await update(ref(this.database.db), { [`games/${gameId}/maxSquaresPerPlayer`]: limit === null ? null : limit });
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly espnService: EspnService = inject(EspnService);
  private readonly records: GameRecordService = inject(GameRecordService);
}
