import { computed, inject, Injectable, Signal, signal, WritableSignal } from '@angular/core';
import { BoardSize, EspnLiveSnapshot, GameData, getBoardDimensions } from '../../../core/services/game.service';
import { AuthService, AuthUser } from '../../../core/services/auth.service';
import { EspnGame, SportType } from '../../../core/services/espn.service';
import { PlanService } from '../../../core/services/plan.service';
import { SanitizationService } from '../../../core/services/sanitization.service';
import { TeamLogoService } from '../../../core/services/team-logo.service';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, splitFractions } from '../../../core/plans';
import { AutoManageSettings } from '../../../core/utils/auto-manage';
import { confirmedPlayers } from '../../../core/utils/paid-squares';
import type { PaidCounts } from '../../../core/utils/game-data';
import { isGameOver, startedQuarterCount } from '../../../core/utils/quarter-label';
import { smallerBoardSizes } from '../../../core/utils/shuffle-squares';
import { squareLimitState } from '../../../core/utils/square-limit';
import type { OpenBoardRow } from '../../../core/utils/open-boards';
import { normalizePlayerColors, PLAYER_COLORS } from '../utils/player-colors';
import { quarterLabels, QuarterWin } from '../utils/quarter-labels';
import { BoardLayout, BoardScores, emptyScores, lastPlayedQuarter, leaderSquare, playerStatsFor, quarterWins } from '../utils/board-math';
import type { PlayerStats } from '../types';

/**
 * The game page's store: the board on screen, as the game listener last delivered it plus this browser's edits,
 * and everything derived from it. Provided on the page component, so each page gets its own.
 */
@Injectable()
export class GameStateService {
  // Public properties

  /** The host's plan stamp: no ads on this board until this time (ms). */
  public adFreeUntil: number = 0;
  public autoManage: AutoManageSettings | undefined;
  public availableColors: string[] = PLAYER_COLORS;
  public awayNumbers: (number | null)[] = [];
  public awayTeam: string = '';
  public boardSize: BoardSize = 100;
  /** Paid players who hold no squares beyond what the host confirmed; the page shows these as Confirmed. */
  public confirmedPlayers: Set<string> = new Set();
  /** The name this viewer plays as, sanitized. PlayerNameService owns the rules for changing it. */
  public currentPlayerName: string = '';
  public currentPrice: number = 10;
  public readonly currentUser: Signal<AuthUser | null> = inject(AuthService).currentUser;
  /** Set once the page is torn down, so late async results are dropped. */
  public destroyed: boolean = false;
  public emptyQuarterRule: EmptyQuarterRule = DEFAULT_EMPTY_QUARTER_RULE;
  public espnEventId: string | undefined;
  public espnSport: SportType = 'nfl';
  public gameId: string = '';
  public gameName: string = 'Football Squares';
  public readonly gameNotFound: WritableSignal<boolean> = signal(false);
  public gameOwnerId: string = '';
  public homeNumbers: (number | null)[] = [];
  public homeTeam: string = '';
  public hostNote: string = '';
  public readonly isGameOwner: Signal<boolean> = computed(() => {
    const role = this.authService.previewRole();
    if (role === 'owner' || role === 'cohost') return role === 'owner';
    const user = this.authService.currentUser();
    return !!user && user.uid === this.ownerId();
  });
  public readonly isLoading: WritableSignal<boolean> = signal(true);
  public isLocked: boolean = false;
  public readonly isManager: Signal<boolean> = computed(() => {
    const role = this.authService.previewRole();
    if (role === 'owner' || role === 'cohost') return role === 'cohost';
    const user = this.authService.currentUser();
    const managerId = this.managerId();
    return !!user && !!managerId && user.uid === managerId;
  });
  public isRandomized: boolean = false;
  public latestEspnLive: EspnLiveSnapshot | null = null;
  public readonly linkedEspnGame: WritableSignal<EspnGame | null> = signal(null);
  /** Event id the summary feed says is final. Past games drop off the scoreboard feed, so this covers them. */
  public readonly linkedFinalEventId: WritableSignal<string | null> = signal(null);
  public readonly managerId: WritableSignal<string | null> = signal(null);
  /** Season Pass: most squares one name can claim here (undefined = no limit). */
  public maxSquaresPerPlayer: number | undefined;
  public readonly openBoards: WritableSignal<OpenBoardRow[]> = signal([]);
  public readonly ownerId: WritableSignal<string> = signal('');
  public paidPlayers: Set<string> = new Set();
  /** How many squares each paid name held when the host confirmed it. */
  public paidSquares: PaidCounts = {};
  public playerColors: { [key: string]: string } = {};
  public playerStats: { [key: string]: PlayerStats } = {};
  public playerUserIds: { [name: string]: string } = {};
  public quarterPayouts: { q1: number; q2: number; q3: number; q4: number } = { q1: 0.2, q2: 0.2, q3: 0.2, q4: 0.4 };
  public quarterSplit: QuarterSplit | null = null;
  public scores: BoardScores = emptyScores();
  public selectedSquares: { [key: string]: string } = {};
  public showInOpenBoards: boolean = false;
  public totalPot: number = 0;
  public winners: { [key: string]: string } = {};

  /** Rows use paired digits on 5-row boards. */
  public get awayNumbersPaired(): boolean {
    return getBoardDimensions(this.boardSize).rows === 5;
  }

  /** What the winner math needs from the board on screen. */
  public get board(): BoardLayout {
    return {
      selectedSquares: this.selectedSquares,
      homeNumbers: this.homeNumbers,
      awayNumbers: this.awayNumbers,
      homePaired: this.homeNumbersPaired,
      awayPaired: this.awayNumbersPaired
    };
  }

  /** The square the current score points to, once the numbers are drawn. */
  public get currentLeaderSquare(): string | null {
    if (!this.isRandomized) return null;
    return leaderSquare(this.board, this.scores, !!this.espnEventId);
  }

  /** Columns use paired digits on 5-column boards. */
  public get homeNumbersPaired(): boolean {
    return getBoardDimensions(this.boardSize).cols === 5;
  }

  public get playerCount(): number {
    return Object.keys(this.playerStats).length;
  }

  /** Tab text for each winning square ("Q1", "FINAL", "Q1 Q3"), keyed by "row-col". */
  public get winnerQuarterLabels(): Record<string, string> {
    return quarterLabels(this.drawnQuarterWins);
  }

  /** The squares that won a quarter. */
  public get winnerSquares(): string[] {
    return this.drawnQuarterWins.map(w => w.key);
  }

  // Public functions

  /** First half of a game snapshot: the board itself (squares, numbers, scores, lock state and limits). */
  public applyCoreData(data: GameData): void {
    this.gameName = data.name || 'Football Squares';
    this.gameOwnerId = data.ownerId || '';
    this.boardSize = data.boardSize || 100;
    const { rows, cols } = getBoardDimensions(this.boardSize);
    this.selectedSquares = data.selectedSquares || {};
    this.homeNumbers = data.homeNumbers || Array(cols).fill(null);
    this.awayNumbers = data.awayNumbers || Array(rows).fill(null);
    this.scores = data.scores || this.scores;
    this.currentPrice = data.pricePerSquare || 10;
    this.isRandomized = data.isRandomized || false;
    this.isLocked = data.isLocked || false;
    this.showInOpenBoards = !!data.showInOpenBoards;
    this.autoManage = data.autoManage;
    this.maxSquaresPerPlayer = data.maxSquaresPerPlayer;
  }

  /** Second half of a game snapshot: teams, note, split, players, ESPN link and roles. True when the host note changed. */
  public applyDetailData(data: GameData): boolean {
    this.homeTeam = data.homeTeam || '';
    this.awayTeam = data.awayTeam || '';
    const note = data.hostNote || '';
    const noteChanged = note !== this.hostNote;
    this.hostNote = note;
    this.quarterSplit = data.quarterSplit || null;
    this.quarterPayouts = splitFractions(data.quarterSplit);
    this.emptyQuarterRule = data.emptyQuarterRule || DEFAULT_EMPTY_QUARTER_RULE;
    this.adFreeUntil = data.adFreeUntil || 0;
    this.paidPlayers = new Set(data.paidPlayers || []);
    this.paidSquares = data.paidSquares || {};
    this.playerColors = normalizePlayerColors(data.playerColors || {});
    this.winners = data.winners || {};
    this.playerUserIds = data.playerUserIds || {};
    this.espnEventId = data.espnEventId || undefined;
    this.espnSport = data.espnSport || 'nfl';
    this.latestEspnLive = data.espnLive || null;
    this.ownerId.set(data.ownerId || '');
    this.managerId.set(data.managerId || null);
    return noteChanged;
  }

  public calculatePlayerStats(): void {
    const { stats, totalPot } = playerStatsFor(this.selectedSquares, this.currentPrice);
    this.playerStats = stats;
    this.totalPot = totalPot;
    this.confirmedPlayers = confirmedPlayers(this.selectedSquares, this.paidPlayers, this.paidSquares);
  }

  /** The host can switch on lock-and-draw before kickoff: Season Pass, a linked game, numbers not drawn yet. */
  public canAutoManage(): boolean {
    return this.isGameOwner() && this.planService.features().autoManage && !!this.espnEventId && !(this.isLocked && this.isRandomized);
  }

  /** Whether this board can be shown to players on the host's full boards. */
  public canShowInOpenBoards(): boolean {
    const { rows, cols } = getBoardDimensions(this.boardSize);
    const eligible = !this.isLocked && this.squaresPicked() < rows * cols;
    return this.isGameOwner() && this.planService.features().activeBoards > 1 && (this.showInOpenBoards || eligible);
  }

  /**
   * How many quarters are finished (always the first N). An unclaimed square only settles a quarter once it is over.
   * Linked boards follow the feed's period, because the poller writes the running total into later quarters.
   */
  public completedQuarterCount(): number {
    if (this.isGameOver()) return 4;
    if (this.espnEventId) return Math.max(0, Math.min(3, (this.linkedEspnGame()?.period ?? 0) - 1));
    return lastPlayedQuarter(this.scores) + 1;
  }

  /** A full board shows a way out to people who hold no square on it (not the host or co-host). */
  public fullBoardNotice(): boolean {
    const { rows, cols } = getBoardDimensions(this.boardSize);
    const me = this.currentPlayerName.toLowerCase();
    const holdsSquare = !!me && Object.values(this.selectedSquares).some(name => name.toLowerCase() === me);
    return this.squaresPicked() >= rows * cols && !this.isGameOwner() && !this.isManager() && !holdsSquare;
  }

  /** Same rule as Presentation mode: see isGameOver in core/utils/quarter-label.ts. */
  public isGameOver(): boolean {
    return isGameOver({
      espnEventId: this.espnEventId,
      espnLive: this.latestEspnLive,
      linkedStatus: this.linkedEspnGame()?.status ?? (this.espnEventId && this.linkedFinalEventId() === this.espnEventId ? 'post' : null),
      q4: this.scores.q4,
      q4Winner: this.winners['q4']
    });
  }

  /** The owner or the co-host. */
  public isHost(): boolean {
    return this.isGameOwner() || this.isManager();
  }

  /** The linked ESPN game is being played right now. */
  public isLiveGame(): boolean {
    return this.linkedEspnGame()?.status === 'in';
  }

  /** Ads show on free hosts' boards. The admin can preview a plan from the View-as switcher. */
  public showAd(): boolean {
    if (this.authService.isPreviewAdmin() && this.planService.plan() !== 'admin') {
      return !this.planService.features().adFree;
    }
    return Date.now() >= this.adFreeUntil;
  }

  /** Sizes this board could shrink to, largest first: picks fit and numbers are not drawn. */
  public shrinkSizes(): BoardSize[] {
    return smallerBoardSizes(this.boardSize, this.squaresPicked(), this.isRandomized);
  }

  /** "3 of 5 squares" for the player's own name (the host and co-host included), or null when there is no limit. */
  public squareCounter(): { held: number; max: number; full: boolean } | null {
    return squareLimitState(this.selectedSquares, this.sanitizationService.sanitizePlayerName(this.currentPlayerName || ''), this.maxSquaresPerPlayer);
  }

  public squaresPicked(): number {
    return Object.keys(this.selectedSquares).length;
  }

  /** Quarters that have started, for the Winners tiles (see startedQuarterCount). */
  public startedQuarterCount(): number {
    const game = this.linkedEspnGame();
    return startedQuarterCount({
      espnEventId: this.espnEventId,
      gameOver: this.isGameOver(),
      linkedStatus: game?.status ?? null,
      period: game?.period ?? null
    });
  }

  /** Both teams' logos for the board caption and box score: our NFL table, or ESPN's logo for other leagues. */
  public teamLogos(): { away: string | null; home: string | null } {
    const t = this.teamLogoService.teams({ awayTeam: this.awayTeam, homeTeam: this.homeTeam, espnEventId: this.espnEventId, espnSport: this.espnSport }, this.linkedEspnGame());
    return { away: t.away.logo, home: t.home.logo };
  }

  // Private properties

  private readonly authService: AuthService = inject(AuthService);
  private readonly planService: PlanService = inject(PlanService);
  private readonly sanitizationService: SanitizationService = inject(SanitizationService);
  private readonly teamLogoService: TeamLogoService = inject(TeamLogoService);

  /** Each quarter's winning square, once the numbers are drawn. */
  private get drawnQuarterWins(): QuarterWin[] {
    return this.isRandomized ? quarterWins(this.board, this.scores, this.winners) : [];
  }
}
