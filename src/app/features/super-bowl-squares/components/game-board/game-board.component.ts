import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnimatedNumberComponent } from '../animated-number/animated-number.component';

@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule, AnimatedNumberComponent],
  templateUrl: './game-board.component.html'
})
export class GameBoardComponent {
  @Input() homeTeam!: string;
  @Input() awayTeam!: string;
  @Input() homeNumbers!: (number | null)[];
  @Input() awayNumbers!: (number | null)[];
  @Input() selectedSquares!: { [key: string]: string };
  @Input() playerColors!: { [key: string]: string };
  @Input() selectedPlayer: string | null = null;
  
  isAnimating = false;

  @Output() squareClick = new EventEmitter<{ row: number; col: number }>();

  @Input() set isRandomizing(value: boolean) {
    this.isAnimating = value;
  }

  getSquareClass(row: number, col: number): string {
    const key = `${row}-${col}`;
    const player = this.selectedSquares[key];
    const baseColor = player ? this.playerColors[player] : 'bg-square';
    
    if (this.selectedPlayer && player !== this.selectedPlayer) {
      return `${baseColor} opacity-25`;
    }
    
    return baseColor;
  }

  getSquarePlayer(row: number, col: number): string {
    const key = `${row}-${col}`;
    return this.selectedSquares[key] || '';
  }

  onSquareClick(row: number, col: number): void {
    this.squareClick.emit({ row, col });
  }
} 