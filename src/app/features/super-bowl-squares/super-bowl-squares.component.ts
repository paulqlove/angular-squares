import { Component, OnInit, OnDestroy, ViewChild, HostListener, signal, inject, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService, GameData } from '../../core/services/game.service';
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
  heroCog6Tooth
} from '@ng-icons/heroicons/outline';
import { GameStatusComponent } from './components/game-status/game-status.component';
import { AppHeaderComponent } from '../../components/ui/app-header/app-header.component';
import { SettingsPanelComponent } from './components/settings-panel/settings-panel.component';
import { VenmoPopoverComponent } from './components/venmo-popover/venmo-popover.component';
import { PaymentDialogComponent } from './components/payment-dialog/payment-dialog.component';
import { ProbabilityHeatmapComponent } from './components/probability-heatmap/probability-heatmap.component';
import { BoxScoreComponent } from './components/box-score/box-score.component';
import { AuthModalComponent } from '../../components/ui/auth-modal/auth-modal.component';

@Component({
  selector: 'app-super-bowl-squares',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgIconComponent,
    GameBoardComponent,
    PlayersListComponent,
    WinnersAndPayoutsComponent,
    GameStatusComponent,
    AppHeaderComponent,
    SettingsPanelComponent,
    VenmoPopoverComponent,
    PaymentDialogComponent,
    ProbabilityHeatmapComponent,
    BoxScoreComponent,
    AuthModalComponent
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
      heroCog6Tooth
    })
  ],
  templateUrl: './super-bowl-squares.component.html',
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
  availableColors = [
    'bg-red-200',
    'bg-blue-200',
    'bg-green-200',
    'bg-yellow-200',
    'bg-purple-200',
    'bg-pink-200',
    'bg-indigo-200',
    'bg-orange-200',
    'bg-teal-200',
    'bg-cyan-200',
    'bg-lime-200',
    'bg-emerald-200',
    'bg-sky-200',
    'bg-violet-200',
    'bg-fuchsia-200',
    'bg-rose-200',
    'bg-amber-200',
    'bg-red-100',
    'bg-blue-100',
    'bg-green-100',
    'bg-yellow-100',
    'bg-purple-100',
    'bg-pink-100',
    'bg-indigo-100',
    'bg-orange-100',
    'bg-teal-100',
    'bg-cyan-100',
    'bg-lime-100',
    'bg-emerald-100',
    'bg-sky-100'
  ];

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
  isRandomizing: boolean = false;
  isLocked: boolean = false;
  isPlayersListVisible: boolean = true;
  showAlert: boolean = false;
  alertMessage: string = '';
  takenByPlayer: string = '';
  selectedPlayer: string | null = null;
  highlightedSquare: string | null = null;
  venmoUsername = '';
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
      description: 'Click any empty square to claim it. Check the Odds tab to see which squares have the best winning probability.',
      position: 'right'
    },
    {
      target: 'players-list',
      title: 'Players List',
      description: 'See all players and their squares. Click a name to highlight their squares on the board.',
      position: 'left'
    },
    {
      target: 'settings-button',
      title: 'Game Settings',
      description: 'Game owners can manage team names, prices, lock the board, and sync live ESPN scores here.',
      position: 'bottom'
    },
    {
      target: 'winners-payouts',
      title: 'Winners & Payouts',
      description: 'After numbers are randomized and scores come in, you\'ll see the winners for each quarter here.',
      position: 'top'
    }
  ];

  // Auth modal state for unauthenticated square clicks
  showAuthModal = signal(false);
  pendingSquare: { row: number; col: number } | null = null;

  constructor() {
    // Reactively update currentPlayer when auth state changes (e.g., Google sign-in after page load)
    effect(() => {
      const user = this.authService.currentUser();
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
  copiedToClipboard = signal(false);
  showNameEditModal = signal(false);
  editingName = '';
  isSavingName = signal(false);
  showForceNameChangeModal = signal(false);
  forceNameValue = '';
  isSavingForceName = signal(false);

  // Auth state
  currentUser = this.authService.currentUser;
  isGameOwner = signal(false);
  isManager = signal(false);

  // ESPN sync state
  linkedEspnGame = signal<EspnGame | null>(null);
  espnEventId: string | undefined;
  espnSport: SportType = 'nfl';
  isSyncingEspn = signal(false);
  espnSyncError = signal<string | null>(null);
  lastSyncTime = signal<Date | null>(null);

  // Auto-polling for live scores
  private pollingInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit(): void {
    // Set current player from auth if available (name or email)
    const user = this.authService.currentUser();
    if (user?.displayName) {
      this._currentPlayer = user.displayName;
    } else if (user?.email) {
      this._currentPlayer = user.email;
    }

    // Get game ID from route
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
          this.venmoUsername = data.venmoUsername || '';
          this.paidPlayers = new Set(data.paidPlayers || []);
          this.playerColors = data.playerColors || {};
          this.playerUserIds = data.playerUserIds || {};
          this.espnEventId = data.espnEventId;
          this.espnSport = data.espnSport || 'nfl';

          // Check if current user is the game owner or manager
          const user = this.authService.currentUser();
          this.isGameOwner.set(!!user && user.uid === data.ownerId);
          this.isManager.set(!!user && !!data.managerId && user.uid === data.managerId);

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

          // Calculate winners — skip for ESPN-linked games (syncFromEspn handles period-aware winners)
          if (!this.espnEventId && Object.values(this.scores).some(score => score.home > 0 || score.away > 0)) {
            this.calculateWinners();
          }

          // Fetch linked ESPN game data for all users (for box score display)
          if (this.espnEventId && this.espnEventId !== this.linkedEspnGame()?.id) {
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
    this.subscription.unsubscribe();
    this.gameService.unsubscribe();
    this.stopPolling();
  }

  private startPolling(): void {
    if (this.pollingInterval) return;
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
    const availableColor = this.availableColors.find(color => !usedColors.includes(color));

    if (availableColor) {
      this.playerColors[playerName] = availableColor;
      this.gameService.updateGame(this.gameId, { playerColors: this.playerColors }).catch(() => {});
      return availableColor;
    }

    return this.availableColors[0];
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

    if (this.isLocked) {
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

    Object.entries(this.scores).forEach(([quarter, score]) => {
      const winner = getWinner(score.home, score.away);
      if (winner) {
        newWinners[quarter] = winner;
      }
    });

    this.winners = newWinners;
    this.gameService.updateGame(this.gameId, { winners: newWinners });
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

  getQuarterScores(quarter: number): { home: number; away: number } {
    const key = `q${quarter}` as keyof typeof this.scores;
    return this.scores[key];
  }

  async randomizeNumbers(): Promise<void> {
    if (this.isRandomized) {
      this.isRandomizing = false;
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

    this.isRandomizing = true;

    const numbers = Array.from({length: 10}, (_, i) => i);
    const homeNumbers = [...numbers].sort(() => Math.random() - 0.5);
    const awayNumbers = [...numbers].sort(() => Math.random() - 0.5);

    this.homeNumbers = homeNumbers;
    this.awayNumbers = awayNumbers;

    await new Promise(resolve => setTimeout(resolve, 1000));

    this.isRandomized = true;
    this.isRandomizing = false;

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
    await this.gameService.updateGame(this.gameId, { isLocked: this.isLocked });
  }

  onTeamNameChange(event: {team: 'home' | 'away', name: string}): void {
    const sanitizedName = this.sanitizationService.sanitizeTeamName(event.name);
    if (event.team === 'home') {
      this.homeTeam = sanitizedName;
    } else {
      this.awayTeam = sanitizedName;
    }
    this.gameService.updateGame(this.gameId, {
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam
    });
  }

  onPriceChange(price: number): void {
    this.currentPrice = this.sanitizationService.validatePrice(price);
    this.gameService.updateGame(this.gameId, {
      pricePerSquare: this.currentPrice
    });
    this.calculatePlayerStats();
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

  onVenmoUsernameChange(username: string) {
    this.venmoUsername = this.sanitizationService.sanitizeVenmoUsername(username);
    this.gameService.updateGame(this.gameId, {
      venmoUsername: this.venmoUsername
    });
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

  async onClearGame() {
    // Only owners can clear game
    if (!this.isGameOwner()) {
      return;
    }

    if (!confirm('Are you sure you want to clear all game data? This cannot be undone.')) {
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
      venmoUsername: '',
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
    this.copiedToClipboard.set(false);
  }

  closeShareModal(): void {
    this.showShareModal.set(false);
  }

  getShareableLink(): string {
    return this.gameService.getShareableLink(this.gameId);
  }

  async copyGameCode(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.gameId);
      this.copiedToClipboard.set(true);
      setTimeout(() => this.copiedToClipboard.set(false), 2000);
    } catch (error) {
      this.toastService.error('Failed to copy');
    }
  }

  async copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getShareableLink());
      this.copiedToClipboard.set(true);
      setTimeout(() => this.copiedToClipboard.set(false), 2000);
    } catch (error) {
      this.toastService.error('Failed to copy');
    }
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

  // ESPN Sync Methods
  private async fetchLinkedEspnGame(): Promise<void> {
    if (!this.espnEventId) return;

    const game = await this.espnService.getGame(this.espnEventId, this.espnSport);
    this.linkedEspnGame.set(game);

    if (game?.status === 'in') {
      this.startPolling();
    } else {
      this.stopPolling();
    }
  }

  async syncFromEspn(): Promise<void> {
    if (!this.espnEventId) return;

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
    this.walkthroughService.start('gameboard', this.gameboardWalkthroughSteps);
  }

  private triggerWalkthroughIfNew(): void {
    setTimeout(() => {
      this.walkthroughService.startIfNew('gameboard', this.gameboardWalkthroughSteps);
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
