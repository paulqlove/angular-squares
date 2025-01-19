import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { FirebaseService } from '../../core/services/firebase.service';
import { Subscription } from 'rxjs';
import { GameBoardComponent } from './components/game-board/game-board.component';
import { PlayersListComponent } from './components/players-list/players-list.component';
import { ScoreInputComponent } from './components/score-input/score-input.component';
import { WinnersAndPayoutsComponent } from './components/winners-and-payouts/winners-and-payouts.component';
import { NgIconComponent, provideIcons } from '@ng-icons/core';
import { heroLockOpen, heroLockClosed } from '@ng-icons/heroicons/outline';
import { GameStatusComponent } from './components/game-status/game-status.component';

@Component({
  selector: 'app-super-bowl-squares',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    GameBoardComponent,
    PlayersListComponent,
    ScoreInputComponent,
    WinnersAndPayoutsComponent,
    NgIconComponent,
    GameStatusComponent
  ],
  providers: [
    provideIcons({ heroLockOpen, heroLockClosed })
  ],
  templateUrl: './super-bowl-squares.component.html',
  styleUrls: ['./super-bowl-squares.component.scss']
})
export class SuperBowlSquaresComponent implements OnInit, OnDestroy {
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
  currentPlayer: string = '';
  isRandomized: boolean = false;
  isLocked: boolean = false;
  isPlayersListVisible: boolean = true;

  constructor(private firebaseService: FirebaseService) {}

  ngOnInit(): void {
    this.subscription.add(
      this.firebaseService.getGameData().subscribe(data => {
        if (data) {
          this.selectedSquares = data.selectedSquares || {};
          this.homeNumbers = data.homeNumbers || Array(10).fill(null);
          this.awayNumbers = data.awayNumbers || Array(10).fill(null);
          this.scores = data.scores || this.scores;
          this.currentPrice = data.pricePerSquare || 10;
          this.isRandomized = data.isRandomized || false;
          this.isLocked = data.isLocked || false;
          this.homeTeam = data.homeTeam || '';
          this.awayTeam = data.awayTeam || '';

          Object.values(this.selectedSquares).forEach(playerName => {
            if (!this.playerColors[playerName]) {
              this.getPlayerColor(playerName);
            }
          });

          this.calculatePlayerStats();
          
          if (Object.values(this.scores).some(score => score.home > 0 || score.away > 0)) {
            this.calculateWinners();
          }
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
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
      this.firebaseService.updateGameData({ playerColors: this.playerColors });
      return availableColor;
    }

    return this.availableColors[0];
  }

  onSquareClick(event: { row: number; col: number }): void {
    if (!this.currentPlayer) {
      alert('Please enter your name first');
      return;
    }
    
    const key = `${event.row}-${event.col}`;
    
    this.firebaseService.updateGameData({
      selectedSquares: {
        ...this.selectedSquares,
        [key]: this.currentPlayer
      },
      playerColors: this.playerColors
    });
  }

  onScoreChange(event: { quarter: string; scores: { home: number; away: number } }): void {
    const quarter = `q${event.quarter}` as keyof typeof this.scores;
    this.scores[quarter] = event.scores;
    this.firebaseService.updateGameData({
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
    this.firebaseService.updateGameData({ winners: newWinners });
  }

  getQuarterScores(quarter: number): { home: number; away: number } {
    const key = `q${quarter}` as keyof typeof this.scores;
    return this.scores[key];
  }

  randomizeNumbers(): void {
    console.log('Before toggle - isRandomized:', this.isRandomized);
    
    if (this.isRandomized) {
      // Clear numbers
      this.homeNumbers = Array(10).fill(null);
      this.awayNumbers = Array(10).fill(null);
      this.isRandomized = false;
    } else {
      // Randomize numbers
      const numbers = Array.from({length: 10}, (_, i) => i);
      const homeNumbers = [...numbers].sort(() => Math.random() - 0.5);
      const awayNumbers = [...numbers].sort(() => Math.random() - 0.5);
      this.homeNumbers = homeNumbers;
      this.awayNumbers = awayNumbers;
      this.isRandomized = true;
    }

    console.log('After toggle - isRandomized:', this.isRandomized);
    console.log('Updating Firebase with:', {
      homeNumbers: this.homeNumbers,
      awayNumbers: this.awayNumbers,
      isRandomized: this.isRandomized
    });

    this.firebaseService.updateGameData({
      homeNumbers: this.homeNumbers,
      awayNumbers: this.awayNumbers,
      isRandomized: this.isRandomized
    });
  }

  async toggleLock(): Promise<void> {
    const password = prompt('Enter password to lock/unlock game:');
    if (!password) return;
    
    if (password === 'chattanooga' || password === 'password') {
      this.isLocked = !this.isLocked;
      await this.firebaseService.updateGameData({ isLocked: this.isLocked });
    } else {
      alert('Incorrect password');
    }
  }

  onTeamNameChange(): void {
    this.firebaseService.updateGameData({
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam
    });
  }

  onPriceChange(): void {
    this.firebaseService.updateGameData({
      pricePerSquare: this.currentPrice
    });
    this.calculatePlayerStats(); // Recalculate totals when price changes
  }
} 