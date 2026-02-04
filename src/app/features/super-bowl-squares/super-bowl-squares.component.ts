import { Component, OnInit, OnDestroy, ViewChild, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService, GameData } from '../../core/services/game.service';
import { AuthService } from '../../core/services/auth.service';
import { EspnService, EspnGame, SportType, SPORT_CONFIG } from '../../core/services/espn.service';
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
  heroXMark
} from '@ng-icons/heroicons/outline';
import { GameStatusComponent } from './components/game-status/game-status.component';
import { PasswordDialogComponent } from './components/password-dialog/password-dialog.component';
import { HeaderComponent } from './components/header/header.component';
import { PaymentDialogComponent } from './components/payment-dialog/payment-dialog.component';
import { ProbabilityHeatmapComponent } from './components/probability-heatmap/probability-heatmap.component';

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
    PasswordDialogComponent,
    HeaderComponent,
    PaymentDialogComponent,
    ProbabilityHeatmapComponent
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
      heroXMark
    })
  ],
  templateUrl: './super-bowl-squares.component.html',
  styleUrls: ['./super-bowl-squares.component.scss']
})
export class SuperBowlSquaresComponent implements OnInit, OnDestroy {
  @ViewChild('passwordDialog') passwordDialog!: PasswordDialogComponent;
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
  }
  isRandomized: boolean = false;
  isRandomizing: boolean = false;
  isLocked: boolean = false;
  isPlayersListVisible: boolean = true;
  showAlert: boolean = false;
  alertMessage: string = '';
  takenByPlayer: string = '';
  selectedPlayer: string | null = null;
  venmoUsername = '';
  paidPlayers: Set<string> = new Set();
  activeTab: 'board' | 'probabilities' = 'board';

  // Injected services
  private gameService = inject(GameService);
  private authService = inject(AuthService);
  private espnService = inject(EspnService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  // UI state
  isLoading = signal(true);
  gameNotFound = signal(false);
  showShareModal = signal(false);
  copiedToClipboard = signal(false);
  showNameEditModal = signal(false);
  editingName = '';
  isSavingName = signal(false);

  // Auth state
  currentUser = this.authService.currentUser;
  isGameOwner = signal(false);
  isManager = signal(false);

  // ESPN sync state
  espnGames = signal<EspnGame[]>([]);
  linkedEspnGame = signal<EspnGame | null>(null);
  espnEventId: string | undefined;
  espnSport: SportType = 'nfl';
  isSyncingEspn = signal(false);
  espnSyncError = signal<string | null>(null);
  lastSyncTime = signal<Date | null>(null);
  sportOptions: { value: SportType; label: string }[] = [
    { value: 'nfl', label: 'NFL' },
    { value: 'nba', label: 'NBA' }
  ];

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

          if (Object.values(this.scores).some(score => score.home > 0 || score.away > 0)) {
            this.calculateWinners();
          }

          // Fetch ESPN games if owner and load linked game data
          if (this.isGameOwner() && this.espnGames().length === 0) {
            this.fetchEspnGames();
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
      this.gameService.updateGame(this.gameId, { playerColors: this.playerColors });
      return availableColor;
    }

    return this.availableColors[0];
  }

  private sanitizePlayerName(name: string): string {
    return name
      .trim()
      .replace(/\s+/g, ' ');
  }

  onSquareClick(event: { row: number; col: number }): void {
    if (!this.currentPlayer) {
      this.showAlert = true;
      this.alertMessage = 'Please enter your name first';
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
      if (this.selectedSquares[key] === sanitizedPlayer) {
        const newSelectedSquares = { ...this.selectedSquares };
        delete newSelectedSquares[key];

        this.selectedSquares = newSelectedSquares;
        this.calculatePlayerStats();

        this.gameService.updateGame(this.gameId, {
          selectedSquares: newSelectedSquares
        });
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

    const newSelectedSquares = {
      ...this.selectedSquares,
      [key]: sanitizedPlayer
    };

    this.selectedSquares = newSelectedSquares;
    this.calculatePlayerStats();

    this.gameService.updateGame(this.gameId, {
      selectedSquares: newSelectedSquares
    });
  }

  onScoreChange(event: { quarter: string; scores: { home: number; away: number } }): void {
    const quarter = `q${event.quarter}` as keyof typeof this.scores;
    this.scores[quarter] = event.scores;
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
    // Check if user is game owner
    if (this.isGameOwner()) {
      this.isLocked = !this.isLocked;
      await this.gameService.updateGame(this.gameId, { isLocked: this.isLocked });
      return;
    }

    // Fall back to password for legacy games
    try {
      const password = await new Promise<string>((resolve, reject) => {
        const submitSub = this.passwordDialog.passwordSubmit.subscribe(pwd => {
          submitSub.unsubscribe();
          cancelSub.unsubscribe();
          resolve(pwd);
        });

        const cancelSub = this.passwordDialog.cancel.subscribe(() => {
          submitSub.unsubscribe();
          cancelSub.unsubscribe();
          reject();
        });

        this.passwordDialog.open();
      });

      if (password === 'chattanooga' || password === 'password') {
        this.isLocked = !this.isLocked;
        await this.gameService.updateGame(this.gameId, { isLocked: this.isLocked });
      } else {
        alert('Incorrect password');
      }
    } catch {
      // User cancelled
    }
  }

  onTeamNameChange(event: {team: 'home' | 'away', name: string}): void {
    if (event.team === 'home') {
      this.homeTeam = event.name;
    } else {
      this.awayTeam = event.name;
    }
    this.gameService.updateGame(this.gameId, {
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam
    });
  }

  onPriceChange(price: number): void {
    this.currentPrice = price;
    this.gameService.updateGame(this.gameId, {
      pricePerSquare: this.currentPrice
    });
    this.calculatePlayerStats();
  }

  onPlayerSelected(player: string | null): void {
    this.selectedPlayer = player;
  }

  onVenmoUsernameChange(username: string) {
    this.venmoUsername = username;
    this.gameService.updateGame(this.gameId, {
      venmoUsername: username
    });
  }

  onManagePayments() {
    // Check if user is game owner or manager
    if (this.isGameOwner() || this.isManager()) {
      this.paymentDialog.setData(this.playerStats, this.playerColors, this.paidPlayers);
      this.paymentDialog.open();
      return;
    }

    // Fall back to password for legacy games
    this.verifyPassword().then(isValid => {
      if (isValid) {
        this.paymentDialog.setData(this.playerStats, this.playerColors, this.paidPlayers);
        this.paymentDialog.open();
      }
    });
  }

  private async verifyPassword(): Promise<boolean> {
    try {
      const password = await new Promise<string>((resolve, reject) => {
        const submitSub = this.passwordDialog.passwordSubmit.subscribe(pwd => {
          submitSub.unsubscribe();
          cancelSub.unsubscribe();
          resolve(pwd);
        });

        const cancelSub = this.passwordDialog.cancel.subscribe(() => {
          submitSub.unsubscribe();
          cancelSub.unsubscribe();
          reject();
        });

        this.passwordDialog.open();
      });

      return password === 'chattanooga' || password === 'password';
    } catch {
      return false;
    }
  }

  onPaidPlayersChange(paidPlayers: string[]) {
    this.paidPlayers = new Set(paidPlayers);
    this.gameService.updateGame(this.gameId, {
      paidPlayers: Array.from(this.paidPlayers)
    });
  }

  async onClearGame() {
    // Check if user is game owner
    if (!this.isGameOwner()) {
      const isValid = await this.verifyPassword();
      if (!isValid) return;
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
      console.error('Failed to copy:', error);
    }
  }

  async copyShareLink(): Promise<void> {
    try {
      await navigator.clipboard.writeText(this.getShareableLink());
      this.copiedToClipboard.set(true);
      setTimeout(() => this.copiedToClipboard.set(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }

  goBack(): void {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['/']);
    }
  }

  // ESPN Sync Methods
  async fetchEspnGames(): Promise<void> {
    this.espnSyncError.set(null);
    const games = await this.espnService.getGames(this.espnSport);
    this.espnGames.set(games);

    // If we have a linked game, update its data
    if (this.espnEventId) {
      const linked = games.find(g => g.id === this.espnEventId);
      this.linkedEspnGame.set(linked || null);

      // Start/stop polling based on game status
      if (linked?.status === 'in') {
        this.startPolling();
      } else {
        this.stopPolling();
      }
    }
  }

  onSportChange(sport: SportType): void {
    this.espnSport = sport;
    this.espnGames.set([]);
    this.fetchEspnGames();
    // Save sport preference to game
    this.gameService.updateGame(this.gameId, { espnSport: sport });
  }

  async linkEspnGame(eventId: string): Promise<void> {
    this.espnEventId = eventId;
    await this.gameService.updateGame(this.gameId, { espnEventId: eventId, espnSport: this.espnSport });

    const game = this.espnGames().find(g => g.id === eventId);
    this.linkedEspnGame.set(game || null);

    // Auto-populate team names if empty
    if (game && !this.homeTeam && !this.awayTeam) {
      this.homeTeam = game.homeTeam;
      this.awayTeam = game.awayTeam;
      await this.gameService.updateGame(this.gameId, {
        homeTeam: game.homeTeam,
        awayTeam: game.awayTeam
      });
    }

    // Start polling if game is in progress
    if (game?.status === 'in') {
      this.startPolling();
    }
  }

  async unlinkEspnGame(): Promise<void> {
    this.espnEventId = undefined;
    this.linkedEspnGame.set(null);
    this.lastSyncTime.set(null);
    this.stopPolling();
    await this.gameService.updateGame(this.gameId, { espnEventId: '' });
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

      // Map ESPN quarters to our scores format
      const newScores = {
        q1: { home: game.quarters[0]?.home || 0, away: game.quarters[0]?.away || 0 },
        q2: { home: game.quarters[1]?.home || 0, away: game.quarters[1]?.away || 0 },
        q3: { home: game.quarters[2]?.home || 0, away: game.quarters[2]?.away || 0 },
        q4: { home: game.quarters[3]?.home || 0, away: game.quarters[3]?.away || 0 }
      };

      // For Pro Bowl or other 3-period games, use final score for Q4
      if (game.quarters.length === 3 && game.status === 'post') {
        newScores.q4 = { home: game.homeScore, away: game.awayScore };
      }

      this.scores = newScores;
      await this.gameService.updateGame(this.gameId, { scores: newScores });
      this.calculateWinners();

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

  // Name edit modal methods
  openNameEditModal(): void {
    const user = this.authService.currentUser();
    this.editingName = user?.displayName || '';
    this.showNameEditModal.set(true);
  }

  async saveNameEdit(): Promise<void> {
    if (!this.editingName.trim()) return;

    this.isSavingName.set(true);
    try {
      const user = this.authService.currentUser();
      if (user?.isGuest) {
        this.authService.updateGuestName(this.editingName);
      } else {
        await this.authService.updateDisplayName(this.editingName);
      }
      this._currentPlayer = this.editingName.trim();
      this.showNameEditModal.set(false);
    } catch (error) {
      console.error('Failed to save name:', error);
    } finally {
      this.isSavingName.set(false);
    }
  }
}
