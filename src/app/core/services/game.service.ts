import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Entitlement, EmptyQuarterRule, QuarterSplit } from '../plans';
import type { AutoManageSettings } from '../utils/auto-manage';
import { BoardSize, GameData, GameListItem, SportType, TvLink } from '../utils/game-data';
import type { OpenBoardRow } from '../utils/open-boards';
import type { RecentVisit } from '../utils/recent-games';
import { BoardSettingsService } from './board-settings.service';
import { EntitlementService } from './entitlement.service';
import { GameLifecycleService } from './game-lifecycle.service';
import { GameRecordService } from './game-record.service';
import { LiveGameIndexService } from './live-game-index.service';
import { SeasonPassService } from './season-pass.service';
import { TvLinkService } from './tv-link.service';
import { UserGamesService } from './user-games.service';

// The game types moved to utils/game-data.ts. Re-exported so every existing import keeps working.
export { getBoardDimensions } from '../utils/game-data';
export type { BoardSize, EspnLiveSnapshot, GameData, GameListItem, SportType, TvLink } from '../utils/game-data';

/**
 * The one entry point components use for boards. Each method hands off to the service that owns
 * that part of the data (see the imports above); this class keeps the public API in one place.
 */
@Injectable({
  providedIn: 'root'
})
export class GameService {
  constructor() {
    this.currentGame$ = this.records.currentGame$;
  }

  public currentGame$: Observable<GameData | null>;

  /** Boards this host has active right now (counted against their plan). */
  public activeBoardCount(ownerId: string): Promise<number> {
    return this.entitlements.activeBoardCount(ownerId);
  }

  /** How long a new or opened board stays ad-free for this host (0 = ads). Rules cap it at the real pass. */
  public adFreeUntilFor(uid: string): Promise<number> {
    return this.entitlements.adFreeUntilFor(uid);
  }

  /** Add a game to the user's joined games list. */
  public addJoinedGame(userId: string, gameId: string, gameName: string): Promise<void> {
    return this.userGames.addJoinedGame(userId, gameId, gameName);
  }

  /** Read-only check used by the dashboard and by createGame. Does not write, delete, or rewrite any existing board. */
  public assertUnderFreeBoardLimit(ownerId: string): Promise<void> {
    return this.entitlements.assertUnderFreeBoardLimit(ownerId);
  }

  public createGame(
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
    return this.lifecycle.createGame(
      ownerId, ownerName, gameName, espnEventId, homeTeam, awayTeam, pricePerSquare,
      espnSport, managerEmail, hostNote, boardSize, quarterSplit, emptyQuarterRule
    );
  }

  /** Write-only notifyMe/{pushId} entry. Callers must already be signed in. */
  public createNotifyMe(email: string, uid: string, source: string, extra?: { prefilled: boolean; trigger: 'limit' | 'pass' }): Promise<void> {
    return this.entitlements.createNotifyMe(email, uid, source, extra);
  }

  /** Delete a game and its live-score index entry. */
  public deleteGame(gameId: string, ownerId: string): Promise<void> {
    return this.lifecycle.deleteGame(gameId, ownerId);
  }

  public ensureLiveGameIndex(gameId: string, espnEventId: string, espnSport: SportType = 'nfl'): Promise<void> {
    return this.liveGameIndex.ensureLiveGameIndex(gameId, espnEventId, espnSport);
  }

  public ensureLiveGameIndexes(entries: { gameId: string; espnEventId: string; espnSport?: SportType | null }[]): Promise<void> {
    return this.liveGameIndex.ensureLiveGameIndexes(entries);
  }

  public gameExists(gameId: string): Promise<boolean> {
    return this.records.gameExists(gameId);
  }

  /** Auto-manage is on by default for new boards unless the host switched it off (users/{uid}/autoManageOff). */
  public getAutoManageDefault(uid: string): Promise<boolean> {
    return this.boardSettings.getAutoManageDefault(uid);
  }

  /** entitlements/{uid}: the host's paid plan, or null. */
  public getEntitlement(uid: string): Promise<Entitlement | null> {
    return this.entitlements.getEntitlement(uid);
  }

  /** One-time fetch of a board. */
  public getGame(gameId: string): Promise<GameData | null> {
    return this.records.getGame(gameId);
  }

  /** Gifted season pass for an email, or null. */
  public getGiftedSeasonPass(email: string): Promise<Entitlement | null> {
    return this.seasonPass.getGiftedSeasonPass(email);
  }

  /** Games the user joined (not owned), newest first. */
  public getJoinedGames(userId: string): Promise<GameListItem[]> {
    return this.userGames.getJoinedGames(userId);
  }

  /** The same host's other boards a player on a full board can join. Empty on any error. */
  public getOpenBoards(ownerId: string, excludeId: string): Promise<OpenBoardRow[]> {
    return this.boardSettings.getOpenBoards(ownerId, excludeId);
  }

  public getRotationTvLink(token: string): string {
    return this.tvLinks.getRotationTvLink(token);
  }

  public getShareableLink(gameId: string): string {
    return this.tvLinks.getShareableLink(gameId);
  }

  public getTvLink(gameId: string): string {
    return this.tvLinks.getTvLink(gameId);
  }

  public getTvToken(userId: string): Promise<string | null> {
    return this.tvLinks.getTvToken(userId);
  }

  /** The host's board ids, newest first (same order as the dashboard). */
  public getUserGameIds(userId: string): Promise<string[]> {
    return this.userGames.getUserGameIds(userId);
  }

  /** Games the user hosts, newest first. */
  public getUserGames(userId: string): Promise<GameListItem[]> {
    return this.userGames.getUserGames(userId);
  }

  /** Hosted and joined games with when each was created or joined, for the Your Games menu. */
  public getYourGameIndex(userId: string): Promise<RecentVisit[]> {
    return this.userGames.getYourGameIndex(userId);
  }

  /** Grant a season pass to an email address. Admin only. */
  public grantSeasonPass(email: string, durationDays: number = 210): Promise<void> {
    return this.seasonPass.grantSeasonPass(email, durationDays);
  }

  /** Admins (set by hand at admins/{uid} in the console) have no board limit. */
  public isAdmin(uid: string): Promise<boolean> {
    return this.entitlements.isAdmin(uid);
  }

  /** Whether the user owns the board the live subscription is showing. */
  public isGameOwner(userId: string): boolean {
    return this.records.isGameOwner(userId);
  }

  /** List all gifted season passes. Admin only. */
  public listGiftedSeasonPasses(): Promise<{ email: string; expiresAt: number; updatedAt?: number }[]> {
    return this.seasonPass.listGiftedSeasonPasses();
  }

  /** Rename a player across every board the user hosts or joined. */
  public propagateNameChange(userId: string, oldName: string, newName: string): Promise<void> {
    return this.userGames.propagateNameChange(userId, oldName, newName);
  }

  /** Counts one visitor's first full-board view, Start-your-own click or other-board join per board. Never throws. */
  public recordBoardStatOnce(boardId: string, field: 'fullBoardViews' | 'fullBoardViewsWithOpenBoards' | 'startYourOwnClicks' | 'otherBoardJoins'): Promise<void> {
    return this.boardSettings.recordBoardStatOnce(boardId, field);
  }

  /** Counts the host's upgrade-dialog views for the fake-door read. Failures are ignored. */
  public recordUpgradeView(uid: string, trigger: 'limit' | 'pass'): Promise<void> {
    return this.entitlements.recordUpgradeView(uid, trigger);
  }

  public removeJoinedGame(userId: string, gameId: string): Promise<void> {
    return this.userGames.removeJoinedGame(userId, gameId);
  }

  /** Turn the TV link off: the old address stops working and the next link gets a new token. */
  public removeTvLink(userId: string): Promise<void> {
    return this.tvLinks.removeTvLink(userId);
  }

  /** Clears a board for reuse. Keeps name, owner and any linked game. */
  public resetGame(gameId: string, boardSize: BoardSize): Promise<void> {
    return this.lifecycle.resetGame(gameId, boardSize);
  }

  /** Converts a board to a smaller size. Picks are shuffled into random empty cells; each player keeps their count. */
  public resizeBoard(gameId: string, target: BoardSize): Promise<void> {
    return this.lifecycle.resizeBoard(gameId, target);
  }

  public revokeSeasonPass(email: string): Promise<void> {
    return this.seasonPass.revokeSeasonPass(email);
  }

  /** Publish the boards and interval under the host's TV token, creating it if needed. */
  public saveTvLink(userId: string, boardIds: string[], interval: number): Promise<string> {
    return this.tvLinks.saveTvLink(userId, boardIds, interval);
  }

  /** The host turns auto-manage on or off. The server runs the board 5 minutes after kickoff. */
  public setAutoManage(gameId: string, settings: AutoManageSettings | null, kickoffAt?: number): Promise<void> {
    return this.boardSettings.setAutoManage(gameId, settings, kickoffAt);
  }

  public setAutoManageDefault(uid: string, on: boolean): Promise<void> {
    return this.boardSettings.setAutoManageDefault(uid, on);
  }

  public setSeasonPassNoExpiry(email: string): Promise<void> {
    return this.seasonPass.setSeasonPassNoExpiry(email);
  }

  /** The host turns "Show in my open boards" on or off for one board. */
  public setShowInOpenBoards(gameId: string, ownerId: string, on: boolean): Promise<void> {
    return this.boardSettings.setShowInOpenBoards(gameId, ownerId, on);
  }

  /** Sets or clears the most squares one name can claim on a board (Season Pass). */
  public setSquareLimit(gameId: string, limit: number | null): Promise<void> {
    return this.boardSettings.setSquareLimit(gameId, limit);
  }

  /** Smaller board sizes this board can convert to. */
  public smallerSizesFor(boardSize: BoardSize, squaresFilled: number, isRandomized: boolean): BoardSize[] {
    return this.lifecycle.smallerSizesFor(boardSize, squaresFilled, isRandomized);
  }

  /** Live subscription to one board. Replaces any earlier subscription. */
  public subscribeToGame(gameId: string): Observable<GameData | null> {
    return this.records.subscribeToGame(gameId);
  }

  /** Stops the live subscription and clears the current board. */
  public unsubscribe(): void {
    this.records.unsubscribe();
  }

  /** Multi-path update of a board's fields. */
  public updateGame(gameId: string, data: Partial<GameData>): Promise<void> {
    return this.records.updateGame(gameId, data);
  }

  public updateGameManager(gameId: string, managerId: string | null, managerEmail: string | null, managerName: string | null = null): Promise<void> {
    return this.lifecycle.updateGameManager(gameId, managerId, managerEmail, managerName);
  }

  /** Live boards and interval for a TV link. null when the link is off or unknown. */
  public watchTvLink(token: string): Observable<TvLink | null> {
    return this.tvLinks.watchTvLink(token);
  }

  private readonly boardSettings: BoardSettingsService = inject(BoardSettingsService);
  private readonly entitlements: EntitlementService = inject(EntitlementService);
  private readonly lifecycle: GameLifecycleService = inject(GameLifecycleService);
  private readonly liveGameIndex: LiveGameIndexService = inject(LiveGameIndexService);
  private readonly records: GameRecordService = inject(GameRecordService);
  private readonly seasonPass: SeasonPassService = inject(SeasonPassService);
  private readonly tvLinks: TvLinkService = inject(TvLinkService);
  private readonly userGames: UserGamesService = inject(UserGamesService);
}
