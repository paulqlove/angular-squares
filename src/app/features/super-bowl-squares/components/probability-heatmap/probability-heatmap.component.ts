import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SQUARES_PROBABILITIES } from '../../utils/probability.utils';

@Component({
  selector: 'app-probability-heatmap',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="relative">
      <!-- Grid Container -->
      <div class="grid-container">
        <!-- Numbers row -->
        <div class="grid grid-cols-[auto_repeat(10,minmax(0,1fr))] gap-0">
          <!-- Empty cell for top-left corner -->
          <div class="number-cell empty-cell"></div>
          
          <!-- Top numbers (home) -->
          @for (num of homeNumbers; track num) {
            <div class="number-cell">
              {{ num !== null ? num : '' }}
            </div>
          }
        </div>

        <!-- Grid rows -->
        @for (awayNum of awayNumbers; track awayNum; let row = $index) {
          <div class="grid grid-cols-[auto_repeat(10,minmax(0,1fr))] gap-0">
            <!-- Side number (away) -->
            <div class="number-cell pr-4">
              {{ awayNum !== null ? awayNum : '' }}
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
                     class="text-blue-600 hover:underline">
            ELDORADO Super Bowl Squares Odds & Probabilities
          </a>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./probability-heatmap.component.scss']
})
export class ProbabilityHeatmapComponent {
  @Input() homeNumbers: (number | null)[] = [];
  @Input() awayNumbers: (number | null)[] = [];
  @Input() homeTeam: string = '';
  @Input() awayTeam: string = '';
  @Input() selectedSquares: { [key: string]: string } = {};
  @Input() selectedPlayer: string | null = null;

  getProbability(row: number, col: number): string {
    if (this.homeNumbers[col] === null || this.awayNumbers[row] === null) {
      return '';
    }
    const key = `${this.awayNumbers[row]},${this.homeNumbers[col]}`;
    return SQUARES_PROBABILITIES[key]?.toFixed(1) || '0.0';
  }

  getCellClass(row: number, col: number): string {
    if (this.homeNumbers[col] === null || this.awayNumbers[row] === null) {
      return 'bg-card';
    }

    const prob = Number(this.getProbability(row, col));
    
    // Enhanced color scale with better contrast
    if (prob >= 3.0) return 'bg-blue-300';      // Darker blue
    if (prob >= 2.0) return 'bg-blue-200';
    if (prob >= 1.5) return 'bg-green-300';     // Darker green
    if (prob >= 1.0) return 'bg-green-200';
    if (prob >= 0.5) return 'bg-yellow-200';    // More visible yellow
    return 'bg-red-100';                        // Light red for lowest
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