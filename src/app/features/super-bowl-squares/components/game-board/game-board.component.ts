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
  
  isAnimating = false;

  @Input() set selectedSquares(value: { [key: string]: string }) {
    this._selectedSquares = value;
  }
  get selectedSquares(): { [key: string]: string } {
    return this._selectedSquares;
  }
  private _selectedSquares!: { [key: string]: string };

  @Input() set playerColors(value: { [key: string]: string }) {
    this._playerColors = value;
  }
  get playerColors(): { [key: string]: string } {
    return this._playerColors;
  }
  private _playerColors!: { [key: string]: string };

  @Output() squareClick = new EventEmitter<{ row: number; col: number }>();

  @Input() set isRandomizing(value: boolean) {
    this.isAnimating = value;
  }

  getSquareClass(row: number, col: number): string {
    const key = `${row}-${col}`;
    const player = this.selectedSquares[key];
    const color = player ? this.playerColors[player] : '';
    return color || 'bg-square';
  }

  getSquarePlayer(row: number, col: number): string {
    const key = `${row}-${col}`;
    return this.selectedSquares[key] || '';
  }

  onSquareClick(row: number, col: number): void {
    this.squareClick.emit({ row, col });
  }
} 