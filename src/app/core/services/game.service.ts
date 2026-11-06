import { Injectable, signal, inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { initializeApp, getApps } from 'firebase/app';
import {
  Database,
  getDatabase,
  ref,
  onValue,
  set,
  update,
  push,
  get,
  remove
} from 'firebase/database';
import { Observable, BehaviorSubject } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ActiveBoardLimitError } from '../errors/active-board-limit.error';
import { EspnService } from './espn.service';
import { PREVIEW_GAME_ID, RolePreviewService } from './role-preview.service';
import { DEFAULT_EMPTY_QUARTER_RULE, Entitlement, EmptyQuarterRule, PLANS, QuarterSplit, isActive, isEmptyQuarterRule } from '../plans';
import { AuthService } from './auth.service';
import {
  BoardActivity,
  FREE_ACTIVE_BOARD_LIMIT,
  NOTIFY_EMAIL_MAX_LENGTH,
  NOTIFY_EMAIL_PATTERN,
  NOTIFY_SOURCE_MAX_LENGTH,
  hasLinkedGame,
  isBoardActive
} from '../utils/board-activity';

export type SportType = 'nfl' | 'nba' | 'ncaaf' | 'wnba' | 'afl';

/** Board size: 100 (10x10), 50 (5x10), or 25 (5x5) squares. */
export type BoardSize = 100 | 50 | 25;

/** Get dimensions for a board size: { rows, cols } */
export function getBoardDimensions(size: BoardSize): { rows: number; cols: number } {
  switch (size) {
    case 25: return { rows: 5, cols: 5 };
    case 50: return { rows: 5, cols: 10 };
    default: return { rows: 10, cols: 10 };
  }
}

export interface EspnLiveSnapshot {
  status: 'pre' | 'in' | 'post';
  period: number;
  clock: string;
  completed: boolean;
  homeScore: number;
  awayScore: number;
  homeTeam: string;
  awayTeam: string;
  quarters: { home: number; away: number }[];
}

export interface GameData {
  id?: string;
  name: string;
  ownerId: string;
  ownerName: string;
  createdAt: number;
  /** Board size: 100 (10x10), 50 (5x10), or 25 (5x5). Defaults to 100. */
  boardSize?: BoardSize;
  selectedSquares: { [key: string]: string };
  homeNumbers: (number | null)[];
  awayNumbers: (number | null)[];
  scores: {
    q1: { home: number; away: number };
    q2: { home: number; away: number };
    q3: { home: number; away: number };
    q4: { home: number; away: number };
  };
  pricePerSquare: number;
  isRandomized: boolean;
  isLocked: boolean;
  homeTeam: string;
  awayTeam: string;
  winners?: { [key: string]: string };
  playerColors?: { [key: string]: string };
  hostNote?: string;
  paidPlayers?: string[];
  espnEventId?: string | null;
  espnSport?: SportType | null;
  espnLive?: EspnLiveSnapshot;
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  playerUserIds?: { [name: string]: string };
  /** Host's plan stamp: no ads on this board until this time (ms). */
  adFreeUntil?: number;
  /** Custom per-quarter split in tenths of a percent (paid plans). */
  quarterSplit?: QuarterSplit | null;
  /** What an unclaimed winning square does to that quarter's points. Missing means the default. */
  emptyQuarterRule?: EmptyQuarterRule;
}

export interface GameListItem {
  id: string;
  name: string;
  ownerName: string;
  homeTeam: string;
  awayTeam: string;
  createdAt: number;
  playerCount: number;
  squaresFilled: number;
  isLocked: boolean;
  pricePerSquare: number;
  /** Board size: 100 (10x10), 50 (5x10), or 25 (5x5). Defaults to 100. */
  boardSize: BoardSize;
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  espnEventId?: string;
  espnSport?: SportType;
  hostNote?: string;
  emptyQuarterRule?: EmptyQuarterRule;
  confirmedCount: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private platformId = inject(PLATFORM_ID);
  private espnService = inject(EspnService);
  private authService = inject(AuthService);
  private rolePreview = inject(RolePreviewService);
  // Lazy init required for SSR hydration - see CLAUDE.md "SSR Hydration Pattern"
  private _db: Database | null = null;
  private currentGameId = signal<string | null>(null);
  private _currentGame = new BehaviorSubject<GameData | null>(null);
  private gameSubscription: (() => void) | null = null;

  currentGame$ = this._currentGame.asObservable();

  private get isBrowser(): boolean {
    return isPlatformBrowser(this.platformId);
  }

  private get db(): Database {
    if (!this._db && this.isBrowser) {
      let app;
      if (getApps().length === 0) {
        app = initializeApp(environment.firebase);
      } else {
        app = getApps()[0];
      }
      this._db = getDatabase(app, environment.firebase.databaseURL);
    }
    if (!this._db) {
      throw new Error('[GameService] Database not available - not in browser context');
    }
    return this._db;
  }

  constructor() {}

  private async loadOwnedBoardActivity(ownerId: string): Promise<BoardActivity[]> {
    const userGamesRef = ref(this.db, `users/${ownerId}/games`);
    const snapshot = await get(userGamesRef);
    if (!snapshot.exists()) {
      return [];
    }

    const gameIds = Object.keys(snapshot.val());
    const boards = await Promise.all(gameIds.map(async (gameId) => {
      const gameSnap = await get(ref(this.db, `games/${gameId}`));
      if (!gameSnap.exists()) {
        return null;
      }
      const raw = gameSnap.val() || {};
      const espnEventId = typeof raw.espnEventId === 'string' ? raw.espnEventId : null;
      const linkedGameFinal = hasLinkedGame(espnEventId)
        ? await this.espnService.isEventFinal(espnEventId as string, this.normalizeSport(raw.espnSport))
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

  private normalizeSport(value: unknown): SportType {
    if (value === 'nfl' || value === 'nba' || value === 'ncaaf' || value === 'wnba' || value === 'afl') {
      return value;
    }
    return 'nfl';
  }

  // Generate a short, shareable game ID
  private generateGameId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Read-only check used by the dashboard and by createGame.
   * Does not write, delete, or rewrite any existing board.
   */
  async assertUnderFreeBoardLimit(ownerId: string): Promise<void> {
    if (!this.isBrowser) {
      throw new Error('Cannot check boards on server');
    }
    // The View-as stand-in has no real account to read, so it only counts the boards it "created" this session.
    const previewRole = this.authService.previewRole();
    if (previewRole === 'player' || previewRole === 'guest') {
      const plan = this.rolePreview.plan();
      const limit = plan === 'actual' ? FREE_ACTIVE_BOARD_LIMIT : PLANS[plan].activeBoards;
      if (this.rolePreview.simulatedBoards() >= limit) throw new ActiveBoardLimitError();
      return;
    }
    const limit = await this.boardLimit(ownerId);
    if (limit === Number.POSITIVE_INFINITY) return;
    if ((await this.activeBoardCount(ownerId)) >= limit) {
      throw new ActiveBoardLimitError();
    }
  }

  /** Boards this host has active right now (counted against their plan). */
  async activeBoardCount(ownerId: string): Promise<number> {
    const now = Date.now();
    return (await this.loadOwnedBoardActivity(ownerId)).filter(board => isBoardActive(board, now)).length;
  }

  /** Admins (set by hand at admins/{uid} in the console) have no board limit. */
  async isAdmin(uid: string): Promise<boolean> {
    try {
      return (await get(ref(this.db, `admins/${uid}`))).val() === true;
    } catch {
      return false;
    }
  }

  /** entitlements/{uid}: the host's paid plan, or null. Readable only by its owner and admins. */
  async getEntitlement(uid: string): Promise<Entitlement | null> {
    if (!this.isBrowser) return null;
    try {
      return ((await get(ref(this.db, `entitlements/${uid}`))).val() as Entitlement | null) ?? null;
    } catch {
      return null;
    }
  }

  /** Active boards allowed for this host: admin unlimited, else the active plan's limit, else Free. */
  private async boardLimit(uid: string): Promise<number> {
    if (await this.isAdmin(uid)) {
      // The admin can preview a plan's limits from the View-as switcher.
      const preview = this.rolePreview.plan();
      return preview === 'actual' ? PLANS.admin.activeBoards : PLANS[preview].activeBoards;
    }
    const entitlement = await this.bestEntitlement(uid);
    return entitlement ? PLANS[entitlement.plan].activeBoards : FREE_ACTIVE_BOARD_LIMIT;
  }

  /** The host's active pass, paid or gifted (whichever lasts longer), or null. */
  private async bestEntitlement(uid: string): Promise<Entitlement | null> {
    const email = this.authService.realUser()?.email;
    const [paid, gifted] = await Promise.all([this.getEntitlement(uid), email ? this.getGiftedSeasonPass(email) : null]);
    return [paid, gifted].filter(e => isActive(e)).sort((a, b) => b!.expiresAt - a!.expiresAt)[0] ?? null;
  }

  /** How long a new or opened board stays ad-free for this host (0 = ads). Rules cap it at the real pass. */
  async adFreeUntilFor(uid: string): Promise<number> {
    if (await this.isAdmin(uid)) return Date.now() + 3650 * 86_400_000;
    return (await this.bestEntitlement(uid))?.expiresAt ?? 0;
  }

  /** Counts the host's upgrade-dialog views for the fake-door read. Own record only; failures are ignored. */
  async recordUpgradeView(uid: string): Promise<void> {
    if (!this.isBrowser || !uid || uid.length > 128) return;
    try {
      const entryRef = ref(this.db, `upgradeViews/${uid}`);
      const now = Date.now();
      const prev = (await get(entryRef)).val() as { firstAt?: number; count?: number } | null;
      await set(entryRef, { firstAt: prev?.firstAt ?? now, lastAt: now, count: (prev?.count ?? 0) + 1 });
    } catch {
      // Counting must never get in the way of the dialog.
    }
  }

  /** Write-only notifyMe/{pushId} entry. Callers must already be signed in. */
  async createNotifyMe(email: string, uid: string, source: string): Promise<void> {
    if (!this.isBrowser) {
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

    const entryRef = push(ref(this.db, 'notifyMe'));
    await set(entryRef, {
      email: trimmed,
      timestamp: Date.now(),
      uid,
      source
    });
  }

  // Create a new game
  async createGame(
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
    if (!this.isBrowser) throw new Error('Cannot create game on server');
    const previewRole = this.authService.previewRole();
    if (previewRole === 'player' || previewRole === 'guest') {
      await this.assertUnderFreeBoardLimit(ownerId);
      this.rolePreview.simulatedBoards.update(n => n + 1);
      return PREVIEW_GAME_ID;
    }
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    await this.assertUnderFreeBoardLimit(ownerId);
    // Drop a stale slot only after the read-only check says nothing is active.
    // Existing game nodes are not modified.
    await remove(ref(this.db, `users/${ownerId}/activeBoardId`));
    const gameId = this.generateGameId();

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
      adFreeUntil: await this.adFreeUntilFor(ownerId),
      quarterSplit: quarterSplit || null,
      emptyQuarterRule: emptyQuarterRule || DEFAULT_EMPTY_QUARTER_RULE,
      ...(espnEventId ? { espnEventId } : {}),
      ...(espnSport ? { espnSport } : {}),
      ...(managerEmail ? { managerEmail } : {})
    };

    const gameRef = ref(this.db, `games/${gameId}`);
    await set(gameRef, defaultGameData);

    // Also add to user's games list
    const userGameRef = ref(this.db, `users/${ownerId}/games/${gameId}`);
    await set(userGameRef, {
      createdAt: defaultGameData.createdAt,
      name: defaultGameData.name
    });

    if (espnEventId) {
      // The board already exists. A failed index write is repaired when the
      // owner next opens the dashboard or the game.
      await this.ensureLiveGameIndex(gameId, espnEventId, espnSport || 'nfl').catch(() => {});
    }

    try {
      await set(ref(this.db, `users/${ownerId}/activeBoardId`), gameId);
    } catch (error) {
      // The board exists. The client-side count still enforces the limit.
      console.warn('[GameService] Active board slot was not saved', error);
    }

    return gameId;
  }

  // Subscribe to a specific game
  subscribeToGame(gameId: string): Observable<GameData | null> {
    if (!this.isBrowser) {
      return this.currentGame$;
    }

    // Unsubscribe from previous game
    if (this.gameSubscription) {
      this.gameSubscription();
      this.gameSubscription = null;
    }

    // Reset to null before subscribing to new game
    this._currentGame.next(null);
    this.currentGameId.set(gameId);

    const gameRef = ref(this.db, `games/${gameId}`);

    this.gameSubscription = onValue(gameRef, (snapshot) => {
      if (snapshot.exists()) {
        const rawData = snapshot.val();
        const boardSize: BoardSize = rawData.boardSize === 25 || rawData.boardSize === 50 ? rawData.boardSize : 100;
        const { rows, cols } = getBoardDimensions(boardSize);
        const data: GameData = {
          id: gameId,
          name: rawData.name || 'Football Squares',
          ownerId: rawData.ownerId || '',
          ownerName: rawData.ownerName || 'Unknown',
          createdAt: rawData.createdAt || Date.now(),
          boardSize,
          selectedSquares: {},
          homeNumbers: rawData.homeNumbers || Array(cols).fill(null),
          awayNumbers: rawData.awayNumbers || Array(rows).fill(null),
          scores: rawData.scores || {
            q1: { home: 0, away: 0 },
            q2: { home: 0, away: 0 },
            q3: { home: 0, away: 0 },
            q4: { home: 0, away: 0 }
          },
          playerColors: rawData.playerColors || {},
          winners: rawData.winners || {},
          pricePerSquare: rawData.pricePerSquare || 10,
          isRandomized: rawData.isRandomized || false,
          isLocked: rawData.isLocked || false,
          homeTeam: rawData.homeTeam || '',
          awayTeam: rawData.awayTeam || '',
          hostNote: rawData.hostNote || '',
          paidPlayers: rawData.paidPlayers || [],
          espnEventId: rawData.espnEventId || undefined,
          espnSport: rawData.espnSport || undefined,
          espnLive: this.readEspnLive(rawData.espnLive),
          managerId: rawData.managerId || undefined,
          managerEmail: rawData.managerEmail || undefined,
          managerName: rawData.managerName || undefined,
          adFreeUntil: rawData.adFreeUntil || 0,
          quarterSplit: rawData.quarterSplit || null,
          emptyQuarterRule: isEmptyQuarterRule(rawData.emptyQuarterRule) ? rawData.emptyQuarterRule : undefined,
          playerUserIds: rawData.playerUserIds || undefined
        };

        // Convert squares from Firebase format
        if (rawData.squares) {
          Object.entries(rawData.squares).forEach(([key, value]) => {
            data.selectedSquares[key] = value as string;
          });
        }

        this._currentGame.next(data);
      } else {
        this._currentGame.next(null);
      }
    });

    return this.currentGame$;
  }

  // Update game data — uses multi-path updates from root so Firebase evaluates
  // each path's .write rules independently.
  async updateGame(gameId: string, data: Partial<GameData>): Promise<void> {
    if (!this.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');

    const prefix = `games/${gameId}`;
    const updates: Record<string, any> = {};

    if (data.name !== undefined) {
      updates[`${prefix}/name`] = data.name;
    }
    if (data.pricePerSquare !== undefined) {
      updates[`${prefix}/pricePerSquare`] = data.pricePerSquare;
    }
    if (data.homeNumbers) {
      updates[`${prefix}/homeNumbers`] = data.homeNumbers;
    }
    if (data.awayNumbers) {
      updates[`${prefix}/awayNumbers`] = data.awayNumbers;
    }
    if (data.scores) {
      updates[`${prefix}/scores`] = data.scores;
    }
    if (data.winners) {
      updates[`${prefix}/winners`] = data.winners;
    }
    if (data.isRandomized !== undefined) {
      updates[`${prefix}/isRandomized`] = data.isRandomized;
    }
    if (data.isLocked !== undefined) {
      updates[`${prefix}/isLocked`] = data.isLocked;
    }
    if (data.homeTeam !== undefined) {
      updates[`${prefix}/homeTeam`] = data.homeTeam;
    }
    if (data.awayTeam !== undefined) {
      updates[`${prefix}/awayTeam`] = data.awayTeam;
    }
    if (data.hostNote !== undefined) {
      updates[`${prefix}/hostNote`] = data.hostNote;
    }
    if (data.adFreeUntil !== undefined) {
      updates[`${prefix}/adFreeUntil`] = data.adFreeUntil;
    }
    if (data.quarterSplit !== undefined) {
      updates[`${prefix}/quarterSplit`] = data.quarterSplit;
    }
    if (data.emptyQuarterRule !== undefined) {
      updates[`${prefix}/emptyQuarterRule`] = data.emptyQuarterRule;
    }
    if (data.espnEventId !== undefined) {
      const nextId = data.espnEventId || null;
      const nextSport = data.espnSport || 'nfl';
      if (nextId && !this.isLinkableEspnId(nextId)) {
        throw new Error('Invalid ESPN event id');
      }
      Object.assign(updates, await this.liveIndexUpdates(gameId, nextId, nextSport));
      updates[`${prefix}/espnEventId`] = nextId;
    }
    if (data.espnSport !== undefined) {
      updates[`${prefix}/espnSport`] = data.espnSport || null;
    }
    if (data.managerId !== undefined) {
      updates[`${prefix}/managerId`] = data.managerId;
    }
    if (data.managerEmail !== undefined) {
      updates[`${prefix}/managerEmail`] = data.managerEmail;
    }
    if (data.managerName !== undefined) {
      updates[`${prefix}/managerName`] = data.managerName;
    }
    // Player-writable maps go per key so the rules can check each square/name.
    const maps: [string, object | undefined][] = [
      ['squares', data.selectedSquares],
      ['playerColors', data.playerColors],
      ['paidPlayers', data.paidPlayers],
      ['playerUserIds', data.playerUserIds]
    ];
    await Promise.all(maps.filter(([, next]) => next).map(async ([field, next]) => {
      const path = `${prefix}/${field}`;
      const current: Record<string, unknown> = (await get(ref(this.db, path))).val() || {};
      const target = next as Record<string, unknown>;
      for (const key of new Set([...Object.keys(current), ...Object.keys(target)])) {
        if (current[key] !== target[key]) updates[`${path}/${key}`] = target[key] ?? null;
      }
    }));

    if (Object.keys(updates).length === 0) return;
    await update(ref(this.db), updates);
  }

  // Get a game by ID (one-time fetch)
  async getGame(gameId: string): Promise<GameData | null> {
    if (!this.isBrowser) return null;
    const gameRef = ref(this.db, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (snapshot.exists()) {
      const rawData = snapshot.val();
      const boardSize: BoardSize = rawData.boardSize === 25 || rawData.boardSize === 50 ? rawData.boardSize : 100;
      const { rows, cols } = getBoardDimensions(boardSize);
      return {
        id: gameId,
        name: rawData.name || 'Football Squares',
        ownerId: rawData.ownerId || '',
        ownerName: rawData.ownerName || 'Unknown',
        createdAt: rawData.createdAt || Date.now(),
        boardSize,
        selectedSquares: rawData.squares || {},
        homeNumbers: rawData.homeNumbers || Array(cols).fill(null),
        awayNumbers: rawData.awayNumbers || Array(rows).fill(null),
        scores: rawData.scores || {
          q1: { home: 0, away: 0 },
          q2: { home: 0, away: 0 },
          q3: { home: 0, away: 0 },
          q4: { home: 0, away: 0 }
        },
        playerColors: rawData.playerColors || {},
        winners: rawData.winners || {},
        pricePerSquare: rawData.pricePerSquare || 10,
        isRandomized: rawData.isRandomized || false,
        isLocked: rawData.isLocked || false,
        homeTeam: rawData.homeTeam || '',
        awayTeam: rawData.awayTeam || '',
        hostNote: rawData.hostNote || '',
        paidPlayers: rawData.paidPlayers || [],
        espnEventId: rawData.espnEventId || undefined,
        espnSport: rawData.espnSport || undefined,
        espnLive: this.readEspnLive(rawData.espnLive),
        managerId: rawData.managerId || undefined,
        managerEmail: rawData.managerEmail || undefined,
        managerName: rawData.managerName || undefined,
          adFreeUntil: rawData.adFreeUntil || 0,
          quarterSplit: rawData.quarterSplit || null,
          emptyQuarterRule: isEmptyQuarterRule(rawData.emptyQuarterRule) ? rawData.emptyQuarterRule : undefined,
        playerUserIds: rawData.playerUserIds || undefined
      };
    }

    return null;
  }

  // Check if game exists
  async gameExists(gameId: string): Promise<boolean> {
    if (!this.isBrowser) return false;
    const gameRef = ref(this.db, `games/${gameId}`);
    const snapshot = await get(gameRef);
    return snapshot.exists();
  }

  // Get games created by a user
  /** The host's board ids, newest first (same order as the dashboard). */
  async getUserGameIds(userId: string): Promise<string[]> {
    if (!this.isBrowser) return [];
    const snapshot = await get(ref(this.db, `users/${userId}/games`));
    if (!snapshot.exists()) return [];
    const entries = Object.entries(snapshot.val() as Record<string, { createdAt?: number }>);
    return entries.sort((a, b) => (b[1]?.createdAt ?? 0) - (a[1]?.createdAt ?? 0)).map(([id]) => id);
  }

  async getUserGames(userId: string): Promise<GameListItem[]> {
    if (!this.isBrowser) return [];
    const userGamesRef = ref(this.db, `users/${userId}/games`);
    const snapshot = await get(userGamesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const gameIds = Object.keys(snapshot.val());
    const games: GameListItem[] = [];

    for (const gameId of gameIds) {
      const game = await this.getGame(gameId);
      if (game) {
        const playerNames = new Set(Object.values(game.selectedSquares));
        const squaresFilled = Object.keys(game.selectedSquares).length;
        const confirmedCount = (game.paidPlayers || []).filter(p => playerNames.has(p)).length;
        games.push({
          id: gameId,
          name: game.name,
          ownerName: game.ownerName,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          createdAt: game.createdAt,
          playerCount: playerNames.size,
          squaresFilled,
          isLocked: game.isLocked,
          pricePerSquare: game.pricePerSquare,
          boardSize: game.boardSize || 100,
          managerId: game.managerId,
          managerEmail: game.managerEmail,
          managerName: game.managerName,
          espnEventId: game.espnEventId || undefined,
          espnSport: game.espnSport || undefined,
          hostNote: game.hostNote,
          emptyQuarterRule: isEmptyQuarterRule(game.emptyQuarterRule) ? game.emptyQuarterRule : undefined,
          confirmedCount
        });
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Delete a game and its live-score index entry.
  async deleteGame(gameId: string, ownerId: string): Promise<void> {
    if (!this.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const espnSnap = await get(ref(this.db, `games/${gameId}/espnEventId`));
    const updates: Record<string, unknown> = {
      [`games/${gameId}`]: null,
      [`users/${ownerId}/games/${gameId}`]: null,
    };
    const espnId = espnSnap.exists() ? espnSnap.val() : null;
    if (typeof espnId === 'string' && this.isLinkableEspnId(espnId)) {
      updates[`liveGames/${espnId}/${gameId}`] = null;
    }
    await update(ref(this.db), updates);
  }

  // Keep liveGames/{espnId}/{boardId} in sync so the scheduled function
  // can find linked boards without scanning every game.
  async ensureLiveGameIndex(gameId: string, espnEventId: string, espnSport: SportType = 'nfl'): Promise<void> {
    await this.ensureLiveGameIndexes([{ gameId, espnEventId, espnSport }]);
  }

  async ensureLiveGameIndexes(entries: { gameId: string; espnEventId: string; espnSport?: SportType | null }[]): Promise<void> {
    if (!this.isBrowser || entries.length === 0 || this.authService.previewRole() !== 'actual') return;
    const updates: Record<string, { sport: SportType }> = {};
    for (const entry of entries) {
      if (!this.isLinkableEspnId(entry.espnEventId) || !this.isBoardId(entry.gameId)) continue;
      updates[`liveGames/${entry.espnEventId}/${entry.gameId}`] = { sport: entry.espnSport || 'nfl' };
    }
    if (Object.keys(updates).length === 0) return;
    await update(ref(this.db), updates);
  }

  // Get shareable link for a game
  getShareableLink(gameId: string): string {
    return `${this.appBaseUrl()}/game/${gameId}`;
  }

  // Display link for TVs and other screens: live board, no sign-in needed
  getTvLink(gameId: string): string {
    return `${this.appBaseUrl()}/present/${gameId}`;
  }

  private appBaseUrl(): string {
    const basePath = window.location.pathname.includes('/angular-squares')
      ? '/angular-squares'
      : '';
    return `${window.location.origin}${basePath}`;
  }

  // Cleanup subscription
  unsubscribe(): void {
    if (this.gameSubscription) {
      this.gameSubscription();
      this.gameSubscription = null;
    }
    this._currentGame.next(null);
    this.currentGameId.set(null);
  }

  // Check if user is owner of current game
  isGameOwner(userId: string): boolean {
    const game = this._currentGame.getValue();
    return game?.ownerId === userId;
  }

  // Add a game to user's joined games list
  async addJoinedGame(userId: string, gameId: string, gameName: string): Promise<void> {
    if (!this.isBrowser || this.authService.previewRole() !== 'actual') return;
    const joinedGameRef = ref(this.db, `users/${userId}/joinedGames/${gameId}`);
    const snapshot = await get(joinedGameRef);
    if (snapshot.exists()) return; // Already joined
    await set(joinedGameRef, {
      joinedAt: Date.now(),
      gameName
    });
  }

  // Get games user has joined (not owned)
  async getJoinedGames(userId: string): Promise<GameListItem[]> {
    if (!this.isBrowser) return [];
    const joinedGamesRef = ref(this.db, `users/${userId}/joinedGames`);
    const snapshot = await get(joinedGamesRef);

    if (!snapshot.exists()) {
      return [];
    }

    const gameIds = Object.keys(snapshot.val());
    const games: GameListItem[] = [];

    for (const gameId of gameIds) {
      const game = await this.getGame(gameId);
      if (game) {
        const playerNames = new Set(Object.values(game.selectedSquares));
        const squaresFilled = Object.keys(game.selectedSquares).length;
        const confirmedCount = (game.paidPlayers || []).filter(p => playerNames.has(p)).length;
        games.push({
          id: gameId,
          name: game.name,
          ownerName: game.ownerName,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          createdAt: game.createdAt,
          playerCount: playerNames.size,
          squaresFilled,
          isLocked: game.isLocked,
          pricePerSquare: game.pricePerSquare,
          boardSize: game.boardSize || 100,
          managerId: game.managerId,
          managerEmail: game.managerEmail,
          managerName: game.managerName,
          espnEventId: game.espnEventId || undefined,
          espnSport: game.espnSport || undefined,
          hostNote: game.hostNote,
          confirmedCount
        });
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Remove a game from user's joined games list
  async removeJoinedGame(userId: string, gameId: string): Promise<void> {
    if (!this.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    const joinedGameRef = ref(this.db, `users/${userId}/joinedGames/${gameId}`);
    await remove(joinedGameRef);
  }

  // Propagate a player name change across all games the user participates in
  async propagateNameChange(userId: string, oldName: string, newName: string): Promise<void> {
    if (!this.isBrowser || !oldName || oldName === newName) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');

    const [owned, joined] = await Promise.all([
      this.getUserGames(userId),
      this.getJoinedGames(userId)
    ]);
    const allGames = [...owned, ...joined];

    for (const gameListing of allGames) {
      const game = await this.getGame(gameListing.id);
      if (!game) continue;

      const hasSquares = Object.values(game.selectedSquares).some(
        p => p.toLowerCase() === oldName.toLowerCase()
      );
      if (!hasSquares) continue;

      const updatedSquares = { ...game.selectedSquares };
      for (const key of Object.keys(updatedSquares)) {
        if (updatedSquares[key].toLowerCase() === oldName.toLowerCase()) {
          updatedSquares[key] = newName;
        }
      }

      const updatedColors = { ...game.playerColors };
      if (updatedColors[oldName]) {
        updatedColors[newName] = updatedColors[oldName];
        delete updatedColors[oldName];
      }

      const updatedPaidPlayers = (game.paidPlayers || []).map(p =>
        p.toLowerCase() === oldName.toLowerCase() ? newName : p
      );

      const updatedPlayerUserIds = { ...(game.playerUserIds || {}) };
      if (updatedPlayerUserIds[oldName]) {
        updatedPlayerUserIds[newName] = updatedPlayerUserIds[oldName];
        delete updatedPlayerUserIds[oldName];
      }

      await this.updateGame(gameListing.id, {
        selectedSquares: updatedSquares,
        playerColors: updatedColors,
        paidPlayers: updatedPaidPlayers,
        playerUserIds: updatedPlayerUserIds
      });
    }
  }

  // Update game manager
  async updateGameManager(gameId: string, managerId: string | null, managerEmail: string | null, managerName: string | null = null): Promise<void> {
    if (!this.isBrowser) return;
    if (this.authService.blockPreviewWrite()) throw new Error('Preview only');
    await update(ref(this.db), {
      [`games/${gameId}/managerId`]: managerId || '',
      [`games/${gameId}/managerEmail`]: managerEmail || '',
      [`games/${gameId}/managerName`]: managerName || ''
    });
  }

  private async liveIndexUpdates(gameId: string, nextId: string | null, sport: SportType): Promise<Record<string, unknown>> {
    const currentSnap = await get(ref(this.db, `games/${gameId}/espnEventId`));
    const currentId = currentSnap.exists() && typeof currentSnap.val() === 'string' ? currentSnap.val() as string : null;
    const updates: Record<string, unknown> = {};
    if (currentId && currentId !== nextId && this.isLinkableEspnId(currentId)) {
      updates[`liveGames/${currentId}/${gameId}`] = null;
    }
    if (nextId) {
      updates[`liveGames/${nextId}/${gameId}`] = { sport };
    }
    return updates;
  }

  private isLinkableEspnId(id: string): boolean {
    return /^[A-Za-z0-9_-]{1,50}$/.test(id);
  }

  private isBoardId(id: string): boolean {
    return /^[A-Za-z0-9]{6}$/.test(id);
  }

  private readEspnLive(value: unknown): EspnLiveSnapshot | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Record<string, unknown>;
    const status = raw['status'];
    if (status !== 'pre' && status !== 'in' && status !== 'post') return undefined;

    const quartersRaw = raw['quarters'];
    let quarterList: unknown[] = [];
    if (Array.isArray(quartersRaw)) {
      quarterList = quartersRaw;
    } else if (quartersRaw && typeof quartersRaw === 'object') {
      quarterList = Object.keys(quartersRaw)
        .sort((a, b) => Number(a) - Number(b))
        .map(key => (quartersRaw as Record<string, unknown>)[key]);
    }

    return {
      status,
      period: typeof raw['period'] === 'number' ? raw['period'] : 0,
      clock: typeof raw['clock'] === 'string' ? raw['clock'] : '',
      completed: raw['completed'] === true,
      homeScore: typeof raw['homeScore'] === 'number' ? raw['homeScore'] : 0,
      awayScore: typeof raw['awayScore'] === 'number' ? raw['awayScore'] : 0,
      homeTeam: typeof raw['homeTeam'] === 'string' ? raw['homeTeam'] : '',
      awayTeam: typeof raw['awayTeam'] === 'string' ? raw['awayTeam'] : '',
      quarters: quarterList.map(quarter => {
        const row = quarter && typeof quarter === 'object' ? quarter as Record<string, unknown> : {};
        return {
          home: typeof row['home'] === 'number' ? row['home'] : 0,
          away: typeof row['away'] === 'number' ? row['away'] : 0
        };
      })
    };
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // Gifted Season Pass (admin-only feature for granting passes to friends)
  // ─────────────────────────────────────────────────────────────────────────────

  /** Encode email for use as Firebase key (replace . with ,) */
  private encodeEmailKey(email: string): string {
    return email.toLowerCase().replace(/\./g, ',');
  }

  /** Decode Firebase key back to email */
  private decodeEmailKey(key: string): string {
    return key.replace(/,/g, '.');
  }

  /** Check if an email has a gifted season pass. Returns expiry timestamp or null. */
  async getGiftedSeasonPass(email: string): Promise<Entitlement | null> {
    if (!this.isBrowser || !email) return null;
    try {
      const key = this.encodeEmailKey(email);
      const snapshot = await get(ref(this.db, `giftedSeasonPass/${key}`));
      const data = snapshot.val();
      if (!data || typeof data.expiresAt !== 'number') return null;
      return { plan: 'season', expiresAt: data.expiresAt, updatedAt: data.updatedAt };
    } catch {
      return null;
    }
  }

  /** Grant a season pass to an email address. Admin only. */
  async grantSeasonPass(email: string, durationDays = 210): Promise<void> {
    if (!this.isBrowser) throw new Error('Cannot grant pass on server');
    const key = this.encodeEmailKey(email);
    const now = Date.now();
    const expiresAt = now + durationDays * 86_400_000;
    await set(ref(this.db, `giftedSeasonPass/${key}`), {
      expiresAt,
      updatedAt: now
    });
  }

  /** Revoke a gifted season pass. Admin only. */
  async revokeSeasonPass(email: string): Promise<void> {
    if (!this.isBrowser) throw new Error('Cannot revoke pass on server');
    const key = this.encodeEmailKey(email);
    await remove(ref(this.db, `giftedSeasonPass/${key}`));
  }

  /** List all gifted season passes. Admin only. */
  async listGiftedSeasonPasses(): Promise<{ email: string; expiresAt: number; updatedAt?: number }[]> {
    if (!this.isBrowser) return [];
    try {
      const snapshot = await get(ref(this.db, 'giftedSeasonPass'));
      const data = snapshot.val();
      if (!data || typeof data !== 'object') return [];
      return Object.entries(data).map(([key, value]) => {
        const v = value as { expiresAt: number; updatedAt?: number };
        return {
          email: this.decodeEmailKey(key),
          expiresAt: v.expiresAt,
          updatedAt: v.updatedAt
        };
      }).sort((a, b) => b.expiresAt - a.expiresAt);
    } catch {
      return [];
    }
  }
}
