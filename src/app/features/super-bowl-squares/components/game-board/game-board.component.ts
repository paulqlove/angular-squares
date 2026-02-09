import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
@Component({
  selector: 'app-game-board',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-board.component.html',
  styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent {
  @Input() homeTeam!: string;
  @Input() awayTeam!: string;
  @Input() homeNumbers!: (number | null)[];
  @Input() awayNumbers!: (number | null)[];
  @Input() selectedSquares!: { [key: string]: string };
  @Input() playerColors!: { [key: string]: string };
  @Input() selectedPlayer: string | null = null;
  @Input() highlightedSquare: string | null = null;
  @Input() currentLeaderSquare: string | null = null;
  @Input() isRandomized: boolean = false;

  @Output() squareClick = new EventEmitter<{ row: number; col: number }>();

  getSquareClass(row: number, col: number): string {
    const key = `${row}-${col}`;
    const player = this.selectedSquares[key];
    const baseColor = player ? this.playerColors[player] : 'bg-square';

    if (this.highlightedSquare) {
      if (key === this.highlightedSquare) {
        return `${baseColor} square-highlight`;
      }
      return `${baseColor} opacity-25`;
    }

    if (this.selectedPlayer && player !== this.selectedPlayer) {
      return `${baseColor} opacity-25`;
    }

    const leader = !this.highlightedSquare && key === this.currentLeaderSquare ? ' square-leader' : '';
    return baseColor + leader;
  }

  getSquarePlayer(row: number, col: number): string {
    const key = `${row}-${col}`;
    return this.selectedSquares[key] || '';
  }

  getSquareAriaLabel(row: number, col: number): string {
    const player = this.getSquarePlayer(row, col);
    const awayNum = this.awayNumbers[row];
    const homeNum = this.homeNumbers[col];
    const awayLabel = this.awayTeam || 'Away';
    const homeLabel = this.homeTeam || 'Home';

    if (player) {
      return `Square ${awayLabel} ${awayNum ?? '?'}, ${homeLabel} ${homeNum ?? '?'}, taken by ${player}`;
    }
    return `Square ${awayLabel} ${awayNum ?? '?'}, ${homeLabel} ${homeNum ?? '?'}, available`;
  }

  onSquareClick(row: number, col: number): void {
    this.squareClick.emit({ row, col });
  }

  onSquareKeydown(event: KeyboardEvent, row: number, col: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.squareClick.emit({ row, col });
    }
  }
} 