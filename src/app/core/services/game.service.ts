import { Injectable, signal } from '@angular/core';
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
}

@Injectable({
  providedIn: 'root'
})
export class GameService {
  private db: Database;
  private currentGameId = signal<string | null>(null);
  private _currentGame = new BehaviorSubject<GameData | null>(null);
  private gameSubscription: (() => void) | null = null;

  currentGame$ = this._currentGame.asObservable();

  constructor() {
    if (getApps().length === 0) {
      initializeApp(environment.firebase);
    }
    this.db = getDatabase();
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

  // Create a new game
  async createGame(ownerId: string, ownerName: string, gameName?: string): Promise<string> {
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
      pricePerSquare: 10,
      isRandomized: false,
      homeTeam: '',
      awayTeam: '',
      venmoUsername: '',
      paidPlayers: []
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
    // Unsubscribe from previous game
    if (this.gameSubscription) {
      this.gameSubscription();
      this.gameSubscription = null;
    }

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
          paidPlayers: rawData.paidPlayers || []
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

  // Update game data
  async updateGame(gameId: string, data: Partial<GameData>): Promise<void> {
    const gameRef = ref(this.db, `games/${gameId}`);

    const updateData: any = {};

    if (data.selectedSquares) {
      updateData.squares = data.selectedSquares;
    }
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.pricePerSquare !== undefined) {
      updateData.pricePerSquare = data.pricePerSquare;
    }
    if (data.playerColors) {
      updateData.playerColors = data.playerColors;
    }
    if (data.homeNumbers) {
      updateData.homeNumbers = data.homeNumbers;
    }
    if (data.awayNumbers) {
      updateData.awayNumbers = data.awayNumbers;
    }
    if (data.scores) {
      updateData.scores = data.scores;
    }
    if (data.winners) {
      updateData.winners = data.winners;
    }
    if (data.isRandomized !== undefined) {
      updateData.isRandomized = data.isRandomized;
    }
    if (data.isLocked !== undefined) {
      updateData.isLocked = data.isLocked;
    }
    if (data.homeTeam !== undefined) {
      updateData.homeTeam = data.homeTeam;
    }
    if (data.awayTeam !== undefined) {
      updateData.awayTeam = data.awayTeam;
    }
    if (data.venmoUsername !== undefined) {
      updateData.venmoUsername = data.venmoUsername;
    }
    if (data.paidPlayers !== undefined) {
      updateData.paidPlayers = data.paidPlayers;
    }

    await update(gameRef, updateData);
  }

  // Get a game by ID (one-time fetch)
  async getGame(gameId: string): Promise<GameData | null> {
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
        paidPlayers: rawData.paidPlayers || []
      };
    }

    return null;
  }

  // Check if game exists
  async gameExists(gameId: string): Promise<boolean> {
    const gameRef = ref(this.db, `games/${gameId}`);
    const snapshot = await get(gameRef);
    return snapshot.exists();
  }

  // Get games created by a user
  async getUserGames(userId: string): Promise<GameListItem[]> {
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
          isLocked: game.isLocked
        });
      }
    }

    return games.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Delete a game
  async deleteGame(gameId: string, ownerId: string): Promise<void> {
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
}
