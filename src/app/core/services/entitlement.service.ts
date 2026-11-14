import { Injectable, inject } from '@angular/core';
import { get, push, ref, set } from 'firebase/database';
import { ActiveBoardLimitError } from '../errors/active-board-limit.error';
import { Entitlement, PLANS, isActive } from '../plans';
import {
  BoardActivity,
  FREE_ACTIVE_BOARD_LIMIT,
  NOTIFY_EMAIL_MAX_LENGTH,
  NOTIFY_EMAIL_PATTERN,
  NOTIFY_SOURCE_MAX_LENGTH,
  hasLinkedGame,
  isBoardActive
} from '../utils/board-activity';
import { normalizeSport } from '../utils/game-parse';
import { AuthService } from './auth.service';
import { EspnService } from './espn.service';
import { GameDatabaseService } from './game-database.service';
import { RolePreviewService } from './role-preview.service';
import { SeasonPassService } from './season-pass.service';

/**
 * Plans and board limits: admin status, paid and gifted passes, the active-board cap,
 * ad-free stamps, and the upgrade fake-door counters. GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class EntitlementService {
  /** Boards this host has active right now (counted against their plan). */
  public async activeBoardCount(ownerId: string): Promise<number> {
    const now = Date.now();
    return (await this.loadOwnedBoardActivity(ownerId)).filter(board => isBoardActive(board, now)).length;
  }

  /** How long a new or opened board stays ad-free for this host (0 = ads). Rules cap it at the real pass. */
  public async adFreeUntilFor(uid: string): Promise<number> {
    if (await this.isAdmin(uid)) return Date.now() + 3650 * 86_400_000;
    return (await this.bestEntitlement(uid))?.expiresAt ?? 0;
  }

  /**
   * Read-only check used by the dashboard and by createGame.
   * Does not write, delete, or rewrite any existing board.
   */
  public async assertUnderFreeBoardLimit(ownerId: string): Promise<void> {
    if (!this.database.isBrowser) {
      throw new Error('Cannot check boards on server');
    }
    const limit = await this.boardLimit(ownerId);
    if (limit === Number.POSITIVE_INFINITY) return;
    if ((await this.activeBoardCount(ownerId)) >= limit) {
      throw new ActiveBoardLimitError();
    }
  }

  /** Write-only notifyMe/{pushId} entry. Callers must already be signed in. */
  public async createNotifyMe(
    email: string,
    uid: string,
    source: string,
    extra?: { prefilled: boolean; trigger: 'limit' | 'pass' }
  ): Promise<void> {
    if (!this.database.isBrowser) {
      throw new Error('Cannot save notification on server');
    }
    const trimmed = email.trim();
    if (
      trimmed.length === 0 ||
      trimmed.length > NOTIFY_EMAIL_MAX_LENGTH ||
      !NOTIFY_EMAIL_PATTERN.test(trimmed)
    ) {
      throw new Error('Invalid email');
    }
    if (!uid || uid.length > 128) {
      throw new Error('Invalid uid');
    }
    if (!source || source.length > NOTIFY_SOURCE_MAX_LENGTH) {
      throw new Error('Invalid source');
    }

    const entryRef = push(ref(this.database.db, 'notifyMe'));
    await set(entryRef, {
      email: trimmed,
      timestamp: Date.now(),
      uid,
      source,
      ...(extra ?? {})
    });
  }

  /** entitlements/{uid}: the host's paid plan, or null. Readable only by its owner and admins. */
  public async getEntitlement(uid: string): Promise<Entitlement | null> {
    if (!this.database.isBrowser) return null;
    try {
      return ((await get(ref(this.database.db, `entitlements/${uid}`))).val() as Entitlement | null) ?? null;
    } catch {
      return null;
    }
  }

  /** Admins (set by hand at admins/{uid} in the console) have no board limit. */
  public async isAdmin(uid: string): Promise<boolean> {
    try {
      return (await get(ref(this.database.db, `admins/${uid}`))).val() === true;
    } catch {
      return false;
    }
  }

  /** Counts the host's upgrade-dialog views for the fake-door read. Own record only; failures are ignored. */
  public async recordUpgradeView(uid: string, trigger: 'limit' | 'pass'): Promise<void> {
    if (!this.database.isBrowser || !uid || uid.length > 128) return;
    try {
      const entryRef = ref(this.database.db, `upgradeViews/${uid}`);
      const now = Date.now();
      const prev = (await get(entryRef)).val() as { firstAt?: number; count?: number; limitCount?: number } | null;
      await set(entryRef, {
        firstAt: prev?.firstAt ?? now,
        lastAt: now,
        count: (prev?.count ?? 0) + 1,
        limitCount: (prev?.limitCount ?? 0) + (trigger === 'limit' ? 1 : 0)
      });
    } catch {
      // Counting must never get in the way of the dialog.
    }
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly espnService: EspnService = inject(EspnService);
  private readonly rolePreview: RolePreviewService = inject(RolePreviewService);
  private readonly seasonPass: SeasonPassService = inject(SeasonPassService);

  /** The host's active pass, paid or gifted (whichever lasts longer), or null. */
  private async bestEntitlement(uid: string): Promise<Entitlement | null> {
    const email = this.authService.realUser()?.email;
    const [paid, gifted] = await Promise.all([this.getEntitlement(uid), email ? this.seasonPass.getGiftedSeasonPass(email) : null]);
    return [paid, gifted].filter(e => isActive(e)).sort((a, b) => b!.expiresAt - a!.expiresAt)[0] ?? null;
  }

  /** Active boards allowed for this host: admin unlimited, else the active plan's limit, else Free. */
  private async boardLimit(uid: string): Promise<number> {
    if (await this.isAdmin(uid)) {
      // The admin can preview a plan's limits from the View-as switcher.
      const preview = this.rolePreview.plan();
      return preview === 'actual' ? PLANS.admin.activeBoards : PLANS[preview].activeBoards;
    }
    const entitlement = await this.bestEntitlement(uid);
    return entitlement ? PLANS.season.activeBoards : FREE_ACTIVE_BOARD_LIMIT;
  }

  private async loadOwnedBoardActivity(ownerId: string): Promise<BoardActivity[]> {
    const userGamesRef = ref(this.database.db, `users/${ownerId}/games`);
    const snapshot = await get(userGamesRef);
    if (!snapshot.exists()) {
      return [];
    }

    const gameIds = Object.keys(snapshot.val());
    const boards = await Promise.all(gameIds.map(async (gameId) => {
      const gameSnap = await get(ref(this.database.db, `games/${gameId}`));
      if (!gameSnap.exists()) {
        return null;
      }
      const raw = gameSnap.val() || {};
      const espnEventId = typeof raw.espnEventId === 'string' ? raw.espnEventId : null;
      const linkedGameFinal = hasLinkedGame(espnEventId)
        ? await this.espnService.isEventFinal(espnEventId as string, normalizeSport(raw.espnSport))
        : null;
      const board: BoardActivity = {
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : null,
        espnEventId,
        linkedGameFinal
      };
      return board;
    }));

    return boards.filter((board): board is BoardActivity => board !== null);
  }
}
