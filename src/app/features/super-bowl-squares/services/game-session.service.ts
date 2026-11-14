import { inject, Injectable, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../../core/services/auth.service';
import { GameData, GameService } from '../../../core/services/game.service';
import { boardArrowStep } from '../../../core/utils/board-keys';
import { normalizeGameCode } from '../../../core/utils/game-code';
import type { OpenBoardRow } from '../../../core/utils/open-boards';
import { recordRecentVisit } from '../../../core/utils/recent-games';
import { EspnSyncService } from './espn-sync.service';
import { GamePageUiService } from './game-page-ui.service';
import { GamePlayersService } from './game-players.service';
import { GameScoringService } from './game-scoring.service';
import { GameStateService } from './game-state.service';
import { NumberDrawService } from './number-draw.service';
import { PlayerNameService } from './player-name.service';

/**
 * Which board the page shows and its live subscription: follows the route, loads and switches boards (arrow keys,
 * Your games), applies each snapshot to the store, and leaves for the dashboard or landing page when a code is unknown.
 */
@Injectable()
export class GameSessionService {
  // Public functions

  /** Starts following the route's board once Firebase has loaded (it loads with the game route, not the landing page). */
  public async bindRoute(): Promise<void> {
    await this.authService.ensureInitialized();
    if (this.state.destroyed) return;

    this.names.adoptAuthName();

    const user = this.authService.currentUser();
    if (user && !user.isGuest) {
      this.gameService.getUserGameIds(user.uid).then(ids => (this.hostBoardIds = ids)).catch(() => {});
    }

    this.subscription.add(
      this.route.params.subscribe(params => {
        const gameId = params['gameId'];
        if (gameId) {
          this.state.gameId = gameId;
          this.loadGame(gameId);
        }
      })
    );
  }

  /** Tears the page down: listeners, polling and the draw. */
  public destroy(): void {
    this.state.destroyed = true;
    this.subscription.unsubscribe();
    this.gameService.unsubscribe();
    this.espn.stopPolling();
    this.draw.stopAnimation();
  }

  /** Left and right arrows step through the host's boards. */
  public onArrowKey(event: KeyboardEvent): void {
    const dir = boardArrowStep(event);
    const ids = this.hostBoardIds;
    const index = ids.indexOf(this.state.gameId);
    if (!dir || ids.length < 2 || index < 0) return;
    this.ui.slideFrom = dir > 0 ? 'right' : 'left';
    this.router.navigate(['/game', ids[(index + dir + ids.length) % ids.length]]);
  }

  public trackOtherBoardJoin(): void {
    this.gameService.recordBoardStatOnce(this.state.gameId, 'otherBoardJoins');
  }

  // Private properties

  private adStampDone: boolean = false;
  private readonly authService: AuthService = inject(AuthService);
  private readonly draw: NumberDrawService = inject(NumberDrawService);
  private readonly espn: EspnSyncService = inject(EspnSyncService);
  private readonly gameService: GameService = inject(GameService);
  private gameSub: Subscription | null = null;
  private hostBoardIds: string[] = [];
  private readonly names: PlayerNameService = inject(PlayerNameService);
  private openBoardsFor: string = '';
  private openBoardsLoad: Promise<OpenBoardRow[]> | null = null;
  private readonly platformId: object = inject(PLATFORM_ID);
  private readonly players: GamePlayersService = inject(GamePlayersService);
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly scoring: GameScoringService = inject(GameScoringService);
  private readonly state: GameStateService = inject(GameStateService);
  private readonly subscription: Subscription = new Subscription();
  private readonly ui: GamePageUiService = inject(GamePageUiService);

  // Private functions

  /** Applies one game snapshot to the page, in the order the page has always used. */
  private applySnapshot(data: GameData): void {
    const state = this.state;
    state.applyCoreData(data);
    try {
      localStorage.setItem(`qs_size_${state.gameId}`, String(state.boardSize));
    } catch {}
    this.loadOpenBoards();
    if (state.fullBoardNotice()) {
      this.gameService.recordBoardStatOnce(state.gameId, 'fullBoardViews');
      this.loadOpenBoards().then(rows => {
        if (rows.length) this.gameService.recordBoardStatOnce(state.gameId, 'fullBoardViewsWithOpenBoards');
      });
    }
    if (state.applyDetailData(data)) this.ui.resetHostNote();

    if (!this.adStampDone && state.isGameOwner() && this.authService.previewRole() === 'actual') {
      this.adStampDone = true;
      void this.stampAdFree();
    }

    this.players.assignMissingColors();
    state.calculatePlayerStats();
    this.names.checkDuplicateName();
    this.players.backfillPlayerUserId();
    this.players.backfillPaidSquares();

    // Calculate winners — skip for ESPN-linked games (the server, or syncFromEspn when
    // serverScoring is false, handles period-aware winners)
    if (!state.espnEventId && Object.values(state.scores).some(score => score.home > 0 || score.away > 0)) {
      this.scoring.calculateWinners();
    }

    this.espn.onGameData();
    this.draw.initDisplayNumbers();
    // Play the number reveal the first time this browser sees these numbers
    this.draw.checkAndPlayAnimation();
  }

  /**
   * No game has this code (a mistyped link, or a board that was deleted). The page has no "not found" screen: it sends
   * signed-out visitors to the landing page and signed-in ones to the dashboard, with the code in the join field and
   * "Game not found" under it. The skeleton stays up meanwhile.
   */
  private async leaveMissingGame(gameId: string): Promise<void> {
    this.state.gameNotFound.set(true);
    this.state.isLoading.set(true);
    if (!isPlatformBrowser(this.platformId)) return;
    await this.authService.waitForAuthReady();
    if (this.state.destroyed || this.state.gameId !== gameId) return;
    const target = this.authService.isAuthenticated() ? '/dashboard' : '/';
    this.router.navigate([target], { queryParams: { join: normalizeGameCode(gameId), missing: 1 }, replaceUrl: true });
  }

  private async loadGame(gameId: string): Promise<void> {
    const state = this.state;
    // Switching boards reuses this page: drop the previous board's listener and state
    this.gameSub?.unsubscribe();
    this.gameSub = null;
    // Switching from a board already on screen (arrow keys, Your games) keeps it showing until the next one's data
    // arrives, then swaps in place. Only a first load, or one after "not found", shows the skeleton.
    const switching = !state.isLoading() && !state.gameNotFound();
    state.gameNotFound.set(false);
    this.openBoardsLoad = null;
    state.latestEspnLive = null;
    this.espn.reset();
    this.draw.stopAnimation();
    if (!switching) {
      state.isLoading.set(true);
      this.ui.pickSkeletonSize(gameId);
      this.resetBoardView();
    }

    const exists = await this.gameService.gameExists(gameId);
    if (state.destroyed || state.gameId !== gameId) return;
    if (!exists) {
      this.leaveMissingGame(gameId);
      return;
    }
    // Your Games lists boards opened on this device, which is the only list a guest has
    if (isPlatformBrowser(this.platformId)) recordRecentVisit(gameId);

    this.subscribeToBoard(gameId, switching);
  }

  /** The host's other opted-in open boards, loaded once per board. */
  private loadOpenBoards(): Promise<OpenBoardRow[]> {
    if (this.openBoardsFor !== this.state.gameId || !this.openBoardsLoad) {
      this.openBoardsFor = this.state.gameId;
      this.openBoardsLoad = this.gameService.getOpenBoards(this.state.gameOwnerId, this.state.gameId).then(rows => {
        this.state.openBoards.set(rows);
        return rows;
      });
    }
    return this.openBoardsLoad;
  }

  /** Clears what belongs to the board on screen, so the next board starts on its squares with nothing selected. */
  private resetBoardView(): void {
    // A board opened from the More list starts on its squares, not the list it came from
    this.ui.activeTab = 'board';
    this.state.openBoards.set([]);
    this.ui.selectedPlayer = null;
    this.ui.highlightedSquare = null;
    this.draw.reset();
    this.state.linkedEspnGame.set(null);
  }

  /** The host stamps how long this board is ad-free; the rules cap it at their real pass. */
  private async stampAdFree(): Promise<void> {
    const uid = this.authService.realUser()?.uid;
    if (!uid) return;
    const until = await this.gameService.adFreeUntilFor(uid);
    if (until > this.state.adFreeUntil) {
      this.state.adFreeUntil = until;
      this.gameService.updateGame(this.state.gameId, { adFreeUntil: until }).catch(() => {});
    }
  }

  /**
   * Follows the board's snapshots. The first null is the subject's starting value (the board was just checked to
   * exist), so it is skipped; a later null means the board was deleted.
   */
  private subscribeToBoard(gameId: string, switching: boolean): void {
    const state = this.state;
    let isFirstEmission = true;
    let awaitingData = true;
    this.gameSub = this.gameService.subscribeToGame(gameId).subscribe((data: GameData | null) => {
      if (isFirstEmission && !data) {
        isFirstEmission = false;
        return;
      }
      isFirstEmission = false;
      const firstData = awaitingData && !!data;
      if (data) awaitingData = false;
      if (switching && firstData) this.resetBoardView();
      state.isLoading.set(false);

      if (!data) {
        this.leaveMissingGame(gameId);
        return;
      }
      this.applySnapshot(data);
      if (switching && firstData) this.ui.slideInBoard();
    });
    this.subscription.add(this.gameSub);
  }
}
