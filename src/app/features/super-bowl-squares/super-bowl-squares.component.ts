import { Component, OnInit, OnDestroy, ViewChild, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { GameService, GameData } from '../../core/services/game.service';
import { AuthService } from '../../core/services/auth.service';
import { Subscription } from 'rxjs';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { PlayersListComponent } from './components/players-list/players-list.component';
import { ScoreInputComponent } from './components/score-input/score-input.component';
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
  heroClipboard
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
    ScoreInputComponent,
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
      heroClipboard
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

  // UI state
  isLoading = signal(true);
  gameNotFound = signal(false);
  showShareModal = signal(false);
  copiedToClipboard = signal(false);

  // Auth state
  currentUser = this.authService.currentUser;
  isGameOwner = signal(false);

  constructor(
    private gameService: GameService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Set current player from auth if available
    const user = this.authService.currentUser();
    if (user?.displayName) {
      this._currentPlayer = user.displayName;
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

    // Subscribe to game updates
    this.subscription.add(
      this.gameService.subscribeToGame(gameId).subscribe((data: GameData | null) => {
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

          // Check if current user is the game owner
          const user = this.authService.currentUser();
          this.isGameOwner.set(user?.uid === data.ownerId);

          Object.values(this.selectedSquares).forEach(playerName => {
            if (!this.playerColors[playerName]) {
              this.getPlayerColor(playerName);
            }
          });

          this.calculatePlayerStats();

          if (Object.values(this.scores).some(score => score.home > 0 || score.away > 0)) {
            this.calculateWinners();
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
    // Check if user is game owner
    if (this.isGameOwner()) {
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
}
