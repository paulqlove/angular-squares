import { computed, Component, OnInit, OnDestroy, ViewChild, HostListener, signal, inject, effect, ChangeDetectionStrategy, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { boardArrowStep } from '../../core/utils/board-keys';
import { isGameOver, startedQuarterCount } from '../../core/utils/quarter-label';
import { GameService, GameData, EspnLiveSnapshot, BoardSize, getBoardDimensions } from '../../core/services/game.service';
import { environment } from '../../../environments/environment';
import { PLAYER_COLORS, normalizePlayerColors } from './utils/player-colors';
import { PreviewRole } from '../../core/services/role-preview.service';
import { PlanService } from '../../core/services/plan.service';
import { DEFAULT_EMPTY_QUARTER_RULE, EmptyQuarterRule, QuarterSplit, splitFractions } from '../../core/plans';
import { AutoManageSettings, autoRunLabel } from '../../core/utils/auto-manage';
import { squareLimitMessage, squareLimitState } from '../../core/utils/square-limit';
import { AdSlotComponent } from '../../components/ui/ad-slot/ad-slot.component';
import { AuthService } from '../../core/services/auth.service';
import { EspnService, EspnGame, SportType } from '../../core/services/espn.service';
import { ConfirmService } from '../../core/services/confirm.service';
import { ToastService } from '../../core/services/toast.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { WalkthroughService, WalkthroughStep } from '../../core/services/walkthrough.service';
import { Subscription } from 'rxjs';
import { GameSkeletonComponent } from './components/game-skeleton/game-skeleton.component';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { PlayersListComponent } from './components/players-list/players-list.component';
import { WinnersAndPayoutsComponent } from './components/winners-and-payouts/winners-and-payouts.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import {
  heroLockOpen,
  heroLockClosed,
  heroChevronDown,
  heroChevronRight,
  heroTrash,
  heroShare,
  heroSquares2x2,
  heroClipboard,
  heroPencilSquare,
  heroXMark,
  heroArrowPath,
  heroSparkles,
  heroUsers
} from '@ng-icons/heroicons/outline';
import { GameStatusComponent } from './components/game-status/game-status.component';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { EditGameDialogComponent, EditGameValues } from './components/edit-game-dialog/edit-game-dialog.component';
import { OpenBoardsListComponent } from './components/open-boards-list/open-boards-list.component';
import type { OpenBoardRow } from '../../core/utils/open-boards';
import { ShrinkBoardDialogComponent } from './components/shrink-board-dialog/shrink-board-dialog.component';
import { smallerBoardSizes } from '../../core/utils/shuffle-squares';
import { PaymentDialogComponent } from './components/payment-dialog/payment-dialog.component';
import { ProbabilityHeatmapComponent } from './components/probability-heatmap/probability-heatmap.component';
import { BoxScoreComponent, ManualScores } from './components/box-score/box-score.component';
import { HelpMenuComponent } from '../../components/ui/help-menu/help-menu.component';
import { ProfileMenuComponent } from '../../components/ui/profile-menu/profile-menu.component';
import { ShareDialogComponent } from '../../components/ui/share-dialog/share-dialog.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';

@Component({
    selector: 'app-super-bowl-squares',
    imports: [
    FormsModule,
    NgIconComponent,
    GameBoardComponent,
    GameSkeletonComponent,
    PlayersListComponent,
    WinnersAndPayoutsComponent,
    GameStatusComponent,
    AppHeaderComponent,
    EditGameDialogComponent,
    ShrinkBoardDialogComponent,
    OpenBoardsListComponent,
    PaymentDialogComponent,
    ProbabilityHeatmapComponent,
    BoxScoreComponent,
    AuthModalComponent,
    HelpMenuComponent,
    ProfileMenuComponent,
    ShareDialogComponent,
    AdSlotComponent
],
    providers: [
        provideIcons({
            heroLockOpen,
            heroLockClosed,
            heroChevronDown,
            heroChevronRight,
            heroTrash,
            heroShare,
            heroSquares2x2,
            heroClipboard,
            heroPencilSquare,
            heroXMark,
            heroArrowPath,
            heroSparkles,
            heroUsers
        })
    ],
    templateUrl: './super-bowl-squares.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./super-bowl-squares.component.scss']
})
export class SuperBowlSquaresComponent implements OnInit, OnDestroy {
  @ViewChild('paymentDialog') paymentDialog!: PaymentDialogComponent;

  // Game state
  gameId: string = '';
  gameName: string = 'Football Squares';
  gameOwnerId: string = '';
  boardSize: BoardSize = 100;
  homeTeam: string = '';
  awayTeam: string = '';
  selectedSquares: { [key: string]: string } = {};
  playerStats: { [key: string]: { squares: number, total: number } } = {};
  currentPrice: number = 10;
  homeNumbers: (number | null)[] = [];
  awayNumbers: (number | null)[] = [];
  scores = {
    q1: { home: 0, away: 0 },
    q2: { home: 0, away: 0 },
    q3: { home: 0, away: 0 },
    q4: { home: 0, away: 0 }
  };
  winners: { [key: string]: string } = {};
  playerColors: { [key: string]: string } = {};
  playerUserIds: { [name: string]: string } = {};
  totalPot: number = 0;
  quarterSplit: QuarterSplit | null = null;
  emptyQuarterRule: EmptyQuarterRule = DEFAULT_EMPTY_QUARTER_RULE;
  adFreeUntil = 0;
  private adStampDone = false;
  availableColors = PLAYER_COLORS;

  quarterPayouts = {
    q1: 0.2,
    q2: 0.2,
    q3: 0.2,
    q4: 0.4
  };

  private subscription: Subscription = new Subscription();
  private _currentPlayer = '';
  get currentPlayer(): string {
    return this._currentPlayer;
  }
  set currentPlayer(value: string) {
    this._currentPlayer = this.sanitizePlayerName(value);
    this.checkDuplicateName();
  }
  duplicateNameWarning = signal<string | null>(null);
  isRandomized: boolean = false;
  isLocked: boolean = false;
  /** Below the lg breakpoint the list starts folded so Winners is not pushed far down the page. */
  isPlayersListVisible: boolean = !(typeof window !== 'undefined' && window.matchMedia?.('(max-width: 1023px)').matches);
  showAlert: boolean = false;
  alertMessage: string = '';
  takenByPlayer: string = '';
  selectedPlayer: string | null = null;
  highlightedSquare: string | null = null;
  hostNote = '';
  paidPlayers: Set<string> = new Set();
  activeTab: 'board' | 'probabilities' | 'boxscore' | 'more' = 'board';

  // Injected services
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  protected planService = inject(PlanService);
  private espnService = inject(EspnService);
  private confirmService = inject(ConfirmService);
  private toastService = inject(ToastService);
  private walkthroughService = inject(WalkthroughService);
  private sanitizationService = inject(SanitizationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private gameSub: Subscription | null = null;
  private hostBoardIds: string[] = [];
  protected slideDir = signal<'left' | 'right' | ''>('');

  private gameboardWalkthroughSteps: WalkthroughStep[] = [
    {
      target: 'player-name',
      title: 'Your name',
      description: 'Your name is what other players see on the squares you claim. Set it here, or change it later from your profile menu.',
      position: 'bottom'
    },
    {
      target: 'game-board',
      title: 'The Game Board',
      description: 'Click any empty square to claim it. Check the Heatmap tab to see how often each square\'s digit pair has come up.',
      position: 'right'
    },
    {
      target: 'players-list',
      title: 'Players List',
      description: 'See all players and their squares. Click a name to highlight their squares on the board.',
      position: 'left'
    },
    {
      target: 'share',
      title: 'Share',
      description: 'Share gives you the game code, the invite link and a TV link.',
      position: 'bottom'
    },
    {
      target: 'host-tools',
      title: 'Host tools',
      description: 'Lock the board, draw the numbers, manage players, and edit team names, points and your note.',
      position: 'top'
    },
    {
      target: 'winners-payouts',
      title: 'Winners',
      description: 'After numbers are randomized and scores come in, you\'ll see the winners for each quarter here.',
      position: 'top'
    }
  ];

  // Auth modal state for unauthenticated square clicks
  showAuthModal = signal(false);
  pendingSquare: { row: number; col: number } | null = null;

  constructor() {
    this.pickSkeletonSize(this.route.snapshot.params['gameId'] ?? '');
    // Reactively update currentPlayer when auth state changes (e.g., Google sign-in after page load)
    // Lift toasts and the preview switcher above the floating host bar
    effect(() => {
      const hasHostBar = this.isGameOwner() || this.isManager();
      if (typeof document !== 'undefined') document.body.classList.toggle('has-host-bar', hasHostBar);
    });

    effect(() => {
      const user = this.authService.currentUser();
      const previewRole = this.authService.previewRole();
      if (previewRole !== this.lastPreviewRole) {
        // Role preview switched: play as the previewed user (or nobody when signed out)
        this.lastPreviewRole = previewRole;
        this._currentPlayer = user?.displayName || '';
        return;
      }
      if (user?.displayName && !this._currentPlayer) {
        this._currentPlayer = user.displayName;
      }
    });
  }

  // UI state
  showSettings = signal(false);
  showShrinkSuggestion = signal(false);
  openBoards = signal<OpenBoardRow[]>([]);
  showInOpenBoards = false;
  readonly autoRunLabel = autoRunLabel;
  /** Season Pass: most squares one name can claim here (undefined = no limit). */
  maxSquaresPerPlayer: number | undefined;
  autoManage: AutoManageSettings | undefined;
  private openBoardsFor = '';
  private openBoardsLoad: Promise<OpenBoardRow[]> | null = null;
  isLoading = signal(true);
  skeletonFade = signal(false);
  skeletonSize = signal<BoardSize>(100);
  gameNotFound = signal(false);
  showShareModal = signal(false);
  showNameEditModal = signal(false);
  editingName = '';
  isSavingName = signal(false);
  showForceNameChangeModal = signal(false);
  forceNameValue = '';
  isSavingForceName = signal(false);

  // Auth state
  currentUser = this.authService.currentUser;
  isGameOwner = computed(() => {
    const role = this.authService.previewRole();
    if (role === 'owner' || role === 'cohost') return role === 'owner';
    const user = this.authService.currentUser();
    return !!user && user.uid === this.ownerId();
  });
  isManager = computed(() => {
    const role = this.authService.previewRole();
    if (role === 'owner' || role === 'cohost') return role === 'cohost';
    const user = this.authService.currentUser();
    const managerId = this.managerId();
    return !!user && !!managerId && user.uid === managerId;
  });
  private lastPreviewRole: PreviewRole = 'actual';
  private ownerId = signal('');
  private managerId = signal<string | null>(null);

  // ESPN sync state
  linkedEspnGame = signal<EspnGame | null>(null);
  espnEventId: string | undefined;
  espnSport: SportType = 'nfl';
  isSyncingEspn = signal(false);
  espnSyncError = signal<string | null>(null);
  lastSyncTime = signal<Date | null>(null);

  // Auto-polling for live scores. Off when Cloud Functions own the score writes.
  private pollingInterval: ReturnType<typeof setInterval> | null = null;
  private liveIndexEnsuredFor: string | null = null;
  private latestEspnLive: EspnLiveSnapshot | null = null;
  /** Event id the summary feed says is final. Past games drop off the scoreboard feed, so this covers them. */
  private linkedFinalEventId = signal<string | null>(null);
  private finalCheckedFor: string | null = null;

  // Number reveal animation state
  private platformId = inject(PLATFORM_ID);
  isAnimatingNumbers = signal(false);
  displayHomeNumbers = signal<(number | null)[]>([]);
  displayAwayNumbers = signal<(number | null)[]>([]);
  homeNumbersLocked = signal<boolean[]>([]);
  awayNumbersLocked = signal<boolean[]>([]);
  private animationIntervalId: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    void this.bindRoute();
  }

  private destroyed = false;

  private async bindRoute(): Promise<void> {
    // Firebase loads with the game route, not with the landing page.
    await this.authService.ensureInitialized();
    if (this.destroyed) return;

    const user = this.authService.currentUser();
    if (user?.displayName) {
      this._currentPlayer = user.displayName;
    }

    if (user && !user.isGuest) {
      this.gameService.getUserGameIds(user.uid).then(ids => (this.hostBoardIds = ids)).catch(() => {});
    }

    this.subscription.add(
      this.route.params.subscribe(params => {
        const gameId = params['gameId'];
        if (gameId) {
          this.gameId = gameId;
          this.loadGame(gameId);
        }
      })
    );
  }

  private pickSkeletonSize(gameId: string): void {
    if (!isPlatformBrowser(this.platformId)) return;
    const valid = (v: unknown): v is BoardSize => v === 25 || v === 50 || v === 100;
    let size: unknown = history.state?.boardSize;
    if (!valid(size)) {
      try {
        size = Number(localStorage.getItem(`qs_size_${gameId}`));
      } catch {
        size = null;
      }
    }
    this.skeletonFade.set(!valid(size));
    this.skeletonSize.set(valid(size) ? size : 100);
  }

  private async loadGame(gameId: string): Promise<void> {
    // Switching boards reuses this component: drop the previous board's listener and state
    this.gameSub?.unsubscribe();
    this.gameSub = null;
    this.gameNotFound.set(false);
    this.isLoading.set(true);
    this.pickSkeletonSize(gameId);
    // A board opened from the More list starts on its squares, not the list it came from
    this.activeTab = 'board';
    this.openBoards.set([]);
    this.openBoardsLoad = null;
    this.liveIndexEnsuredFor = null;
    this.latestEspnLive = null;
    this.selectedPlayer = null;
    this.highlightedSquare = null;
    this.displayHomeNumbers.set([]);
    this.displayAwayNumbers.set([]);
    this.linkedEspnGame.set(null);
    this.stopPolling();
    this.stopAnimation();

    // Check if game exists
    const exists = await this.gameService.gameExists(gameId);
    if (this.destroyed || this.gameId !== gameId) return;
    if (!exists) {
      this.gameNotFound.set(true);
      this.isLoading.set(false);
      return;
    }

    // Subscribe to game updates (skip initial null from BehaviorSubject since we already verified game exists)
    let isFirstEmission = true;
    this.gameSub = this.gameService.subscribeToGame(gameId).subscribe((data: GameData | null) => {
        // Skip the initial null emission from BehaviorSubject - we already verified game exists
        if (isFirstEmission && !data) {
          isFirstEmission = false;
          return;
        }
        isFirstEmission = false;
        this.isLoading.set(false);

        if (data) {
          this.gameName = data.name || 'Football Squares';
          this.gameOwnerId = data.ownerId || '';
          this.boardSize = data.boardSize || 100;
          try {
            localStorage.setItem(`qs_size_${this.gameId}`, String(this.boardSize));
          } catch {}
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
          this.loadOpenBoards();
          if (this.fullBoardNotice()) {
            this.gameService.recordBoardStatOnce(this.gameId, 'fullBoardViews');
            this.loadOpenBoards().then(rows => {
              if (rows.length) this.gameService.recordBoardStatOnce(this.gameId, 'fullBoardViewsWithOpenBoards');
            });
          }
          this.homeTeam = data.homeTeam || '';
          this.awayTeam = data.awayTeam || '';
          this.hostNote = data.hostNote || '';
          this.quarterSplit = data.quarterSplit || null;
          this.quarterPayouts = splitFractions(data.quarterSplit);
          this.emptyQuarterRule = data.emptyQuarterRule || DEFAULT_EMPTY_QUARTER_RULE;
          this.adFreeUntil = data.adFreeUntil || 0;
          this.paidPlayers = new Set(data.paidPlayers || []);
          this.playerColors = normalizePlayerColors(data.playerColors || {});
          this.winners = data.winners || {};
          this.playerUserIds = data.playerUserIds || {};
          this.espnEventId = data.espnEventId || undefined;
          this.espnSport = data.espnSport || 'nfl';
          this.latestEspnLive = data.espnLive || null;

          // Check if current user is the game owner or manager
          this.ownerId.set(data.ownerId || '');
          this.managerId.set(data.managerId || null);
          if (!this.adStampDone && this.isGameOwner() && this.authService.previewRole() === 'actual') {
            this.adStampDone = true;
            void this.stampAdFree();
          }

          Object.values(this.selectedSquares).forEach(playerName => {
            if (!this.playerColors[playerName]) {
              this.getPlayerColor(playerName);
            }
          });

          this.calculatePlayerStats();
          this.checkDuplicateName();

          // Backfill playerUserIds for current user if they have squares but no mapping
          const currentUser = this.authService.currentUser();
          if (currentUser && this._currentPlayer) {
            const hasSquares = Object.values(this.selectedSquares).some(
              p => p.toLowerCase() === this._currentPlayer.toLowerCase()
            );
            if (hasSquares && !this.playerUserIds[this._currentPlayer]) {
              this.playerUserIds[this._currentPlayer] = currentUser.uid;
              this.gameService.updateGame(this.gameId, { playerUserIds: this.playerUserIds }).catch(() => {});
            }
          }

          // Calculate winners — skip for ESPN-linked games (the server, or syncFromEspn when
          // serverScoring is false, handles period-aware winners)
          if (!this.espnEventId && Object.values(this.scores).some(score => score.home > 0 || score.away > 0)) {
            this.calculateWinners();
          }

          if (environment.serverScoring) {
            this.applyServerScoreDisplay();
            this.ensureLiveIndex();
          } else if (this.espnEventId && this.espnEventId !== this.linkedEspnGame()?.id) {
            this.fetchLinkedEspnGame();
            this.syncFromEspn();
          } else if (this.espnEventId && this.linkedEspnGame()) {
            // ESPN game already loaded — re-sync to get period-aware winners
            this.syncFromEspn();
          } else if (!this.espnEventId && this.linkedEspnGame()) {
            this.linkedEspnGame.set(null);
            this.stopPolling();
          }

          // Initialize display numbers if not already set (before checking animation)
          if (this.displayHomeNumbers().length === 0) {
            this.displayHomeNumbers.set([...this.homeNumbers]);
            this.displayAwayNumbers.set([...this.awayNumbers]);
            this.homeNumbersLocked.set(Array(this.homeNumbers.length).fill(true));
            this.awayNumbersLocked.set(Array(this.awayNumbers.length).fill(true));
          }

          // Check if we need to play number reveal animation (first time seeing these numbers)
          this.checkAndPlayAnimation();
        } else {
          this.gameNotFound.set(true);
        }
      });
    this.subscription.add(this.gameSub);
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.classList.remove('has-host-bar');
    this.destroyed = true;
    this.subscription.unsubscribe();
    this.gameService.unsubscribe();
    this.stopPolling();
    this.stopAnimation();
  }

  private startPolling(): void {
    if (environment.serverScoring || this.pollingInterval) return;
    this.pollingInterval = setInterval(() => {
      if (this.espnEventId && this.linkedEspnGame()?.status === 'in') {
        this.syncFromEspn();
      }
    }, 30000); // 30 seconds
  }

  private stopPolling(): void {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private calculatePlayerStats(): void {
    const stats: { [key: string]: { squares: number, total: number } } = {};
    let totalPot = 0;

    Object.entries(this.selectedSquares).forEach(([key, player]) => {
      if (!stats[player]) {
        stats[player] = { squares: 0, total: 0 };
      }
      stats[player].squares += 1;
      stats[player].total += this.currentPrice;
      totalPot += this.currentPrice;
    });

    this.playerStats = stats;
    this.totalPot = totalPot;
  }

  private getPlayerColor(playerName: string): string {
    if (this.playerColors[playerName]) {
      return this.playerColors[playerName];
    }

    const usedColors = Object.values(this.playerColors);
    // Unused colors first; past 10 players, cycle through the palette
    const color = this.availableColors.find(c => !usedColors.includes(c))
      ?? this.availableColors[usedColors.length % this.availableColors.length];
    this.playerColors[playerName] = color;
    this.gameService.updateGame(this.gameId, { playerColors: this.playerColors }).catch(() => {});
    return color;
  }

  private sanitizePlayerName(name: string): string {
    return this.sanitizationService.sanitizePlayerName(name);
  }

  private checkDuplicateName(): void {
    const sanitizedName = this.sanitizePlayerName(this._currentPlayer);
    if (!sanitizedName) {
      this.duplicateNameWarning.set(null);
      this.showForceNameChangeModal.set(false);
      return;
    }

    const currentUser = this.authService.currentUser();
    const currentUid = currentUser?.uid;

    // Check if this name already exists in the game (case-insensitive)
    const existingName = Object.values(this.selectedSquares).find(
      p => p.toLowerCase() === sanitizedName.toLowerCase()
    );
    if (!existingName) {
      this.duplicateNameWarning.set(null);
      this.showForceNameChangeModal.set(false);
      return;
    }

    // Name exists in game — check playerUserIds for ownership
    const ownerUid = this.playerUserIds[existingName];

    if (ownerUid && currentUid && ownerUid === currentUid) {
      // Same user — allow
      this.duplicateNameWarning.set(null);
      this.showForceNameChangeModal.set(false);
      return;
    }

    if (!ownerUid) {
      // Legacy data — no userId mapping. Allow if it matches their auth name.
      const currentUserName = currentUser?.displayName;
      if (currentUserName?.toLowerCase() === sanitizedName.toLowerCase()) {
        this.duplicateNameWarning.set(null);
        this.showForceNameChangeModal.set(false);
        return;
      }
    }

    // Real conflict — another user owns this name
    if (currentUser?.displayName?.toLowerCase() === sanitizedName.toLowerCase()) {
      // Their auth profile name conflicts — force modal
      this.showForceNameChangeModal.set(true);
      this.forceNameValue = '';
    }
    this.duplicateNameWarning.set(`"${sanitizedName}" is already in use`);
  }

  async onSquareClick(event: { row: number; col: number }): Promise<void> {
    if (this.isLocked) {
      this.toastService.warning('This game is locked. Contact the game owner or co-host to unlock it.');
      return;
    }

    // If not authenticated, show auth modal and remember which square was clicked
    if (!this.authService.currentUser()) {
      this.pendingSquare = event;
      this.showAuthModal.set(true);
      return;
    }

    if (!this.currentPlayer && !this.authService.currentUser()?.isGuest) {
      this.openNameEditModal();
      return;
    }

    if (!this.currentPlayer) {
      this.showAlert = true;
      this.alertMessage = 'Please enter your name first';
      setTimeout(() => {
        this.showAlert = false;
      }, 3000);
      return;
    }

    if (this.duplicateNameWarning()) {
      this.showAlert = true;
      this.alertMessage = this.duplicateNameWarning()!;
      setTimeout(() => {
        this.showAlert = false;
      }, 3000);
      return;
    }

    const key = `${event.row}-${event.col}`;
    const sanitizedPlayer = this.sanitizePlayerName(this.currentPlayer);

    if (this.selectedSquares[key]) {
      if (this.selectedSquares[key].toLowerCase() === sanitizedPlayer.toLowerCase()) {
        const previousSquares = { ...this.selectedSquares };
        const newSelectedSquares = { ...this.selectedSquares };
        delete newSelectedSquares[key];

        this.selectedSquares = newSelectedSquares;
        this.calculatePlayerStats();

        try {
          await this.gameService.updateGame(this.gameId, {
            selectedSquares: newSelectedSquares
          });
        } catch {
          // Rollback on failure
          this.selectedSquares = previousSquares;
          this.calculatePlayerStats();
          this.toastService.error('Could not update the square. Try again.');
        }
      } else {
        this.takenByPlayer = this.selectedSquares[key];
        this.showAlert = true;
        this.alertMessage = `Square already taken by ${this.takenByPlayer}`;
        setTimeout(() => {
          this.showAlert = false;
        }, 3000);
      }
      return;
    }

    const limit = squareLimitState(this.selectedSquares, sanitizedPlayer, this.maxSquaresPerPlayer);
    if (limit?.full) {
      this.toastService.warning(squareLimitMessage(limit.held, limit.max));
      return;
    }

    const previousSquares = { ...this.selectedSquares };
    const newSelectedSquares = {
      ...this.selectedSquares,
      [key]: sanitizedPlayer
    };

    this.selectedSquares = newSelectedSquares;
    this.calculatePlayerStats();

    // Record userId ownership for this player name
    const user = this.authService.currentUser();
    if (user && !this.playerUserIds[sanitizedPlayer]) {
      this.playerUserIds[sanitizedPlayer] = user.uid;
    }

    try {
      await this.gameService.updateGame(this.gameId, {
        selectedSquares: newSelectedSquares,
        playerUserIds: this.playerUserIds
      });
    } catch {
      // Rollback on failure
      this.selectedSquares = previousSquares;
      this.calculatePlayerStats();
      this.toastService.error('Could not claim the square. Try again.');
      return;
    }

    // Track joined game for authenticated non-owner users
    if (user && !user.isGuest && user.uid !== this.gameOwnerId) {
      this.gameService.addJoinedGame(user.uid, this.gameId, this.gameName);
    }
  }

  onScoreChange(event: { quarter: string; scores: { home: number; away: number } }): void {
    const quarter = `q${event.quarter}` as keyof typeof this.scores;
    this.scores[quarter] = {
      home: this.sanitizationService.validateScore(event.scores.home),
      away: this.sanitizationService.validateScore(event.scores.away)
    };
    this.gameService.updateGame(this.gameId, {
      scores: this.scores
    });
    this.calculateWinners();
  }

  onBoxScoreChange(newScores: ManualScores): void {
    this.scores.q1 = { home: newScores.q1.home, away: newScores.q1.away };
    this.scores.q2 = { home: newScores.q2.home, away: newScores.q2.away };
    this.scores.q3 = { home: newScores.q3.home, away: newScores.q3.away };
    this.scores.q4 = { home: newScores.q4.home, away: newScores.q4.away };
    this.gameService.updateGame(this.gameId, {
      scores: this.scores
    });
    this.calculateWinners();
  }

  /** Check if a score digit matches a stored number (handles paired numbers for smaller boards) */
  private digitMatchesNumber(digit: number, storedNumber: number | null, isPaired: boolean): boolean {
    if (storedNumber === null) return false;
    if (!isPaired) return storedNumber === digit;
    // For paired numbers: stored 0 = digits 0,1; stored 1 = digits 2,3; etc.
    return Math.floor(digit / 2) === storedNumber;
  }

  private calculateWinners(): void {
    const newWinners: { [key: string]: string } = {};

    const getWinner = (homeScore: number, awayScore: number): string | null => {
      const homeLastDigit = homeScore % 10;
      const awayLastDigit = awayScore % 10;

      const winningSquare = Object.entries(this.selectedSquares).find(([key]) => {
        const [row, col] = key.split('-').map(Number);
        return this.digitMatchesNumber(awayLastDigit, this.awayNumbers[row], this.awayNumbersPaired) &&
               this.digitMatchesNumber(homeLastDigit, this.homeNumbers[col], this.homeNumbersPaired);
      });

      return winningSquare ? winningSquare[1] : null;
    };

    // Scores are cumulative, so a quarter counts as played if it or any later quarter has points.
    // Unplayed quarters sit at 0-0 and must not award the 0-0 square.
    const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
    let lastPlayed = -1;
    quarters.forEach((quarter, i) => {
      const score = this.scores[quarter];
      if (score && (score.home > 0 || score.away > 0)) lastPlayed = i;
    });
    quarters.forEach((quarter, i) => {
      if (i > lastPlayed) return;
      const score = this.scores[quarter];
      const winner = getWinner(score.home, score.away);
      if (winner) {
        newWinners[quarter] = winner;
      }
    });

    this.winners = newWinners;
    // Only the owner and co-host can write winners; other viewers just compute them locally.
    if (this.isGameOwner() || this.isManager()) {
      this.gameService.updateGame(this.gameId, { winners: newWinners }).catch(() => {});
    }
  }

  private calculateWinnersFromEspn(currentPeriod: number, completed: boolean): void {
    const newWinners: { [key: string]: string } = {};
    const quarterKeys = ['q1', 'q2', 'q3', 'q4'];

    const getWinner = (homeScore: number, awayScore: number): string | null => {
      const homeLastDigit = homeScore % 10;
      const awayLastDigit = awayScore % 10;
      const winningSquare = Object.entries(this.selectedSquares).find(([key]) => {
        const [row, col] = key.split('-').map(Number);
        return this.digitMatchesNumber(awayLastDigit, this.awayNumbers[row], this.awayNumbersPaired) &&
               this.digitMatchesNumber(homeLastDigit, this.homeNumbers[col], this.homeNumbersPaired);
      });
      return winningSquare ? winningSquare[1] : null;
    };

    quarterKeys.forEach((quarter, index) => {
      // Q4 (index 3) requires game completed; Q1-Q3 require period past that quarter
      const isComplete = index === 3 ? completed : currentPeriod > index + 1;
      if (isComplete) {
        const score = this.scores[quarter as keyof typeof this.scores];
        const winner = getWinner(score.home, score.away);
        if (winner) {
          newWinners[quarter] = winner;
        }
      }
    });

    this.winners = newWinners;
    this.gameService.updateGame(this.gameId, { winners: newWinners });
  }

  get currentLeaderSquare(): string | null {
    if (!this.isRandomized) return null;

    // Need scores or a linked ESPN game to show the leader
    const hasScores = Object.values(this.scores).some(s => s.home > 0 || s.away > 0);
    if (!hasScores && !this.espnEventId) return null;

    // Use the latest quarter with scores, or 0-0 for linked ESPN games pre-kickoff
    const quarters = ['q4', 'q3', 'q2', 'q1'] as const;
    let currentScore = { home: 0, away: 0 };
    for (const q of quarters) {
      const s = this.scores[q];
      if (s.home > 0 || s.away > 0) {
        currentScore = s;
        break;
      }
    }

    const homeDigit = currentScore.home % 10;
    const awayDigit = currentScore.away % 10;

    // Find the matching row and column (handling paired numbers)
    const row = this.awayNumbers.findIndex(n => this.digitMatchesNumber(awayDigit, n, this.awayNumbersPaired));
    const col = this.homeNumbers.findIndex(n => this.digitMatchesNumber(homeDigit, n, this.homeNumbersPaired));
    if (row === -1 || col === -1) return null;
    return `${row}-${col}`;
  }

  getQuarterScores(quarter: number): { home: number; away: number } {
    const key = `q${quarter}` as keyof typeof this.scores;
    return this.scores[key];
  }

  async randomizeNumbers(): Promise<void> {
    const { rows, cols } = getBoardDimensions(this.boardSize);

    if (!this.isRandomized && !this.isLocked) {
      this.toastService.warning('Lock the board before drawing numbers.');
      return;
    }
    void this.stopAutoManage();

    if (this.isRandomized) {
      // Stop any running animation first
      this.stopAnimation();

      this.homeNumbers = Array(cols).fill(null);
      this.awayNumbers = Array(rows).fill(null);
      this.isRandomized = false;
      // Winners belong to the numbers that were drawn, so they go with them
      this.winners = {};

      // Clear animation state - set locked to true since empty cells are "done"
      this.displayHomeNumbers.set([...this.homeNumbers]);
      this.displayAwayNumbers.set([...this.awayNumbers]);
      this.homeNumbersLocked.set(Array(cols).fill(true));
      this.awayNumbersLocked.set(Array(rows).fill(true));

      // Reset the animation cookie for this game (re-generate will play animation again)
      this.clearNumbersSeenFlag();

      await this.gameService.updateGame(this.gameId, {
        homeNumbers: this.homeNumbers,
        awayNumbers: this.awayNumbers,
        isRandomized: this.isRandomized,
        winners: {}
      });
      return;
    }

    // For 10-column/row boards: single digits 0-9
    // For 5-column/row boards: paired digits stored as group index (0-4)
    //   Group 0 = digits 0,1; Group 1 = digits 2,3; etc.
    const generateNumbers = (count: number): number[] => {
      if (count === 10) {
        // Standard 10 digits, shuffled
        return Array.from({length: 10}, (_, i) => i).sort(() => Math.random() - 0.5);
      } else {
        // 5 groups (paired digits), shuffled
        return Array.from({length: 5}, (_, i) => i).sort(() => Math.random() - 0.5);
      }
    };

    this.homeNumbers = generateNumbers(cols);
    this.awayNumbers = generateNumbers(rows);
    this.isRandomized = true;

    // Clear the seen flag so animation plays
    this.clearNumbersSeenFlag();

    await this.gameService.updateGame(this.gameId, {
      homeNumbers: this.homeNumbers,
      awayNumbers: this.awayNumbers,
      isRandomized: this.isRandomized
    });

    // Trigger the reveal animation
    this.playNumberRevealAnimation(this.homeNumbers, this.awayNumbers);
  }

  /** Check if user has already seen the number reveal for this game version */
  private hasSeenNumbers(): boolean {
    if (!isPlatformBrowser(this.platformId)) return true;
    try {
      const key = `qs-numbers-seen-${this.gameId}`;
      const stored = localStorage.getItem(key);
      if (!stored) return false;
      const data = JSON.parse(stored);
      // Compare stored numbers with current to detect re-generation
      return JSON.stringify(data.home) === JSON.stringify(this.homeNumbers) &&
             JSON.stringify(data.away) === JSON.stringify(this.awayNumbers);
    } catch {
      return false;
    }
  }

  /** Mark that user has seen the current numbers */
  private markNumbersSeen(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const key = `qs-numbers-seen-${this.gameId}`;
      localStorage.setItem(key, JSON.stringify({
        home: this.homeNumbers,
        away: this.awayNumbers
      }));
    } catch {
      // localStorage not available
    }
  }

  /** Clear the seen flag (for when numbers are regenerated) */
  private clearNumbersSeenFlag(): void {
    if (!isPlatformBrowser(this.platformId)) return;
    try {
      const key = `qs-numbers-seen-${this.gameId}`;
      localStorage.removeItem(key);
    } catch {
      // localStorage not available
    }
  }

  /** Play the number reveal animation (like the landing page mockup) */
  private playNumberRevealAnimation(finalHome: (number | null)[], finalAway: (number | null)[]): void {
    if (!isPlatformBrowser(this.platformId)) {
      this.displayHomeNumbers.set([...finalHome]);
      this.displayAwayNumbers.set([...finalAway]);
      this.homeNumbersLocked.set(Array(finalHome.length).fill(true));
      this.awayNumbersLocked.set(Array(finalAway.length).fill(true));
      this.markNumbersSeen();
      return;
    }

    // Respect reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.displayHomeNumbers.set([...finalHome]);
      this.displayAwayNumbers.set([...finalAway]);
      this.homeNumbersLocked.set(Array(finalHome.length).fill(true));
      this.awayNumbersLocked.set(Array(finalAway.length).fill(true));
      this.markNumbersSeen();
      return;
    }

    this.isAnimatingNumbers.set(true);
    const cols = finalHome.length;
    const rows = finalAway.length;

    // Initialize with random numbers
    this.displayHomeNumbers.set(this.generateRandomDisplay(cols));
    this.displayAwayNumbers.set(this.generateRandomDisplay(rows));
    this.homeNumbersLocked.set(Array(cols).fill(false));
    this.awayNumbersLocked.set(Array(rows).fill(false));

    // Flicker interval (rapid random changes)
    const FLICKER_MS = 70;
    this.animationIntervalId = setInterval(() => {
      const homeLocked = this.homeNumbersLocked();
      const awayLocked = this.awayNumbersLocked();
      this.displayHomeNumbers.update(d => d.map((v, i) => homeLocked[i] ? v : this.randomDigit(cols)));
      this.displayAwayNumbers.update(d => d.map((v, i) => awayLocked[i] ? v : this.randomDigit(rows)));
    }, FLICKER_MS);

    // Lock numbers one by one with delay
    const LOCK_STEP_MS = 180;
    const INITIAL_DELAY = 600;

    setTimeout(() => {
      // Lock home numbers (top row) left to right
      for (let i = 0; i < cols; i++) {
        setTimeout(() => {
          this.displayHomeNumbers.update(d => d.map((v, j) => j === i ? finalHome[i] : v));
          this.homeNumbersLocked.update(l => l.map((v, j) => v || j === i));
        }, i * LOCK_STEP_MS);
      }

      // Lock away numbers (side column) top to bottom, after home is done
      const homeDelay = cols * LOCK_STEP_MS;
      for (let i = 0; i < rows; i++) {
        setTimeout(() => {
          this.displayAwayNumbers.update(d => d.map((v, j) => j === i ? finalAway[i] : v));
          this.awayNumbersLocked.update(l => l.map((v, j) => v || j === i));

          // After last away number locks, stop flickering
          if (i === rows - 1) {
            this.stopAnimation();
            this.markNumbersSeen();
          }
        }, homeDelay + i * LOCK_STEP_MS);
      }
    }, INITIAL_DELAY);
  }

  private generateRandomDisplay(count: number): number[] {
    return Array.from({ length: count }, () => this.randomDigit(count));
  }

  private randomDigit(maxDigits: number): number {
    // For 10-col: 0-9, for 5-col: 0-4
    return Math.floor(Math.random() * maxDigits);
  }

  private stopAnimation(): void {
    if (this.animationIntervalId) {
      clearInterval(this.animationIntervalId);
      this.animationIntervalId = null;
    }
    this.isAnimatingNumbers.set(false);
  }

  /** Check on load if we need to animate (first time seeing these numbers) */
  private checkAndPlayAnimation(): void {
    if (!this.isRandomized) {
      // Numbers cleared - stop any running animation and show empty state
      this.stopAnimation();
      this.displayHomeNumbers.set([...this.homeNumbers]);
      this.displayAwayNumbers.set([...this.awayNumbers]);
      this.homeNumbersLocked.set(Array(this.homeNumbers.length).fill(true));
      this.awayNumbersLocked.set(Array(this.awayNumbers.length).fill(true));
      return;
    }
    if (this.hasSeenNumbers()) {
      // User has seen these numbers, show them locked immediately
      this.stopAnimation();
      this.displayHomeNumbers.set([...this.homeNumbers]);
      this.displayAwayNumbers.set([...this.awayNumbers]);
      this.homeNumbersLocked.set(Array(this.homeNumbers.length).fill(true));
      this.awayNumbersLocked.set(Array(this.awayNumbers.length).fill(true));
    } else {
      // First time seeing these numbers, play animation
      this.playNumberRevealAnimation(this.homeNumbers, this.awayNumbers);
    }
  }

  /** Format a number for display - shows paired digits for 5-col/row boards */
  formatNumber(num: number | null, isPaired: boolean): string {
    if (num === null) return '';
    if (!isPaired) return num.toString();
    // Paired: group 0 = "0,1", group 1 = "2,3", etc.
    const first = num * 2;
    const second = first + 1;
    return `${first},${second}`;
  }

  /** Check if columns use paired digits */
  get homeNumbersPaired(): boolean {
    return getBoardDimensions(this.boardSize).cols === 5;
  }

  /** Check if rows use paired digits */
  get awayNumbersPaired(): boolean {
    return getBoardDimensions(this.boardSize).rows === 5;
  }

  async toggleLock(): Promise<void> {
    // Only owners can toggle lock
    if (!this.isGameOwner()) {
      return;
    }
    if (!this.isLocked && this.shrinkSizes().length) {
      this.showShrinkSuggestion.set(true);
      return;
    }
    await this.setLocked(!this.isLocked);
  }

  /** Locking a half-empty board: convert to the chosen smaller size, then lock. */
  async convertAndLock(size: BoardSize): Promise<void> {
    this.showShrinkSuggestion.set(false);
    try {
      await this.gameService.resizeBoard(this.gameId, size);
    } catch {
      this.toastService.error('Could not convert the board. Try again.');
      return;
    }
    await this.setLocked(true);
  }

  async lockAsIs(): Promise<void> {
    this.showShrinkSuggestion.set(false);
    await this.setLocked(true);
  }

  /** Sizes this board could shrink to, largest first: picks fit and numbers are not drawn. */
  shrinkSizes(): BoardSize[] {
    return smallerBoardSizes(this.boardSize, this.squaresPicked(), this.isRandomized);
  }

  /** A host who locks, unlocks, draws or clears by hand takes over: Auto-lock and draw switches itself off for this board. */
  private async stopAutoManage(): Promise<void> {
    if (!this.autoManage) return;
    const before = this.autoManage;
    this.autoManage = undefined;
    try {
      await this.gameService.setAutoManage(this.gameId, null);
      this.toastService.success('Auto-lock and draw is off for this board');
    } catch {
      this.autoManage = before;
      this.toastService.warning('Could not turn off Auto-lock and draw. Turn it off in Edit game.');
    }
  }

  private async setLocked(locked: boolean): Promise<void> {
    void this.stopAutoManage();
    this.isLocked = locked;
    try {
      await this.gameService.updateGame(this.gameId, { isLocked: locked });
    } catch {
      this.isLocked = !locked;
    }
  }

  /** Saves the Edit game popup in one write. */
  /** A full board shows a way out to people who hold no square on it (not the host or co-host). */
  fullBoardNotice(): boolean {
    const { rows, cols } = getBoardDimensions(this.boardSize);
    const me = this._currentPlayer.toLowerCase();
    const holdsSquare = !!me && Object.values(this.selectedSquares).some(name => name.toLowerCase() === me);
    return this.squaresPicked() >= rows * cols && !this.isGameOwner() && !this.isManager() && !holdsSquare;
  }

  /** Whether this board can be shown to players on the host's full boards. */
  canShowInOpenBoards(): boolean {
    const { rows, cols } = getBoardDimensions(this.boardSize);
    const eligible = !this.isLocked && this.squaresPicked() < rows * cols;
    return this.isGameOwner() && this.planService.features().activeBoards > 1 && (this.showInOpenBoards || eligible);
  }

  /** "3 of 5 squares" for the player's own name (the host and co-host included), or null when there is no limit. */
  squareCounter(): { held: number; max: number; full: boolean } | null {
    return squareLimitState(this.selectedSquares, this.sanitizePlayerName(this.currentPlayer || ''), this.maxSquaresPerPlayer);
  }

  /** The host can switch on lock-and-draw before kickoff: Season Pass, a linked game, numbers not drawn yet. */
  canAutoManage(): boolean {
    return this.isGameOwner() && this.planService.features().autoManage && !!this.espnEventId && !(this.isLocked && this.isRandomized);
  }

  /** True once the viewer has picked a tab, so switching fades the content in but the first paint does not. */
  tabTouched = false;

  selectTab(tab: 'board' | 'probabilities' | 'boxscore' | 'more'): void {
    this.activeTab = tab;
    this.tabTouched = true;
  }

  /** The linked ESPN game is being played right now. */
  isLiveGame(): boolean {
    return this.linkedEspnGame()?.status === 'in';
  }

  trackOtherBoardJoin(): void {
    this.gameService.recordBoardStatOnce(this.gameId, 'otherBoardJoins');
  }

  /** The host's other opted-in open boards, loaded once per board. */
  private loadOpenBoards(): Promise<OpenBoardRow[]> {
    if (this.openBoardsFor !== this.gameId || !this.openBoardsLoad) {
      this.openBoardsFor = this.gameId;
      this.openBoardsLoad = this.gameService.getOpenBoards(this.gameOwnerId, this.gameId).then(rows => {
        this.openBoards.set(rows);
        return rows;
      });
    }
    return this.openBoardsLoad;
  }

  squaresPicked(): number {
    return Object.keys(this.selectedSquares).length;
  }

  async onEditGameSaved(values: EditGameValues): Promise<void> {
    if (!this.isGameOwner()) return;
    const homeTeam = this.sanitizationService.sanitizeTeamName(values.homeTeam);
    const awayTeam = this.sanitizationService.sanitizeTeamName(values.awayTeam);
    const hostNote = this.sanitizationService.sanitizeHostNote(values.hostNote);
    const price = this.isLocked ? this.currentPrice : this.sanitizationService.validatePrice(values.pricePerSquare);
    const canSplit = this.planService.features().customSplits && !this.isRandomized;
    const split = canSplit ? values.quarterSplit : this.quarterSplit;
    try {
      if (values.newBoardSize) await this.gameService.resizeBoard(this.gameId, values.newBoardSize);
      await this.gameService.updateGame(this.gameId, {
        homeTeam, awayTeam, hostNote, pricePerSquare: price,
        emptyQuarterRule: values.emptyQuarterRule,
        ...(canSplit ? { quarterSplit: split } : {})
      });
      this.emptyQuarterRule = values.emptyQuarterRule;
      this.quarterSplit = split;
      this.quarterPayouts = splitFractions(split);
      this.homeTeam = homeTeam;
      this.awayTeam = awayTeam;
      this.hostNote = hostNote;
      this.currentPrice = price;
      this.calculatePlayerStats();
      if (values.showInOpenBoards !== this.showInOpenBoards) {
        try {
          await this.gameService.setShowInOpenBoards(this.gameId, this.gameOwnerId, values.showInOpenBoards);
          this.showInOpenBoards = values.showInOpenBoards;
        } catch {
          this.toastService.warning('Saved, but Show in my open boards could not be changed. Try again in a moment.');
          return;
        }
      }
      if (this.isGameOwner() && this.planService.features().squareLimit && (values.maxSquaresPerPlayer ?? undefined) !== this.maxSquaresPerPlayer) {
        try {
          await this.gameService.setSquareLimit(this.gameId, values.maxSquaresPerPlayer);
          this.maxSquaresPerPlayer = values.maxSquaresPerPlayer ?? undefined;
        } catch {
          this.toastService.warning('Saved, but the squares limit could not be changed. Try again in a moment.');
          return;
        }
      }
      if (this.canAutoManage() && values.autoManage !== !!this.autoManage) {
        try {
          const date = this.linkedEspnGame()?.date;
          await this.gameService.setAutoManage(this.gameId, values.autoManage ? { enabled: true, resize: true } : null, date ? Date.parse(date) : undefined);
          this.autoManage = values.autoManage ? { enabled: true, resize: true } : undefined;
        } catch {
          this.toastService.warning('Saved, but Auto-lock and draw could not be changed. Try again in a moment.');
          return;
        }
      }
      this.toastService.success('Game saved');
    } catch {
      this.toastService.error('Could not save the game. Try again.');
    }
  }

  /**
   * How many quarters are finished (always the first N). An unclaimed square only settles a quarter once it is over.
   * Linked boards follow the feed's period, because the poller writes the running total into later quarters.
   */
  completedQuarterCount(): number {
    if (this.isGameOver()) return 4;
    if (this.espnEventId) return Math.max(0, Math.min(3, (this.linkedEspnGame()?.period ?? 0) - 1));
    const quarters = ['q1', 'q2', 'q3', 'q4'] as const;
    let lastPlayed = -1;
    quarters.forEach((quarter, i) => {
      const score = this.scores[quarter];
      if (score && (score.home > 0 || score.away > 0)) lastPlayed = i;
    });
    return lastPlayed + 1;
  }

  /** Quarters that have started, for the Winners tiles (see startedQuarterCount). */
  startedQuarterCount(): number {
    const game = this.linkedEspnGame();
    return startedQuarterCount({
      espnEventId: this.espnEventId,
      gameOver: this.isGameOver(),
      linkedStatus: game?.status ?? null,
      period: game?.period ?? null
    });
  }

  /** Same rule as Presentation mode: see isGameOver in core/utils/quarter-label.ts. */
  isGameOver(): boolean {
    return isGameOver({
      espnEventId: this.espnEventId,
      espnLive: this.latestEspnLive,
      linkedStatus: this.linkedEspnGame()?.status ?? (this.espnEventId && this.linkedFinalEventId() === this.espnEventId ? 'post' : null),
      q4: this.scores.q4,
      q4Winner: this.winners['q4']
    });
  }

  /** Ads show on free hosts' boards. The admin can preview a plan from the View-as switcher. */
  showAd(): boolean {
    if (this.authService.isPreviewAdmin() && this.planService.plan() !== 'admin') {
      return !this.planService.features().adFree;
    }
    return Date.now() >= this.adFreeUntil;
  }

  /** The host stamps how long this board is ad-free; the rules cap it at their real pass. */
  private async stampAdFree(): Promise<void> {
    const uid = this.authService.realUser()?.uid;
    if (!uid) return;
    const until = await this.gameService.adFreeUntilFor(uid);
    if (until > this.adFreeUntil) {
      this.adFreeUntil = until;
      this.gameService.updateGame(this.gameId, { adFreeUntil: until }).catch(() => {});
    }
  }

  filledCount(): number {
    return Object.keys(this.selectedSquares).length;
  }

  /** Tour steps; the host-only steps only for owner and co-host. */
  private walkthroughSteps(): WalkthroughStep[] {
    const host = this.isGameOwner() || this.isManager();
    return this.gameboardWalkthroughSteps.filter(step => host || step.target !== 'host-tools');
  }



  @HostListener('document:keydown', ['$event'])
  onArrowKey(event: KeyboardEvent): void {
    const dir = boardArrowStep(event);
    const ids = this.hostBoardIds;
    const index = ids.indexOf(this.gameId);
    if (!dir || ids.length < 2 || index < 0) return;
    this.slideDir.set(dir > 0 ? 'right' : 'left');
    this.router.navigate(['/game', ids[(index + dir + ids.length) % ids.length]]);
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.showNameEditModal()) this.showNameEditModal.set(false);
  }

  @HostListener('document:click')
  onDocumentClick(): void {
    this.highlightedSquare = null;
  }

  onPlayerSelected(player: string | null): void {
    this.selectedPlayer = player;
  }

  onQuarterClick(quarter: string): void {
    const score = this.scores[quarter as keyof typeof this.scores];
    if (!score) return;

    const homeLastDigit = score.home % 10;
    const awayLastDigit = score.away % 10;

    const row = this.awayNumbers.findIndex(n => this.digitMatchesNumber(awayLastDigit, n, this.awayNumbersPaired));
    const col = this.homeNumbers.findIndex(n => this.digitMatchesNumber(homeLastDigit, n, this.homeNumbersPaired));
    if (row === -1 || col === -1) return;

    const key = `${row}-${col}`;
    this.highlightedSquare = this.highlightedSquare === key ? null : key;
  }


  onManagePayments() {
    // Only owners and managers can manage payments
    if (!this.isGameOwner() && !this.isManager()) {
      return;
    }
    this.paymentDialog.setData(this.playerStats, this.playerColors, this.paidPlayers);
    this.paymentDialog.open();
  }

  /** Owner and co-host: take a player off the board. Frees their squares and clears everything tied to their name. */
  async onPlayerRemoved(playerName: string): Promise<void> {
    if (!this.isGameOwner() && !this.isManager()) return;

    const previous = {
      squares: this.selectedSquares,
      colors: this.playerColors,
      paid: this.paidPlayers,
      userIds: this.playerUserIds,
      winners: this.winners
    };
    const without = <T>(map: { [key: string]: T }, drop: (key: string, value: T) => boolean): { [key: string]: T } =>
      Object.fromEntries(Object.entries(map).filter(([key, value]) => !drop(key, value)));

    this.selectedSquares = without(this.selectedSquares, (_, name) => name === playerName);
    this.playerColors = without(this.playerColors, key => key === playerName);
    this.paidPlayers = new Set([...this.paidPlayers].filter(name => name !== playerName));
    this.playerUserIds = without(this.playerUserIds, key => key === playerName);
    this.winners = without(this.winners, (_, name) => name === playerName);
    if (this.selectedPlayer === playerName) this.selectedPlayer = null;
    this.calculatePlayerStats();
    this.paymentDialog.setData(this.playerStats, this.playerColors, this.paidPlayers);

    try {
      await this.gameService.updateGame(this.gameId, {
        selectedSquares: this.selectedSquares,
        playerColors: this.playerColors,
        paidPlayers: Array.from(this.paidPlayers),
        playerUserIds: this.playerUserIds,
        winners: this.winners
      });
      this.toastService.success(`Removed ${playerName}`);
    } catch {
      this.selectedSquares = previous.squares;
      this.playerColors = previous.colors;
      this.paidPlayers = previous.paid;
      this.playerUserIds = previous.userIds;
      this.winners = previous.winners;
      this.calculatePlayerStats();
      this.paymentDialog.setData(this.playerStats, this.playerColors, this.paidPlayers);
      this.toastService.error(`Could not remove ${playerName}. Try again.`);
    }
  }

  onPaidPlayersChange(paidPlayers: string[]) {
    this.paidPlayers = new Set(paidPlayers);
    this.gameService.updateGame(this.gameId, {
      paidPlayers: Array.from(this.paidPlayers)
    });
  }

  async onClearGame(confirmed = false) {
    // Only owners can clear game
    if (!this.isGameOwner()) {
      return;
    }

    if (!confirmed && !await this.confirmService.ask({ title: 'Clear all game data?', message: 'Squares, numbers and scores are removed. This cannot be undone.', confirmLabel: 'Clear game data' })) {
      return;
    }

    const { rows, cols } = getBoardDimensions(this.boardSize);
    const defaultGameState: Partial<GameData> = {
      selectedSquares: {},
      homeNumbers: Array(cols).fill(null),
      awayNumbers: Array(rows).fill(null),
      scores: {
        q1: { home: 0, away: 0 },
        q2: { home: 0, away: 0 },
        q3: { home: 0, away: 0 },
        q4: { home: 0, away: 0 }
      },
      winners: {},
      playerColors: {},
      playerUserIds: {},
      pricePerSquare: 10,
      isRandomized: false,
      isLocked: false,
      homeTeam: '',
      awayTeam: '',
      hostNote: '',
      paidPlayers: []
    };

    await this.gameService.updateGame(this.gameId, defaultGameState);
  }

  get playerCount(): number {
    return Object.keys(this.playerStats).length;
  }

  togglePlayersList(): void {
    this.isPlayersListVisible = !this.isPlayersListVisible;
  }

  // Share functionality
  openShareModal(): void {
    this.showShareModal.set(true);
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
  }




  goBack(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }

  async onAuthModalAuthenticated(): Promise<void> {
    this.showAuthModal.set(false);

    // Set current player from the newly authenticated user
    const user = this.authService.currentUser();
    if (user?.displayName) {
      this._currentPlayer = user.displayName;
    }

    // Claim the pending square if there was one
    if (this.pendingSquare) {
      const square = this.pendingSquare;
      this.pendingSquare = null;
      await this.onSquareClick(square);
    }
  }

  onAuthModalClosed(): void {
    this.showAuthModal.set(false);
    // The user backed out, so don't claim this square on a later sign-in
    this.pendingSquare = null;
  }

  // ESPN Sync Methods
  private applyServerScoreDisplay(): void {
    this.stopPolling();
    if (!this.espnEventId) {
      if (this.linkedEspnGame()) this.linkedEspnGame.set(null);
      return;
    }
    const live = this.latestEspnLive;
    if (live) {
      this.linkedEspnGame.set(this.toLinkedGame(this.espnEventId, live));
      return;
    }
    if (this.espnEventId !== this.linkedEspnGame()?.id) {
      void this.fetchLinkedEspnGame(false);
    }
  }

  private ensureLiveIndex(): void {
    if (!this.espnEventId || !this.gameId) return;
    if (!this.isGameOwner() && !this.isManager()) return;
    const key = `${this.gameId}:${this.espnEventId}`;
    if (this.liveIndexEnsuredFor === key) return;
    this.liveIndexEnsuredFor = key;
    this.gameService.ensureLiveGameIndex(this.gameId, this.espnEventId, this.espnSport).catch(() => {});
  }

  private toLinkedGame(id: string, live: EspnLiveSnapshot): EspnGame {
    const homeTeam = live.homeTeam || this.homeTeam || 'Home';
    const awayTeam = live.awayTeam || this.awayTeam || 'Away';
    return {
      id,
      name: `${awayTeam} at ${homeTeam}`,
      homeTeam,
      awayTeam,
      homeTeamFull: homeTeam,
      awayTeamFull: awayTeam,
      homeScore: live.homeScore,
      awayScore: live.awayScore,
      period: live.period,
      clock: live.clock,
      status: live.status,
      completed: live.completed,
      quarters: live.quarters,
      date: ''
    };
  }

  private async fetchLinkedEspnGame(poll = true): Promise<void> {
    if (!this.espnEventId) return;

    const requestedId = this.espnEventId;
    const game = await this.espnService.getGame(requestedId, this.espnSport);
    if (this.destroyed || this.espnEventId !== requestedId) return;
    if (environment.serverScoring && this.latestEspnLive) return;
    this.linkedEspnGame.set(game);
    if (!game) void this.checkLinkedEventFinal(requestedId);

    if (!poll || environment.serverScoring) return;

    if (game?.status === 'in') {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  private async checkLinkedEventFinal(eventId: string): Promise<void> {
    if (this.finalCheckedFor === eventId) return;
    this.finalCheckedFor = eventId;
    const final = await this.espnService.isEventFinal(eventId, this.espnSport);
    if (this.destroyed || this.espnEventId !== eventId) return;
    if (final === null) this.finalCheckedFor = null;
    else if (final) this.linkedFinalEventId.set(eventId);
  }

  /**
   * ESPN's scoreboard only lists the current week, so a finished game can stop being found there.
   * Its final scores are already saved on the board: the host's browser works the winners out from those.
   */
  private async recomputeWinnersIfFinal(): Promise<boolean> {
    const id = this.espnEventId;
    if (!id || !(this.isGameOwner() || this.isManager())) return false;
    const final = this.linkedFinalEventId() === id || (await this.espnService.isEventFinal(id, this.espnSport)) === true;
    if (!final || this.espnEventId !== id) return false;
    this.linkedFinalEventId.set(id);
    this.espnSyncError.set(null);
    this.calculateWinnersFromEspn(4, true);
    return true;
  }

  async syncFromEspn(): Promise<void> {
    if (environment.serverScoring || !this.espnEventId) return;

    this.isSyncingEspn.set(true);
    this.espnSyncError.set(null);

    try {
      const game = await this.espnService.getGame(this.espnEventId, this.espnSport);
      if (!game) {
        if (await this.recomputeWinnersIfFinal()) return;
        this.espnSyncError.set('Could not fetch game data from ESPN');
        return;
      }

      this.linkedEspnGame.set(game);
      this.lastSyncTime.set(new Date());

      // Only the host or co-host writes scores. A viewer's write is refused by the rules, but Firebase applies
      // it locally first and then rolls it back, which made the Q4 tile flicker on joined boards. Viewers keep
      // the live game info (period, clock) for display and read the stored scores and winners.
      if (!this.isGameOwner() && !this.isManager()) {
        if (game.status === 'post') {
          this.stopPolling();
        } else if (game.status === 'in' && !this.pollingInterval) {
          this.startPolling();
        }
        return;
      }

      // ESPN gives per-quarter scores; squares need cumulative scores
      let homeAccum = 0;
      let awayAccum = 0;
      const quarterKeys = ['q1', 'q2', 'q3', 'q4'] as const;
      const newScores = { ...this.scores };

      for (let i = 0; i < 4; i++) {
        homeAccum += game.quarters[i]?.home || 0;
        awayAccum += game.quarters[i]?.away || 0;
        newScores[quarterKeys[i]] = { home: homeAccum, away: awayAccum };
      }

      // Use final score for Q4 when game is finished (handles OT, Pro Bowl, etc.)
      if (game.status === 'post') {
        newScores.q4 = { home: game.homeScore, away: game.awayScore };
      }

      this.scores = newScores;
      await this.gameService.updateGame(this.gameId, { scores: newScores });
      this.calculateWinnersFromEspn(game.period, game.completed);

      // Stop polling if game has ended
      if (game.status === 'post') {
        this.stopPolling();
      } else if (game.status === 'in' && !this.pollingInterval) {
        this.startPolling();
      }
    } catch (error) {
      this.espnSyncError.set('Failed to sync scores from ESPN');
    } finally {
      this.isSyncingEspn.set(false);
    }
  }

  // Walkthrough methods
  startWalkthrough(): void {
    this.walkthroughService.resetCompletion('gameboard');
    this.walkthroughService.start('gameboard', this.walkthroughSteps());
  }

  // Name edit modal methods
  openNameEditModal(): void {
    const user = this.authService.currentUser();
    this.editingName = user?.displayName || '';
    this.showNameEditModal.set(true);
  }

  isEditingNameTaken(): boolean {
    if (!this.editingName.trim()) return false;
    const sanitizedName = this.sanitizePlayerName(this.editingName);
    const existingPlayers = new Set(
      Object.values(this.selectedSquares).map(p => p.toLowerCase())
    );
    const currentUserName = this.authService.currentUser()?.displayName;
    return existingPlayers.has(sanitizedName.toLowerCase())
      && currentUserName?.toLowerCase() !== sanitizedName.toLowerCase();
  }

  async saveNameEdit(): Promise<void> {
    if (!this.editingName.trim()) return;

    // Check for duplicate name (case-insensitive)
    const sanitizedName = this.sanitizePlayerName(this.editingName);
    const existingPlayers = new Set(
      Object.values(this.selectedSquares).map(p => p.toLowerCase())
    );
    const currentUserName = this.authService.currentUser()?.displayName;

    const isOwnName = currentUserName?.toLowerCase() === sanitizedName.toLowerCase();
    if (existingPlayers.has(sanitizedName.toLowerCase()) && !isOwnName) {
      this.toastService.error(`"${sanitizedName}" is already in use. Please use a different name.`);
      return;
    }

    this.isSavingName.set(true);
    try {
      const user = this.authService.currentUser();
      if (user?.isGuest) {
        this.authService.updateGuestName(this.editingName);
      } else {
        await this.authService.updateDisplayName(this.editingName);
      }

      // Propagate name change across all game data
      const oldName = currentUserName;
      if (oldName && oldName !== sanitizedName) {
        const updatedSquares = { ...this.selectedSquares };
        for (const key of Object.keys(updatedSquares)) {
          if (updatedSquares[key].toLowerCase() === oldName.toLowerCase()) {
            updatedSquares[key] = sanitizedName;
          }
        }

        const updatedColors = { ...this.playerColors };
        if (updatedColors[oldName]) {
          updatedColors[sanitizedName] = updatedColors[oldName];
          delete updatedColors[oldName];
        }

        const updatedPaidPlayers = Array.from(this.paidPlayers).map(p =>
          p.toLowerCase() === oldName.toLowerCase() ? sanitizedName : p
        );

        const updatedPlayerUserIds = { ...this.playerUserIds };
        if (updatedPlayerUserIds[oldName]) {
          updatedPlayerUserIds[sanitizedName] = updatedPlayerUserIds[oldName];
          delete updatedPlayerUserIds[oldName];
        }

        await this.gameService.updateGame(this.gameId, {
          selectedSquares: updatedSquares,
          playerColors: updatedColors,
          paidPlayers: updatedPaidPlayers,
          playerUserIds: updatedPlayerUserIds
        });
      }

      this._currentPlayer = this.editingName.trim();
      this.showNameEditModal.set(false);
    } catch (error) {
      this.toastService.error('Could not save your name. Try again.');
    } finally {
      this.isSavingName.set(false);
    }
  }

  isForceNameTaken(): boolean {
    if (!this.forceNameValue.trim()) return false;
    const sanitized = this.sanitizePlayerName(this.forceNameValue);
    return Object.values(this.selectedSquares).some(
      p => p.toLowerCase() === sanitized.toLowerCase()
    );
  }

  async saveForceNameChange(): Promise<void> {
    const sanitized = this.sanitizePlayerName(this.forceNameValue);
    if (!sanitized || this.isForceNameTaken()) return;

    this.isSavingForceName.set(true);
    try {
      const user = this.authService.currentUser();
      if (!user) return;

      if (user.isGuest) {
        this.authService.updateGuestName(sanitized);
      } else {
        await this.authService.updateDisplayName(sanitized);
      }

      // Record new name in playerUserIds
      this.playerUserIds[sanitized] = user.uid;
      await this.gameService.updateGame(this.gameId, { playerUserIds: this.playerUserIds });

      this._currentPlayer = sanitized;
      this.showForceNameChangeModal.set(false);
      this.duplicateNameWarning.set(null);
    } catch (error) {
      this.toastService.error('Could not save your name. Try again.');
    } finally {
      this.isSavingForceName.set(false);
    }
  }
}
