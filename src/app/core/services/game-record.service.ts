import { Injectable, inject } from '@angular/core';
import { get, onValue, ref, update } from 'firebase/database';
import { BehaviorSubject, Observable } from 'rxjs';
import { GameData } from '../utils/game-data';
import { isLinkableEspnId, parseGameData } from '../utils/game-parse';
import { AuthService } from './auth.service';
import { GameDatabaseService } from './game-database.service';
import { LiveGameIndexService } from './live-game-index.service';

/**
 * Reading and writing one board at games/{gameId}: the live subscription, one-time reads,
 * and field updates. GameService delegates here.
 */
@Injectable({
  providedIn: 'root'
})
export class GameRecordService {
  constructor() {
    this.currentGame$ = this._currentGame.asObservable();
  }

  public readonly currentGame$: Observable<GameData | null>;

  /** The board the live subscription last delivered, or null. */
  public currentGameValue(): GameData | null {
    return this._currentGame.getValue();
  }

  // Check if game exists
  public async gameExists(gameId: string): Promise<boolean> {
    if (!this.database.isBrowser) return false;
    const gameRef = ref(this.database.db, `games/${gameId}`);
    const snapshot = await get(gameRef);
    return snapshot.exists();
  }

  // Get a game by ID (one-time fetch)
  public async getGame(gameId: string): Promise<GameData | null> {
    if (!this.database.isBrowser) return null;
    const gameRef = ref(this.database.db, `games/${gameId}`);
    const snapshot = await get(gameRef);
    return snapshot.exists() ? parseGameData(gameId, snapshot.val()) : null;
  }

  // Check if user is owner of current game
  public isGameOwner(userId: string): boolean {
    const game = this._currentGame.getValue();
    return game?.ownerId === userId;
  }

  // Subscribe to a specific game
  public subscribeToGame(gameId: string): Observable<GameData | null> {
    if (!this.database.isBrowser) {
      return this.currentGame$;
    }

    // Unsubscribe from previous game
    if (this.gameSubscription) {
      this.gameSubscription();
      this.gameSubscription = null;
    }

    // Reset to null before subscribing to new game
    this._currentGame.next(null);

    const gameRef = ref(this.database.db, `games/${gameId}`);

    this.gameSubscription = onValue(gameRef, (snapshot) => {
      this._currentGame.next(snapshot.exists() ? parseGameData(gameId, snapshot.val()) : null);
    });

    return this.currentGame$;
  }

  // Cleanup subscription
  public unsubscribe(): void {
    if (this.gameSubscription) {
      this.gameSubscription();
      this.gameSubscription = null;
    }
    this._currentGame.next(null);
  }

  // Update game data — uses multi-path updates from root so Firebase evaluates
  // each path's .write rules independently.
  public async updateGame(gameId: string, data: Partial<GameData>): Promise<void> {
    if (!this.database.isBrowser) return;
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
      if (nextId && !isLinkableEspnId(nextId)) {
        throw new Error('Invalid ESPN event id');
      }
      Object.assign(updates, await this.liveGameIndex.liveIndexUpdates(gameId, nextId, nextSport));
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
      const current: Record<string, unknown> = (await get(ref(this.database.db, path))).val() || {};
      const target = next as Record<string, unknown>;
      for (const key of new Set([...Object.keys(current), ...Object.keys(target)])) {
        if (current[key] !== target[key]) updates[`${path}/${key}`] = target[key] ?? null;
      }
    }));

    if (Object.keys(updates).length === 0) return;
    await update(ref(this.database.db), updates);
  }

  private readonly _currentGame: BehaviorSubject<GameData | null> = new BehaviorSubject<GameData | null>(null);
  private readonly authService: AuthService = inject(AuthService);
  private readonly database: GameDatabaseService = inject(GameDatabaseService);
  private gameSubscription: (() => void) | null = null;
  private readonly liveGameIndex: LiveGameIndexService = inject(LiveGameIndexService);
}
