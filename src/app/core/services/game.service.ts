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

export type SportType = 'nfl' | 'nba' | 'ncaaf' | 'wnba' | 'afl';

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
  espnEventId?: string;
  espnSport?: SportType;
  managerId?: string;
  managerEmail?: string;
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
  espnEventId?: string;
  espnSport?: SportType;
  venmoUsername?: string;
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private platformId = inject(PLATFORM_ID);
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

  // Generate a short, shareable game ID
  private generateGameId(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Removed ambiguous chars
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
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
          managerId: rawData.managerId || undefined,
          managerEmail: rawData.managerEmail || undefined,
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
      updates[`${prefix}/espnEventId`] = data.espnEventId;
    }
    if (data.espnSport !== undefined) {
      updates[`${prefix}/espnSport`] = data.espnSport;
    }
    if (data.managerId !== undefined) {
      updates[`${prefix}/managerId`] = data.managerId;
    }
    if (data.managerEmail !== undefined) {
      updates[`${prefix}/managerEmail`] = data.managerEmail;
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
        managerId: rawData.managerId || undefined,
        managerEmail: rawData.managerEmail || undefined,
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
        games.push({
          id: gameId,
          name: game.name,
          ownerName: game.ownerName,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          createdAt: game.createdAt,
          playerCount: playerNames.size,
          squaresFilled: Object.keys(game.selectedSquares).length,
          isLocked: game.isLocked,
          pricePerSquare: game.pricePerSquare,
          managerId: game.managerId,
          managerEmail: game.managerEmail,
          espnEventId: game.espnEventId,
          espnSport: game.espnSport,
          venmoUsername: game.venmoUsername
        });
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Delete a game
  async deleteGame(gameId: string, ownerId: string): Promise<void> {
    if (!this.isBrowser) return;
    const gameRef = ref(this.db, `games/${gameId}`);
    const userGameRef = ref(this.db, `users/${ownerId}/games/${gameId}`);

    await remove(gameRef);
    await remove(userGameRef);
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
        games.push({
          id: gameId,
          name: game.name,
          ownerName: game.ownerName,
          homeTeam: game.homeTeam,
          awayTeam: game.awayTeam,
          createdAt: game.createdAt,
          playerCount: playerNames.size,
          squaresFilled: Object.keys(game.selectedSquares).length,
          isLocked: game.isLocked,
          pricePerSquare: game.pricePerSquare,
          managerId: game.managerId,
          managerEmail: game.managerEmail,
          espnEventId: game.espnEventId,
          espnSport: game.espnSport,
          venmoUsername: game.venmoUsername
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
  async updateGameManager(gameId: string, managerId: string | null, managerEmail: string | null): Promise<void> {
    if (!this.isBrowser) return;
    await update(ref(this.db), {
      [`games/${gameId}/managerId`]: managerId || '',
      [`games/${gameId}/managerEmail`]: managerEmail || ''
    });
  }
}
