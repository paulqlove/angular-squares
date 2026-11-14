import { Injectable, inject } from '@angular/core';
import { get, increment, ref, update } from 'firebase/database';
import { AUTO_MANAGE_DELAY_MS, AutoManageSettings } from '../utils/auto-manage';
import { normalizeSport } from '../utils/game-parse';
import { OpenBoardRow, openBoardRows } from '../utils/open-boards';
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

  /** The same host's other boards a player on a full board can join. Empty on any error. */
  public async getOpenBoards(ownerId: string, excludeId: string): Promise<OpenBoardRow[]> {
    if (!this.database.isBrowser || !ownerId) return [];
    try {
      const snap = await get(ref(this.database.db, `openBoards/${ownerId}`));
      const ids = Object.keys(snap.val() || {}).filter(id => id !== excludeId).slice(0, 10);
      return openBoardRows(await Promise.all(ids.map(id => this.records.getGame(id))), excludeId);
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

  /** The host turns "Show in my open boards" on or off for one board. */
  public async setShowInOpenBoards(gameId: string, ownerId: string, on: boolean): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    await update(ref(this.database.db), {
      [`games/${gameId}/showInOpenBoards`]: on ? true : null,
      [`openBoards/${ownerId}/${gameId}`]: on ? true : null
    });
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
