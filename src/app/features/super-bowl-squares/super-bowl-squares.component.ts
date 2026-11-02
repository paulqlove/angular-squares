import { computed, Component, OnInit, OnDestroy, ViewChild, HostListener, signal, inject, effect, ChangeDetectionStrategy } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService, GameData, EspnLiveSnapshot } from '../../core/services/game.service';
import { environment } from '../../../environments/environment';
import { PLAYER_COLORS, normalizePlayerColors } from './utils/player-colors';
import { PreviewRole } from '../../core/services/role-preview.service';
import { AuthService } from '../../core/services/auth.service';
import { EspnService, EspnGame, SportType } from '../../core/services/espn.service';
import { ToastService } from '../../core/services/toast.service';
import { SanitizationService } from '../../core/services/sanitization.service';
import { WalkthroughService, WalkthroughStep } from '../../core/services/walkthrough.service';
import { Subscription } from 'rxjs';
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
  heroArrowLeft,
  heroClipboard,
  heroPencilSquare,
  heroXMark,
  heroQuestionMarkCircle,
  heroArrowPath,
  heroSparkles,
  heroCheckCircle
} from '@ng-icons/heroicons/outline';
import { GameStatusComponent } from './components/game-status/game-status.component';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { EditGameDialogComponent, EditGameValues } from './components/edit-game-dialog/edit-game-dialog.component';
import { PaymentDialogComponent } from './components/payment-dialog/payment-dialog.component';
import { ProbabilityHeatmapComponent } from './components/probability-heatmap/probability-heatmap.component';
import { BoxScoreComponent } from './components/box-score/box-score.component';
import { ProfileMenuComponent } from '../../components/ui/profile-menu/profile-menu.component';
import { ShareDialogComponent } from '../../components/ui/share-dialog/share-dialog.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';

@Component({
    selector: 'app-super-bowl-squares',
    imports: [
    FormsModule,
    NgIconComponent,
    GameBoardComponent,
    PlayersListComponent,
    WinnersAndPayoutsComponent,
    GameStatusComponent,
    AppHeaderComponent,
    EditGameDialogComponent,
    PaymentDialogComponent,
    ProbabilityHeatmapComponent,
    BoxScoreComponent,
    AuthModalComponent,
    ProfileMenuComponent,
    ShareDialogComponent
],
    providers: [
        provideIcons({
            heroLockOpen,
            heroLockClosed,
            heroChevronDown,
            heroChevronRight,
            heroTrash,
            heroShare,
            heroArrowLeft,
            heroClipboard,
            heroPencilSquare,
            heroXMark,
            heroQuestionMarkCircle,
            heroArrowPath,
            heroSparkles,
            heroCheckCircle
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
  homeTeam: string = '';
  awayTeam: string = '';
  selectedSquares: { [key: string]: string } = {};
  playerStats: { [key: string]: { squares: number, total: number } } = {};
  currentPrice: number = 10;
  homeNumbers: (number | null)[] = Array(10).fill(null);
  awayNumbers: (number | null)[] = Array(10).fill(null);
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
  isPlayersListVisible: boolean = true;
  showAlert: boolean = false;
  alertMessage: string = '';
  takenByPlayer: string = '';
  selectedPlayer: string | null = null;
  highlightedSquare: string | null = null;
  hostNote = '';
  paidPlayers: Set<string> = new Set();
  activeTab: 'board' | 'probabilities' | 'boxscore' = 'board';

  // Injected services
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private espnService = inject(EspnService);
  private toastService = inject(ToastService);
  private walkthroughService = inject(WalkthroughService);
  private sanitizationService = inject(SanitizationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private gameboardWalkthroughSteps: WalkthroughStep[] = [
    {
      target: 'player-name',
      title: 'Enter Your Name',
      description: 'Type your name here so others know which squares are yours when you claim them.',
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
      target: 'host-tools',
      title: 'Host tools',
      description: 'Lock the board, draw the numbers, confirm players, and edit team names, points and your note.',
      position: 'bottom'
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
        this._currentPlayer = user?.displayName || user?.email || '';
        return;
      }
      if (user?.displayName && !this._currentPlayer) {
        this._currentPlayer = user.displayName;
      } else if (user?.email && !this._currentPlayer) {
        this._currentPlayer = user.email;
      }
    });
  }

  // UI state
  showSettings = signal(false);
  isLoading = signal(true);
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
    } else if (user?.email) {
      this._currentPlayer = user.email;
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

  private async loadGame(gameId: string): Promise<void> {
    this.isLoading.set(true);
    this.liveIndexEnsuredFor = null;
    this.latestEspnLive = null;

    // Check if game exists
    const exists = await this.gameService.gameExists(gameId);
    if (!exists) {
      this.gameNotFound.set(true);
      this.isLoading.set(false);
      return;
    }

    // Subscribe to game updates (skip initial null from BehaviorSubject since we already verified game exists)
    let isFirstEmission = true;
    this.subscription.add(
      this.gameService.subscribeToGame(gameId).subscribe((data: GameData | null) => {
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
          this.selectedSquares = data.selectedSquares || {};
          this.homeNumbers = data.homeNumbers || Array(10).fill(null);
          this.awayNumbers = data.awayNumbers || Array(10).fill(null);
          this.scores = data.scores || this.scores;
          this.currentPrice = data.pricePerSquare || 10;
          this.isRandomized = data.isRandomized || false;
          this.isLocked = data.isLocked || false;
          this.homeTeam = data.homeTeam || '';
          this.awayTeam = data.awayTeam || '';
          this.hostNote = data.hostNote || '';
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

          // Trigger walkthrough on first load (only if already authenticated)
          if (this.authService.currentUser()) {
            this.triggerWalkthroughIfNew();
          }
        } else {
          this.gameNotFound.set(true);
        }
      })
    );
  }

  ngOnDestroy(): void {
    if (typeof document !== 'undefined') document.body.classList.remove('has-host-bar');
    this.destroyed = true;
    this.subscription.unsubscribe();
    this.gameService.unsubscribe();
    this.stopPolling();
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
          this.toastService.error('Failed to update square. Please try again.');
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
      this.toastService.error('Failed to claim square. Please try again.');
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

  private calculateWinners(): void {
    const newWinners: { [key: string]: string } = {};

    const getWinner = (homeScore: number, awayScore: number): string | null => {
      const homeLastDigit = homeScore % 10;
      const awayLastDigit = awayScore % 10;

      const winningSquare = Object.entries(this.selectedSquares).find(([key]) => {
        const [row, col] = key.split('-').map(Number);
        return this.awayNumbers[row] === awayLastDigit &&
               this.homeNumbers[col] === homeLastDigit;
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
        return this.awayNumbers[row] === awayLastDigit &&
               this.homeNumbers[col] === homeLastDigit;
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
    const row = this.awayNumbers.findIndex(n => n === awayDigit);
    const col = this.homeNumbers.findIndex(n => n === homeDigit);
    if (row === -1 || col === -1) return null;
    return `${row}-${col}`;
  }

  getQuarterScores(quarter: number): { home: number; away: number } {
    const key = `q${quarter}` as keyof typeof this.scores;
    return this.scores[key];
  }

  async randomizeNumbers(): Promise<void> {
    if (this.isRandomized) {
      this.homeNumbers = Array(10).fill(null);
      this.awayNumbers = Array(10).fill(null);
      this.isRandomized = false;

      await this.gameService.updateGame(this.gameId, {
        homeNumbers: this.homeNumbers,
        awayNumbers: this.awayNumbers,
        isRandomized: this.isRandomized
      });
      return;
    }

    const numbers = Array.from({length: 10}, (_, i) => i);
    const homeNumbers = [...numbers].sort(() => Math.random() - 0.5);
    const awayNumbers = [...numbers].sort(() => Math.random() - 0.5);

    this.homeNumbers = homeNumbers;
    this.awayNumbers = awayNumbers;
    this.isRandomized = true;

    await this.gameService.updateGame(this.gameId, {
      homeNumbers: this.homeNumbers,
      awayNumbers: this.awayNumbers,
      isRandomized: this.isRandomized
    });
  }

  async toggleLock(): Promise<void> {
    // Only owners can toggle lock
    if (!this.isGameOwner()) {
      return;
    }
    this.isLocked = !this.isLocked;
    try {
      await this.gameService.updateGame(this.gameId, { isLocked: this.isLocked });
    } catch {
      this.isLocked = !this.isLocked;
    }
  }

  /** Saves the Edit game popup in one write. */
  async onEditGameSaved(values: EditGameValues): Promise<void> {
    if (!this.isGameOwner()) return;
    const homeTeam = this.sanitizationService.sanitizeTeamName(values.homeTeam);
    const awayTeam = this.sanitizationService.sanitizeTeamName(values.awayTeam);
    const hostNote = this.sanitizationService.sanitizeHostNote(values.hostNote);
    const price = this.isLocked ? this.currentPrice : this.sanitizationService.validatePrice(values.pricePerSquare);
    try {
      await this.gameService.updateGame(this.gameId, { homeTeam, awayTeam, hostNote, pricePerSquare: price });
      this.homeTeam = homeTeam;
      this.awayTeam = awayTeam;
      this.hostNote = hostNote;
      this.currentPrice = price;
      this.calculatePlayerStats();
      this.toastService.success('Game saved');
    } catch {
      this.toastService.error('Failed to save game. Please try again.');
    }
  }

  filledCount(): number {
    return Object.keys(this.selectedSquares).length;
  }

  /** Tour steps; the host-tools step only for owner and co-host. */
  private walkthroughSteps(): WalkthroughStep[] {
    const host = this.isGameOwner() || this.isManager();
    return this.gameboardWalkthroughSteps.filter(step => host || step.target !== 'host-tools');
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

    const row = this.awayNumbers.findIndex(n => n === awayLastDigit);
    const col = this.homeNumbers.findIndex(n => n === homeLastDigit);
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

    if (!confirmed && !confirm('Are you sure you want to clear all game data? This cannot be undone.')) {
      return;
    }

    const defaultGameState: Partial<GameData> = {
      selectedSquares: {},
      homeNumbers: Array(10).fill(null),
      awayNumbers: Array(10).fill(null),
      scores: {
        q1: { home: 0, away: 0 },
        q2: { home: 0, away: 0 },
        q3: { home: 0, away: 0 },
        q4: { home: 0, away: 0 }
      },
      winners: {},
      playerColors: {},
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

  getShareableLink(): string {
    return this.gameService.getShareableLink(this.gameId);
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
    } else if (user?.email) {
      this._currentPlayer = user.email;
    }

    // Claim the pending square if there was one
    if (this.pendingSquare) {
      const square = this.pendingSquare;
      this.pendingSquare = null;
      await this.onSquareClick(square);
    }

    // Trigger walkthrough for first-time users
    this.triggerWalkthroughIfNew();
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
    return {
      id,
      name: `${live.awayTeam || this.awayTeam || 'Away'} at ${live.homeTeam || this.homeTeam || 'Home'}`,
      homeTeam: live.homeTeam || this.homeTeam || 'Home',
      awayTeam: live.awayTeam || this.awayTeam || 'Away',
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

    if (!poll || environment.serverScoring) return;

    if (game?.status === 'in') {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  async syncFromEspn(): Promise<void> {
    if (environment.serverScoring || !this.espnEventId) return;

    this.isSyncingEspn.set(true);
    this.espnSyncError.set(null);

    try {
      const game = await this.espnService.getGame(this.espnEventId, this.espnSport);
      if (!game) {
        this.espnSyncError.set('Could not fetch game data from ESPN');
        return;
      }

      this.linkedEspnGame.set(game);
      this.lastSyncTime.set(new Date());

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

  private triggerWalkthroughIfNew(): void {
    setTimeout(() => {
      this.walkthroughService.startIfNew('gameboard', this.walkthroughSteps());
    }, 1000);
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
      this.toastService.error('Failed to save name');
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
      this.toastService.error('Failed to save name');
    } finally {
      this.isSavingForceName.set(false);
    }
  }
}
