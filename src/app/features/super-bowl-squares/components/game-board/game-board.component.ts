import { buildInitials } from '../../utils/initials.utils';
import { ArrivalTracker, NO_SQUARE_CHANGES, SquareChanges, squareChanges } from '../../utils/square-motion.utils';
import { Component, Input, Output, EventEmitter, ChangeDetectionStrategy, OnChanges, SimpleChanges } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BoardSize, getBoardDimensions } from '../../../../core/services/game.service';

@Component({
    selector: 'app-game-board',
    imports: [CommonModule],
    templateUrl: './game-board.component.html',
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./game-board.component.scss']
})
export class GameBoardComponent implements OnChanges {
  private arrivingWinners: ReadonlySet<string> = new Set();
  private changes: SquareChanges = NO_SQUARE_CHANGES;
  private previousSquares: { [key: string]: string } | null = null;
  private tapped: string | null = null;
  private readonly winnerArrivals = new ArrivalTracker();

  /** The board on screen, so switching boards never replays a quarter winner. */
  @Input() public boardId: string = '';
  /** A locked board: squares can't be picked, so they get no hover or press. */
  @Input() public locked: boolean = false;
  @Input() homeTeam!: string;
  @Input() awayTeam!: string;
  /** Team logos from TeamLogoService (our NFL table, or ESPN's logo for other leagues). */
  @Input() awayLogo: string | null = null;
  @Input() homeLogo: string | null = null;
  @Input() homeNumbers!: (number | null)[];
  @Input() awayNumbers!: (number | null)[];
  @Input() selectedSquares!: { [key: string]: string };
  @Input() playerColors!: { [key: string]: string };
  @Input() selectedPlayer: string | null = null;
  @Input() highlightedSquare: string | null = null;
  @Input() currentLeaderSquare: string | null = null;
  /** The game is in progress: the leader square breathes for a while. */
  @Input() liveScore = false;
  @Input() winnerSquares: string[] = [];
  /** Quarter tab text for each winning square, keyed by "row-col": "Q1", "FINAL", "Q1 Q3". Shown from 640px up. */
  @Input() winnerQuarterLabels: Record<string, string> = {};
  @Input() isRandomized: boolean = false;
  @Input() boardSize: BoardSize = 100;
  /** True while the numbers are being drawn: each digit rises in, as on How to play (.qs-draw-digit). */
  @Input() drawing = false;

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

  private initials = new Map<string, string>();
  private initialsSource: { [key: string]: string } | null = null;

  /** Squares that change hands and quarter winners that arrive animate once. Loads, refreshes and board switches do not. */
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['winnerSquares'] || changes['boardId']) {
      const arrived = this.winnerArrivals.next(this.boardId, this.winnerSquares);
      if (arrived) this.arrivingWinners = new Set(arrived);
    }
    if (!changes['selectedSquares']) return;
    const next = this.selectedSquares ?? {};
    const previous = this.previousSquares;
    this.previousSquares = next;
    if (!previous) return;
    const sorted = changes['boardId'] ? NO_SQUARE_CHANGES : squareChanges(previous, next, this.tapped);
    if (!sorted) return;
    this.changes = sorted;
    this.tapped = null;
  }

  /** How a square's name comes in: a spring for your own claim, a fade for someone else's. */
  public nameEnter(key: string): string {
    if (this.changes.own.has(key)) return 'qs-name-own';
    return this.changes.others.has(key) ? 'qs-name-in' : '';
  }

  /** A square that was let go: its name fades out. */
  public nameLeave(key: string): string {
    return this.changes.released.has(key) ? 'qs-name-out' : '';
  }

  @Output() squareClick = new EventEmitter<{ row: number; col: number }>();

  getSquareClass(row: number, col: number): string {
    const key = `${row}-${col}`;
    // Kept on every path, so showing a winner or picking a player doesn't replay the winner's fade
    const winIn = this.arrivingWinners.has(key) ? ' square-win-in' : '';
    const player = this.selectedSquares[key];
    const baseColor = player ? this.playerColors[player] : 'bg-qs-panel';

    if (this.highlightedSquare) {
      return baseColor + (key === this.highlightedSquare ? ' square-highlight' : ' opacity-25') + winIn;
    }

    if (this.selectedPlayer && player !== this.selectedPlayer) {
      return `${baseColor} opacity-25${winIn}`;
    }

    const leader = key === this.currentLeaderSquare ? ' square-leader' + (player ? '' : ' square-leader-empty') + (this.liveScore ? ' square-live' : '') : '';
    const open = !player && !this.locked ? ' qs-square-open' : '';
    return baseColor + leader + open + winIn;
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

  getSquareInitials(row: number, col: number): string {
    if (this.initialsSource !== this.selectedSquares) {
      this.initialsSource = this.selectedSquares;
      this.initials = buildInitials(Object.values(this.selectedSquares));
    }
    return this.initials.get(this.getSquarePlayer(row, col).trim()) ?? '';
  }

  getSquareAriaLabel(row: number, col: number): string {
    const player = this.getSquarePlayer(row, col);
    const awayNum = this.awayNumbers[row];
    const homeNum = this.homeNumbers[col];
    const awayLabel = this.awayTeam || 'Away';
    const homeLabel = this.homeTeam || 'Home';

    if (player) {
      const quarters = this.winnerQuarterLabels[`${row}-${col}`];
      const won = quarters ? `, won ${quarters}` : this.winnerSquares.includes(`${row}-${col}`) ? ', winning square' : '';
      return `Square ${awayLabel} ${awayNum ?? '?'}, ${homeLabel} ${homeNum ?? '?'}, taken by ${player}${won}`;
    }
    return `Square ${awayLabel} ${awayNum ?? '?'}, ${homeLabel} ${homeNum ?? '?'}, available`;
  }

  onSquareClick(row: number, col: number): void {
    this.tapped = `${row}-${col}`;
    this.squareClick.emit({ row, col });
  }

  onSquareKeydown(event: KeyboardEvent, row: number, col: number): void {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.onSquareClick(row, col);
    }
  }
} 