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
  venmoUsername?: string;
  paidPlayers?: string[];
  espnEventId?: string | null;
  espnSport?: SportType | null;
  espnLive?: EspnLiveSnapshot;
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  playerUserIds?: { [name: string]: string };
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
  managerId?: string;
  managerEmail?: string;
  managerName?: string;
  espnEventId?: string;
  espnSport?: SportType;
  venmoUsername?: string;
  collected: number;
  totalPot: number;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private platformId = inject(PLATFORM_ID);
  private espnService = inject(EspnService);
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
    const boards = await this.loadOwnedBoardActivity(ownerId);
    const now = Date.now();
    const activeCount = boards.filter(board => isBoardActive(board, now)).length;
    if (activeCount >= FREE_ACTIVE_BOARD_LIMIT) {
      throw new ActiveBoardLimitError();
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
    venmoUsername?: string
  ): Promise<string> {
    if (!this.isBrowser) throw new Error('Cannot create game on server');
    await this.assertUnderFreeBoardLimit(ownerId);
    // Drop a stale slot only after the read-only check says nothing is active.
    // Existing game nodes are not modified.
    await remove(ref(this.db, `users/${ownerId}/activeBoardId`));
    const gameId = this.generateGameId();

    const defaultGameData: GameData = {
      id: gameId,
      name: gameName || 'Football Squares',
      ownerId: ownerId,
      ownerName: ownerName,
      createdAt: Date.now(),
      selectedSquares: {},
      homeNumbers: Array(10).fill(null),
      awayNumbers: Array(10).fill(null),
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
      venmoUsername: venmoUsername || '',
      paidPlayers: [],
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
        const data: GameData = {
          id: gameId,
          name: rawData.name || 'Football Squares',
          ownerId: rawData.ownerId || '',
          ownerName: rawData.ownerName || 'Unknown',
          createdAt: rawData.createdAt || Date.now(),
          selectedSquares: {},
          homeNumbers: rawData.homeNumbers || Array(10).fill(null),
          awayNumbers: rawData.awayNumbers || Array(10).fill(null),
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
          venmoUsername: rawData.venmoUsername || '',
          paidPlayers: rawData.paidPlayers || [],
          espnEventId: rawData.espnEventId || undefined,
          espnSport: rawData.espnSport || undefined,
          espnLive: this.readEspnLive(rawData.espnLive),
          managerId: rawData.managerId || undefined,
          managerEmail: rawData.managerEmail || undefined,
          managerName: rawData.managerName || undefined,
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
  // each path's .write rules independently (allows players to write to squares/playerColors/etc.)
  async updateGame(gameId: string, data: Partial<GameData>): Promise<void> {
    if (!this.isBrowser) return;

    const prefix = `games/${gameId}`;
    const updates: Record<string, any> = {};

    if (data.selectedSquares) {
      updates[`${prefix}/squares`] = data.selectedSquares;
    }
    if (data.name !== undefined) {
      updates[`${prefix}/name`] = data.name;
    }
    if (data.pricePerSquare !== undefined) {
      updates[`${prefix}/pricePerSquare`] = data.pricePerSquare;
    }
    if (data.playerColors) {
      updates[`${prefix}/playerColors`] = data.playerColors;
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
    if (data.venmoUsername !== undefined) {
      updates[`${prefix}/venmoUsername`] = data.venmoUsername;
    }
    if (data.paidPlayers !== undefined) {
      updates[`${prefix}/paidPlayers`] = data.paidPlayers;
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
    if (data.playerUserIds !== undefined) {
      updates[`${prefix}/playerUserIds`] = data.playerUserIds;
    }

    await update(ref(this.db), updates);
  }

  // Get a game by ID (one-time fetch)
  async getGame(gameId: string): Promise<GameData | null> {
    if (!this.isBrowser) return null;
    const gameRef = ref(this.db, `games/${gameId}`);
    const snapshot = await get(gameRef);

    if (snapshot.exists()) {
      const rawData = snapshot.val();
      return {
        id: gameId,
        name: rawData.name || 'Football Squares',
        ownerId: rawData.ownerId || '',
        ownerName: rawData.ownerName || 'Unknown',
        createdAt: rawData.createdAt || Date.now(),
        selectedSquares: rawData.squares || {},
        homeNumbers: rawData.homeNumbers || Array(10).fill(null),
        awayNumbers: rawData.awayNumbers || Array(10).fill(null),
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
        venmoUsername: rawData.venmoUsername || '',
        paidPlayers: rawData.paidPlayers || [],
        espnEventId: rawData.espnEventId || undefined,
        espnSport: rawData.espnSport || undefined,
        espnLive: this.readEspnLive(rawData.espnLive),
        managerId: rawData.managerId || undefined,
        managerEmail: rawData.managerEmail || undefined,
        managerName: rawData.managerName || undefined,
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
        const paidSet = new Set(game.paidPlayers || []);
        const squaresPerPlayer: Record<string, number> = {};
        for (const player of Object.values(game.selectedSquares)) {
          squaresPerPlayer[player] = (squaresPerPlayer[player] || 0) + 1;
        }
        const collected = Object.entries(squaresPerPlayer)
          .filter(([player]) => paidSet.has(player))
          .reduce((sum, [, count]) => sum + count * game.pricePerSquare, 0);
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
          managerId: game.managerId,
          managerEmail: game.managerEmail,
          managerName: game.managerName,
          espnEventId: game.espnEventId || undefined,
          espnSport: game.espnSport || undefined,
          venmoUsername: game.venmoUsername,
          collected,
          totalPot: squaresFilled * game.pricePerSquare
        });
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Delete a game and its live-score index entry.
  async deleteGame(gameId: string, ownerId: string): Promise<void> {
    if (!this.isBrowser) return;
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
    if (!this.isBrowser || entries.length === 0) return;
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
    const baseUrl = window.location.origin;
    const basePath = window.location.pathname.includes('/angular-squares')
      ? '/angular-squares'
      : '';
    return `${baseUrl}${basePath}/game/${gameId}`;
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
    if (!this.isBrowser) return;
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
        const paidSet = new Set(game.paidPlayers || []);
        const squaresPerPlayer: Record<string, number> = {};
        for (const player of Object.values(game.selectedSquares)) {
          squaresPerPlayer[player] = (squaresPerPlayer[player] || 0) + 1;
        }
        const collected = Object.entries(squaresPerPlayer)
          .filter(([player]) => paidSet.has(player))
          .reduce((sum, [, count]) => sum + count * game.pricePerSquare, 0);
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
          managerId: game.managerId,
          managerEmail: game.managerEmail,
          managerName: game.managerName,
          espnEventId: game.espnEventId || undefined,
          espnSport: game.espnSport || undefined,
          venmoUsername: game.venmoUsername,
          collected,
          totalPot: squaresFilled * game.pricePerSquare
        });
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Remove a game from user's joined games list
  async removeJoinedGame(userId: string, gameId: string): Promise<void> {
    if (!this.isBrowser) return;
    const joinedGameRef = ref(this.db, `users/${userId}/joinedGames/${gameId}`);
    await remove(joinedGameRef);
  }

  // Propagate a player name change across all games the user participates in
  async propagateNameChange(userId: string, oldName: string, newName: string): Promise<void> {
    if (!this.isBrowser || !oldName || oldName === newName) return;

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
}
