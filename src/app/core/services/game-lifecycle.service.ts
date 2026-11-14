import { Injectable, inject } from '@angular/core';
import { get, increment, ref, remove, set, update } from 'firebase/database';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit } from '../plans';
import { BoardSize, GameData, SportType, getBoardDimensions } from '../utils/game-data';
import { generateGameId, isLinkableEspnId } from '../utils/game-parse';
import { shuffleSquares, smallerBoardSizes } from '../utils/shuffle-squares';
import { AuthService } from './auth.service';
import { EntitlementService } from './entitlement.service';
import { GameDatabaseService } from './game-database.service';
import { GameRecordService } from './game-record.service';
import { LiveGameIndexService } from './live-game-index.service';

/**
 * A board's life: create, reset, resize, hand to a manager, and delete,
 * with the host's usage counters. GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class GameLifecycleService {
  // Create a new game
  public async createGame(
    ownerId: string,
    ownerName: string,
    gameName?: string,
    espnEventId?: string,
    homeTeam?: string,
    awayTeam?: string,
    pricePerSquare?: number,
    espnSport?: SportType,
    managerEmail?: string,
    hostNote?: string,
    boardSize?: BoardSize,
    quarterSplit?: QuarterSplit | null,
    emptyQuarterRule?: EmptyQuarterRule
  ): Promise<string> {
    if (!this.database.isBrowser) throw new Error('Cannot create game on server');
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    await this.entitlements.assertUnderFreeBoardLimit(ownerId);
    // Drop a stale slot only after the read-only check says nothing is active.
    // Existing game nodes are not modified.
    await remove(ref(this.database.db, `users/${ownerId}/activeBoardId`));
    const gameId = generateGameId();

    const size: BoardSize = boardSize || 100;
    const { rows, cols } = getBoardDimensions(size);

    const defaultGameData: GameData = {
      id: gameId,
      name: gameName || 'Football Squares',
      ownerId: ownerId,
      ownerName: ownerName,
      createdAt: Date.now(),
      boardSize: size,
      selectedSquares: {},
      homeNumbers: Array(cols).fill(null),
      awayNumbers: Array(rows).fill(null),
      scores: {
        q1: { home: 0, away: 0 },
        q2: { home: 0, away: 0 },
        q3: { home: 0, away: 0 },
        q4: { home: 0, away: 0 }
      },
      playerColors: {},
      winners: {},
      isLocked: false,
      pricePerSquare: pricePerSquare ?? 10,
      isRandomized: false,
      homeTeam: homeTeam || '',
      awayTeam: awayTeam || '',
      hostNote: hostNote || '',
      paidPlayers: [],
      adFreeUntil: await this.entitlements.adFreeUntilFor(ownerId),
      quarterSplit: quarterSplit || null,
      emptyQuarterRule: emptyQuarterRule || DEFAULT_EMPTY_QUARTER_RULE,
      ...(espnEventId ? { espnEventId } : {}),
      ...(espnSport ? { espnSport } : {}),
      ...(managerEmail ? { managerEmail } : {})
    };

    const gameRef = ref(this.database.db, `games/${gameId}`);
    await set(gameRef, defaultGameData);

    // Also add to user's games list
    const userGameRef = ref(this.database.db, `users/${ownerId}/games/${gameId}`);
    await set(userGameRef, {
      createdAt: defaultGameData.createdAt,
      name: defaultGameData.name
    });

    if (espnEventId) {
      // The board already exists. A failed index write is repaired when the
      // owner next opens the dashboard or the game.
      await this.liveGameIndex.ensureLiveGameIndex(gameId, espnEventId, espnSport || 'nfl').catch(() => {});
    }

    try {
      await set(ref(this.database.db, `users/${ownerId}/activeBoardId`), gameId);
    } catch (error) {
      // The board exists. The client-side count still enforces the limit.
      console.warn('[GameService] Active board slot was not saved', error);
    }

    await this.bumpUsage(ownerId, 'gamesCreated');

    return gameId;
  }

  // Delete a game and its live-score index entry.
  public async deleteGame(gameId: string, ownerId: string): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const espnSnap = await get(ref(this.database.db, `games/${gameId}/espnEventId`));
    const updates: Record<string, unknown> = {
      [`games/${gameId}`]: null,
      [`users/${ownerId}/games/${gameId}`]: null,
      [`openBoards/${ownerId}/${gameId}`]: null,
    };
    const espnId = espnSnap.exists() ? espnSnap.val() : null;
    if (typeof espnId === 'string' && isLinkableEspnId(espnId)) {
      updates[`liveGames/${espnId}/${gameId}`] = null;
    }
    await update(ref(this.database.db), updates);
    await this.bumpUsage(ownerId, 'deletes');
  }

  /** Clears a board for reuse (same as the Clear game button in the game settings). Keeps name, owner and any linked game. */
  public async resetGame(gameId: string, boardSize: BoardSize): Promise<void> {
    const { rows, cols } = getBoardDimensions(boardSize);
    await this.records.updateGame(gameId, {
      selectedSquares: {},
      homeNumbers: Array(cols).fill(null),
      awayNumbers: Array(rows).fill(null),
      scores: { q1: { home: 0, away: 0 }, q2: { home: 0, away: 0 }, q3: { home: 0, away: 0 }, q4: { home: 0, away: 0 } },
      winners: {},
      playerColors: {},
      playerUserIds: {},
      isRandomized: false,
      isLocked: false,
      paidPlayers: [],
      paidSquares: {}
    });
    const current = this.records.currentGameValue();
    const ownerId = current?.id === gameId ? current.ownerId : this.authService.currentUser()?.uid;
    if (ownerId) await this.bumpUsage(ownerId, 'resets');
  }

  /** Converts a board to a smaller size. Picks are shuffled into random empty cells; each player keeps their count. */
  public async resizeBoard(gameId: string, target: BoardSize): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const game = await this.records.getGame(gameId);
    if (!game || !this.smallerSizesFor(game.boardSize ?? 100, Object.keys(game.selectedSquares).length, game.isRandomized).includes(target)) {
      throw new Error('This board cannot be converted');
    }
    const { rows, cols } = getBoardDimensions(target);
    const squares = shuffleSquares(game.selectedSquares, rows, cols);
    if (!squares) throw new Error('Squares do not fit');
    const prefix = `games/${gameId}`;
    await update(ref(this.database.db), {
      [`${prefix}/boardSize`]: target,
      [`${prefix}/squares`]: Object.keys(squares).length ? squares : null,
      [`${prefix}/homeNumbers`]: Array(cols).fill(null),
      [`${prefix}/awayNumbers`]: Array(rows).fill(null)
    });
  }

  /** Smaller board sizes this board can convert to: the picks must fit and the numbers must not be drawn yet. */
  public smallerSizesFor(boardSize: BoardSize, squaresFilled: number, isRandomized: boolean): BoardSize[] {
    return smallerBoardSizes(boardSize, squaresFilled, isRandomized);
  }

  // Update game manager
  public async updateGameManager(gameId: string, managerId: string | null, managerEmail: string | null, managerName: string | null = null): Promise<void> {
    if (!this.database.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    await update(ref(this.database.db), {
      [`games/${gameId}/managerId`]: managerId || '',
      [`games/${gameId}/managerEmail`]: managerEmail || '',
      [`games/${gameId}/managerName`]: managerName || ''
    });
  }

  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private readonly entitlements: EntitlementService = inject(EntitlementService);
  private readonly liveGameIndex: LiveGameIndexService = inject(LiveGameIndexService);
  private readonly records: GameRecordService = inject(GameRecordService);

  // Lifetime counters per host, read in the console to see who reuses or churns boards.
  // Best effort: a failed write never blocks the create, reset or delete.
  private async bumpUsage(uid: string, key: 'gamesCreated' | 'resets' | 'deletes'): Promise<void> {
    try {
      const updates: Record<string, unknown> = { [`users/${uid}/usage/${key}`]: increment(1) };
      if (key === 'gamesCreated') updates[`users/${uid}/usage/lastGameAt`] = Date.now();
      await update(ref(this.database.db), updates);
    } catch (error) {
      console.warn('[GameService] Usage counter not saved', error);
    }
  }
}
