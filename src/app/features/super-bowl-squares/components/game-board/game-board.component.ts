import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardSize, getBoardDimensions } from '../../../../core/services/game.service';
import { getTeamLogoByAbbreviation } from '../../../content/teams-data';

@Component({
    selector: 'app-game-board',
    imports: [CommonModule],
    templateUrl: './game-board.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
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
  @Input() boardSize: BoardSize = 100;
  @Input() homeNumbersLocked: boolean[] = [];
  @Input() awayNumbersLocked: boolean[] = [];

  /** Number of columns in the grid (10 for 100/50, 5 for 25) */
  get cols(): number {
    return getBoardDimensions(this.boardSize).cols;
  }

  /** Number of rows in the grid (10 for 100, 5 for 50/25) */
  get rows(): number {
    return getBoardDimensions(this.boardSize).rows;
  }

  /** CSS class for grid columns based on board size */
  get gridColsClass(): string {
    const cols = this.cols;
    const rows = this.rows;
    if (cols === 5) {
      return 'grid-cols-[2.25rem_repeat(5,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(5,minmax(0,1fr))]';
    }
    if (rows === 5) {
      // 50-square board: 10 cols but paired row digits need wider header
      return 'grid-cols-[2.25rem_repeat(10,minmax(0,1fr))] sm:grid-cols-[2.5rem_repeat(10,minmax(0,1fr))]';
    }
    return 'grid-cols-[1.5rem_repeat(10,minmax(0,1fr))] sm:grid-cols-[2.25rem_repeat(10,minmax(0,1fr))]';
  }

  /** Check if columns use paired digits (5-col boards) */
  get homeNumbersPaired(): boolean {
    return this.cols === 5;
  }

  /** Check if rows use paired digits (5-row boards) */
  get awayNumbersPaired(): boolean {
    return this.rows === 5;
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

  /** Check if a home number (column header) is locked (for animation) */
  isHomeLocked(index: number): boolean {
    return this.homeNumbersLocked[index] ?? true;
  }

  /** Check if an away number (row header) is locked (for animation) */
  isAwayLocked(index: number): boolean {
    return this.awayNumbersLocked[index] ?? true;
  }

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

  get leaderRow(): number | null {
    return this.currentLeaderSquare ? Number(this.currentLeaderSquare.split('-')[0]) : null;
  }

  get leaderCol(): number | null {
    return this.currentLeaderSquare ? Number(this.currentLeaderSquare.split('-')[1]) : null;
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

  getTeamLogo(abbrev: string): string | null {
    return getTeamLogoByAbbreviation(abbrev, 100);
  }
} 