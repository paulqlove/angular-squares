import { Component, Input, ChangeDetectionStrategy } from '@angular/core';

import { SQUARES_PROBABILITIES } from '../../utils/probability.utils';
import { BoardSize, getBoardDimensions } from '../../../../core/services/game.service';

@Component({
    selector: 'app-probability-heatmap',
    imports: [],
    template: `
    <div class="relative">
      <!-- Grid Container -->
      <div class="grid-container">
        <!-- Numbers row -->
        <div [class]="'grid gap-0 ' + gridColsClass">
          <!-- Empty cell for top-left corner -->
          <div class="number-cell empty-cell"></div>

          <!-- Top numbers (home) -->
          @for (num of homeNumbers; track num) {
            <div class="number-cell">
              {{ formatNumber(num, homeNumbersPaired) }}
            </div>
          }
        </div>

        <!-- Grid rows -->
        @for (awayNum of awayNumbers; track awayNum; let row = $index) {
          <div [class]="'grid gap-0 ' + gridColsClass">
            <!-- Side number (away) -->
            <div class="number-cell pr-4">
              {{ formatNumber(awayNum, awayNumbersPaired) }}
            </div>

            <!-- Probability cells -->
            @for (homeNum of homeNumbers; track homeNum; let col = $index) {
              <div [class]="getCellClass(row, col)"
                   [class.opacity-25]="shouldDimSquare(row, col)"
                   class="probability-cell">
                {{ getProbability(row, col) }}%
              </div>
            }
          </div>
        }

        <!-- Source attribution -->
        <div class="mt-4 text-xs text-muted text-center">
          Source: <a href="https://www.eldo.co/super-bowl-squares-odds-probabilities-best-worst-numbers.html" 
                     target="_blank" 
                     class="text-qs-accent underline-offset-2 hover:underline">
            ELDORADO, Super Bowl squares frequencies
          </a>
        </div>
      </div>
    </div>
  `,
    changeDetection: ChangeDetectionStrategy.Eager,
    styleUrls: ['./probability-heatmap.component.scss']
})
export class ProbabilityHeatmapComponent {
  @Input() homeNumbers: (number | null)[] = [];
  @Input() awayNumbers: (number | null)[] = [];
  @Input() homeTeam: string = '';
  @Input() awayTeam: string = '';
  @Input() selectedSquares: { [key: string]: string } = {};
  @Input() selectedPlayer: string | null = null;
  @Input() boardSize: BoardSize = 100;

  get gridColsClass(): string {
    const cols = getBoardDimensions(this.boardSize).cols;
    return cols === 5
      ? 'grid-cols-[auto_repeat(5,minmax(0,1fr))]'
      : 'grid-cols-[auto_repeat(10,minmax(0,1fr))]';
  }

  get homeNumbersPaired(): boolean {
    return getBoardDimensions(this.boardSize).cols === 5;
  }

  get awayNumbersPaired(): boolean {
    return getBoardDimensions(this.boardSize).rows === 5;
  }

  formatNumber(num: number | null, isPaired: boolean): string {
    if (num === null) return '';
    if (!isPaired) return num.toString();
    const first = num * 2;
    const second = first + 1;
    return `${first},${second}`;
  }

  getProbability(row: number, col: number): string {
    if (this.homeNumbers[col] === null || this.awayNumbers[row] === null) {
      return '';
    }

    // For paired numbers, sum probabilities of all digit combinations in the pair
    const homeNum = this.homeNumbers[col]!;
    const awayNum = this.awayNumbers[row]!;

    const homeDigits = this.homeNumbersPaired ? [homeNum * 2, homeNum * 2 + 1] : [homeNum];
    const awayDigits = this.awayNumbersPaired ? [awayNum * 2, awayNum * 2 + 1] : [awayNum];

    let totalProb = 0;
    for (const away of awayDigits) {
      for (const home of homeDigits) {
        const key = `${away},${home}`;
        totalProb += SQUARES_PROBABILITIES[key] || 0;
      }
    }

    return totalProb.toFixed(1);
  }

  getCellClass(row: number, col: number): string {
    if (this.homeNumbers[col] === null || this.awayNumbers[row] === null) {
      return 'bg-card';
    }

    const prob = Number(this.getProbability(row, col));
    
    // One emerald ramp, same as the best-numbers page
    if (prob >= 3.0) return 'qs-heat-5';
    if (prob >= 2.0) return 'qs-heat-4';
    if (prob >= 1.5) return 'qs-heat-3';
    if (prob >= 1.0) return 'qs-heat-2';
    if (prob >= 0.5) return 'qs-heat-1';
    return 'qs-heat-0';
  }

  isSelectedPlayerSquare(row: number, col: number): boolean {
    if (!this.selectedPlayer) return false;
    const key = `${row}-${col}`;
    return this.selectedSquares[key] === this.selectedPlayer;
  }

  shouldDimSquare(row: number, col: number): boolean {
    if (!this.selectedPlayer) return false;
    const key = `${row}-${col}`;
    return this.selectedSquares[key] !== this.selectedPlayer;
  }
} 